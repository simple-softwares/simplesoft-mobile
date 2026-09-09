import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import ChatService from '../chatService';
import CallBar from '../components/CallBar';
import { useTheme } from '../../../theme/ThemeContext';
import { useSelector } from 'react-redux';

const MessageBubble = ({ msg, isMe, colors }) => {
  const initials = (msg.author_id?.[1] || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const date = msg.date
    ? new Date(msg.date).toLocaleString('en-IN', {
        day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
      })
    : '';
  const body = (msg.body || '').replace(/<[^>]+>/g, '').trim();
  if (!body) return null;

  return (
    <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
      {!isMe && (
        <View style={[styles.msgAvatar, { backgroundColor: colors.primary + '25' }]}>
          <Text style={[styles.msgAvatarText, { color: colors.primary }]}>{initials}</Text>
        </View>
      )}
      <View style={[
        styles.msgBubble,
        isMe
          ? { backgroundColor: colors.primary }
          : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
      ]}>
        {!isMe && (
          <Text style={[styles.msgAuthor, { color: colors.primary }]}>
            {msg.author_id?.[1] || 'Unknown'}
          </Text>
        )}
        <Text style={[styles.msgBody, { color: isMe ? '#fff' : colors.text }]}>
          {body}
        </Text>
        <Text style={[styles.msgDate, {
          color: isMe ? 'rgba(255,255,255,0.6)' : colors.textLight,
        }]}>
          {date}
        </Text>
      </View>
    </View>
  );
};

const ChatThreadScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const user = useSelector(s => s.auth.user);
  const { channelId, channelName } = route.params;

  const [channel, setChannel] = useState({ id: channelId, name: channelName });
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const pollIntervalRef = useRef(null);
  const flatListRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
      loadMembers();
      ChatService.markChannelRead(channelId);

      // Start polling every 5 seconds
      pollIntervalRef.current = setInterval(() => {
        loadMessages(false);
      }, 5000);

      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }, [channelId])
  );

  const loadMessages = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const messageList = await ChatService.getMessages(channelId, { limit: 100 });
      setMessages(messageList);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const memberList = await ChatService.getChannelMembers(channelId);
      setMembers(memberList);
    } catch (e) {
    }
  };

  const handleSend = async () => {
    if (!text.trim()) return;

    const msgText = text;
    setSending(true);
    setText('');

    // Optimistic update
    const tempMsg = {
      id: -1,
      body: msgText,
      author_id: [user?.id, user?.name],
      date: new Date().toISOString(),
      message_type: 'comment',
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await ChatService.postMessage(channelId, msgText);
      // Reload messages to confirm
      await loadMessages(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to send message');
      setText(msgText); // Restore text on error
      setMessages(prev => prev.filter(m => m.id !== -1)); // Remove optimistic msg
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {channel.name}
          </Text>
          <Text style={[styles.headerMembers, { color: colors.textSecondary }]}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Call Bar */}
      <CallBar channel={channel} members={members} />

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <MessageBubble msg={item} isMe={item.author_id?.[0] === user?.id} colors={colors} />
        )}
        inverted
        scrollEnabled={true}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 8 }}
      />

      {/* Compose Bar */}
      <View style={[styles.composeBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.composeInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.textLight}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }, !text.trim() && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Icon name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerMembers: { fontSize: 11, marginTop: 2 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 4, marginHorizontal: 8 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  msgAvatarText: { fontSize: 12, fontWeight: '700' },
  msgBubble: { maxWidth: '85%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  msgAuthor: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  msgBody: { fontSize: 14, lineHeight: 18 },
  msgDate: { fontSize: 10, marginTop: 2 },
  composeBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 8, paddingVertical: 8, borderTopWidth: 1 },
  composeInput: { flex: 1, maxHeight: 100, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, fontSize: 14 },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

export default ChatThreadScreen;
