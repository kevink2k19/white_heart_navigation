import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Clock, DollarSign, Users, X, Check, Star, Navigation } from 'lucide-react-native';

interface PassengerOrder {
  id: string;
  passengerName: string;
  passengerRating: number;
  pickupLocation: string;
  destination: string;
  timestamp: string;
  fareAmount: number;
  distance: string;
  estimatedDuration: string;
  status: 'pending' | 'accepted' | 'declined' | 'sent_to_group';
  createdAt: number;
  visibilityState: 'admin' | 'moderator' | 'driver';
  remainingTime: number;
}

const mockOrderTemplates = [
  {
    passengerName: 'Aung Kyaw',
    passengerRating: 4.8,
    pickupLocation: 'Shwedagon Pagoda, Yangon',
    destination: 'Yangon International Airport',
    fareAmount: 15000,
    distance: '18.5 km',
    estimatedDuration: '35 min',
  },
  {
    passengerName: 'Ma Thida',
    passengerRating: 4.6,
    pickupLocation: 'Junction City Shopping Center',
    destination: 'University of Yangon',
    fareAmount: 8500,
    distance: '12.3 km',
    estimatedDuration: '25 min',
  },
  {
    passengerName: 'Ko Min Thu',
    passengerRating: 4.9,
    pickupLocation: 'Bogyoke Market',
    destination: 'Kandawgyi Lake',
    fareAmount: 6500,
    distance: '8.2 km',
    estimatedDuration: '18 min',
  },
  {
    passengerName: 'Daw Khin',
    passengerRating: 4.7,
    pickupLocation: 'Myanmar Plaza',
    destination: 'Inya Lake Hotel',
    fareAmount: 12000,
    distance: '15.1 km',
    estimatedDuration: '28 min',
  },
  {
    passengerName: 'Ko Zaw',
    passengerRating: 4.5,
    pickupLocation: 'Sule Pagoda',
    destination: 'Mandalay Hill',
    fareAmount: 25000,
    distance: '28.3 km',
    estimatedDuration: '45 min',
  },
  {
    passengerName: 'Ma Aye',
    passengerRating: 4.9,
    pickupLocation: 'Inle Lake Resort',
    destination: 'Heho Airport',
    fareAmount: 18000,
    distance: '22.1 km',
    estimatedDuration: '38 min',
  },
];

