import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl, // ⬅️ NEW
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Plus, X, Send } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { fetchMe } from '../lib/authClient';
import { fetchMyGroups, createGroup } from '../lib/chatApi';
import type { ServerGroup } from '../lib/chatApi';
import { getSocket } from '../lib/socket'; // ⬅️ NEW

type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';

type ChatGroup = {
  id: string;
  name: string;
  memberCount: number;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
};

const timeAgo = (iso?: string) => {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.floor((now - then) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString();
};

/* Create Group Modal */
type CreateGroupModalProps = {
  visible: boolean;
  canManage: boolean;
  creating: boolean;
  groupName: string;
  groupDesc: string;
  onChangeGroupName: (s: string) => void;
  onChangeGroupDesc: (s: string) => void;
  onClose: () => void;
  onCreate: () => void;
};

const CreateGroupModal = React.memo(function CreateGroupModal({
  visible, canManage, creating, groupName, groupDesc,
  onChangeGroupName, onChangeGroupDesc, onClose, onCreate,
}: CreateGroupModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.formLabel}>Group Name</Text>
            <TextInput
              style={styles.formInput}
              value={groupName}
              onChangeText={onChangeGroupName}
              placeholder="e.g., Downtown Drivers"
              autoFocus
            />

            <View style={{ height: 12 }} />
            <Text style={styles.formLabel}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={groupDesc}
              onChangeText={onChangeGroupDesc}
              placeholder="Optional description (coverage area, shift, rules...)"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} disabled={creating} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSubmit}
              disabled={creating || !canManage}
              onPress={onCreate}
            >
              <Send size={16} color="white" />
              <Text style={styles.modalSubmitText}>{creating ? 'Creating…' : 'Create'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

/* Screen */
export default function MessagingScreen() {
  const router = useRouter();

  const [myId, setMyId] = useState<string>('');               // ⬅️ NEW
  const [role, setRole] = useState<AppRole>('USER');
  const canManage = role === 'SUPER_ADMIN' || role === 'ADMIN';

  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);        // ⬅️ NEW

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe<{ id: string; role: AppRole }>();
        if (me?.role) setRole(me.role);
        if (me?.id) setMyId(me.id);                            // ⬅️ NEW
      } catch {}
    })();
  }, []);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const serverGroups = await fetchMyGroups(); // ServerGroup[]
      const uiGroups: ChatGroup[] = serverGroups.map((g: ServerGroup) => ({
        id: g.id,
        name: g.name,
        memberCount: g.memberCount,
        lastMessage: g.lastMessage || '',
        lastMessageTime: timeAgo(g.lastMessageAt),
        unreadCount: g.unreadCount || 0,
      }));
      setGroups(uiGroups);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load groups');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Pull-to-refresh handler  ⬇️ NEW
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadGroups();
    } finally {
      setRefreshing(false);
    }
  }, [loadGroups]);

  // initial load
  useEffect(() => { loadGroups(); }, [loadGroups]);

  // also refresh whenever this screen regains focus
  useFocusEffect(useCallback(() => { loadGroups(); }, [loadGroups]));

  // realtime: join all conv rooms, listen for rename/delete and "you were added" events
  useEffect(() => {
    let off: undefined | (() => void);

    (async () => {
      const sock = await getSocket();

      // Join all rooms for this user
      sock.emit('conversations:joinAll');

      const softRefresh = () => { loadGroups(); }; // keeps logic in one place

      // Rename
      const onUpdated = (p: { conversationId: string; name?: string }) => {
        if (!p?.conversationId) return;
        setGroups(prev => prev.map(g => g.id === p.conversationId ? { ...g, name: p.name ?? g.name } : g));
      };

      // Delete
      const onDeleted = (p: { conversationId: string }) => {
        if (!p?.conversationId) return;
        setGroups(prev => prev.filter(g => g.id !== p.conversationId));
      };

      // NEW GROUP visible to you — support several possible server events:
      // 1) generic "groups:refresh"
      const onGroupsRefresh = () => softRefresh();

      // 2) you were added to a group (payload may vary)
      const onMemberAdded = (p: { conversationId?: string; userId?: string; member?: { id?: string } }) => {
        const addedId = p?.userId ?? p?.member?.id;
        if (addedId && myId && String(addedId) === String(myId)) {
          softRefresh();
        }
      };

      // 3) group created for you explicitly
      const onGroupCreated = (p: { conversationId?: string; userIds?: string[]; createdForUserId?: string }) => {
        const isForMe =
          (Array.isArray(p?.userIds) && p!.userIds!.some(uid => String(uid) === String(myId))) ||
          (!!p?.createdForUserId && String(p.createdForUserId) === String(myId));
        if (isForMe) softRefresh();
      };

      sock.on('group:updated', onUpdated);
      sock.on('group:deleted', onDeleted);
      sock.on('groups:refresh', onGroupsRefresh);     // optional, if server emits
      sock.on('member:added', onMemberAdded);         // optional, if server emits
      sock.on('group:created', onGroupCreated);       // optional, if server emits

      off = () => {
        try {
          sock.off('group:updated', onUpdated);
          sock.off('group:deleted', onDeleted);
          sock.off('groups:refresh', onGroupsRefresh);
          sock.off('member:added', onMemberAdded);
          sock.off('group:created', onGroupCreated);
        } catch {}
      };
    })();

    return () => { if (off) off(); };
  }, [loadGroups, myId]); // re-bind if myId changes

  const handleCreateGroup = useCallback(async () => {
    if (!canManage) return Alert.alert('Forbidden', 'Only admins can create groups.');
    const name = newGroupName.trim();
    const description = newGroupDesc.trim();
    if (!name) return Alert.alert('Validation', 'Please enter a group name.');
    try {
      setCreating(true);
      await createGroup({ name, description });
      setNewGroupName('');
      setNewGroupDesc('');
      setShowCreateGroup(false);
      await loadGroups(); // immediate refresh
      Alert.alert('Success', 'Group created.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create group.');
    } finally {
      setCreating(false);
    }
  }, [canManage, newGroupName, newGroupDesc, loadGroups]);

  const renderGroupList = () => (
    <View style={styles.groupList}>
      <View style={styles.groupListHeader}>
        <Text style={styles.groupListTitle}>Driver Groups</Text>
        {canManage && (
          <TouchableOpacity style={styles.addGroupButton} onPress={() => setShowCreateGroup(true)}>
            <Plus size={20} color="#3B82F6" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ padding: 20 }}>
          <Text style={{ color: '#6B7280' }}>Loading…</Text>
        </View>
      ) : groups.length === 0 ? (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}   // ⬅️ NEW
          contentContainerStyle={{ padding: 20 }}
        >
          <Text style={{ color: '#6B7280' }}>No groups yet.</Text>
        </ScrollView>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}   // ⬅️ NEW
        >
          {groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupItem}
              onPress={() =>
                router.push({ pathname: '/[id]', params: { id: group.id, name: group.name } })
              }
            >
              <View style={styles.groupAvatar}>
                <Users size={24} color="#6B7280" />
              </View>
              <View style={styles.groupInfo}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupTime}>{group.lastMessageTime}</Text>
                </View>
                <View style={styles.groupFooter}>
                  <Text style={styles.groupLastMessage} numberOfLines={1}>
                    {group.lastMessage}
                  </Text>
                  <Text style={styles.groupMembers}>{group.memberCount} members</Text>
                </View>
              </View>
              {group.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>{group.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderGroupList()}

      <CreateGroupModal
        visible={canManage && showCreateGroup}
        canManage={canManage}
        creating={creating}
        groupName={newGroupName}
        groupDesc={newGroupDesc}
        onChangeGroupName={setNewGroupName}
        onChangeGroupDesc={setNewGroupDesc}
        onClose={() => setShowCreateGroup(false)}
        onCreate={handleCreateGroup}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  groupList: { flex: 1 },
  groupListHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  groupListTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  addGroupButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EBF4FF', alignItems: 'center', justifyContent: 'center' },

  groupItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  groupAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  groupInfo: { flex: 1 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  groupName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  groupTime: { fontSize: 12, color: '#6B7280' },
  groupFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupLastMessage: { fontSize: 14, color: '#6B7280', flex: 1, marginRight: 8 },
  groupMembers: { fontSize: 12, color: '#9CA3AF' },
  unreadBadge: { backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  unreadCount: { color: 'white', fontSize: 12, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  modalBody: { paddingHorizontal: 20, paddingVertical: 16 },
  formLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  formInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: '#1F2937' },
  textArea: { height: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  modalSubmit: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, backgroundColor: '#3B82F6', gap: 6 },
  modalSubmitText: { fontSize: 16, fontWeight: '600', color: 'white' },
});
