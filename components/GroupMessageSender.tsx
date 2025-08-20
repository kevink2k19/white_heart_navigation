import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {
  Users,
  Search,
  X,
  Check,
  Send,
  AlertCircle,
  Wifi,
  WifiOff,
  ChevronRight,
  MessageSquare,
  Navigation,
  MapPin,
  Clock,
  DollarSign,
  Star,
} from 'lucide-react-native';

interface Group {
  id: string;
  name: string;
  memberCount: number;
  description?: string;
  isActive: boolean;
  lastActivity: string;
  avatar?: string;
}

interface OrderData {
  customerName?: string;
  customerPhone: string;
  pickupLocation: string;
  destination: string;
  fareAmount: number;
  distance: string;
  estimatedDuration: string;
  customerRating?: number;
  specialInstructions?: string;
  orderId: string;
}

interface GroupMessageSenderProps {
  visible: boolean;
  onClose: () => void;
  orderData: OrderData;
  onSendComplete: (sentGroups: Group[]) => void;
}

const mockGroups: Group[] = [
  {
    id: '1',
    name: 'Downtown Drivers',
    memberCount: 24,
    description: 'Active drivers in downtown area',
    isActive: true,
    lastActivity: '2 min ago',
  },
  {
    id: '2',
    name: 'Airport Route Specialists',
    memberCount: 18,
    description: 'Drivers specializing in airport routes',
    isActive: true,
    lastActivity: '5 min ago',
  },
  {
    id: '3',
    name: 'Night Shift Team',
    memberCount: 12,
    description: 'Late night and early morning drivers',
    isActive: false,
    lastActivity: '1 hour ago',
  },
  {
    id: '4',
    name: 'Premium Service Drivers',
    memberCount: 8,
    description: 'Luxury and premium vehicle drivers',
    isActive: true,
    lastActivity: '10 min ago',
  },
  {
    id: '5',
    name: 'Weekend Warriors',
    memberCount: 32,
    description: 'Weekend and holiday active drivers',
    isActive: true,
    lastActivity: '15 min ago',
  },
  {
    id: '6',
    name: 'Emergency Response Team',
    memberCount: 6,
    description: 'Emergency and urgent ride specialists',
    isActive: true,
    lastActivity: '3 min ago',
  },
];

