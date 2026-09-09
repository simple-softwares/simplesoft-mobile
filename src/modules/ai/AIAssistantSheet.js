import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  FlatList, ScrollView, ActivityIndicator, Animated, Platform,
  KeyboardAvoidingView, Dimensions,
} from 'react-native';

const SHEET_HEIGHT = Dimensions.get('window').height * 0.88;
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { QUESTIONS, CATEGORIES, searchQuestions } from './aiQuestions';
import httpClient from '../../services/api/httpClient';

// ── Result card ───────────────────────────────────────────────────────────────

const ResultCard = ({ result, question, onClose, colors }) => {
  const isError = !!result?.error;
  return (
    <View style={[rc.card, { backgroundColor: colors.surface, borderColor: isError ? '#FECACA' : colors.border }]}>
      <View style={rc.cardTop}>
        <View style={[rc.iconWrap, { backgroundColor: (question?.color || '#7C3AED') + '20' }]}>
          <Icon name={question?.icon || 'sparkles'} size={18} color={question?.color || '#7C3AED'} />
        </View>
        <Text style={[rc.questionText, { color: colors.textSecondary }]} numberOfLines={2}>
          {question?.text}
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="close" size={16} color={colors.textLight} />
        </TouchableOpacity>
      </View>
      {result?.loading ? (
        <View style={rc.loading}>
          <ActivityIndicator size="small" color={question?.color || '#7C3AED'} />
          <Text style={[rc.loadingText, { color: colors.textSecondary }]}>Fetching data…</Text>
        </View>
      ) : isError ? (
        <Text style={rc.errorText}>{result.error}</Text>
      ) : (
        <View>
          <Text style={[rc.value, { color: question?.color || '#7C3AED' }]}>{result?.value ?? '—'}</Text>
          {result?.sub ? <Text style={[rc.sub, { color: colors.textSecondary }]}>{result.sub}</Text> : null}
        </View>
      )}
    </View>
  );
};

