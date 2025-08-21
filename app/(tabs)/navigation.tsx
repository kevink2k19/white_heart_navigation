import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  BackHandler,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Navigation as NavigationIcon,
  Play,
  Pause,
  Square,
  MapPin,
  Clock,
  DollarSign,
  Zap,
  Phone,
  ArrowLeft,
  Star,
  Users,
  X,
} from 'lucide-react-native';
import { Linking } from 'react-native';
import DropoffDialog from '@/components/DropoffDialog';
import GroupMessageSender from '@/components/GroupMessageSender';

const { width, height } = Dimensions.get('window');

interface OrderData {
  orderId: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  destination: string;
  fareAmount: number;
  distance: string;
  estimatedDuration: string;
  customerRating: number;
}

interface TripState {
  status: 'idle' | 'active' | 'resting' | 'completed';
  startTime: number | null;
  restStartTime: number | null;
  totalRestTime: number;
}

interface LocationCoords {
  latitude: number;
  longitude: number;
}

const FARE_RATE = 600; // MMK per km
const INITIAL_DISTANCE = 0.1; // Starting distance in km

export default function NavigationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Extract order details from navigation params (optional - may be empty)
  const orderData: OrderData = {
    orderId: params.orderId as string || '',
    customerName: params.customerName as string || '',
    customerPhone: params.customerPhone as string || '',
    pickupLocation: params.pickupLocation as string || '',
    destination: params.destination as string || '',
    fareAmount: params.fareAmount ? parseInt(params.fareAmount as string) : 0,
    distance: params.distance as string || '',
    estimatedDuration: params.estimatedDuration as string || '',
    customerRating: params.customerRating ? parseFloat(params.customerRating as string) : 0,
  };

  // Check if we have complete order data
  const hasCompleteOrderData = orderData.orderId && orderData.customerName && 
    orderData.customerPhone && orderData.pickupLocation && orderData.destination;

  // Enhanced phone call handler with comprehensive error handling
  const handleCallCustomer = async () => {
    if (!orderData.customerPhone) {
      Alert.alert(
        'Error',
        'Customer phone number is not available.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    try {
      // Validate phone number format
      const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(orderData.customerPhone)) {
        Alert.alert(
          'Invalid Phone Number',
          'The customer phone number appears to be invalid.',
          [
            { text: 'OK' },
            { 
              text: 'Show Number', 
              onPress: () => Alert.alert('Customer Phone', orderData.customerPhone)
            }
          ]
        );
        return;
      }

      const phoneUrl = `tel:${orderData.customerPhone}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      
      if (canOpen) {
        await Linking.openURL(phoneUrl);
        console.log('Phone call initiated successfully');
      } else {
        Alert.alert(
          'Call Not Supported',
          'Your device does not support making phone calls.',
          [
            { text: 'OK' },
            { 
              text: 'Show Number', 
              onPress: () => Alert.alert('Customer Phone', orderData.customerPhone)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Phone call failed:', error);
      Alert.alert(
        'Call Failed',
        'Unable to initiate phone call. Please try again.',
        [
          { text: 'Cancel' },
          { text: 'Retry', onPress: handleCallCustomer },
          { 
            text: 'Show Number', 
            onPress: () => Alert.alert('Customer Phone', orderData.customerPhone)
          }
        ]
      );
    }
  };

  const [tripState, setTripState] = useState<TripState>({
    status: 'idle',
    startTime: null,
    restStartTime: null,
    totalRestTime: 0,
  });

  // Handle hardware back button on Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tripState.status === 'active' || tripState.status === 'resting') {
        Alert.alert(
          'Trip in Progress',
          'You have an active trip. Are you sure you want to go back?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Yes', onPress: () => router.back() },
          ]
        );
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [tripState.status, router]);

  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [destination, setDestination] = useState<LocationCoords>({
    latitude: 16.8661, // Yangon International Airport
    longitude: 96.1951,
  });
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const [distance, setDistance] = useState(INITIAL_DISTANCE);
  const [fare, setFare] = useState(INITIAL_DISTANCE * FARE_RATE);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState('--:--');
  const [showDropoffDialog, setShowDropoffDialog] = useState(false);
  const [showGroupSender, setShowGroupSender] = useState(false);

  // Animation values
  const distanceAnim = useRef(new Animated.Value(INITIAL_DISTANCE)).current;
  const fareAnim = useRef(new Animated.Value(INITIAL_DISTANCE * FARE_RATE)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const mapOpacityAnim = useRef(new Animated.Value(0)).current;
  const buttonsOpacityAnim = useRef(new Animated.Value(0)).current;

  // Timers
  const tripTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    // Initialize with default location and cancel button state
    const defaultLocation = {
      latitude: 16.8409, // Yangon city center
      longitude: 96.1735,
    };
    setCurrentLocation(defaultLocation);
    
    // Request location permission in background
    requestLocationPermissionAsync();
    
    // Animate buttons in after component mount
    setTimeout(() => {
      Animated.timing(buttonsOpacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 100);
    
    return () => {
      if (tripTimer.current) clearInterval(tripTimer.current);
      if (locationWatcher.current) locationWatcher.current.remove();
    };
  }, []);

  const requestLocationPermissionAsync = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermissionGranted(false);
        // Show a non-blocking notification instead of blocking alert
        console.log('Location permission not granted, using default location');
        return;
      }

      setLocationPermissionGranted(true);
      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Start watching location changes
      locationWatcher.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 10,
        },
        (location) => {
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          setSpeed(location.coords.speed || 0);
        }
      );
    } catch (error) {
      console.log('Location error:', error);
      setLocationPermissionGranted(false);
      // Continue with default location
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={14}
        color={index < Math.floor(rating) ? '#F59E0B' : '#E5E7EB'}
        fill={index < Math.floor(rating) ? '#F59E0B' : '#E5E7EB'}
      />
    ));
  };

  const animateCounters = (newDistance: number, newFare: number) => {
    Animated.parallel([
      Animated.timing(distanceAnim, {
        toValue: newDistance,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(fareAnim, {
        toValue: newFare,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start();
  };


  const startTrip = () => {
    setTripState({
      status: 'active',
      startTime: Date.now(),
      restStartTime: null,
      totalRestTime: 0,
    });

    // Animate button press
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Start trip simulation
    startTripSimulation();
  };

  const startTripSimulation = () => {
    let currentDistance = INITIAL_DISTANCE;
    
    tripTimer.current = setInterval(() => {
      if (tripState.status === 'active') {
        // Simulate distance increment (0.05-0.15 km per update)
        const increment = Math.random() * 0.1 + 0.05;
        currentDistance += increment;
        const newFare = currentDistance * FARE_RATE;

        setDistance(currentDistance);
        setFare(newFare);
        animateCounters(currentDistance, newFare);

        // Calculate ETA (assuming average speed of 30 km/h)
        const remainingDistance = calculateDistance(currentLocation!, destination);
        const estimatedMinutes = (remainingDistance / 30) * 60;
        const etaTime = new Date(Date.now() + estimatedMinutes * 60000);
        setEta(etaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    }, 3000); // Update every 3 seconds
  };

  const toggleRest = () => {
    if (tripState.status === 'active') {
      setTripState(prev => ({
        ...prev,
        status: 'resting',
        restStartTime: Date.now(),
      }));
    } else if (tripState.status === 'resting') {
      const restDuration = Date.now() - (tripState.restStartTime || 0);
      setTripState(prev => ({
        ...prev,
        status: 'active',
        restStartTime: null,
        totalRestTime: prev.totalRestTime + restDuration,
      }));
    }
  };

  const dropOff = () => {
    setShowDropoffDialog(true);
  };

  const handleSendToGroups = () => {
    setShowGroupSender(true);
  };

  const handleGroupSendComplete = (sentGroups: any[]) => {
    Alert.alert(
      'Order Shared',
      `Order successfully shared with ${sentGroups.length} group${sentGroups.length > 1 ? 's' : ''}.`,
      [{ text: 'OK' }]
    );
  };

  const handleDropoffConfirm = () => {
    if (tripTimer.current) clearInterval(tripTimer.current);
    setTripState({
      status: 'completed',
      startTime: null,
      restStartTime: null,
      totalRestTime: 0,
    });
  };

  const resetTrip = () => {
    if (tripTimer.current) clearInterval(tripTimer.current);
    setTripState({
      status: 'idle',
      startTime: null,
      restStartTime: null,
      totalRestTime: 0,
    });
    setDistance(INITIAL_DISTANCE);
    setFare(INITIAL_DISTANCE * FARE_RATE);
    distanceAnim.setValue(INITIAL_DISTANCE);
    fareAnim.setValue(INITIAL_DISTANCE * FARE_RATE);
    setEta('--:--');
  };

  const handleCancelActiveOrder = () => {
    Alert.alert(
      'Cancel Active Order',
      'Are you sure you want to cancel this active order? This will clear all order data and return you to the orders list.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel Order',
          style: 'destructive',
          onPress: () => {
            // Clear all timers
            if (tripTimer.current) clearInterval(tripTimer.current);
            
            // Reset trip state
            setTripState({
              status: 'idle',
              startTime: null,
              restStartTime: null,
              totalRestTime: 0,
            });
            
            // Reset counters
            setDistance(INITIAL_DISTANCE);
            setFare(INITIAL_DISTANCE * FARE_RATE);
            distanceAnim.setValue(INITIAL_DISTANCE);
            fareAnim.setValue(INITIAL_DISTANCE * FARE_RATE);
            setEta('--:--');
            
            // Clear all order data by navigating to navigation without params
            router.replace('/(tabs)/navigation');
          },
        },
      ]
    );
  };
  const calculateDistance = (point1: LocationCoords, point2: LocationCoords): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleMapReady = () => {
    setMapReady(true);
    Animated.timing(mapOpacityAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const getRouteCoordinates = (): LocationCoords[] => {
    if (!currentLocation) return [];
    
    // Simple route simulation (in real app, use Google Directions API)
    return [
      currentLocation,
      {
        latitude: (currentLocation.latitude + destination.latitude) / 2,
        longitude: (currentLocation.longitude + destination.longitude) / 2,
      },
      destination,
    ];
  }



  const tripDetails = {
    distance,
    duration: tripState.startTime 
      ? `${Math.round((Date.now() - tripState.startTime) / 60000)} minutes`
      : '0 minutes',
    speed,
    totalCost: Math.round(fare),
    startTime: tripState.startTime 
      ? new Date(tripState.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '--:--',
    endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    pickupLocation: hasCompleteOrderData ? orderData.pickupLocation : 'Current Location',
    dropoffLocation: hasCompleteOrderData ? orderData.destination : 'Destination',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Enhanced Customer Info Header - Only show if we have complete order data */}
        {hasCompleteOrderData ? (
          <View style={styles.headerContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                if (tripState.status === 'active' || tripState.status === 'resting') {
                  Alert.alert(
                    'Trip in Progress',
                    'You have an active trip. Are you sure you want to go back?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Yes', onPress: () => router.back() },
                    ]
                  );
                } else {
                  router.back();
                }
              }}
            >
              <ArrowLeft size={24} color="#1F2937" />
            </TouchableOpacity>
            
            <View style={styles.customerHeader}>
              <View style={styles.customerInfo}>
                <View style={styles.customerNameRow}>
                  <Text style={styles.customerName}>{orderData.customerName}</Text>
                  <View style={styles.ratingContainer}>
                    <View style={styles.stars}>
                      {renderStars(orderData.customerRating)}
                    </View>
                    <Text style={styles.ratingText}>{orderData.customerRating}</Text>
                  </View>
                </View>
                <Text style={styles.customerPhone}>{orderData.customerPhone}</Text>
                <Text style={styles.orderInfo}>Order #{orderData.orderId}</Text>
              </View>
              <TouchableOpacity 
                style={styles.callButton}
                onPress={handleCallCustomer}
              >
                <Phone size={20} color="white" />
                <Text style={styles.callButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.headerContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color="#1F2937" />
            </TouchableOpacity>
            
            <View style={styles.customerHeader}>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>Navigation</Text>
                <Text style={styles.customerPhone}>No active order</Text>
              </View>
            </View>
          </View>
        )}

        {/* Order Summary Card - Only show if we have complete order data */}
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
              <Text style={styles.metricText}>{orderData.distance}</Text>
              <Text style={styles.metricText}>{orderData.estimatedDuration}</Text>
              <Text style={[styles.metricText, styles.fareText]}>{orderData.fareAmount.toLocaleString()} MMK</Text>
            </View>
          </View>
        )}

        {/* No Order State - Show when no order data is available */}
        {!hasCompleteOrderData && (
          <View style={styles.noOrderCard}>
          
            <Text style={styles.noOrderTitle}>White Heart Kilo Taxi</Text>
          </View>
        )}

        {/* Map Container */}
        <Animated.View style={[styles.mapContainer, { opacity: mapOpacityAnim }]}>
          {currentLocation && (
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              showsUserLocation={locationPermissionGranted}
              showsMyLocationButton={false}
              showsTraffic={true}
              onMapReady={handleMapReady}
              loadingEnabled={true}
              loadingIndicatorColor="#3B82F6"
              loadingBackgroundColor="#F9FAFB"
            >
              {/* Current Location Marker */}
              <Marker
                coordinate={currentLocation}
                title="Current Location"
                pinColor="#3B82F6"
              />
              
              {/* Destination Marker */}
              <Marker
                coordinate={destination}
                title="Destination"
                pinColor="#EF4444"
              />

              {/* Route Polyline */}
              {tripState.status !== 'idle' && (
                <Polyline
                  coordinates={getRouteCoordinates()}
                  strokeColor="#3B82F6"
                  strokeWidth={4}
                />
              )}
            </MapView>
          )}

          {/* Trip Status Overlay */}
          <View style={styles.statusOverlay}>
            <View style={[
              styles.statusBadge,
              tripState.status === 'active' && styles.activeBadge,
              tripState.status === 'resting' && styles.restingBadge,
              tripState.status === 'completed' && styles.completedBadge,
            ]}>
              <Text style={styles.statusText}>
                {tripState.status === 'idle' && 'Ready to Start'}
                {tripState.status === 'active' && 'Trip Active'}
                {tripState.status === 'resting' && 'Resting'}
                {tripState.status === 'completed' && 'Completed'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Trip Information Panel */}
        <Animated.View style={[
          styles.infoPanel, 
          { 
            paddingBottom: Math.max(20, insets.bottom + 10),
            opacity: buttonsOpacityAnim 
          }
        ]}>
          <View style={styles.countersContainer}>
            <View style={styles.counterItem}>
              <NavigationIcon size={20} color="#6B7280" />
              <Animated.Text style={styles.counterValue}>
                {distanceAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0.0', '100.0'],
                  extrapolate: 'clamp',
                })}
              </Animated.Text>
              <Text style={styles.counterLabel}>km</Text>
            </View>

            <View style={styles.counterItem}>
              <DollarSign size={20} color="#10B981" />
              <Animated.Text style={styles.counterValue}>
                {fareAnim.interpolate({
                  inputRange: [0, 60000],
                  outputRange: ['0', '60000'],
                  extrapolate: 'clamp',
                })}
              </Animated.Text>
              <Text style={styles.counterLabel}>MMK</Text>
            </View>

            <View style={styles.counterItem}>
              <Clock size={20} color="#F59E0B" />
              <Text style={styles.counterValue}>{eta}</Text>
              <Text style={styles.counterLabel}>ETA</Text>
            </View>

            <View style={styles.counterItem}>
              <Zap size={20} color="#8B5CF6" />
              <Text style={styles.counterValue}>{Math.round(speed * 3.6)}</Text>
              <Text style={styles.counterLabel}>km/h</Text>
            </View>
          </View>

          {/* Control Buttons */}
          <View style={styles.controlsContainer}>
            {tripState.status === 'idle' && (
              <View style={styles.idleControls}>
                <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
                  <TouchableOpacity style={styles.startButton} onPress={startTrip}>
                    <Play size={24} color="white" />
                    <Text style={styles.startButtonText}>Start Trip</Text>
                  </TouchableOpacity>
                </Animated.View>
                
                {/* Order Cancel Button - Show when there's an active order */}
                {hasCompleteOrderData && (
                  <TouchableOpacity style={styles.orderCancelButton} onPress={handleCancelActiveOrder}>
                    <X size={20} color="#EF4444" />
                    <Text style={styles.orderCancelButtonText}>Order Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {(tripState.status === 'active' || tripState.status === 'resting') && (
              <View style={styles.activeControls}>
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    styles.restButton,
                    tripState.status === 'resting' && styles.continueButton,
                  ]}
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

                <TouchableOpacity
                  style={[styles.controlButton, styles.dropOffButton]}
                  onPress={dropOff}
                >
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
                
                {/* Order Cancel Button - Show after trip completion if order data exists */}
                {hasCompleteOrderData && (
                  <TouchableOpacity style={styles.orderCancelButton} onPress={handleCancelActiveOrder}>
                    <X size={20} color="#EF4444" />
                    <Text style={styles.orderCancelButtonText}>Order Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Custom Drop-off Dialog */}
      <DropoffDialog
        visible={showDropoffDialog}
        onClose={() => setShowDropoffDialog(false)}
        onConfirm={handleDropoffConfirm}
        tripDetails={tripDetails}
      />

      {/* Group Message Sender */}
      <GroupMessageSender
        visible={showGroupSender}
        onClose={() => setShowGroupSender(false)}
        orderData={{
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          pickupLocation: orderData.pickupLocation,
          destination: orderData.destination,
          fareAmount: orderData.fareAmount,
          distance: orderData.distance,
          estimatedDuration: orderData.estimatedDuration,
          customerRating: orderData.customerRating,
          specialInstructions: '',
          orderId: orderData.orderId,
        }}
        onSendComplete={handleGroupSendComplete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 70,
    paddingVertical: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginRight: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  customerPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  orderInfo: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  callButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  orderSummaryCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  routeInfo: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  routeText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  orderMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metricText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  fareText: {
    color: '#10B981',
    fontWeight: '600',
  },
  noOrderCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noOrderIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noOrderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  noOrderText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  goToOrdersButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goToOrdersButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    height: height * 0.35,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  statusOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  activeBadge: {
    backgroundColor: '#10B981',
  },
  restingBadge: {
    backgroundColor: '#F59E0B',
  },
  completedBadge: {
    backgroundColor: '#3B82F6',
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  infoPanel: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  countersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  counterItem: {
    alignItems: 'center',
    flex: 1,
  },
  counterValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginVertical: 4,
  },
  counterLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  controlsContainer: {
    paddingBottom: 20,
  },
  idleControls: {
    gap: 12,
  },
  completedControls: {
    gap: 12,
  },
  startButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  orderCancelButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 6,
  },
  orderCancelButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  activeControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  controlButton: {
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  restButton: {
    backgroundColor: '#F59E0B',
  },
  continueButton: {
    backgroundColor: '#10B981',
  },
  dropOffButton: {
    backgroundColor: '#EF4444',
  },
  sendToGroupButton: {
    backgroundColor: '#8B5CF6',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  resetButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});