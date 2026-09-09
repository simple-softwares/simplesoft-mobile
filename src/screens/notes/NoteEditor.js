import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, Alert, KeyboardAvoidingView,
  Platform, Modal, ActivityIndicator, Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import NotesService, { mkBlk } from '../../services/notes/notesService';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, layout } from '../../theme/spacing';
import typography from '../../theme/typography';
import { undoDelete } from '../../utils/undoDelete';

// ── Note background (light + dark variants) ───────────────────
const NOTE_BG_LIGHT = {
  0: '#FFFFFF', 1: '#FFFDE7', 2: '#F3E5F5',
  3: '#E3F2FD', 4: '#E8F5E9', 5: '#FBE9E7', 6: '#E0F7FA', 7: '#FFF8E1',
};
const NOTE_BG_DARK = {
  0: '#16161F', 1: '#1C1A08', 2: '#180E22',
  3: '#0A1520', 4: '#0A1A0C', 5: '#1C0E0A', 6: '#081A1C', 7: '#1C1800',
};
const NOTE_BORDER_LIGHT = {
  0: '#E5E7EB', 1: '#FDD835', 2: '#CE93D8',
  3: '#90CAF9', 4: '#A5D6A7', 5: '#FFAB91', 6: '#80DEEA', 7: '#FFE082',
};
const NOTE_BORDER_DARK = {
  0: '#2A2A3A', 1: '#3A320A', 2: '#3A1550',
  3: '#0D2A4A', 4: '#0D3A10', 5: '#3A1A0D', 6: '#0D2E30', 7: '#3A2E00',
};

const COLOR_NAMES = ['White','Yellow','Purple','Blue','Green','Orange','Cyan','Amber'];

const TOOLS = [
  { type: 'text',    icon: 'text-outline',       label: 'Text',    color: '#9090AA' },
  { type: 'h1',      icon: 'text',               label: 'H1',      color: '#2563EB' },
  { type: 'h2',      icon: 'text-outline',        label: 'H2',      color: '#6366F1' },
  { type: 'todo',    icon: 'checkbox-outline',    label: 'Todo',    color: '#059669' },
  { type: 'code',    icon: 'code-slash-outline',  label: 'Code',    color: '#7C3AED' },
  { type: 'divider', icon: 'remove-outline',      label: 'Line',    color: '#9090AA' },
];

