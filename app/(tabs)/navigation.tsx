import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
  Alert, ScrollView, Platform, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Navigation as NavigationIcon, Play, Pause, Square, DollarSign, Zap,
  MapPin, Phone, ArrowLeft, Star, X, LocateFixed,
} from 'lucide-react-native';
import { Linking } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, LatLng } from 'react-native-maps';
import * as Location from 'expo-location';
import polyline from 'polyline';

import DropoffDialog from '@/components/DropoffDialog';
import DemandModal from '@/components/DemandModal';

const { height } = Dimensions.get('window');

interface OrderData {
  orderId: string; customerName: string; customerPhone: string;
  pickupLocation: string; destination: string; fareAmount: number;
  distance: string; estimatedDuration: string; customerRating: number;
}

interface TripState {
  status: 'idle' | 'active' | 'resting' | 'completed';
  startTime: number | null; restStartTime: number | null; totalRestTime: number;
}

const BASE_FARE = 2000;
const FARE_RATE = 1000;
const INITIAL_DISTANCE = 0.1;
const CAR_MARKER_SIZE = 36;

const DEFAULT_REGION = {
  latitude: 16.8409, longitude: 96.1735, latitudeDelta: 0.05, longitudeDelta: 0.05,
};

const carIcon = require('../../assets/images/car-marker.png');

// ---------- heading controls ----------
const COURSE_UP = false;              // rotate map like Google Maps
const CAR_MARKER_HEADING_OFFSET = 0; // tweak to visually align your PNG (0 if image faces up)
const HEADING_SMOOTHING = 0.2;
const MOVING_SPEED_MPS = 1.5;

const norm360 = (d: number) => ((d % 360) + 360) % 360;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const shortestDelta = (from: number, to: number) => {
  let d = norm360(to) - norm360(from);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
};
const smoothAngle = (prev: number, next: number, a = HEADING_SMOOTHING) =>
  norm360(prev + shortestDelta(prev, next) * a);

