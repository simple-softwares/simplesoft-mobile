import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import api from '../../services/api/httpClient';
import { useTheme } from '../../theme/ThemeContext';

const MessageBubble = ({ msg, isMe }) => {
  const { colors } = useTheme();
  const initials = (msg.author_name || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const date = msg.created_at
    ? new Date(msg.created_at).toLocaleString('en-IN', {
        day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
      })
    : '';

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
            {msg.author_name || 'Unknown'}
          </Text>
        )}
        <Text style={[styles.msgBody, { color: isMe ? '#fff' : colors.text }]}>
          {msg.body || ''}
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

const TaskChatter = ({ taskId }) => {
  const { colors } = useTheme();
  const user = useSelector(s => s.auth.user);

  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);

  useEffect(() => { loadMessages(); }, [taskId]);

  const loadMessages = async () => {
    try {
      const { data } = await api.get(`/tasks/${taskId}/comments`);
      setMessages(data || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');
    try {
      await api.post(`/tasks/${taskId}/comments`, { body });
      await loadMessages();
    } catch {
      setText(body);
    } finally {
      setSending(false);
    }
  };

  const myId = user?.id || user?.uid;

  return (
    <View style={[styles.container, { borderTopColor: colors.border }]}>

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Icon name="chatbubbles-outline" size={16} color={colors.primary} />
        <Text style={[styles.headerText, { color: colors.text }]}>
          Comments{messages.length > 0 ? ` (${messages.length})` : ''}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />
      ) : messages.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="chatbubble-outline" size={28} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textLight }]}>
            No comments yet — be the first
          </Text>
        </View>
      ) : (
        <View style={styles.messageList}>
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMe={msg.author_id === myId}
            />
          ))}
        </View>
      )}

      <View style={[styles.inputRow, {
        backgroundColor: colors.surface,
        borderTopColor:  colors.border,
      }]}>
        <TextInput
          style={[styles.input, {
            color:           colors.text,
            backgroundColor: colors.background,
            borderColor:     colors.border,
          }]}
          value={text}
          onChangeText={setText}
          placeholder="Write a comment..."
          placeholderTextColor={colors.textLight}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, {
            backgroundColor: text.trim() ? colors.primary : colors.border,
          }]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}>
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Icon name="send" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const S = StyleSheet;
const styles = S.create({
  container:    { borderTopWidth: 1, marginTop: 8 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderBottomWidth: S.hairlineWidth },
  headerText:   { fontSize: 13, fontWeight: '700' },
  messageList:  { padding: 12, gap: 8 },
  empty:        { alignItems: 'center', padding: 24, gap: 8 },
  emptyText:    { fontSize: 13 },
  msgRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  msgRowMe:     { flexDirection: 'row-reverse' },
  msgAvatar:    { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  msgAvatarText:{ fontSize: 10, fontWeight: '800' },
  msgBubble:    { maxWidth: '75%', borderRadius: 14, padding: 10 },
  msgAuthor:    { fontSize: 11, fontWeight: '700', marginBottom: 3 },
  msgBody:      { fontSize: 13, lineHeight: 19 },
  msgDate:      { fontSize: 10, marginTop: 4, textAlign: 'right' },
  inputRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: S.hairlineWidth },
  input:        { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, maxHeight: 100 },
  sendBtn:      { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});

export default TaskChatter;
