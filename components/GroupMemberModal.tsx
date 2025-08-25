import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { X, Users, Circle, Crown, Shield, User, Phone, MessageCircle, MoveVertical as MoreVertical, UserPlus, Search, Filter } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface GroupMember {
  id: string;
  name: string;
  username?: string;
  phone?: string;
  profileImage?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
  isTyping?: boolean;
}

interface GroupMemberModalProps {
  visible: boolean;
  onClose: () => void;
  groupName: string;
  groupId: string;
  members: GroupMember[];
  currentUserId: string;
  onCallMember?: (memberId: string, phone: string) => void;
  onMessageMember?: (memberId: string) => void;
  onManageMember?: (memberId: string, action: 'promote' | 'demote' | 'remove') => void;
}

const mockMembers: GroupMember[] = [
  {
    id: '1',
    name: 'Ko Thant Zin',
    username: 'thantzin_driver',
    phone: '+95 9 123 456 789',
    status: 'online',
    role: 'admin',
    joinedAt: '2023-01-15',
    isTyping: false,
  },
  {
    id: '2',
    name: 'Ma Khin Myo',
    username: 'khinmyo_taxi',
    phone: '+95 9 987 654 321',
    status: 'online',
    role: 'moderator',
    joinedAt: '2023-02-20',
    isTyping: true,
  },
  {
    id: '3',
    name: 'U Aung Win',
    username: 'aungwin_driver',
    phone: '+95 9 555 123 456',
    status: 'away',
    lastSeen: '5 minutes ago',
    role: 'member',
    joinedAt: '2023-03-10',
  },
  {
    id: '4',
    name: 'Daw Mya Thida',
    username: 'myathida_cab',
    phone: '+95 9 777 888 999',
    status: 'offline',
    lastSeen: '2 hours ago',
    role: 'member',
    joinedAt: '2023-04-05',
  },
  {
    id: '5',
    name: 'Ko Zaw Myo',
    username: 'zawmyo_taxi',
    phone: '+95 9 111 222 333',
    status: 'busy',
    lastSeen: 'Active now',
    role: 'member',
    joinedAt: '2023-05-12',
  },
  {
    id: '6',
    name: 'Ma Hnin Wai',
    username: 'hninwai_driver',
    phone: '+95 9 444 555 666',
    status: 'online',
    role: 'member',
    joinedAt: '2023-06-18',
  },
];