export default function GroupMessageSender({
  visible,
  onClose,
  orderData,
  onSendComplete,
}: GroupMessageSenderProps) {
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredGroups, setFilteredGroups] = useState<Group[]>(mockGroups);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  const [sendProgress, setSendProgress] = useState(0);

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setSelectedGroups(new Set());
      setSearchQuery('');
      setShowConfirmation(false);
      setSendProgress(0);
      
      // Animate modal entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(300);
    }
  }, [visible]);

  useEffect(() => {
    // Filter groups based on search query
    const filtered = mockGroups.filter(group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredGroups(filtered);
  }, [searchQuery]);

  // Simulate network status monitoring
  useEffect(() => {
    const checkNetworkStatus = () => {
      // In real app, use NetInfo or similar
      setNetworkStatus(Math.random() > 0.1 ? 'online' : 'offline');
    };

    const interval = setInterval(checkNetworkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleGroupSelection = (groupId: string) => {
    const newSelection = new Set(selectedGroups);
    if (newSelection.has(groupId)) {
      newSelection.delete(groupId);
    } else {
      newSelection.add(groupId);
    }
    setSelectedGroups(newSelection);
  };

  const selectAllActiveGroups = () => {
    const activeGroupIds = filteredGroups
      .filter(group => group.isActive)
      .map(group => group.id);
    setSelectedGroups(new Set(activeGroupIds));
  };

  const clearSelection = () => {
    setSelectedGroups(new Set());
  };

  const handleSendToGroups = () => {
    if (selectedGroups.size === 0) {
      Alert.alert('No Groups Selected', 'Please select at least one group to send the message to.');
      return;
    }

    if (networkStatus === 'offline') {
      Alert.alert(
        'No Internet Connection',
        'Please check your internet connection and try again.',
        [
          { text: 'Cancel' },
          { text: 'Retry', onPress: handleSendToGroups },
        ]
      );
      return;
    }

    setShowConfirmation(true);
  };

  const confirmSendMessage = async () => {
    setShowConfirmation(false);
    setIsSending(true);
    setSendProgress(0);

    try {
      const selectedGroupsList = filteredGroups.filter(group => 
        selectedGroups.has(group.id)
      );

      // Simulate sending to multiple groups with progress
      for (let i = 0; i < selectedGroupsList.length; i++) {
        const group = selectedGroupsList[i];
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Update progress
        setSendProgress(((i + 1) / selectedGroupsList.length) * 100);
        
        // Simulate potential network error
        if (Math.random() < 0.05) { // 5% chance of error
          throw new Error(`Failed to send to ${group.name}`);
        }
      }

      // Success
      Alert.alert(
        'Messages Sent Successfully',
        `Order message sent to ${selectedGroups.size} group${selectedGroups.size > 1 ? 's' : ''}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSendComplete(selectedGroupsList);
              onClose();
            },
          },
        ]
      );

    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert(
        'Send Failed',
        error instanceof Error ? error.message : 'Failed to send message. Please try again.',
        [
          { text: 'Cancel', onPress: () => setIsSending(false) },
          { text: 'Retry', onPress: confirmSendMessage },
        ]
      );
    } finally {
      setIsSending(false);
      setSendProgress(0);
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

  const renderOrderPreview = () => (
    <View style={styles.orderPreview}>
      <View style={styles.orderPreviewHeader}>
        <View style={styles.orderPreviewIcon}>
          <Navigation size={20} color="#3B82F6" />
        </View>
        <Text style={styles.orderPreviewTitle}>Order Message Preview</Text>
      </View>
      
      <View style={styles.orderPreviewContent}>
        {orderData.customerName && (
          <View style={styles.orderPreviewRow}>
            <Text style={styles.orderPreviewLabel}>Customer:</Text>
            <Text style={styles.orderPreviewValue}>{orderData.customerName}</Text>
            {orderData.customerRating && (
              <View style={styles.orderPreviewRating}>
                <View style={styles.orderPreviewStars}>
                  {renderStars(orderData.customerRating)}
                </View>
                <Text style={styles.orderPreviewRatingText}>{orderData.customerRating}</Text>
              </View>
            )}
          </View>
        )}
        
        <View style={styles.routePreview}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.routeText} numberOfLines={1}>{orderData.pickupLocation}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.routeText} numberOfLines={1}>{orderData.destination}</Text>
          </View>
        </View>
        
        <View style={styles.orderPreviewMetrics}>
          <View style={styles.metricItem}>
            <MapPin size={14} color="#6B7280" />
            <Text style={styles.metricText}>{orderData.distance}</Text>
          </View>
          <View style={styles.metricItem}>
            <Clock size={14} color="#6B7280" />
            <Text style={styles.metricText}>{orderData.estimatedDuration}</Text>
          </View>
          <View style={styles.metricItem}>
            <DollarSign size={14} color="#10B981" />
            <Text style={[styles.metricText, styles.fareText]}>{orderData.fareAmount.toLocaleString()} MMK</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderGroupItem = (group: Group) => {
    const isSelected = selectedGroups.has(group.id);
    
    return (
      <TouchableOpacity
        key={group.id}
        style={[
          styles.groupItem,
          isSelected && styles.groupItemSelected,
          !group.isActive && styles.groupItemInactive,
        ]}
        onPress={() => toggleGroupSelection(group.id)}
        disabled={!group.isActive}
      >
        <View style={styles.groupItemLeft}>
          <View style={[
            styles.groupAvatar,
            isSelected && styles.groupAvatarSelected,
            !group.isActive && styles.groupAvatarInactive,
          ]}>
            <Users size={20} color={
              !group.isActive ? '#9CA3AF' :
              isSelected ? 'white' : '#6B7280'
            } />
          </View>
          
          <View style={styles.groupInfo}>
            <View style={styles.groupHeader}>
              <Text style={[
                styles.groupName,
                !group.isActive && styles.groupNameInactive,
              ]}>
                {group.name}
              </Text>
              <View style={styles.groupStatus}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: group.isActive ? '#10B981' : '#9CA3AF' }
                ]} />
                <Text style={[
                  styles.groupActivity,
                  !group.isActive && styles.groupActivityInactive,
                ]}>
                  {group.lastActivity}
                </Text>
              </View>
            </View>
            
            <Text style={[
              styles.groupDescription,
              !group.isActive && styles.groupDescriptionInactive,
            ]}>
              {group.description}
            </Text>
            
            <Text style={[
              styles.groupMembers,
              !group.isActive && styles.groupMembersInactive,
            ]}>
              {group.memberCount} members
            </Text>
          </View>
        </View>
        
        <View style={styles.groupItemRight}>
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Check size={16} color="white" />
            </View>
          )}
          <ChevronRight size={16} color={
            !group.isActive ? '#D1D5DB' : '#9CA3AF'
          } />
        </View>
      </TouchableOpacity>
    );
  };

  const renderConfirmationModal = () => (
    <Modal
      visible={showConfirmation}
      transparent
      animationType="fade"
      onRequestClose={() => setShowConfirmation(false)}
    >
      <View style={styles.confirmationOverlay}>
        <View style={styles.confirmationContainer}>
          <View style={styles.confirmationHeader}>
            <View style={styles.confirmationIcon}>
              <MessageSquare size={24} color="#3B82F6" />
            </View>
            <Text style={styles.confirmationTitle}>Confirm Send Message</Text>
          </View>
          
          <View style={styles.confirmationContent}>
            <Text style={styles.confirmationText}>
              Send this order message to {selectedGroups.size} selected group{selectedGroups.size > 1 ? 's' : ''}?
            </Text>
            
            <View style={styles.selectedGroupsList}>
              {filteredGroups
                .filter(group => selectedGroups.has(group.id))
                .map(group => (
                  <View key={group.id} style={styles.selectedGroupItem}>
                    <Users size={16} color="#6B7280" />
                    <Text style={styles.selectedGroupName}>{group.name}</Text>
                    <Text style={styles.selectedGroupMembers}>({group.memberCount})</Text>
                  </View>
                ))}
            </View>
          </View>
          
          <View style={styles.confirmationActions}>
            <TouchableOpacity
              style={styles.confirmationCancel}
              onPress={() => setShowConfirmation(false)}
            >
              <Text style={styles.confirmationCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmationSend}
              onPress={confirmSendMessage}
            >
              <Send size={16} color="white" />
              <Text style={styles.confirmationSendText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderSendingProgress = () => (
    <Modal
      visible={isSending}
      transparent
      animationType="fade"
    >
      <View style={styles.progressOverlay}>
        <View style={styles.progressContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.progressTitle}>Sending Messages...</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${sendProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(sendProgress)}% Complete</Text>
        </View>
      </View>
    </Modal>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[
          styles.container,
          { transform: [{ translateY: slideAnim }] }
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Users size={24} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Send to Groups</Text>
                <Text style={styles.headerSubtitle}>
                  Select groups to share this order
                </Text>
              </View>
            </View>
            
            <View style={styles.headerRight}>
              <View style={styles.networkStatus}>
                {networkStatus === 'online' ? (
                  <Wifi size={16} color="#10B981" />
                ) : (
                  <WifiOff size={16} color="#EF4444" />
                )}
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Order Preview */}
          {renderOrderPreview()}

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={20} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search groups..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Selection Controls */}
          <View style={styles.selectionControls}>
            <View style={styles.selectionInfo}>
              <Text style={styles.selectionCount}>
                {selectedGroups.size} of {filteredGroups.filter(g => g.isActive).length} groups selected
              </Text>
            </View>
            <View style={styles.selectionActions}>
              <TouchableOpacity
                style={styles.selectionButton}
                onPress={selectAllActiveGroups}
              >
                <Text style={styles.selectionButtonText}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.selectionButton}
                onPress={clearSelection}
              >
                <Text style={styles.selectionButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Groups List */}
          <ScrollView style={styles.groupsList} showsVerticalScrollIndicator={false}>
            {filteredGroups.length === 0 ? (
              <View style={styles.emptyState}>
                <AlertCircle size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateTitle}>No Groups Found</Text>
                <Text style={styles.emptyStateText}>
                  {searchQuery ? 'Try adjusting your search terms' : 'You are not a member of any groups yet'}
                </Text>
              </View>
            ) : (
              filteredGroups.map(renderGroupItem)
            )}
          </ScrollView>

          {/* Send Button */}
          <View style={styles.sendContainer}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                selectedGroups.size === 0 && styles.sendButtonDisabled,
                networkStatus === 'offline' && styles.sendButtonOffline,
              ]}
              onPress={handleSendToGroups}
              disabled={selectedGroups.size === 0 || networkStatus === 'offline'}
            >
              <Send size={20} color="white" />
              <Text style={styles.sendButtonText}>
                Send to {selectedGroups.size} Group{selectedGroups.size !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
            
            {networkStatus === 'offline' && (
              <Text style={styles.offlineWarning}>
                No internet connection. Please check your network.
              </Text>
            )}
          </View>

          {/* Confirmation Modal */}
          {renderConfirmationModal()}

          {/* Sending Progress Modal */}
          {renderSendingProgress()}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkStatus: {
    marginRight: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderPreview: {
    margin: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  orderPreviewIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  orderPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderPreviewContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  orderPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderPreviewLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
    fontWeight: '500',
  },
  orderPreviewValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  orderPreviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderPreviewStars: {
    flexDirection: 'row',
    marginRight: 4,
  },
  orderPreviewRatingText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  routePreview: {
    marginVertical: 8,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
  routeLine: {
    width: 2,
    height: 12,
    backgroundColor: '#D1D5DB',
    marginLeft: 3,
    marginVertical: -2,
  },
  orderPreviewMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  fareText: {
    color: '#10B981',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectionInfo: {
    flex: 1,
  },
  selectionCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectionActions: {
    flexDirection: 'row',
  },
  selectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  selectionButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  groupsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  groupItemSelected: {
    backgroundColor: '#EBF4FF',
    borderColor: '#3B82F6',
  },
  groupItemInactive: {
    opacity: 0.6,
  },
  groupItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupAvatarSelected: {
    backgroundColor: '#3B82F6',
  },
  groupAvatarInactive: {
    backgroundColor: '#F9FAFB',
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  groupNameInactive: {
    color: '#9CA3AF',
  },
  groupStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  groupActivity: {
    fontSize: 12,
    color: '#6B7280',
  },
  groupActivityInactive: {
    color: '#9CA3AF',
  },
  groupDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  groupDescriptionInactive: {
    color: '#9CA3AF',
  },
  groupMembers: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  groupMembersInactive: {
    color: '#D1D5DB',
  },
  groupItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  sendContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendButtonOffline: {
    backgroundColor: '#EF4444',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  offlineWarning: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 8,
  },
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confirmationContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  confirmationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  confirmationContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  confirmationText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  selectedGroupsList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  selectedGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedGroupName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  selectedGroupMembers: {
    fontSize: 12,
    color: '#6B7280',
  },
  confirmationActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  confirmationCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  confirmationCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmationSend: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    gap: 6,
  },
  confirmationSendText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  progressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 20,
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
  },
});