// Block accent colours (always shown, not theme-dependent)
const BLOCK_ACCENT = {
  h1:      { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  h2:      { color: '#6366F1', bg: 'rgba(99,102,241,0.08)' },
  todo:    { color: '#059669', bg: 'rgba(5,150,105,0.06)'  },
  code:    { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
  divider: { color: '#9090AA', bg: 'transparent'            },
  text:    { color: '#9090AA', bg: 'transparent'            },
};

// ── Block component ───────────────────────────────────────────
const Block = React.memo(({ block, isFocused, colors, onFocus, onChange, onToggle, onDelete, onEnter, onMdShortcut, inputRefs }) => {
  const acc = BLOCK_ACCENT[block.type] || BLOCK_ACCENT.text;

  if (block.type === 'divider') {
    return (
      <TouchableOpacity onLongPress={() => Alert.alert('Remove divider', '', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onDelete(block.id) },
      ])}>
        <View style={st.dividerWrap}>
          <View style={[st.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[st.dividerLabel, { color: colors.textLight }]}>─ divider ─</Text>
          <View style={[st.dividerLine, { backgroundColor: colors.border }]} />
        </View>
      </TouchableOpacity>
    );
  }

  const isCode  = block.type === 'code';
  const isH1    = block.type === 'h1';
  const isH2    = block.type === 'h2';
  const isTodo  = block.type === 'todo';

  return (
    <View style={[
      st.blockWrap,
      isFocused && { backgroundColor: acc.bg },
      isCode     && [st.blockCode, { backgroundColor: colors.card, borderColor: colors.border }],
      (isH1 || isH2) && { borderLeftWidth: 3, borderLeftColor: acc.color },
    ]}>

      {/* Left indicator */}
      {isTodo ? (
        <TouchableOpacity onPress={() => onToggle(block.id)} style={st.blockLeft}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Icon
            name={block.checked ? 'checkbox' : 'square-outline'} size={22}
            color={block.checked ? '#059669' : colors.border}
          />
        </TouchableOpacity>
      ) : isH1 || isH2 ? (
        <View style={st.blockLeft}>
          <View style={[st.hBadge, { backgroundColor: acc.color + '20' }]}>
            <Text style={[st.hBadgeText, { color: acc.color }]}>{isH1 ? 'H1' : 'H2'}</Text>
          </View>
        </View>
      ) : isCode ? (
        <View style={st.blockLeft}>
          <Icon name="code-slash-outline" size={13} color={acc.color} />
        </View>
      ) : (
        <View style={st.blockLeftSpacer} />
      )}

      {/* Input */}
      <TextInput
        ref={ref => { if (inputRefs) inputRefs.current[block.id] = ref; }}
        style={[
          st.blockInput,
          { color: block.checked ? colors.textLight : colors.text },
          isH1   && st.blockH1,
          isH2   && st.blockH2,
          isCode && [st.blockCodeInput, { color: acc.color }],
          block.checked && st.blockStrike,
        ]}
        value={block.content}
        onChangeText={t => {
          // Markdown shortcuts
          if (!isCode) {
            if      (t === '# ')     return onMdShortcut(block.id, 'h1');
            else if (t === '## ')    return onMdShortcut(block.id, 'h2');
            else if (t === '- ')     return onMdShortcut(block.id, 'todo');
            else if (t === '---')    return onMdShortcut(block.id, 'divider');
          }
          onChange(block.id, t);
        }}
        onFocus={() => onFocus(block.id)}
        placeholder={
          isH1   ? 'Heading 1'    :
          isH2   ? 'Heading 2'    :
          isTodo ? 'To-do item'   :
          isCode ? '// code here' : 'Start writing...'
        }
        placeholderTextColor={isCode ? acc.color + '60' : colors.textLight}
        multiline={!isTodo && !isH1 && !isH2}
        onSubmitEditing={() => onEnter(block.id, block.type)}
        blurOnSubmit={false}
        returnKeyType="default"
        scrollEnabled={false}
        autoCorrect={!isCode}
        autoCapitalize={isCode ? 'none' : 'sentences'}
      />

      {/* Delete (focused only) */}
      {isFocused && (
        <TouchableOpacity onPress={() => onDelete(block.id)} style={st.blockDel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
          <Icon name="close-circle" size={15} color={colors.textLight} />
        </TouchableOpacity>
      )}
    </View>
  );
});

// ── Bottom sheet ──────────────────────────────────────────────
const Sheet = ({ visible, onClose, title, children }) => {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={st.sheetOverlay} onPress={onClose} activeOpacity={1} />
      <View style={[st.sheetCard, { backgroundColor: colors.surface }]}>
        <View style={[st.sheetHandle, { backgroundColor: colors.border }]} />
        <Text style={[st.sheetTitle, { color: colors.text }]}>{title}</Text>
        {children}
      </View>
    </Modal>
  );
};

// ── Main editor ───────────────────────────────────────────────
const NoteEditor = ({ route, navigation }) => {
  const { colors, isDark } = useTheme();
  const { noteId, isNew } = route?.params || {};

  const [note,       setNote]       = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saveErr,    setSaveErr]    = useState(false);
  const [focusedId,  setFocusedId]  = useState(null);
  const [showColors, setShowColors] = useState(false);
  const [showCat,    setShowCat]    = useState(false);
  const [tagInput,   setTagInput]   = useState('');

  const saveTimer  = useRef(null);
  const inputRefs  = useRef({});
  const scrollRef  = useRef(null);
  const latestNote = useRef(null);

  const BG     = isDark ? NOTE_BG_DARK     : NOTE_BG_LIGHT;
  const BORDER = isDark ? NOTE_BORDER_DARK : NOTE_BORDER_LIGHT;

  // ── Load ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [n, cats] = await Promise.all([
        NotesService.get(noteId),
        NotesService.getCategories(),
      ]);
      if (n) { setNote(n); latestNote.current = n; }
      setCategories(cats);
      setLoading(false);
    })();
    return () => clearTimeout(saveTimer.current);
  }, [noteId]);

  // ── Header ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!note) return;
    const cat = categories.find(c => c.id === note.category_id);
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity onPress={() => setShowCat(true)} style={st.headerTitle}>
          {cat ? (
            <>
              <View style={[st.headerCatDot, { backgroundColor: cat.color }]} />
              <Text style={[st.headerTitleText, { color: colors.text }]}>{cat.name}</Text>
            </>
          ) : (
            <Text style={[st.headerTitleMuted, { color: colors.textSecondary }]}>No category</Text>
          )}
          <Icon name="chevron-down" size={13} color={colors.textLight} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 4 }}>
          {saving   && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 6 }} />}
          {saveErr  && <Icon name="cloud-offline-outline" size={16} color={colors.error} style={{ marginRight: 8 }} />}
          {!saving && !saveErr && <Icon name="cloud-done-outline" size={16} color={colors.success} style={{ marginRight: 8 }} />}
          <TouchableOpacity onPress={() => setShowColors(true)} style={st.hBtn}>
            <View style={[st.colorDot, { backgroundColor: BG[note.color] || BG[0], borderColor: BORDER[note.color] || BORDER[0] }]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => mutate({ is_pinned: !note.is_pinned })} style={st.hBtn}>
            <Icon name={note.is_pinned ? 'pin' : 'pin-outline'} size={20}
              color={note.is_pinned ? '#FF9800' : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={st.hBtn}>
            <Icon name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [note, categories, saving, saveErr, isDark]);

  // ── Optimistic mutate + debounced save ────────────────────────
  const mutate = useCallback((patch) => {
    setNote(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch, updated_at: new Date().toISOString() };
      latestNote.current = next;
      scheduleSave();
      return next;
    });
  }, []);

  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    setSaveErr(false);
    saveTimer.current = setTimeout(async () => {
      if (!latestNote.current) return;
      setSaving(true);
      try {
        await NotesService.save(noteId, latestNote.current);
      } catch (e) {
        setSaveErr(true);
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [noteId]);

  // ── Block mutations ────────────────────────────────────────────
  const onTitleChange   = t => mutate({ title: t });
  const onBlockChange   = (id, content) => {
    mutate({ blocks: latestNote.current.blocks.map(b => b.id === id ? { ...b, content } : b) });
  };
  const onToggle = id => {
    mutate({ blocks: latestNote.current.blocks.map(b => b.id === id ? { ...b, checked: !b.checked } : b) });
  };

  const onMdShortcut = (blockId, newType) => {
    if (newType === 'divider') {
      // Replace block with divider
      mutate({ blocks: latestNote.current.blocks.map(b => b.id === blockId ? mkBlk('divider') : b) });
    } else {
      mutate({ blocks: latestNote.current.blocks.map(b =>
        b.id === blockId ? { ...b, type: newType, content: '' } : b
      )});
    }
  };

  const onEnter = (blockId, type) => {
    const newBlock = mkBlk(type === 'h1' || type === 'h2' ? 'text' : type);
    const blocks   = [...latestNote.current.blocks];
    const idx      = blocks.findIndex(b => b.id === blockId);
    blocks.splice(idx + 1, 0, newBlock);
    mutate({ blocks });
    setTimeout(() => inputRefs.current[newBlock.id]?.focus(), 80);
  };

  const onDeleteBlock = blockId => {
    if (!latestNote.current || latestNote.current.blocks.length <= 1) return;
    const blocks = latestNote.current.blocks.filter(b => b.id !== blockId);
    mutate({ blocks });
    // Focus previous block
    const cur = latestNote.current.blocks;
    const idx = cur.findIndex(b => b.id === blockId);
    if (idx > 0) setTimeout(() => inputRefs.current[cur[idx - 1].id]?.focus(), 60);
  };

  const addBlock = type => {
    const newBlock = mkBlk(type);
    const blocks   = [...latestNote.current.blocks];
    const idx      = focusedId ? blocks.findIndex(b => b.id === focusedId) : blocks.length - 1;
    blocks.splice(idx + 1, 0, newBlock);
    mutate({ blocks });
    setTimeout(() => { if (type !== 'divider') inputRefs.current[newBlock.id]?.focus(); }, 80);
  };

  const handleDelete = () => {
    clearTimeout(saveTimer.current);
    navigation.goBack();
    undoDelete(
      'Note',
      () => NotesService.delete(noteId),
      () => navigation.push('NoteEditor', { noteId }),
    );
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!t || note.tags.includes(t)) return;
    mutate({ tags: [...note.tags, t] });
    setTagInput('');
  };

  // ── Derived stats ──────────────────────────────────────────────
  const wordCount  = note?.blocks.reduce((n, b) => n + (b.content?.split(/\s+/).filter(Boolean).length || 0), 0) || 0;
  const blockCount = note?.blocks.length || 0;
  const focBlock   = note?.blocks.find(b => b.id === focusedId);

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[st.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!note) return null;

  const bg = BG[note.color] ?? BG[0];
  const cat = categories.find(c => c.id === note.category_id);

  return (
    <KeyboardAvoidingView style={[st.container, { backgroundColor: bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      <ScrollView ref={scrollRef} style={st.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.scrollContent}>

        {/* ── Category strip ── */}
        {cat && <View style={[st.catStrip, { backgroundColor: cat.color }]} />}

        {/* ── Title ── */}
        <TextInput
          style={[st.title, { color: colors.text }]}
          value={note.title}
          onChangeText={onTitleChange}
          placeholder="Untitled"
          placeholderTextColor={colors.textLight}
          multiline
          onFocus={() => setFocusedId(null)}
        />

        {/* ── Tags row ── */}
        <View style={st.tagsRow}>
          {note.tags.map(tag => (
            <TouchableOpacity key={tag}
              style={[st.tagPill, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '30' }]}
              onPress={() => mutate({ tags: note.tags.filter(t => t !== tag) })}>
              <Text style={[st.tagPillText, { color: colors.primary }]}>#{tag}</Text>
              <Icon name="close" size={9} color={colors.primary} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          ))}
          <View style={st.tagInputRow}>
            <Text style={[st.tagHash, { color: colors.textLight }]}>#</Text>
            <TextInput
              style={[st.tagInput, { color: colors.text }]}
              value={tagInput} onChangeText={setTagInput}
              placeholder="tag" placeholderTextColor={colors.textLight}
              onSubmitEditing={addTag} returnKeyType="done"
              autoCapitalize="none" blurOnSubmit={false}
            />
          </View>
        </View>

        {/* ── Meta bar ── */}
        <View style={[st.metaBar, { borderTopColor: colors.divider, borderBottomColor: colors.divider }]}>
          <Icon name="text-outline" size={11} color={colors.textLight} />
          <Text style={[st.metaText, { color: colors.textLight }]}>{wordCount} words · {blockCount} blocks</Text>
          {focBlock && focBlock.type !== 'text' && (
            <View style={[st.blockTypeBadge, { backgroundColor: BLOCK_ACCENT[focBlock.type]?.color + '18' }]}>
              <Text style={[st.blockTypeBadgeText, { color: BLOCK_ACCENT[focBlock.type]?.color }]}>
                {focBlock.type.toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[st.metaDate, { color: colors.textLight }]}>
            {new Date(note.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </Text>
        </View>

        {/* ── Hint for markdown shortcuts ── */}
        {isNew && blockCount <= 1 && (
          <View style={[st.hintRow, { backgroundColor: colors.primary + '0C' }]}>
            <Icon name="flash-outline" size={11} color={colors.primary} />
            <Text style={[st.hintText, { color: colors.primary }]}>
              Tip: type <Text style={{ fontWeight: '700' }}># </Text>for H1,
              {' '}<Text style={{ fontWeight: '700' }}>## </Text>for H2,
              {' '}<Text style={{ fontWeight: '700' }}>- </Text>for todo
            </Text>
          </View>
        )}

        {/* ── Blocks ── */}
        {note.blocks.map(block => (
          <Block
            key={block.id}
            block={block}
            isFocused={focusedId === block.id}
            colors={colors}
            onFocus={setFocusedId}
            onChange={onBlockChange}
            onToggle={onToggle}
            onDelete={onDeleteBlock}
            onEnter={onEnter}
            onMdShortcut={onMdShortcut}
            inputRefs={inputRefs}
          />
        ))}

        <View style={{ height: 180 }} />
      </ScrollView>

      {/* ── Toolbar ── */}
      <View style={[st.toolbar, { backgroundColor: bg, borderTopColor: colors.divider }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.toolbarInner} keyboardShouldPersistTaps="always">
          {TOOLS.map(t => {
            const isActive = focBlock?.type === t.type;
            return (
              <TouchableOpacity key={t.type} style={[st.toolBtn, isActive && { backgroundColor: t.color + '18' }]}
                onPress={() => addBlock(t.type)}>
                <Icon name={t.icon} size={17} color={isActive ? t.color : colors.textSecondary} />
                <Text style={[st.toolLabel, { color: isActive ? t.color : colors.textLight }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Color picker ── */}
      <Sheet visible={showColors} onClose={() => setShowColors(false)} title="Note colour">
        <View style={st.colorGrid}>
          {Array.from({ length: 8 }, (_, i) => (
            <TouchableOpacity key={i}
              style={[st.colorSwatch, {
                backgroundColor: BG[i],
                borderColor: note.color === i ? colors.primary : BORDER[i],
                borderWidth: note.color === i ? 2 : 1,
              }]}
              onPress={() => { mutate({ color: i }); setShowColors(false); }}>
              {note.color === i && <Icon name="checkmark" size={16} color={colors.primary} />}
              <Text style={[st.colorSwatchLabel, { color: note.color === i ? colors.primary : colors.textSecondary }]}>
                {COLOR_NAMES[i]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Sheet>

      {/* ── Category picker ── */}
      <Sheet visible={showCat} onClose={() => setShowCat(false)} title="Category">
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={[st.catRow, { borderBottomColor: colors.divider }]}
            onPress={() => { mutate({ category_id: null }); setShowCat(false); }}>
            <View style={[st.catRowIcon, { backgroundColor: colors.border }]}>
              <Icon name="close-outline" size={16} color={colors.textSecondary} />
            </View>
            <Text style={[st.catRowText, { color: colors.text }]}>No category</Text>
            {!note.category_id && <Icon name="checkmark" size={16} color={colors.primary} />}
          </TouchableOpacity>
          {categories.map(c => (
            <TouchableOpacity key={c.id}
              style={[st.catRow, { borderBottomColor: colors.divider }]}
              onPress={() => { mutate({ category_id: note.category_id === c.id ? null : c.id }); setShowCat(false); }}>
              <View style={[st.catRowIcon, { backgroundColor: c.color + '22' }]}>
                <Icon name={c.icon} size={16} color={c.color} />
              </View>
              <Text style={[st.catRowText, { color: colors.text }]}>{c.name}</Text>
              {note.category_id === c.id && <Icon name="checkmark" size={16} color={c.color} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Sheet>

    </KeyboardAvoidingView>
  );
};

// ── Styles ────────────────────────────────────────────────────
const st = StyleSheet.create({
  container:    { flex: 1 },
  scroll:       { flex: 1 },
  scrollContent:{ paddingBottom: 20 },
  catStrip:     { height: 4 },

  // Title
  title: {
    fontSize: 26, fontWeight: '800', lineHeight: 34,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4,
  },

  // Tags
  tagsRow:     { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 4, gap: 6 },
  tagPill:     { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 3 },
  tagPillText: { fontSize: 11, fontWeight: '600' },
  tagInputRow: { flexDirection: 'row', alignItems: 'center' },
  tagHash:     { fontSize: 13, fontWeight: '600' },
  tagInput:    { fontSize: 13, minWidth: 50, paddingVertical: 2, paddingLeft: 1 },

  // Meta bar
  metaBar:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, marginTop: 6 },
  metaText:     { fontSize: 11, flex: 1 },
  metaDate:     { fontSize: 11 },
  blockTypeBadge:{ borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  blockTypeBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // Hint
  hintRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 8, marginHorizontal: 12, marginTop: 8, borderRadius: 8 },
  hintText: { fontSize: 11, flex: 1, lineHeight: 16 },

  // Blocks
  blockWrap: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 1,
    marginHorizontal: 8, marginVertical: 1,
    borderRadius: 8,
  },
  blockCode: {
    borderWidth: 1, borderRadius: 10,
    marginHorizontal: 12, marginVertical: 4,
    paddingTop: 4, paddingBottom: 4,
  },
  blockLeft:        { width: 32, alignItems: 'center', paddingTop: 10 },
  blockLeftSpacer:  { width: 12 },
  blockInput:       { flex: 1, fontSize: 16, lineHeight: 26, paddingVertical: 6, paddingRight: 8 },
  blockH1:          { fontSize: 22, fontWeight: '800', lineHeight: 32 },
  blockH2:          { fontSize: 18, fontWeight: '700', lineHeight: 28 },
  blockCodeInput:   { fontFamily: 'monospace', fontSize: 13, lineHeight: 22 },
  blockStrike:      { textDecorationLine: 'line-through', opacity: 0.45 },
  blockDel:         { paddingTop: 10, paddingLeft: 4 },

  hBadge:     { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  hBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },

  dividerWrap:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  dividerLine:  { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontSize: 10, fontWeight: '500' },

  // Toolbar
  toolbar:      { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 2 },
  toolbarInner: { paddingHorizontal: 6, gap: 2, alignItems: 'center' },
  toolBtn:      { alignItems: 'center', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, gap: 2 },
  toolLabel:    { fontSize: 9, fontWeight: '600' },

  // Header
  hBtn:           { padding: 8 },
  headerTitle:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  headerTitleText:  { fontSize: 14, fontWeight: '600' },
  headerTitleMuted: { fontSize: 14 },
  headerCatDot:   { width: 8, height: 8, borderRadius: 4 },
  colorDot:       { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5 },

  // Sheets
  sheetOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', position: 'absolute' },
  sheetCard:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: 40 },
  sheetHandle:  { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:   { fontSize: typography.h5, fontWeight: '700', marginBottom: spacing.lg },

  colorGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch:      { width: 72, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 2 },
  colorSwatchLabel: { fontSize: 9, fontWeight: '600' },

  catRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  catRowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catRowText: { flex: 1, fontSize: typography.body2, fontWeight: '500' },
});

export default NoteEditor;