const rc = StyleSheet.create({
  card:         { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  iconWrap:     { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  questionText: { flex: 1, fontSize: 13, lineHeight: 18 },
  loading:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText:  { fontSize: 13 },
  errorText:    { fontSize: 13, color: '#EF4444' },
  value:        { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  sub:          { fontSize: 12, marginTop: 2 },
});

// ── Quick Insights tab ────────────────────────────────────────────────────────

const InsightsTab = ({ colors }) => {
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('all');
  const [result,   setResult]   = useState(null);
  const [activeQ,  setActiveQ]  = useState(null);

  const handleQuestion = useCallback(async (q) => {
    setActiveQ(q);
    setResult({ loading: true });
    try {
      const data = await q.exec();
      setResult(data);
    } catch (e) {
      setResult({ error: e.message || 'Data unavailable' });
    }
  }, []);

  const clearResult = () => { setResult(null); setActiveQ(null); };
  const filtered = searchQuestions(search, category);

  return (
    <View style={{ flex: 1 }}>
      {/* Search */}
      <View style={[ins.searchRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
        <Icon name="search-outline" size={14} color={colors.textSecondary} />
        <TextInput
          style={[ins.searchInput, { color: colors.text }]}
          placeholder="Search questions…"
          placeholderTextColor={colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close-circle" size={15} color={colors.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ins.chips}
        style={ins.chipsScroll}>
        {CATEGORIES.map(cat => {
          const active = category === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[ins.chip, active ? { backgroundColor: cat.color } : { backgroundColor: '#0000000A' }]}
              onPress={() => setCategory(cat.key)}>
              <Icon name={cat.icon} size={11} color={active ? '#fff' : colors.textSecondary} />
              <Text style={[ins.chipText, { color: active ? '#fff' : colors.textSecondary }]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Result card */}
      {activeQ ? (
        <View style={{ paddingTop: 4 }}>
          <ResultCard result={result} question={activeQ} onClose={clearResult} colors={colors} />
        </View>
      ) : null}

      {/* Questions list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[ins.row, { borderBottomColor: colors.border }]}
            onPress={() => handleQuestion(item)}
            activeOpacity={0.7}>
            <View style={[ins.dot, { backgroundColor: item.color + '20' }]}>
              <Icon name={item.icon} size={13} color={item.color} />
            </View>
            <Text style={[ins.rowText, { color: colors.text }]}>{item.text}</Text>
            <Icon name="chevron-forward" size={13} color={colors.textLight} />
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        ListEmptyComponent={
          <Text style={[ins.emptyText, { color: colors.textSecondary }]}>No questions match "{search}"</Text>
        }
      />
    </View>
  );
};

const ins = StyleSheet.create({
  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  chipsScroll: { flexGrow: 0, marginBottom: 10 },
  chips:       { gap: 6 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  chipText:    { fontSize: 11, fontWeight: '600' },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  dot:         { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowText:     { flex: 1, fontSize: 14 },
  emptyText:   { fontSize: 14, textAlign: 'center', paddingVertical: 32 },
});

// ── Chat AI tab ───────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Summarize this month's sales performance",
  "Which leads are in the pipeline?",
  "How many overdue tasks do we have?",
  "Show me recent invoice totals",
  "What's our total contact count?",
  "How many employees are in the system?",
];

const ChatTab = ({ colors, aiConfig }) => {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const listRef = useRef(null);

  const send = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput('');
    setSending(true);
    const history = messages.map(m => ({ role: m.role, content: m.text }));
    setMessages(prev => [
      ...prev,
      { id: Date.now(),   role: 'user',      text: msg },
      { id: Date.now()+1, role: 'assistant', text: null, pending: true },
    ]);
    try {
      const res = await httpClient.post('/workspace/ai/ask', { question: msg, messages: history });
      const answer = res.data?.status === 'success'
        ? res.data.answer
        : (res.data?.message || 'Something went wrong.');
      setMessages(prev => prev.map(m => m.pending ? { ...m, pending: false, text: answer } : m));
    } catch (e) {
      const err = e.response?.data?.detail || e.message || 'Request failed.';
      setMessages(prev => prev.map(m => m.pending ? { ...m, pending: false, text: `Error: ${err}` } : m));
    } finally {
      setSending(false);
    }
  }, [input, messages, sending]);

  const isEmpty = messages.length === 0;

  return (
    <View style={{ flex: 1 }}>
      {isEmpty ? (
        <ScrollView
          contentContainerStyle={ch.suggestWrap}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={[ch.heroIcon, { backgroundColor: '#2563EB15' }]}>
            <Icon name="sparkles" size={22} color="#2563EB" />
          </View>
          <Text style={[ch.heroTitle, { color: colors.text }]}>Ask anything about your business</Text>
          <Text style={[ch.heroSub, { color: colors.textSecondary }]}>
            Powered by SimpleSoft AI
          </Text>
          <Text style={[ch.suggestLabel, { color: colors.textLight }]}>Try asking</Text>
          <View style={ch.suggests}>
            {SUGGESTIONS.map((sug, i) => (
              <TouchableOpacity
                key={i}
                style={[ch.suggestChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => send(sug)}
                activeOpacity={0.7}>
                <Text style={[ch.suggestText, { color: colors.text }]}>{sug}</Text>
                <Icon name="chevron-forward" size={13} color={colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={ch.chatList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[ch.bubble,
              item.role === 'user'
                ? [ch.bubbleUser, { backgroundColor: '#2563EB' }]
                : [ch.bubbleBot, { backgroundColor: colors.surface, borderColor: colors.border }],
            ]}>
              {item.pending ? (
                <View style={ch.typingRow}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={[ch.typingText, { color: colors.textSecondary }]}>Thinking…</Text>
                </View>
              ) : (
                <Text style={[ch.bubbleText, { color: item.role === 'user' ? '#fff' : colors.text }]}>
                  {item.text}
                </Text>
              )}
            </View>
          )}
        />
      )}

      {/* Input bar */}
      <View style={[ch.inputBar, { borderTopColor: colors.border }]}>
        {!isEmpty && (
          <TouchableOpacity style={ch.newConvBtn} onPress={() => setMessages([])}>
            <Icon name="refresh-outline" size={11} color={colors.textLight} />
            <Text style={[ch.newConvText, { color: colors.textLight }]}>New conversation</Text>
          </TouchableOpacity>
        )}
        <View style={ch.inputRow}>
          <TextInput
            style={[ch.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask something…"
            placeholderTextColor={colors.textLight}
            multiline
            maxLength={500}
            blurOnSubmit
            onSubmitEditing={() => send()}
            editable={!sending}
          />
          <TouchableOpacity
            style={[ch.sendBtn, { backgroundColor: (input.trim() && !sending) ? '#2563EB' : colors.inputBackground }]}
            onPress={() => send()}
            disabled={!input.trim() || sending}
            activeOpacity={0.85}>
            {sending
              ? <ActivityIndicator size="small" color="#2563EB" />
              : <Icon name="arrow-up" size={16} color={input.trim() ? '#fff' : colors.textLight} />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const ch = StyleSheet.create({
  suggestWrap:    { padding: 4, paddingBottom: 32 },
  heroIcon:       { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10 },
  heroTitle:      { fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  heroSub:        { fontSize: 12, textAlign: 'center', marginBottom: 20 },
  suggestLabel:   { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  suggests:       { gap: 6 },
  suggestChip:    { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  suggestText:    { flex: 1, fontSize: 13, lineHeight: 18 },
  chatList:       { padding: 4, paddingBottom: 8, gap: 10 },
  bubble:         { maxWidth: '85%', padding: 12, borderRadius: 18 },
  bubbleUser:     { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleBot:      { alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  bubbleText:     { fontSize: 14, lineHeight: 20 },
  typingRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText:     { fontSize: 13 },
  inputBar:       { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 6 },
  newConvBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  newConvText:    { fontSize: 11, fontWeight: '600' },
  inputRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input:          { flex: 1, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn:        { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
});

// ── Main sheet ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'insights', label: 'Quick Insights' },
  { key: 'chat',     label: 'Chat AI'        },
];

const AIAssistantSheet = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const [tab,      setTab]      = useState('insights');
  const [aiConfig, setAiConfig] = useState(null);

  useEffect(() => {
    if (visible && !aiConfig) {
      httpClient.get('/workspace/ai-config').then(r => setAiConfig(r.data)).catch(() => {});
    }
  }, [visible]);

  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 280, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 0,   duration: 220, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setTab('insights'), 300);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Backdrop */}
        <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[s.sheet, { backgroundColor: colors.background, transform: [{ translateY: slideAnim }] }]}>

          {/* Handle */}
          <View style={[s.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerIcon}>
              <Icon name="sparkles" size={14} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.headerTitle, { color: colors.text }]}>AI Assistant</Text>
              <Text style={[s.headerSub,   { color: colors.textSecondary }]}>Quick insights &amp; chat</Text>
            </View>
            {aiConfig && (() => {
              const used  = aiConfig.messages_used  ?? 0;
              const limit = aiConfig.messages_limit ?? 500;
              const pct   = limit > 0 ? used / limit : 0;
              const bg    = pct >= 0.9 ? '#FEE2E2' : pct >= 0.7 ? '#FEF3C7' : '#EDE9FE';
              const fg    = pct >= 0.9 ? '#DC2626' : pct >= 0.7 ? '#D97706' : '#7C3AED';
              return (
                <View style={[s.usagePill, { backgroundColor: bg }]}>
                  <Text style={[s.usageText, { color: fg }]}>{used}/{limit}</Text>
                </View>
              );
            })()}
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Icon name="close" size={16} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Underline tabs */}
          <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
            {TABS.map(t => {
              const active = tab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[s.tabBtn, active && { borderBottomColor: '#7C3AED', borderBottomWidth: 2 }]}
                  onPress={() => setTab(t.key)}
                  activeOpacity={0.8}>
                  <Text style={[s.tabBtnText, { color: active ? '#7C3AED' : colors.textSecondary }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab content */}
          <View style={[s.content, { paddingBottom: Platform.OS === 'ios' ? 34 : 12 }]}>
            {tab === 'insights'
              ? <InsightsTab colors={colors} />
              : <ChatTab colors={colors} aiConfig={aiConfig} />}
          </View>

        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position:             'absolute',
    bottom: 0, left: 0, right: 0,
    height:               SHEET_HEIGHT,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    shadowColor:          '#000',
    shadowOffset:         { width: 0, height: -4 },
    shadowOpacity:        0.12,
    shadowRadius:         12,
    elevation:            16,
  },
  handle:       { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  headerIcon:   { width: 30, height: 30, borderRadius: 9, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 14, fontWeight: '700' },
  headerSub:    { fontSize: 11 },
  closeBtn:     { padding: 4 },
  usagePill:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginRight: 6 },
  usageText:    { fontSize: 11, fontWeight: '700' },
  tabBar:       { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  tabBtn:       { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnText:   { fontSize: 13, fontWeight: '600' },
  content:      { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
});

export default AIAssistantSheet;
