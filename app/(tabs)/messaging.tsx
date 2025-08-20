import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Send,
  Mic,
  Camera,
  Image as ImageIcon,
  Play,
  Pause,
  Users,
  Plus,
  X,
  Volume2,
  MicOff,
  Check,
  CheckCheck,
} from 'lucide-react-native';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'voice' | 'image' | 'podcast';
  timestamp: string;
  duration?: number; // for voice messages
  imageUrl?: string; // for image messages
  isRead: boolean;
  isDelivered: boolean;
}

interface ChatGroup {
  id: string;
  name: string;
  memberCount: number;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

const mockGroups: ChatGroup[] = [
  {
    id: '1',
    name: 'Downtown Drivers',
    memberCount: 24,
    lastMessage: 'Traffic is heavy on Strand Road',
    lastMessageTime: '2 min ago',
    unreadCount: 3,
  },
  {
    id: '2',
    name: 'Airport Route Drivers',
    memberCount: 18,
    lastMessage: 'New passenger at Terminal 2',
    lastMessageTime: '5 min ago',
    unreadCount: 1,
  },
  {
    id: '3',
    name: 'Night Shift Team',
    memberCount: 12,
    lastMessage: 'Good evening everyone!',
    lastMessageTime: '1 hour ago',
    unreadCount: 0,
  },
];

const mockMessages: Message[] = [
  {
    id: '1',
    senderId: 'user1',
    senderName: 'Ko Thant',
    content: 'Traffic is really heavy on Strand Road today. Better avoid that route.',
    type: 'text',
    timestamp: '10:30 AM',
    isRead: true,
    isDelivered: true,
  },
  {
    id: '2',
    senderId: 'user2',
    senderName: 'Ma Khin',
    content: 'Thanks for the heads up! Taking Sule Pagoda route instead.',
    type: 'text',
    timestamp: '10:32 AM',
    isRead: true,
    isDelivered: true,
  },
  {
    id: '3',
    senderId: 'user3',
    senderName: 'Ko Aung',
    content: '',
    type: 'voice',
    timestamp: '10:35 AM',
    duration: 15,
    isRead: false,
    isDelivered: true,
  },
  {
    id: '4',
    senderId: 'current_user',
    senderName: 'You',
    content: 'Just picked up a passenger from Junction City. Heading to airport.',
    type: 'text',
    timestamp: '10:38 AM',
    isRead: false,
    isDelivered: true,
  },
];

export default function MessagingScreen() {
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPodcastMode, setIsPodcastMode] = useState(false);