export default function OrdersScreen() {
  const [orders, setOrders] = useState<PassengerOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    visible: boolean;
    orderId: string;
    action: 'accept' | 'decline' | 'send_to_group';
    orderDetails?: PassengerOrder;
  }>({
    visible: false,
    orderId: '',
    action: 'accept',
  });

  const orderIdCounter = useRef(1);
  const orderGenerationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Generate random order intervals (15-45 seconds)
  const getRandomInterval = () => Math.floor(Math.random() * 30000) + 15000;

  const generateNewOrder = () => {
    const template = mockOrderTemplates[Math.floor(Math.random() * mockOrderTemplates.length)];
    const now = Date.now();
    
    const newOrder: PassengerOrder = {
      id: `order_${orderIdCounter.current++}`,
      ...template,
      timestamp: 'Just now',
      status: 'pending',
      createdAt: now,
      visibilityState: 'admin',
      remainingTime: 10,
    };

    setOrders(prevOrders => [newOrder, ...prevOrders]);
    startVisibilityTimer(newOrder.id);
  };

  const startVisibilityTimer = (orderId: string) => {
    let adminTimeLeft = 10;
    let moderatorTimeLeft = 10;
    let currentPhase: 'admin' | 'moderator' = 'admin';
    
    const timer = setInterval(() => {
      if (currentPhase === 'admin') {
        adminTimeLeft--;
      } else if (currentPhase === 'moderator') {
        moderatorTimeLeft--;
      }
      
      setOrders(prevOrders => 
        prevOrders.map(order => {
          if (order.id === orderId) {
            if (order.visibilityState === 'admin' && adminTimeLeft <= 0) {
              currentPhase = 'moderator';
              moderatorTimeLeft = 10; // Reset moderator timer
              return {
                ...order,
                visibilityState: 'moderator',
                remainingTime: moderatorTimeLeft,
              };
            } else if (order.visibilityState === 'moderator' && moderatorTimeLeft <= 0) {
              return {
                ...order,
                visibilityState: 'driver',
                remainingTime: 0,
              };
            } else {
              return {
                ...order,
                remainingTime: Math.max(0, currentPhase === 'admin' ? adminTimeLeft : moderatorTimeLeft),
              };
            }
          }
          return order;
        })
      );

      if ((currentPhase === 'admin' && adminTimeLeft <= 0) || (currentPhase === 'moderator' && moderatorTimeLeft <= 0)) {
        setOrders(prevOrders => {
          const order = prevOrders.find(o => o.id === orderId);
          if (order?.visibilityState === 'driver') {
            clearInterval(timer);
            visibilityTimers.current.delete(orderId);
          }
          return prevOrders;
        });
      }
    }, 1000);

    visibilityTimers.current.set(orderId, timer);
  };

  const scheduleNextOrder = () => {
    const interval = getRandomInterval();
    orderGenerationTimer.current = setTimeout(() => {
      generateNewOrder();
      scheduleNextOrder();
    }, interval);
  };

  useEffect(() => {
    // Generate initial order immediately
    generateNewOrder();
    
    // Schedule subsequent orders
    scheduleNextOrder();

    return () => {
      if (orderGenerationTimer.current) {
        clearTimeout(orderGenerationTimer.current);
      }
      visibilityTimers.current.forEach(timer => clearInterval(timer));
      visibilityTimers.current.clear();
    };
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const getVisibilityColor = (state: string) => {
    switch (state) {
      case 'admin':
        return '#EF4444'; // Red
      case 'moderator':
        return '#F59E0B'; // Orange
      case 'driver':
        return '#10B981'; // Green
      default:
        return '#6B7280';
    }
  };

  const getVisibilityLabel = (state: string, remainingTime: number) => {
    switch (state) {
      case 'admin':
        return `Admin (${remainingTime}s)`;
      case 'moderator':
        return `Moderator (${remainingTime}s)`;
      case 'driver':
        return 'Driver';
      default:
        return 'Driver';
    }
  };

  const handleAction = (orderId: string, action: 'accept' | 'decline' | 'send_to_group') => {
    const order = orders.find(o => o.id === orderId);
    setConfirmationModal({
      visible: true,
      orderId,
      action,
      orderDetails: order,
    });
  };

  const confirmAction = async () => {
    const { orderId, action } = confirmationModal;
    setLoadingAction(orderId);
    setConfirmationModal({ ...confirmationModal, visible: false });

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Clear visibility timer for this order
      const timer = visibilityTimers.current.get(orderId);
      if (timer) {
        clearInterval(timer);
        visibilityTimers.current.delete(orderId);
      }

      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status: action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'sent_to_group' }
            : order
        )
      );

      let message = '';
      switch (action) {
        case 'accept':
          message = 'Order accepted successfully! Navigate to pickup location.';
          break;
        case 'decline':
          message = 'Order declined. It will be offered to other drivers.';
          break;
        case 'send_to_group':
          message = 'Order sent to driver group for discussion.';
          break;
      }

      Alert.alert('Success', message);
    } catch (error) {
      Alert.alert('Error', 'Failed to process action. Please try again.');
    } finally {
      setLoadingAction(null);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={12}
        color={index < Math.floor(rating) ? '#F59E0B' : '#E5E7EB'}
        fill={index < Math.floor(rating) ? '#F59E0B' : '#E5E7EB'}
      />
    ));
  };

  const VisibilityBadge = ({ order }: { order: PassengerOrder }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      if (order.visibilityState !== 'driver') {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ])
        );
        pulse.start();

        return () => pulse.stop();
      }
    }, [order.visibilityState, pulseAnim]);

    return (
      <Animated.View
        style={[
          styles.visibilityBadge,
          { 
            backgroundColor: getVisibilityColor(order.visibilityState),
            transform: [{ scale: pulseAnim }]
          }
        ]}
      >
        <Text style={styles.visibilityText}>
          {getVisibilityLabel(order.visibilityState, order.remainingTime)}
        </Text>
      </Animated.View>
    );
  };

  const renderOrderItem = (order: PassengerOrder) => {
    const isLoading = loadingAction === order.id;
    const isProcessed = order.status !== 'pending';

    return (
      <View key={order.id} style={[styles.orderCard, isProcessed && styles.processedCard]}>
        {/* Visibility Badge */}
        <VisibilityBadge order={order} />

        {/* Passenger Info */}
        <View style={styles.passengerInfo}>
          <View style={styles.passengerHeader}>
            <Text style={styles.passengerName}>{order.passengerName}</Text>
            <View style={styles.ratingContainer}>
              <View style={styles.stars}>
                {renderStars(order.passengerRating)}
              </View>
              <Text style={styles.ratingText}>{order.passengerRating}</Text>
            </View>
          </View>
          <Text style={styles.timestamp}>{order.timestamp}</Text>
        </View>

        {/* Route Information */}
        <View style={styles.routeContainer}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
            <View style={styles.routeDetails}>
              <Text style={styles.routeLabel}>Pickup</Text>
              <Text style={styles.routeAddress}>{order.pickupLocation}</Text>
            </View>
          </View>
          
          <View style={styles.routeLine} />
          
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
            <View style={styles.routeDetails}>
              <Text style={styles.routeLabel}>Destination</Text>
              <Text style={styles.routeAddress}>{order.destination}</Text>
            </View>
          </View>
        </View>

        {/* Trip Details */}
        <View style={styles.tripDetails}>
          <View style={styles.detailItem}>
            <Navigation size={16} color="#6B7280" />
            <Text style={styles.detailText}>{order.distance}</Text>
          </View>
          <View style={styles.detailItem}>
            <Clock size={16} color="#6B7280" />
            <Text style={styles.detailText}>{order.estimatedDuration}</Text>
          </View>
          <View style={styles.detailItem}>
            <DollarSign size={16} color="#10B981" />
            <Text style={[styles.detailText, styles.fareText]}>{order.fareAmount.toLocaleString()} MMK</Text>
          </View>
        </View>

        {/* Action Buttons */}
        {!isProcessed && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.sendToGroupButton]}
              onPress={() => handleAction(order.id, 'send_to_group')}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Users size={16} color="white" />
                  <Text style={styles.buttonText}>Send to Group</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleAction(order.id, 'decline')}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <X size={16} color="white" />
                  <Text style={styles.buttonText}>Decline</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAction(order.id, 'accept')}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Check size={16} color="white" />
                  <Text style={styles.buttonText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Status Indicator */}
        {isProcessed && (
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              order.status === 'accepted' && styles.acceptedStatus,
              order.status === 'declined' && styles.declinedStatus,
              order.status === 'sent_to_group' && styles.sentToGroupStatus,
            ]}>
              <Text style={styles.statusText}>
                {order.status === 'accepted' && 'Accepted'}
                {order.status === 'declined' && 'Declined'}
                {order.status === 'sent_to_group' && 'Sent to Group'}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Driver Orders</Text>
        <View style={styles.headerStats}>
          <Text style={styles.headerSubtitle}>
            {orders.filter(o => o.status === 'pending').length} active orders
          </Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Waiting for new orders...</Text>
            <Text style={styles.emptySubtext}>Orders will appear automatically</Text>
          </View>
        ) : (
          orders.map(renderOrderItem)
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmationModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmationModal({ ...confirmationModal, visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Action</Text>
              <TouchableOpacity
                onPress={() => setConfirmationModal({ ...confirmationModal, visible: false })}
                style={styles.modalCloseButton}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {confirmationModal.orderDetails && (
              <View style={styles.modalBody}>
                <Text style={styles.modalText}>
                  Are you sure you want to{' '}
                  <Text style={styles.modalActionText}>
                    {confirmationModal.action === 'accept' && 'accept'}
                    {confirmationModal.action === 'decline' && 'decline'}
                    {confirmationModal.action === 'send_to_group' && 'send to group'}
                  </Text>{' '}
                  this order?
                </Text>

                <View style={styles.modalOrderInfo}>
                  <Text style={styles.modalOrderText}>
                    Passenger: {confirmationModal.orderDetails.passengerName}
                  </Text>
                  <Text style={styles.modalOrderText}>
                    Fare: {confirmationModal.orderDetails.fareAmount.toLocaleString()} MMK
                  </Text>
                  <Text style={styles.modalOrderText}>
                    Distance: {confirmationModal.orderDetails.distance}
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setConfirmationModal({ ...confirmationModal, visible: false })}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={confirmAction}
                  >
                    <Text style={styles.modalConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EF4444',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  processedCard: {
    opacity: 0.7,
  },
  visibilityBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  visibilityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  passengerInfo: {
    marginBottom: 16,
    paddingRight: 120,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  passengerName: {
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
  timestamp: {
    fontSize: 14,
    color: '#6B7280',
  },
  routeContainer: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 4,
  },
  routeDetails: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#D1D5DB',
    marginLeft: 5,
    marginVertical: -4,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 6,
    fontWeight: '500',
  },
  fareText: {
    color: '#10B981',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  sendToGroupButton: {
    backgroundColor: '#3B82F6',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  acceptedStatus: {
    backgroundColor: '#D1FAE5',
  },
  declinedStatus: {
    backgroundColor: '#FEE2E2',
  },
  sentToGroupStatus: {
    backgroundColor: '#DBEAFE',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalActionText: {
    fontWeight: '600',
    color: '#3B82F6',
  },
  modalOrderInfo: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalOrderText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});