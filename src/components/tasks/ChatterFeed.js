import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../services/api/httpClient';
import { useTheme } from '../../theme/ThemeContext';

const MessageBubble = ({ message }) => {
  const { colors } = useTheme();
  const date = message.created_at
    ? new Date(message.created_at).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : '';

  return (
    <View style={[s.bubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.bubbleHeader}>
        <View style={[s.avatar, { backgroundColor: colors.primary + '25' }]}>
          <Text style={[s.avatarText, { color: colors.primary }]}>
            {(message.author_name || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.authorName, { color: colors.text }]}>
            {message.author_name || 'Unknown'}
          </Text>
          <Text style={[s.messageDate, { color: colors.textLight }]}>{date}</Text>
        </View>
      </View>
      <Text style={[s.messageBody, { color: colors.text }]}>{message.body || ''}</Text>
    </View>
  );
};

const ChatterFeed = ({ taskId }) => {
  const { colors } = useTheme();
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [text,     setText]     = useState('');

  const loadMessages = useCallback(async () => {
    if (!taskId) return;
    try {
      const { data } = await api.get(`/tasks/${taskId}/comments`);
      setMessages((data || []).slice().reverse());
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const sendMessage = async () => {
    if (!text.trim() || !taskId) return;
    setSending(true);
    try {
      await api.post(`/tasks/${taskId}/comments`, { body: text.trim() });
      setText('');
      await loadMessages();
    } catch {
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={s.loaderContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[s.container, { backgroundColor: colors.background }]}>

      <FlatList
        data={messages}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <MessageBubble message={item} />}
        inverted
        contentContainerStyle={s.listContent}
        ListEmptyComponent={
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>
            No comments yet — start the conversation!
          </Text>
        }
      />

      <View style={[s.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          style={[s.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
          value={text}
          onChangeText={setText}
          placeholder="Write a comment..."
          placeholderTextColor={colors.textLight}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[s.sendBtn, { backgroundColor: text.trim() && !sending ? colors.primary : colors.border }]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}>
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Icon name="send" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container:       { flex: 1 },
  loaderContainer: { padding: 20, alignItems: 'center' },
  listContent:     { padding: 12, paddingBottom: 16 },
  emptyText:       { textAlign: 'center', fontSize: 14, marginTop: 24 },
  bubble:          { borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
  bubbleHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  avatar:          { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText:      { fontSize: 12, fontWeight: '800' },
  authorName:      { fontSize: 13, fontWeight: '600' },
  messageDate:     { fontSize: 11, marginTop: 1 },
  messageBody:     { fontSize: 13, lineHeight: 19 },
  inputRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input:           { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, maxHeight: 100 },
  sendBtn:         { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});

export default ChatterFeed;