  // Animation for recording button
  const recordingAnim = useRef(new Animated.Value(1)).current;
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pan responder for push-to-talk
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startRecording();
      },
      onPanResponderRelease: () => {
        stopRecording();
      },
    })
  ).current;

  useEffect(() => {
    if (isRecording) {
      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(recordingAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      recordingAnim.setValue(1);
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    }

    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, [isRecording]);

  const startRecording = () => {
    setIsRecording(true);
    setRecordingDuration(0);
    // In real app, start audio recording here
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingDuration > 1) {
      // Send voice message
      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: 'current_user',
        senderName: 'You',
        content: '',
        type: isPodcastMode ? 'podcast' : 'voice',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: recordingDuration,
        isRead: false,
        isDelivered: false,
      };
      setMessages(prev => [...prev, newMessage]);
    }
    setRecordingDuration(0);
  };

  const sendTextMessage = () => {
    if (inputText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: 'current_user',
        senderName: 'You',
        content: inputText.trim(),
        type: 'text',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRead: false,
        isDelivered: false,
      };
      setMessages(prev => [...prev, newMessage]);
      setInputText('');
    }
  };

  const playVoiceMessage = (messageId: string) => {
    if (playingMessageId === messageId) {
      setPlayingMessageId(null);
      // Stop audio playback
    } else {
      setPlayingMessageId(messageId);
      // Start audio playback
      // Simulate playback completion
      setTimeout(() => {
        setPlayingMessageId(null);
      }, 3000);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessage = (message: Message) => {
    const isCurrentUser = message.senderId === 'current_user';

    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        {!isCurrentUser && (
          <Text style={styles.senderName}>{message.senderName}</Text>
        )}
        
        {message.type === 'text' && (
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {message.content}
          </Text>
        )}

        {(message.type === 'voice' || message.type === 'podcast') && (
          <View style={styles.voiceMessageContainer}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => playVoiceMessage(message.id)}
            >
              {playingMessageId === message.id ? (
                <Pause size={20} color="white" />
              ) : (
                <Play size={20} color="white" />
              )}
            </TouchableOpacity>
            <View style={styles.voiceWaveform}>
              {/* Simulated waveform */}
              {Array.from({ length: 20 }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveformBar,
                    {
                      height: Math.random() * 20 + 5,
                      backgroundColor: playingMessageId === message.id ? '#3B82F6' : '#D1D5DB'
                    }
                  ]}
                />
              ))}
            </View>
            <Text style={styles.voiceDuration}>
              {formatDuration(message.duration || 0)}
            </Text>
            {message.type === 'podcast' && (
              <Volume2 size={16} color="#F59E0B" style={styles.podcastIcon} />
            )}
          </View>
        )}

        {message.type === 'image' && (
          <TouchableOpacity
            onPress={() => {
              setSelectedImage(message.imageUrl || '');
              setShowImageModal(true);
            }}
          >
            <Image
              source={{ uri: message.imageUrl }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        <View style={styles.messageFooter}>
          <Text style={styles.messageTime}>{message.timestamp}</Text>
          {isCurrentUser && (
            <View style={styles.messageStatus}>
              {message.isRead ? (
                <CheckCheck size={16} color="#3B82F6" />
              ) : message.isDelivered ? (
                <CheckCheck size={16} color="#9CA3AF" />
              ) : (
                <Check size={16} color="#9CA3AF" />
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderGroupList = () => (
    <View style={styles.groupList}>
      <View style={styles.groupListHeader}>
        <Text style={styles.groupListTitle}>Driver Groups</Text>
        <TouchableOpacity style={styles.addGroupButton}>
          <Plus size={20} color="#3B82F6" />
        </TouchableOpacity>
      </View>
      
      {mockGroups.map(group => (
        <TouchableOpacity
          key={group.id}
          style={styles.groupItem}
          onPress={() => setSelectedGroup(group)}
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
    </View>
  );

  const renderChat = () => (
    <View style={styles.chatContainer}>
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedGroup(null)}
        >
          <X size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatTitle}>{selectedGroup?.name}</Text>
          <Text style={styles.chatSubtitle}>{selectedGroup?.memberCount} members</Text>
        </View>
        <TouchableOpacity
          style={[styles.podcastToggle, isPodcastMode && styles.podcastToggleActive]}
          onPress={() => setIsPodcastMode(!isPodcastMode)}
        >
          <Volume2 size={20} color={isPodcastMode ? 'white' : '#6B7280'} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
        {messages.map(renderMessage)}
      </ScrollView>

      {/* Recording Indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>
            Recording... {formatDuration(recordingDuration)}
          </Text>
          <Text style={styles.recordingHint}>Release to send</Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          
          <View style={styles.inputActions}>
            <TouchableOpacity style={styles.attachButton}>
              <Camera size={20} color="#6B7280" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.attachButton}>
              <ImageIcon size={20} color="#6B7280" />
            </TouchableOpacity>

            {inputText.trim() ? (
              <TouchableOpacity style={styles.sendButton} onPress={sendTextMessage}>
                <Send size={20} color="white" />
              </TouchableOpacity>
            ) : (
              <Animated.View
                style={[styles.micButton, { transform: [{ scale: recordingAnim }] }]}
                {...panResponder.panHandlers}
              >
                <TouchableOpacity style={styles.micButtonInner}>
                  {isRecording ? (
                    <MicOff size={20} color="white" />
                  ) : (
                    <Mic size={20} color="white" />
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>
        
        {isPodcastMode && (
          <Text style={styles.podcastModeText}>
            🎙️ Podcast mode: Long-press mic for walkie-talkie style recording
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {selectedGroup ? renderChat() : renderGroupList()}

      {/* Image Modal */}
      <Modal
        visible={showImageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setShowImageModal(false)}
          >
            <X size={24} color="white" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
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
  groupList: {
    flex: 1,
  },
  groupListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  groupListTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addGroupButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
  },
  groupTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupLastMessage: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    marginRight: 8,
  },
  groupMembers: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  chatSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  podcastToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podcastToggleActive: {
    backgroundColor: '#F59E0B',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserText: {
    color: 'white',
  },
  otherUserText: {
    color: '#1F2937',
  },
  voiceMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  voiceWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: 20,
    marginRight: 8,
  },
  waveformBar: {
    width: 2,
    marginHorizontal: 1,
    borderRadius: 1,
  },
  voiceDuration: {
    fontSize: 12,
    color: '#6B7280',
  },
  podcastIcon: {
    marginLeft: 4,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginRight: 4,
  },
  messageStatus: {
    marginLeft: 4,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 8,
  },
  recordingText: {
    color: 'white',
    fontWeight: '600',
    marginRight: 8,
  },
  recordingHint: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
  },
  inputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
    marginRight: 8,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 40,
    height: 40,
  },
  micButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podcastModeText: {
    fontSize: 12,
    color: '#F59E0B',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenImage: {
    width: '90%',
    height: '70%',
  },
});