// Distance (km)
const haversineKm = (a: LatLng, b: LatLng) => {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Bearing a→b (deg)
const bearingDeg = (a: LatLng, b: LatLng) => {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return norm360((Math.atan2(y, x) * 180) / Math.PI);
};

export default function NavigationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  const orderData: OrderData = {
    orderId: (params.orderId as string) || '',
    customerName: (params.customerName as string) || '',
    customerPhone: (params.customerPhone as string) || '',
    pickupLocation: (params.pickupLocation as string) || '',
    destination: (params.destination as string) || '',
    fareAmount: params.fareAmount ? parseInt(params.fareAmount as string) : 0,
    distance: (params.distance as string) || '',
    estimatedDuration: (params.estimatedDuration as string) || '',
    customerRating: params.customerRating ? parseFloat(params.customerRating as string) : 0,
  };
  const hasCompleteOrderData =
    !!(orderData.orderId && orderData.customerName && orderData.customerPhone && orderData.pickupLocation && orderData.destination);

  // Trip state
  const [tripState, setTripState] = useState<TripState>({ status: 'idle', startTime: null, restStartTime: null, totalRestTime: 0 });
  const statusRef = useRef<TripState['status']>('idle');

  const [distance, setDistance] = useState(INITIAL_DISTANCE);
  const [fare, setFare] = useState(BASE_FARE + INITIAL_DISTANCE * FARE_RATE);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState('--:--');
  const [showDropoffDialog, setShowDropoffDialog] = useState(false);
  const [showCancelButton, setShowCancelButton] = useState(false);
  const [showDemandModal, setShowDemandModal] = useState(false);
  const [demandValue, setDemandValue] = useState(0);
  const [totalFare, setTotalFare] = useState(BASE_FARE);

  // Map + route
  const mapRef = useRef<MapView | null>(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [originMarker, setOriginMarker] = useState<LatLng | null>(null);
  const [destMarker, setDestMarker] = useState<LatLng | null>(null);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);

  // Live tracking
  const [currentCoord, setCurrentCoord] = useState<LatLng | null>(null);
  const [trackCoords, setTrackCoords] = useState<LatLng[]>([]);
  const [carHeading, setCarHeading] = useState(0);     // effective marker heading
  const [cameraHeading, setCameraHeading] = useState(0); // map camera heading
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const prevCoordRef = useRef<LatLng | null>(null);    // <— new: remember last GPS point

  // Compass
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const headingWatchRef = useRef<Location.LocationSubscription | null>(null);

  // Animations
  const distanceAnim = useRef(new Animated.Value(INITIAL_DISTANCE)).current;
  const fareAnim = useRef(new Animated.Value(INITIAL_DISTANCE * FARE_RATE)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const buttonsOpacityAnim = useRef(new Animated.Value(0)).current;

  const tripTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (tripTimer.current) clearInterval(tripTimer.current);
      if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; }
      if (headingWatchRef.current) { headingWatchRef.current.remove(); headingWatchRef.current = null; }
    };
  }, []);

  // Safe setters
  const safeSet = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (updater: React.SetStateAction<T>) => { if (isMountedRef.current) setter(updater); };
  const setTripStateSafe = safeSet(setTripState);
  const setDistanceSafe = safeSet(setDistance);
  const setFareSafe = safeSet(setFare);
  const setTotalFareSafe = safeSet(setTotalFare);
  const setEtaSafe = safeSet(setEta);
  const setSpeedSafe = safeSet(setSpeed);
  const setRouteCoordsSafe = safeSet(setRouteCoords);
  const setOriginMarkerSafe = safeSet(setOriginMarker);
  const setDestMarkerSafe = safeSet(setDestMarker);
  const setIsFetchingRouteSafe = safeSet(setIsFetchingRoute);
  const setCurrentCoordSafe = safeSet(setCurrentCoord);
  const setTrackCoordsSafe = safeSet(setTrackCoords);
  const setCarHeadingSafe = safeSet(setCarHeading);
  const setCameraHeadingSafe = safeSet(setCameraHeading);

  const animateCounters = (newDistance: number, newFare: number) => {
    Animated.parallel([
      Animated.timing(distanceAnim, { toValue: newDistance, duration: 250, useNativeDriver: false }),
      Animated.timing(fareAnim, { toValue: newFare, duration: 250, useNativeDriver: false }),
    ]).start();
  };

  // Call customer
  const handleCallCustomer = async () => {
    if (!orderData.customerPhone) { Alert.alert('Error', 'Customer phone number is not available.'); return; }
    try {
      const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(orderData.customerPhone)) {
        Alert.alert('Invalid Phone Number', 'The customer phone number appears to be invalid.', [
          { text: 'OK' }, { text: 'Show Number', onPress: () => Alert.alert('Customer Phone', orderData.customerPhone) },
        ]); return;
      }
      const phoneUrl = `tel:${orderData.customerPhone}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) await Linking.openURL(phoneUrl);
      else {
        Alert.alert('Call Not Supported', 'Your device does not support making phone calls.', [
          { text: 'OK' }, { text: 'Show Number', onPress: () => Alert.alert('Customer Phone', orderData.customerPhone) },
        ]);
      }
    } catch { Alert.alert('Call Failed', 'Unable to initiate phone call. Please try again.'); }
  };

  // Demand
  const handleDemandSelect = (selectedDemand: number) => { setDemandValue(selectedDemand); setShowDemandModal(false); };

  // Fare recompute
  useEffect(() => {
    const distanceFare = distance * FARE_RATE;
    const total = BASE_FARE + distanceFare + demandValue;
    setTotalFareSafe(total);
    setFareSafe(total);
    animateCounters(distance, total);
  }, [distance, demandValue]);

  // Cancel button + fade-in
  useEffect(() => {
    setShowCancelButton(!!hasCompleteOrderData);
    const id = setTimeout(() => Animated.timing(buttonsOpacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(), 100);
    return () => clearTimeout(id);
  }, [hasCompleteOrderData]);

  // Initial location
  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!isMountedRef.current) return;
        const coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setCurrentCoordSafe(coord);
        setRegion({ latitude: coord.latitude, longitude: coord.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
        prevCoordRef.current = coord; // seed previous coord
      } catch {}
    })();
  }, []);

  // Compass watcher
  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const sub = await Location.watchHeadingAsync(({ trueHeading, magHeading }) => {
          const raw = Number.isFinite(trueHeading) && trueHeading! >= 0 ? trueHeading! : (magHeading ?? 0);
          setCompassHeading((prev) => (prev == null ? raw : smoothAngle(prev, raw)));
        });
        headingWatchRef.current = sub;
      } catch {}
    })();
    return () => { headingWatchRef.current?.remove(); headingWatchRef.current = null; };
  }, []);

  // Use compass when idle/resting or moving slowly (keeps marker rotating with phone)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (compassHeading == null) return;

    const shouldUseCompass =
      statusRef.current !== 'active' || speed < MOVING_SPEED_MPS;

    if (shouldUseCompass) {
      setCarHeadingSafe((prev) => smoothAngle(prev || 0, compassHeading));
      const cam = COURSE_UP ? compassHeading : 0;
      setCameraHeadingSafe(cam);
      if (mapRef.current && currentCoord) {
        try {
          mapRef.current.animateCamera({ center: currentCoord, heading: cam, pitch: 0 }, { duration: 250 });
        } catch {}
      }
    }
  }, [compassHeading, speed, currentCoord]);

  // Fetch planned route
  const fetchRoute = useCallback(async () => {
    if (!hasCompleteOrderData || Platform.OS === 'web') return;
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) return;
    try {
      setIsFetchingRouteSafe(true);
      const originQ = encodeURIComponent(orderData.pickupLocation);
      const destQ = encodeURIComponent(orderData.destination);
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originQ}&destination=${destQ}&mode=driving&key=${apiKey}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();

      const route = data?.routes?.[0];
      const leg = route?.legs?.[0];
      const encoded = route?.overview_polyline?.points;
      if (!route || !encoded) {
        Alert.alert('No route', 'Could not find a route for the given places.');
        setRouteCoordsSafe([]); setOriginMarkerSafe(null); setDestMarkerSafe(null);
        return;
      }

      const pts = polyline.decode(encoded);
      const coords: LatLng[] = Array.isArray(pts)
        ? pts
            .filter((pt): pt is [number, number] => Array.isArray(pt) && pt.length === 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number')
            .map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
        : [];
      setRouteCoordsSafe(coords);

      const km = (leg?.distance?.value ?? 0) / 1000;
      if (km > 0 && statusRef.current === 'idle') setDistanceSafe(km);
      const secs = leg?.duration?.value;
      if (typeof secs === 'number') setEtaSafe(`${Math.round(secs / 60)} min`);

      if (coords.length > 1) { setOriginMarkerSafe(coords[0]); setDestMarkerSafe(coords[coords.length - 1]); }

      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true,
      });
    } catch { if (isMountedRef.current) Alert.alert('Directions error', 'Failed to fetch route.'); }
    finally { setIsFetchingRouteSafe(false); }
  }, [hasCompleteOrderData, orderData.pickupLocation, orderData.destination]);

  useEffect(() => {
    if (hasCompleteOrderData) fetchRoute();
    else { setRouteCoords([]); setOriginMarker(null); setDestMarker(null); }
  }, [hasCompleteOrderData, fetchRoute]);

  // Recenter button
  const centerOnUser = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Location permission required', 'Please enable location to recenter the map.'); return; }
      let loc = await Location.getLastKnownPositionAsync();
      if (!loc || Date.now() - new Date(loc.timestamp).getTime() > 15000) {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      }
      if (!loc) return;

      const point = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCurrentCoordSafe(point);
      prevCoordRef.current = point;

      if (mapRef.current?.animateCamera) {
        mapRef.current.animateCamera(
          { center: point, zoom: 16, heading: COURSE_UP ? cameraHeading : 0, pitch: 0 },
          { duration: 800 }
        );
      } else {
        mapRef.current?.animateToRegion({ ...point, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800);
      }
    } catch { Alert.alert('Location', 'Could not get current location.'); }
  }, [cameraHeading]);

  // GPS tracking (heading now updates even when not moving >5m)
  const startLocationWatch = async () => {
    if (Platform.OS === 'web') return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Location', 'Permission required to track the trip.'); return; }

      watchRef.current?.remove();
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5, mayShowUserSettingsDialog: true },
        (loc) => {
          if (!isMountedRef.current || statusRef.current !== 'active') return;

          const point: LatLng = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          const prevPt = prevCoordRef.current;
          prevCoordRef.current = point;           // update previous point for next callback
          setCurrentCoordSafe(point);             // move the marker immediately

          // --- HEADING: always update (even if movement < 5 m) ---
          const courseHeading = Number.isFinite(loc.coords.heading)
            ? (loc.coords.heading as number)
            : (prevPt ? bearingDeg(prevPt, point) : carHeading);

          const useCompass = !loc.coords.speed || loc.coords.speed < MOVING_SPEED_MPS;
          const rawHeading = useCompass ? (compassHeading ?? courseHeading) : courseHeading;

          // smooth marker heading
          setCarHeadingSafe((prev) => smoothAngle(prev || 0, rawHeading));

          // set camera heading (course-up)
          const camH = COURSE_UP ? norm360(rawHeading) : 0;
          setCameraHeadingSafe(camH);

          try {
            mapRef.current?.animateCamera({ center: point, heading: camH, pitch: 0 }, { duration: 600 });
          } catch {}

          // --- PATH & DISTANCE: only when moved > 5 m ---
          if (prevPt) {
            const movedMeters = haversineKm(prevPt, point) * 1000;
            if (movedMeters >= 5) {
              setTrackCoordsSafe((prev) => (prev.length === 0 ? [point] : [...prev, point]));
              setDistanceSafe((d) => d + movedMeters / 1000);

              const sensorKmh = (loc.coords.speed ?? 0) * 3.6;
              const kmhFromDelta = (movedMeters / 1000) / (2 / 3600); // ~2s interval
              setSpeedSafe(sensorKmh > 0 ? sensorKmh : Math.min(Math.max(kmhFromDelta, 0), 160));
            }
          } else {
            setTrackCoordsSafe((prev) => (prev.length === 0 ? [point] : prev));
          }
        }
      );
    } catch { Alert.alert('Tracking error', 'Failed to start GPS tracking.'); }
  };

  const stopLocationWatch = () => { watchRef.current?.remove(); watchRef.current = null; };

  // Trip flow
  const startTrip = () => {
    setTrackCoords([]); setDistance(0); setSpeed(0);
    setTripStateSafe({ status: 'active', startTime: Date.now(), restStartTime: null, totalRestTime: 0 });
    statusRef.current = 'active';

    Animated.sequence([
      Animated.timing(buttonScaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    startLocationWatch();

    if (tripTimer.current) clearInterval(tripTimer.current);
    tripTimer.current = setInterval(() => {
      if (!isMountedRef.current || statusRef.current !== 'active') return;
      const estimatedMinutes = Math.random() * 30 + 10;
      const etaTime = new Date(Date.now() + estimatedMinutes * 60000);
      setEtaSafe(etaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 5000);
  };

  const toggleRest = () => {
    if (statusRef.current === 'active') {
      setTripStateSafe((prev) => ({ ...prev, status: 'resting', restStartTime: Date.now() }));
      statusRef.current = 'resting';
      stopLocationWatch();
    } else if (statusRef.current === 'resting') {
      const restDuration = Date.now() - (tripState.restStartTime || 0);
      setTripStateSafe((prev) => ({ ...prev, status: 'active', restStartTime: null, totalRestTime: prev.totalRestTime + restDuration }));
      statusRef.current = 'active';
      startLocationWatch();
    }
  };

  const dropOff = () => setShowDropoffDialog(true);

  const handleDropoffConfirm = () => {
    if (tripTimer.current) clearInterval(tripTimer.current);
    stopLocationWatch();
    setTripStateSafe({ status: 'completed', startTime: null, restStartTime: null, totalRestTime: 0 });
    statusRef.current = 'completed';
  };

  const resetTrip = () => {
    if (tripTimer.current) clearInterval(tripTimer.current);
    stopLocationWatch();
    setTripStateSafe({ status: 'idle', startTime: null, restStartTime: null, totalRestTime: 0 });
    statusRef.current = 'idle';
    setSpeed(0); setEta('--:--'); setDemandValue(0); setTrackCoords([]);
  };

  const handleCancelOrder = () => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order? All order data will be cleared.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: () => {
          if (tripTimer.current) clearInterval(tripTimer.current);
          stopLocationWatch();
          setTripStateSafe({ status: 'idle', startTime: null, restStartTime: null, totalRestTime: 0 });
          statusRef.current = 'idle';
          setDistance(INITIAL_DISTANCE);
          setDemandValue(0);
          setTrackCoords([]);
          setRouteCoords([]);
          setOriginMarker(null);
          setDestMarker(null);
          setEta('--:--');
          setShowCancelButton(false);
          router.replace('/(tabs)/');
        },
      },
    ]);
  };

  const tripDetails = {
    distance,
    duration: tripState.startTime ? `${Math.round((Date.now() - tripState.startTime) / 60000)} minutes` : '0 minutes',
    speed,
    totalCost: Math.round(fare),
    startTime: tripState.startTime ? new Date(tripState.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
    endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    pickupLocation: hasCompleteOrderData ? orderData.pickupLocation : 'Current Location',
    dropoffLocation: hasCompleteOrderData ? orderData.destination : 'Destination',
    customerName: hasCompleteOrderData ? orderData.customerName : undefined,
    customerPhone: hasCompleteOrderData ? orderData.customerPhone : undefined,
    orderId: hasCompleteOrderData ? orderData.orderId : undefined,
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={14} color={i < Math.floor(rating) ? '#F59E0B' : '#E5E7EB'} fill={i < Math.floor(rating) ? '#F59E0B' : '#E5E7EB'} />
    ));

  // On-screen rotation for the image:
  const carImageRotation = norm360(
    (COURSE_UP ? carHeading - cameraHeading : carHeading) + CAR_MARKER_HEADING_OFFSET
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (statusRef.current === 'active' || statusRef.current === 'resting') {
                Alert.alert('Trip in Progress', 'You have an active trip. Are you sure you want to go back?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Yes', onPress: () => router.back() },
                ]);
              } else { router.back(); }
            }}
          >
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>

          <View style={styles.customerHeader}>
            {hasCompleteOrderData ? (
              <>
                <View style={styles.customerInfo}>
                  <View style={styles.customerNameRow}>
                    <Text style={styles.customerName}>{orderData.customerName}</Text>
                    <View style={styles.ratingContainer}>
                      <View style={styles.stars}>{renderStars(orderData.customerRating)}</View>
                      <Text style={styles.ratingText}>{orderData.customerRating}</Text>
                    </View>
                  </View>
                  <Text style={styles.customerPhone}>{orderData.customerPhone}</Text>
                  <Text style={styles.orderInfo}>Order #{orderData.orderId}</Text>
                </View>
                <TouchableOpacity style={styles.callButton} onPress={handleCallCustomer}>
                  <Phone size={20} color="white" />
                  <Text style={styles.callButtonText}>Call</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>Navigation</Text>
                <Text style={styles.customerPhone}>No active order</Text>
              </View>
            )}
          </View>
        </View>

        {/* Order Summary */}
        {hasCompleteOrderData && (
          <View style={styles.orderSummaryCard}>
            <View style={styles.routeInfo}>
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.routeText} numberOfLines={1}>{orderData.pickupLocation}</Text>
              </View>
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.routeText} numberOfLines={1}>{orderData.destination}</Text>
              </View>
            </View>
            <View style={styles.orderMetrics}>
              <Text style={styles.metricText}>
                {tripState.status === 'active' || tripState.status === 'completed'
                  ? `${distance.toFixed(2)} km`
                  : orderData.distance || `${distance.toFixed(1)} km`}
              </Text>
              <Text style={styles.metricText}>{orderData.estimatedDuration || eta}</Text>
              <Text style={[styles.metricText, styles.fareText]}>
                {orderData.fareAmount?.toLocaleString() || Math.round(fare).toLocaleString()} MMK
              </Text>
            </View>
          </View>
        )}

        {/* Map */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <View style={styles.mapPlaceholder}>
              <MapPin size={48} color="#6B7280" />
              <Text style={styles.placeholderTitle}>Navigation Map</Text>
              <Text style={styles.placeholderText}>
                Interactive maps are not available on web platform.{'\n'}Use the mobile app for full navigation features.
              </Text>
            </View>
          ) : (
            <MapView
              ref={(r) => { mapRef.current = r; }}
              provider={PROVIDER_GOOGLE}
              style={{ flex: 1, margin: 16, borderRadius: 12 }}
              initialRegion={region}
              showsUserLocation={false}
              loadingEnabled
              onMapLoaded={() => {
                try {
                  if (routeCoords.length && mapRef.current) {
                    mapRef.current.fitToCoordinates(routeCoords, { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true });
                  } else if (currentCoord && mapRef.current) {
                   mapRef.current.animateCamera({ center: currentCoord }, { duration: 600 });
                  }
                } catch {}
              }}
            >
              {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="#3B82F6" />}
              {trackCoords.length > 1 && <Polyline coordinates={trackCoords} strokeWidth={5} strokeColor="#10B981" />}

              {currentCoord && (
                <Marker coordinate={currentCoord} anchor={{ x: 0.5, y: 0.5 }} flat>
                  <Image
                    source={carIcon}
                    style={{ width: CAR_MARKER_SIZE, height: CAR_MARKER_SIZE, transform: [{ rotate: `${carImageRotation}deg` }] }}
                    resizeMode="contain"
                  />
                </Marker>
              )}

              {originMarker && <Marker coordinate={originMarker} title="Pickup" />}
              {destMarker && <Marker coordinate={destMarker} title="Destination" />}
            </MapView>
          )}

          {/* Recenter */}
          {Platform.OS !== 'web' && (
            <TouchableOpacity
              onPress={centerOnUser}
              activeOpacity={0.9}
              style={[styles.locateBtn, { bottom: 28 + insets.bottom }]}
              accessibilityRole="button"
              accessibilityLabel="Recenter map on my location"
            >
              <LocateFixed size={22} color="#111827" />
            </TouchableOpacity>
          )}

          {/* Status */}
          <View className="status" style={styles.statusOverlay}>
            <View style={[
              styles.statusBadge,
              tripState.status === 'active' && styles.activeBadge,
              tripState.status === 'resting' && styles.restingBadge,
              tripState.status === 'completed' && styles.completedBadge,
            ]}>
              <Text style={styles.statusText}>
                {tripState.status === 'idle' && (isFetchingRoute ? 'Loading Route…' : 'Ready to Start')}
                {tripState.status === 'active' && 'Trip Active'}
                {tripState.status === 'resting' && 'Resting'}
                {tripState.status === 'completed' && 'Completed'}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Panel */}
        <Animated.View style={[styles.infoPanel, { paddingBottom: Math.max(20, insets.bottom + 10), opacity: buttonsOpacityAnim }]}>
          <View style={styles.countersContainer}>
            <View style={styles.counterItem}>
              <NavigationIcon size={20} color="#6B7280" />
              <Animated.Text style={styles.counterValue}>
                {distance.toFixed(tripState.status === 'active' || tripState.status === 'completed' ? 2 : 1)}
              </Animated.Text>
              <Text style={styles.counterLabel}>km</Text>
            </View>
            <View style={styles.counterItem}>
              <DollarSign size={20} color="#10B981" />
              <Animated.Text style={styles.counterValue}>{fare.toFixed(0)}</Animated.Text>
              <Text style={styles.counterLabel}>MMK</Text>
            </View>
            <View style={styles.counterItem}>
              <Zap size={20} color="#8B5CF6" />
              <Text style={styles.counterValue}>{Math.round(speed)}</Text>
              <Text style={styles.counterLabel}>km/h</Text>
            </View>
            <View style={styles.counterItem}>
              <TouchableOpacity style={styles.demandButton} onPress={() => setShowDemandModal(true)}>
                <Text style={styles.demandButtonText}>Demand</Text>
                {demandValue > 0 && <Text style={styles.demandValue}>+{demandValue}</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controlsContainer}>
            {tripState.status === 'idle' && (
              <View style={styles.idleControls}>
                <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={startTrip}
                    disabled={(isFetchingRoute && hasCompleteOrderData) || Platform.OS === 'web'}
                  >
                    <Play size={24} color="white" />
                    <Text style={styles.startButtonText}>{isFetchingRoute ? 'Loading Route…' : 'Start Trip'}</Text>
                  </TouchableOpacity>
                </Animated.View>

                {showCancelButton && (
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
                    <X size={20} color="#EF4444" />
                    <Text style={styles.cancelButtonText}>Cancel Order</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {(tripState.status === 'active' || tripState.status === 'resting') && (
              <View style={styles.activeControls}>
                <TouchableOpacity
                  style={[styles.controlButton, styles.restButton, tripState.status === 'resting' && styles.continueButton]}
                  onPress={toggleRest}
                >
                  {tripState.status === 'resting' ? (
                    <>
                      <Play size={20} color="white" />
                      <Text style={styles.controlButtonText}>Continue</Text>
                    </>
                  ) : (
                    <>
                      <Pause size={20} color="white" />
                      <Text style={styles.controlButtonText}>Rest</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.controlButton, styles.dropOffButton]} onPress={dropOff}>
                  <Square size={20} color="white" />
                  <Text style={styles.controlButtonText}>Drop Off</Text>
                </TouchableOpacity>
              </View>
            )}

            {tripState.status === 'completed' && (
              <View style={styles.completedControls}>
                <TouchableOpacity style={styles.resetButton} onPress={resetTrip}>
                  <NavigationIcon size={20} color="white" />
                  <Text style={styles.resetButtonText}>New Trip</Text>
                </TouchableOpacity>

                {showCancelButton && (
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
                    <X size={20} color="#EF4444" />
                    <Text style={styles.cancelButtonText}>Cancel Order</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Modals */}
      <DropoffDialog visible={showDropoffDialog} onClose={() => setShowDropoffDialog(false)} onConfirm={handleDropoffConfirm} tripDetails={tripDetails} />
      <DemandModal visible={showDemandModal} onClose={() => setShowDemandModal(false)} onSelect={setDemandValue} currentDemand={demandValue} baseFare={BASE_FARE} currentDistance={distance} fareRate={FARE_RATE} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContainer: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  headerContainer: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: {
    position: 'absolute', top: 16, left: 16, width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  customerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 70, paddingVertical: 16 },
  customerInfo: { flex: 1 },
  customerNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  customerName: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  stars: { flexDirection: 'row', marginRight: 4 },
  ratingText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  customerPhone: { fontSize: 14, color: '#6B7280', marginBottom: 2 },
  orderInfo: { fontSize: 12, color: '#9CA3AF' },

  callButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 6 },
  callButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },

  orderSummaryCard: {
    backgroundColor: 'white', marginHorizontal: 16, marginVertical: 8, borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  routeInfo: { marginBottom: 12 },
  routePoint: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  routeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  routeText: { fontSize: 14, color: '#374151', flex: 1 },
  orderMetrics: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  metricText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  fareText: { color: '#10B981', fontWeight: '600' },

  mapContainer: { height: height * 0.45, position: 'relative' },
  mapPlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6', margin: 16, borderRadius: 12,
    borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
  },
  placeholderTitle: { fontSize: 24, fontWeight: 'bold', color: '#374151', marginTop: 16, marginBottom: 8 },
  placeholderText: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24, paddingHorizontal: 32 },

  statusOverlay: { position: 'absolute', top: 16, left: 16, right: 16, alignItems: 'center' },
  statusBadge: {
    backgroundColor: '#6B7280', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  activeBadge: { backgroundColor: '#10B981' },
  restingBadge: { backgroundColor: '#F59E0B' },
  completedBadge: { backgroundColor: '#3B82F6' },
  statusText: { color: 'white', fontSize: 14, fontWeight: '600' },

  locateBtn: {
    position: 'absolute', right: 28, width: 48, height: 48, borderRadius: 24, backgroundColor: 'white',
    alignItems: 'center', justifyContent: 'center', zIndex: 10, elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6,
  },

  infoPanel: {
    flex: 1, backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100,
  },
  countersContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  counterItem: { alignItems: 'center', flex: 1 },
  counterValue: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginVertical: 4 },
  counterLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  controlsContainer: { paddingBottom: 20 },
  idleControls: { gap: 12 },
  completedControls: { gap: 12 },

  startButton: {
    backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 16, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  startButtonText: { color: 'white', fontSize: 18, fontWeight: '600', marginLeft: 8 },

  cancelButton: {
    backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: '#EF4444',
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, gap: 6,
  },
  cancelButtonText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },

  activeControls: { flexDirection: 'row', gap: 12 },
  controlButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  restButton: { backgroundColor: '#F59E0B' },
  continueButton: { backgroundColor: '#10B981' },
  dropOffButton: { backgroundColor: '#EF4444' },
  controlButtonText: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 6 },

  resetButton: {
    backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 16, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  resetButtonText: { color: 'white', fontSize: 18, fontWeight: '600', marginLeft: 8 },

  demandButton: {
    backgroundColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', minWidth: 80, shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  demandButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },
  demandValue: { color: '#FEF3C7', fontSize: 12, fontWeight: '700', marginTop: 2 },
});