export default function GroupMemberModal({
  visible,
  onClose,
  groupName,
  groupId,
  members = mockMembers,
  currentUserId = '1',
  onCallMember,
  onMessageMember,
  onManageMember,
}: GroupMemberModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMembers, setFilteredMembers] = useState<GroupMember[]>(members);
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [showMemberActions, setShowMemberActions] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const typingAnim = useRef(new Animated.Value(0)).current;

  // Simulate real-time status updates
  useEffect(() => {
    if (!visible) return;

    const statusUpdateInterval = setInterval(() => {
      // Simulate random status changes for demo
      const randomMember = members[Math.floor(Math.random() * members.length)];
      const statuses: GroupMember['status'][] = ['online', 'offline', 'away', 'busy'];
      const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      // Update member status (in real app, this would come from WebSocket)
      setFilteredMembers(prev => 
        prev.map(member => 
          member.id === randomMember.id 
            ? { ...member, status: newStatus, lastSeen: newStatus === 'offline' ? 'Just now' : undefined }
            : member
        )
      );
    }, 10000); // Update every 10 seconds for demo

    return () => clearInterval(statusUpdateInterval);
  }, [visible, members]);

  // Typing animation
  useEffect(() => {
    const typingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(typingAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(typingAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    typingAnimation.start();
    return () => typingAnimation.stop();
  }, []);

  // Modal animations
  useEffect(() => {
    if (visible) {
      setFilteredMembers(members);
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
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Filter members based on search and status
  useEffect(() => {
    let filtered = members;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.username?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter);
    }

    setFilteredMembers(filtered);
  }, [searchQuery, statusFilter, members]);

  const getStatusColor = (status: GroupMember['status']) => {
    switch (status) {
      case 'online':
        return '#10B981';
      case 'away':
        return '#F59E0B';
      case 'busy':
        return '#EF4444';
      case 'offline':
      default:
        return '#9CA3AF';
    }
  };

  const getStatusText = (status: GroupMember['status']) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'busy':
        return 'Busy';
      case 'offline':
      default:
        return 'Offline';
    }
  };

  const getRoleIcon = (role: GroupMember['role']) => {
    switch (role) {
      case 'admin':
        return <Crown size={16} color="#F59E0B" />;
      case 'moderator':
        return <Shield size={16} color="#3B82F6" />;
      default:
        return null;
    }
  };

  const handleMemberPress = (member: GroupMember) => {
    setSelectedMember(member);
    setShowMemberActions(true);
  };

  const handleCallMember = () => {
    if (selectedMember?.phone && onCallMember) {
      onCallMember(selectedMember.id, selectedMember.phone);
      setShowMemberActions(false);
    }
  };

  const handleMessageMember = () => {
    if (selectedMember && onMessageMember) {
      onMessageMember(selectedMember.id);
      setShowMemberActions(false);
    }
  };

  const renderMemberItem = (member: GroupMember) => {
    const isCurrentUser = member.id === currentUserId;
    const statusColor = getStatusColor(member.status);

    return (
      <TouchableOpacity
        key={member.id}
        style={[
          styles.memberItem,
          isCurrentUser && styles.currentUserItem,
        ]}
        onPress={() => handleMemberPress(member)}
        disabled={isCurrentUser}
      >
        <View style={styles.memberLeft}>
          {/* Profile Picture */}
          <View style={styles.avatarContainer}>
            {member.profileImage ? (
              <Image source={{ uri: member.profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={24} color="#6B7280" />
              </View>
            )}
            
            {/* Status Indicator */}
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
          </View>

          {/* Member Info */}
          <View style={styles.memberInfo}>
            <View style={styles.memberNameRow}>
              <Text style={[
                styles.memberName,
                isCurrentUser && styles.currentUserName,
              ]}>
                {member.name} {isCurrentUser && '(You)'}
              </Text>
              {getRoleIcon(member.role)}
            </View>
            
            <View style={styles.memberStatusRow}>
              <Text style={[styles.memberStatus, { color: statusColor }]}>
                {getStatusText(member.status)}
              </Text>
              {member.lastSeen && member.status === 'offline' && (
                <Text style={styles.lastSeen}>• {member.lastSeen}</Text>
              )}
              {member.isTyping && (
                <Animated.View style={[
                  styles.typingIndicator,
                  {
                    opacity: typingAnim,
                  }
                ]}>
                  <Text style={styles.typingText}>typing...</Text>
                </Animated.View>
              )}
            </View>
            
            {member.username && (
              <Text style={styles.memberUsername}>@{member.username}</Text>
            )}
          </View>
        </View>

        {/* Member Actions */}
        {!isCurrentUser && (
          <View style={styles.memberActions}>
            <TouchableOpacity style={styles.actionButton}>
              <MoreVertical size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderMemberActions = () => (
    <Modal
      visible={showMemberActions}
      transparent
      animationType="fade"
      onRequestClose={() => setShowMemberActions(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowMemberActions(false)}>
        <View style={styles.actionModalOverlay}>
          <View style={styles.actionModalContent}>
            <View style={styles.actionModalHeader}>
              <Text style={styles.actionModalTitle}>{selectedMember?.name}</Text>
              <TouchableOpacity onPress={() => setShowMemberActions(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.actionsList}>
              {selectedMember?.phone && (
                <TouchableOpacity style={styles.actionItem} onPress={handleCallMember}>
                  <Phone size={20} color="#10B981" />
                  <Text style={styles.actionText}>Call Member</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity style={styles.actionItem} onPress={handleMessageMember}>
                <MessageCircle size={20} color="#3B82F6" />
                <Text style={styles.actionText}>Send Private Message</Text>
              </TouchableOpacity>
              
              {/* Admin/Moderator actions */}
              {(currentUserId === '1' || members.find(m => m.id === currentUserId)?.role === 'admin') && (
                <>
                  <View style={styles.actionDivider} />
                  <TouchableOpacity style={styles.actionItem}>
                    <Shield size={20} color="#F59E0B" />
                    <Text style={styles.actionText}>Make Moderator</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionItem}>
                    <X size={20} color="#EF4444" />
                    <Text style={[styles.actionText, styles.dangerAction]}>Remove from Group</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  if (!visible) return null;

  const onlineCount = filteredMembers.filter(m => m.status === 'online').length;
  const totalMembers = members.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View style={[
              styles.modalContainer,
              { transform: [{ translateY: slideAnim }] }
            ]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIcon}>
                    <Users size={24} color="#3B82F6" />
                  </View>
                  <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>{groupName}</Text>
                    <Text style={styles.headerSubtitle}>
                      {onlineCount} online • {totalMembers} members
                    </Text>
                  </View>
                </View>
                
                <View style={styles.headerActions}>
                  <TouchableOpacity style={styles.addMemberButton}>
                    <UserPlus size={20} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <X size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Filters */}
              <View style={styles.filtersContainer}>
                <View style={styles.statusFilters}>
                  {['all', 'online', 'offline'].map(filter => (
                    <TouchableOpacity
                      key={filter}
                      style={[
                        styles.filterButton,
                        statusFilter === filter && styles.activeFilterButton,
                      ]}
                      onPress={() => setStatusFilter(filter as any)}
                    >
                      <Text style={[
                        styles.filterText,
                        statusFilter === filter && styles.activeFilterText,
                      ]}>
                        {filter === 'all' ? 'All' : filter === 'online' ? 'Online' : 'Offline'}
                        {filter === 'online' && ` (${onlineCount})`}
                        {filter === 'offline' && ` (${totalMembers - onlineCount})`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Members List */}
              <ScrollView 
                style={styles.membersList}
                showsVerticalScrollIndicator={false}
              >
                {filteredMembers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Users size={48} color="#9CA3AF" />
                    <Text style={styles.emptyStateTitle}>No Members Found</Text>
                    <Text style={styles.emptyStateText}>
                      {searchQuery ? 'Try adjusting your search' : 'No members match the current filter'}
                    </Text>
                  </View>
                ) : (
                  filteredMembers.map(renderMemberItem)
                )}
              </ScrollView>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Group created • {new Date().toLocaleDateString()}
                </Text>
              </View>

              {/* Member Actions Modal */}
              {renderMemberActions()}
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    minHeight: height * 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addMemberButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  activeFilterButton: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterText: {
    color: 'white',
  },
  membersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  currentUserItem: {
    backgroundColor: '#F8FAFC',
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'white',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  currentUserName: {
    color: '#3B82F6',
  },
  memberStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  memberStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  lastSeen: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  typingIndicator: {
    marginLeft: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#3B82F6',
    fontStyle: 'italic',
  },
  memberUsername: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  memberActions: {
    marginLeft: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
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
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 300,
  },
  actionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionsList: {
    paddingVertical: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  dangerAction: {
    color: '#EF4444',
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
});