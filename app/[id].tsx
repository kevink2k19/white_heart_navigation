// app/[id].tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Users, Send, Image as ImageIcon, Mic, Pencil, Trash2 } from 'lucide-react-native';
import { fetchMe } from './lib/authClient';
import { fetchConversation, fetchMessages, sendText } from './lib/chatApi';
import { fetchGroupMembers, renameGroup, deleteGroup } from './lib/chatApi';
import { getSocket } from './lib/socket';
import GroupMemberModal from '../components/GroupMemberModal';

type ServerMessage = {
  id: string;
  conversationId: string;
  type: 'TEXT' | 'IMAGE' | 'VOICE' | 'ORDER' | 'SYSTEM';
  text?: string | null;
  mediaUrl?: string | null;
  mediaKind?: string | null;
  mediaDurationS?: number | null;
  createdAt: string;
  sender?: { id: string; name: string } | null;
};

type Member = {
  id: string;
  name: string;
  phone: string | null;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
  status: 'online' | 'offline' | 'away' | 'busy';
};

type PlatformRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';

export default function GroupChatScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const conversationId = String(id);

  const [myId, setMyId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<PlatformRole | 'unknown'>('unknown');
  const [title, setTitle] = useState<string>(typeof name === 'string' ? name : 'Group');
  const [memberCount, setMemberCount] = useState<number>(0);

  // members
  const [members, setMembers] = useState<Member[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [canManageMembers, setCanManageMembers] = useState(false); // creator-only

  // platform admins can rename/delete
  const canRenameDelete = myRole === 'SUPER_ADMIN' || myRole === 'ADMIN';

  // rename modal
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameText, setRenameText] = useState('');

  const [messages, setMessages] = useState<ServerMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // who am I?
  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe<{ id: string; role?: PlatformRole }>();
        setMyId(me?.id ?? null);
        if (me?.role) setMyRole(me.role);
      } catch {}
    })();
  }, []);

  // header & participants (and my role if your API returns it)
  useEffect(() => {
    (async () => {
      try {
        const conv = await fetchConversation(conversationId);
        if (conv?.title) setTitle(conv.title);
        setMemberCount(Array.isArray(conv?.participants) ? conv.participants.length : 0);
        // if backend returns myRole: 'admin' | 'moderator' | 'member' for group role, you can still use it elsewhere
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load conversation');
      }
    })();
  }, [conversationId]);

  // load members list
  const normalizeStatus = (raw: any): 'online' | 'offline' | 'away' | 'busy' => {
    if (raw == null) return 'offline';
    if (typeof raw === 'string') {
      const s = raw.toLowerCase();
      if (s === 'online' || s === 'away' || s === 'busy') return s as any;
      return 'offline';
    }
    if (typeof raw === 'boolean') return raw ? 'online' : 'offline';
    return 'offline';
  };
  const eqId = (a: any, b: any) => String(a) === String(b);

  const loadMembers = async () => {
    const list = await fetchGroupMembers(conversationId);
    setMembers(list.map(m => ({
      ...m,
      id: String(m.id),
      status: normalizeStatus((m as any).status ?? (m as any).isOnline),
    })));
    setMemberCount(list.length);
  };

  useEffect(() => { (async () => { try { await loadMembers(); } catch {} })(); }, [conversationId]);

  // initial history
  useEffect(() => {
    (async () => {
      try {
        const list = await fetchMessages(conversationId, { limit: 50 });
        setMessages(list);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 0);
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load messages');
      }
    })();
  }, [conversationId]);

  // Keep an ID set to avoid duplicates
  const idsRef = useRef<Set<string>>(new Set());
  useEffect(() => { idsRef.current = new Set(messages.map(m => m.id)); }, [messages]);

  // REALTIME: messages + presence
  useEffect(() => {
    let unsub: undefined | (() => void);
    let poll: undefined | ReturnType<typeof setInterval>;
    let hb: undefined | ReturnType<typeof setInterval>;

    (async () => {
      const sock = await getSocket();

      // Join and presence subscribe
      sock.emit('join:conversation', { conversationId });
      sock.emit('presence:subscribe', { conversationId });
      sock.emit('presence:here', { conversationId });

      // Heartbeat every 15s
      hb = setInterval(() => sock.emit('presence:ping'), 15000);

      // Messages
      const onNew = (msg: ServerMessage) => {
        if (msg?.conversationId && msg.conversationId !== conversationId) return;
        if (!msg?.id) return;
        setMessages(prev => (prev.some(p => p.id === msg.id) ? prev : [...prev, msg]));
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
      };
      sock.on('message:new', onNew);

      // Bulk presence snapshot
      const onPresenceBulk = (p: { conversationId: string; states: Array<{ userId: any; status?: any; isOnline?: boolean; lastActiveAt?: string }> }) => {
        if (!p || !eqId(p.conversationId, conversationId)) return;
        setMembers(prev =>
          prev.map(m => {
            const s = p.states.find(x => eqId(x.userId, m.id));
            if (!s) return m;
            const status =
              s.status != null
                ? normalizeStatus(s.status)
                : (typeof s.isOnline === 'boolean' ? (s.isOnline ? 'online' : 'offline') : 'offline');
            return { ...m, status };
          })
        );
      };
      sock.on('presence:bulk', onPresenceBulk);

      // Single presence update
      const onPresenceUpdate = (p: { conversationId: any; userId: any; status?: any; isOnline?: boolean; lastActiveAt?: string }) => {
        if (!p || !eqId(p.conversationId, conversationId)) return;
        const status =
          p.status != null
            ? normalizeStatus(p.status)
            : (typeof p.isOnline === 'boolean' ? (p.isOnline ? 'online' : 'offline') : 'offline');
        setMembers(prev => prev.map(m => (eqId(m.id, p.userId) ? { ...m, status } : m)));
      };
      sock.on('presence:update', onPresenceUpdate);

      // Member add/remove (optional)
      const onMemberAdded = (p: { conversationId: any; member: any }) => {
        if (!p || !eqId(p.conversationId, conversationId)) return;
        setMembers(prev => (prev.some(m => eqId(m.id, p.member?.id)) ? prev : [
          ...prev,
          { ...p.member, id: String(p.member.id), status: normalizeStatus(p.member.status ?? p.member.isOnline) }
        ]));
        setMemberCount(c => c + 1);
      };
      const onMemberRemoved = (p: { conversationId: any; userId: any }) => {
        if (!p || !eqId(p.conversationId, conversationId)) return;
        setMembers(prev => prev.filter(m => !eqId(m.id, p.userId)));
        setMemberCount(c => Math.max(0, c - 1));
      };
      sock.on('member:added', onMemberAdded);
      sock.on('member:removed', onMemberRemoved);

      // Fallback polling every 20s
      poll = setInterval(async () => {
        try {
          const list = await fetchGroupMembers(conversationId);
          setMembers(prev => {
            const byId = new Map(prev.map(m => [String(m.id), m]));
            list.forEach(raw => {
              const id = String(raw.id);
              const old = byId.get(id);
              const status = normalizeStatus((raw as any).status ?? (raw as any).isOnline);
              byId.set(id, { ...(old ?? raw), ...raw, id, status });
            });
            return Array.from(byId.values());
          });
        } catch {}
      }, 20000);

      // cleanup
      unsub = () => {
        try {
          sock.emit('leave:conversation', { conversationId });
          sock.emit('presence:unsubscribe', { conversationId });
          sock.off('message:new', onNew);
          sock.off('presence:bulk', onPresenceBulk);
          sock.off('presence:update', onPresenceUpdate);
          sock.off('member:added', onMemberAdded);
          sock.off('member:removed', onMemberRemoved);
        } catch {}
        if (hb) clearInterval(hb);
        if (poll) clearInterval(poll);
      };
    })();

    return () => { if (unsub) unsub(); };
  }, [conversationId]);

  // Only the creator (earliest joined member) can manage members
  useEffect(() => {
    if (!myId || members.length === 0) return;
    const creator = members.reduce((earliest, m) =>
      Date.parse(m.joinedAt) < Date.parse(earliest.joinedAt) ? m : earliest,
      members[0]
    );
    setCanManageMembers(String(creator.id) === String(myId));
  }, [members, myId]);

  // send text
  const onSendText = async () => {
    const text = input.trim();
    if (!text || sending) return;
    try {
      setSending(true);
      const created = await sendText(conversationId, text);
      if (!idsRef.current.has(created.id)) {
        idsRef.current.add(created.id);
        setMessages(prev => [...prev, created]);
      }
      setInput('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const mine = (m: ServerMessage) => !!myId && !!m.sender?.id && m.sender.id === myId;

  // actions passed to modal
  const callMember = (_memberId: string, phone: string | null) => {
    if (!phone) return Alert.alert('No phone', 'This member has no phone number.');
    Alert.alert('Call', `Call ${phone}`);
  };
  const messageMember = (memberId: string) => {
    setInput(prev => (prev ? `${prev} @${memberId} ` : `@${memberId} `));
  };

  // rename handlers
  const openRename = () => { setRenameText(title); setRenameOpen(true); };
  const commitRename = async () => {
    const newName = renameText.trim();
    if (!newName) return Alert.alert('Validation', 'Group name cannot be empty.');
    try {
      const res = await renameGroup(conversationId, { name: newName });
      setTitle(res.name || newName);
      setRenameOpen(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to rename group.');
    }
  };
  const confirmDelete = () => {
    Alert.alert('Delete group', 'This will remove all messages and members. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: actuallyDelete },
    ]);
  };
  const actuallyDelete = async () => {
    try {
      await deleteGroup(conversationId);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to delete group.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>

        {/* tap title area to open members */}
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowMembers(true)}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{memberCount} members</Text>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          {canRenameDelete && (
            <>
              <TouchableOpacity onPress={openRename} style={styles.smallIconBtn}>
                <Pencil size={18} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDelete} style={styles.smallIconBtn}>
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
          <View style={styles.membersIcon}>
            <Users size={18} color="#6B7280" />
          </View>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.list} contentContainerStyle={{ padding: 12 }}>
        {messages.map(m => (
          <View key={m.id} style={[styles.msg, mine(m) ? styles.msgMine : styles.msgOther]}>
            {!!m.sender?.name && !mine(m) && <Text style={styles.msgSender}>{m.sender.name}</Text>}
            <Text style={[styles.msgText, mine(m) ? styles.msgTextMine : styles.msgTextOther]}>
              {m.type === 'TEXT' ? m.text :
               m.type === 'IMAGE' ? `📷 ${m.mediaUrl}` :
               m.type === 'VOICE' ? `🎤 (${m.mediaDurationS ?? 0}s)` :
               m.type === 'ORDER' ? '📄 Order' : 'Unsupported'}
            </Text>
            <Text style={styles.msgTime}>
              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <TouchableOpacity onPress={() => Alert.alert('Image', 'Hook up your image picker.')} style={styles.attachBtn}>
          <ImageIcon size={20} color="#6B7280" />
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message…"
          multiline
        />
        <TouchableOpacity onPress={() => Alert.alert('Voice', 'Hook up recorder.')} style={styles.micBtn}>
          <Mic size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onSendText} disabled={!input.trim() || sending} style={styles.sendBtn}>
          <Send size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Members modal */}
      <GroupMemberModal
        visible={showMembers}
        onClose={() => setShowMembers(false)}
        groupName={title}
        groupId={conversationId}
        members={members}
        currentUserId={myId ?? ''}
        onCallMember={callMember}
        onMessageMember={messageMember}
        canManageMembers={canManageMembers}  // creator-only
        onMembersChanged={loadMembers}
      />

      {/* Rename modal */}
      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
        <View style={styles.renameOverlay}>
          <View style={styles.renameCard}>
            <Text style={styles.renameTitle}>Rename group</Text>
            <TextInput
              style={styles.renameInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Group name"
            />
            <View style={styles.renameRow}>
              <TouchableOpacity style={[styles.renameBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => setRenameOpen(false)}>
                <Text style={[styles.renameBtnTxt, { color: '#111827' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.renameBtn, { backgroundColor: '#111827' }]} onPress={commitRename}>
                <Text style={[styles.renameBtnTxt, { color: 'white' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 8, backgroundColor: '#F3F4F6' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280' },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallIconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  membersIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },

  list: { flex: 1, backgroundColor: '#F9FAFB' },

  msg: { marginVertical: 6, maxWidth: '82%', borderRadius: 14, padding: 10 },
  msgMine: { alignSelf: 'flex-end', backgroundColor: '#3B82F6', borderBottomRightRadius: 4 },
  msgOther: { alignSelf: 'flex-start', backgroundColor: 'white', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  msgSender: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTextMine: { color: 'white' },
  msgTextOther: { color: '#111827' },
  msgTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4, alignSelf: 'flex-end' },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, padding: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: 'white' },
  attachBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  textInput: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10, maxHeight: 120, fontSize: 16 },
  micBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },

  // rename modal styles
  renameOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  renameCard: { width: '86%', backgroundColor: 'white', borderRadius: 12, padding: 16 },
  renameTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  renameInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  renameRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  renameBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  renameBtnTxt: { fontWeight: '700', fontSize: 14 },
});
