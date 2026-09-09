import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ScrollView, Animated, Dimensions, Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect, DrawerActions } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import NotesService, { mkBlk } from '../../services/notes/notesService';
import { useTheme } from '../../theme/ThemeContext';
import spacing, { layout } from '../../theme/spacing';
import typography from '../../theme/typography';
import { SkeletonNoteGrid } from '../../components/common/SkeletonLoader';
import { usePermissions } from '../../hooks/usePermissions';

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - spacing.md * 2 - 10) / 2;

const BG_LIGHT = { 0:'#FFFFFF',1:'#FFFDE7',2:'#F3E5F5',3:'#E3F2FD',4:'#E8F5E9',5:'#FBE9E7',6:'#E0F7FA',7:'#FFF8E1' };
const BG_DARK  = { 0:'#1E1E2A',1:'#1C1A08',2:'#180E22',3:'#0A1520',4:'#0A1A0C',5:'#1C0E0A',6:'#081A1C',7:'#1C1800' };

const PRESET_COLORS = ['#7C3AED','#2563EB','#D97706','#059669','#DC2626','#0891B2','#BE185D','#9333EA'];
const PRESET_ICONS  = [
  'folder-outline','briefcase-outline','bulb-outline','book-outline',
  'heart-outline','wallet-outline','people-outline','construct-outline',
  'journal-outline','cart-outline','airplane-outline','search-outline',
];

// ── Note card ─────────────────────────────────────────────────
const NoteCard = ({ note, category, onPress, onLongPress }) => {
  const { colors, isDark } = useTheme();
  const BG = isDark ? BG_DARK : BG_LIGHT;
  const preview = note.blocks.filter(b => b.type !== 'divider' && b.content).slice(0, 5);
  const todos   = note.blocks.filter(b => b.type === 'todo');
  const done    = todos.filter(b => b.checked).length;

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: BG[note.color] ?? BG[0], width: CARD_W, borderColor: colors.border }]}
      onPress={onPress} onLongPress={onLongPress} activeOpacity={0.82}>

      {category && <View style={[s.catStrip, { backgroundColor: category.color }]} />}
      {note.is_pinned && <View style={s.pinDot}><Icon name="pin" size={9} color="#FF9800" /></View>}

      {!!note.title && <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={2}>{note.title}</Text>}

      {preview.map(b => (
        <View key={b.id} style={s.previewRow}>
          {b.type === 'todo' && (
            <Icon name={b.checked ? 'checkbox' : 'square-outline'} size={11}
              color={b.checked ? colors.success : '#BDBDBD'} style={{ marginRight: 3, marginTop: 1 }} />
          )}
          <Text numberOfLines={1} style={[
            b.type === 'h1' ? s.pH1 : b.type === 'h2' ? s.pH2 : b.type === 'code' ? s.pCode : s.pText,
            { color: b.type === 'code' ? '#7C3AED' : colors.textSecondary, ...(b.type === 'code' && { backgroundColor: colors.primary + '10' }) },
            b.checked && s.pStrike,
          ]}>
            {b.content}
          </Text>
        </View>
      ))}

      {todos.length > 0 && (
        <View style={s.progressRow}>
          <View style={[s.progressBar, { backgroundColor: colors.border }]}>
            <View style={[s.progressFill, {
              width: `${todos.length ? Math.round((done / todos.length) * 100) : 0}%`,
              backgroundColor: done === todos.length ? colors.success : colors.primary,
            }]} />
          </View>
          <Text style={[s.progressText, { color: colors.textSecondary }]}>{done}/{todos.length}</Text>
        </View>
      )}

      {note.tags.length > 0 && (
        <View style={s.cardTags}>
          {note.tags.slice(0, 2).map(t => (
            <Text key={t} style={[s.cardTag, { color: colors.primary }]}>#{t}</Text>
          ))}
          {note.tags.length > 2 && <Text style={[s.cardTag, { color: colors.primary }]}>+{note.tags.length - 2}</Text>}
        </View>
      )}

      <Text style={[s.cardDate, { color: colors.textLight }]}>
        {new Date(note.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      </Text>
    </TouchableOpacity>
  );
};

// ── Create note modal ─────────────────────────────────────────
const CreateModal = ({ visible, onClose, onSelect }) => {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.createOverlay} onPress={onClose} activeOpacity={1}>
        <View style={[s.createCard, { backgroundColor: colors.surface }]}>
          <Text style={[s.createTitle, { color: colors.text }]}>New note</Text>
          {[
            { type: 'text', icon: 'document-text-outline', label: 'Text note',    sub: 'Free-form writing'     },
            { type: 'todo', icon: 'checkbox-outline',       label: 'Checklist',    sub: 'Tasks with checkboxes' },
            { type: 'h1',   icon: 'text',                   label: 'Heading note', sub: 'Start with a title'    },
            { type: 'code', icon: 'code-slash-outline',     label: 'Code snippet', sub: 'Monospace code block'  },
          ].map(item => (
            <TouchableOpacity key={item.type}
              style={[s.createItem, { borderBottomColor: colors.border }]}
              onPress={() => onSelect(item.type)}>
              <View style={[s.createItemIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name={item.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.createItemLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[s.createItemSub, { color: colors.textSecondary }]}>{item.sub}</Text>
              </View>
              <Icon name="chevron-forward" size={16} color={colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ── Add category modal ────────────────────────────────────────
const AddCategoryModal = ({ visible, onClose, onSave }) => {
  const { colors } = useTheme();
  const [name,  setName]  = useState('');
  const [color, setColor] = useState('#7C3AED');
  const [icon,  setIcon]  = useState('folder-outline');
  const [busy,  setBusy]  = useState(false);

  const reset = () => { setName(''); setColor('#7C3AED'); setIcon('folder-outline'); };

  const handleSave = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await onSave({ name: name.trim(), color, icon }); reset(); onClose(); }
    finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.createOverlay} onPress={onClose} activeOpacity={1} />
      <View style={[s.sheetCard, { backgroundColor: colors.surface }]}>
        <View style={[s.sheetHandle, { backgroundColor: colors.border }]} />
        <Text style={[s.sheetTitle, { color: colors.text }]}>New category</Text>

        {/* Name */}
        <TextInput
          style={[s.catInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
          value={name} onChangeText={setName}
          placeholder="Category name" placeholderTextColor={colors.textLight}
          autoFocus
        />

        {/* Color */}
        <Text style={[s.sheetLabel, { color: colors.textSecondary }]}>Colour</Text>
        <View style={s.colorRow}>
          {PRESET_COLORS.map(c => (
            <TouchableOpacity key={c} onPress={() => setColor(c)}
              style={[s.colorDot, { backgroundColor: c }, color === c && s.colorDotActive]}>
              {color === c && <Icon name="checkmark" size={12} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Icon */}
        <Text style={[s.sheetLabel, { color: colors.textSecondary }]}>Icon</Text>
        <View style={s.iconRow}>
          {PRESET_ICONS.map(ic => (
            <TouchableOpacity key={ic} onPress={() => setIcon(ic)}
              style={[s.iconBtn,
                { backgroundColor: icon === ic ? color + '25' : colors.inputBackground },
                icon === ic && { borderColor: color, borderWidth: 1.5 },
              ]}>
              <Icon name={ic} size={18} color={icon === ic ? color : colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: colors.primary }, busy && { opacity: 0.6 }]}
          onPress={handleSave} disabled={busy || !name.trim()}>
          {busy
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveBtnText}>Save category</Text>
          }
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// ── Main screen ───────────────────────────────────────────────
const VIEW_MODES = ['notes', 'categories', 'tags'];

const NotesScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const user = useSelector(s => s.auth.user);
  const { canCreateNote, canReadNotes } = usePermissions(user?.id);
  const [notes,       setNotes]       = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [tagsData,    setTagsData]    = useState([]);
  const [search,      setSearch]      = useState('');
  const [selCat,      setSelCat]      = useState(null);
  const [selTag,      setSelTag]      = useState(null);
  const [viewMode,    setViewMode]    = useState('notes');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  const [showAddCat,  setShowAddCat]  = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const slideX = useRef(new Animated.Value(-260)).current;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [fetchedNotes, fetchedCats, fetchedTags] = await Promise.all([
        NotesService.list({ search, categoryId: selCat, tag: selTag }),
        NotesService.getCategories(),
        NotesService.getTagsWithCount(),
      ]);
      setNotes(fetchedNotes.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.updated_at) - new Date(a.updated_at);
      }));
      setCategories(fetchedCats);
      setTagsData(fetchedTags);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selCat, selTag]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const searchTimer = useRef(null);
  const onSearch = t => {
    setSearch(t);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(), 300);
  };

  const toggleSidebar = () => {
    const open = !sidebarOpen;
    setSidebarOpen(open);
    Animated.spring(slideX, { toValue: open ? 0 : -260, useNativeDriver: true, tension: 70, friction: 11 }).start();
  };
  const closeSidebar = () => {
    setSidebarOpen(false);
    Animated.spring(slideX, { toValue: -260, useNativeDriver: true, tension: 70, friction: 11 }).start();
  };

  const createNote = async type => {
    setShowCreate(false);
    try {
      const note = await NotesService.create({ category_id: selCat, firstBlockType: type });
      navigation.navigate('NoteEditor', { noteId: note.id, isNew: true });
    } catch (e) {
    }
  };

  const handleAddCategory = async (vals) => {
    await NotesService.createCategory(vals);
    load();
  };

  const handleDeleteCategory = (catId) => {
    // Optimistic: clear selection + reload
    if (selCat === catId) setSelCat(null);
    NotesService.deleteCategory(catId).then(() => load()).catch(() => {});
  };

  const togglePin = async (noteId) => {
    await NotesService.save(noteId, {
      is_pinned: !(notes.find(n => n.id === noteId)?.is_pinned),
    });
    load();
  };

  const getCat = id => categories.find(c => c.id === id);

  const noteCatCount = catId => notes.filter(n => n.category_id === catId).length;
  const pinnedCount  = notes.filter(n => n.is_pinned).length;
  const allTags      = [...new Set(notes.flatMap(n => n.tags))].sort();

  const activeFilterLabel = () => {
    if (selTag) return `#${selTag}`;
    if (selCat) { const c = getCat(selCat); return c ? c.name : null; }
    return null;
  };

  // ── Tags view ─────────────────────────────────────────────────
  const TagsView = () => (
    <ScrollView contentContainerStyle={s.tagsViewGrid}>
      <Text style={[s.tagsViewHint, { color: colors.textSecondary }]}>Tap a tag to filter notes</Text>
      {tagsData.length === 0
        ? <Text style={[s.emptyText, { color: colors.textSecondary }]}>No tags yet. Add tags while editing notes.</Text>
        : tagsData.map(({ tag, count }) => (
          <TouchableOpacity key={tag}
            style={[s.tagViewChip,
              { backgroundColor: colors.surface, borderColor: colors.border },
              selTag === tag && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => { setSelTag(selTag === tag ? null : tag); setSelCat(null); setViewMode('notes'); }}>
            <Text style={[s.tagViewText, { color: selTag === tag ? '#fff' : colors.textSecondary }]}>#{tag}</Text>
            <View style={[s.tagViewBadge, { backgroundColor: selTag === tag ? 'rgba(255,255,255,0.25)' : colors.inputBackground }]}>
              <Text style={[s.tagViewBadgeText, { color: selTag === tag ? '#fff' : colors.text }]}>{count}</Text>
            </View>
          </TouchableOpacity>
        ))
      }
    </ScrollView>
  );

  // ── Categories view ───────────────────────────────────────────
  const CategoriesView = () => (
    <ScrollView contentContainerStyle={s.catGrid}>
      {categories.map(cat => {
        const cnt    = noteCatCount(cat.id);
        const active = selCat === cat.id;
        return (
          <TouchableOpacity key={cat.id}
            style={[s.catCard,
              { backgroundColor: colors.surface, borderColor: active ? cat.color : colors.border },
              active && { borderWidth: 2 }]}
            onPress={() => { setSelCat(active ? null : cat.id); setSelTag(null); setViewMode('notes'); }}
            onLongPress={() => handleDeleteCategory(cat.id)}>
            <View style={[s.catCardIcon, { backgroundColor: cat.color + '20' }]}>
              <Icon name={cat.icon} size={22} color={cat.color} />
            </View>
            <Text style={[s.catCardName, { color: colors.text }]}>{cat.name}</Text>
            <Text style={[s.catCardCount, { color: cat.color }]}>{cnt}</Text>
          </TouchableOpacity>
        );
      })}

      {/* Add category card */}
      <TouchableOpacity
        style={[s.catCard, s.catCardAdd, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowAddCat(true)}>
        <View style={[s.catCardIcon, { backgroundColor: colors.inputBackground }]}>
          <Icon name="add-outline" size={22} color={colors.textSecondary} />
        </View>
        <Text style={[s.catCardName, { color: colors.textSecondary }]}>New</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={s.hBtn}>
          <Icon name="menu-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="search-outline" size={16} color={colors.textLight} style={{ marginLeft: 10 }} />
          <TextInput style={[s.searchInput, { color: colors.text }]} value={search} onChangeText={onSearch}
            placeholder="Search notes..." placeholderTextColor={colors.textLight} />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: 10 }}>
              <Icon name="close-circle" size={16} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={toggleSidebar} style={s.hBtn}>
          <Icon name="options-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── View mode tabs ── */}
      <View style={[s.tabRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {VIEW_MODES.map(m => (
          <TouchableOpacity key={m}
            style={[s.tab, viewMode === m && { backgroundColor: colors.primary }]}
            onPress={() => setViewMode(m)}>
            <Icon
              name={m === 'notes' ? 'documents-outline' : m === 'categories' ? 'grid-outline' : 'pricetags-outline'}
              size={14} color={viewMode === m ? '#fff' : colors.textSecondary} />
            <Text style={[s.tabText, { color: viewMode === m ? '#fff' : colors.textSecondary, fontWeight: viewMode === m ? '700' : '500' }]}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Active filter chip ── */}
      {(selCat || selTag) && viewMode === 'notes' && (
        <View style={s.filterRow}>
          <View style={[s.filterChip, { backgroundColor: colors.primary + '15' }]}>
            <Icon name={selTag ? 'pricetag-outline' : 'folder-outline'} size={12}
              color={selTag ? colors.primary : getCat(selCat)?.color || colors.primary} />
            <Text style={[s.filterChipText, { color: colors.primary }]}>{activeFilterLabel()}</Text>
            <TouchableOpacity onPress={() => { setSelCat(null); setSelTag(null); }}>
              <Icon name="close" size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={[s.filterCount, { color: colors.textSecondary }]}>{notes.length} notes</Text>
        </View>
      )}

      {/* ── Content ── */}
      {loading ? (
        <SkeletonNoteGrid count={6} />
      ) : viewMode === 'categories' ? <CategoriesView /> :
         viewMode === 'tags'        ? <TagsView /> : (
        notes.length === 0 ? (
          <View style={s.empty}>
            <Icon name="document-text-outline" size={56} color={colors.border} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>{search || selCat || selTag ? 'No matching notes' : 'No notes yet'}</Text>
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>Tap + to start writing</Text>
          </View>
        ) : (
          <FlatList
            data={notes}
            keyExtractor={n => String(n.id)}
            numColumns={2}
            contentContainerStyle={s.grid}
            columnWrapperStyle={{ gap: 10 }}
            refreshing={refreshing}
            onRefresh={() => load(true)}
            renderItem={({ item }) => (
              <NoteCard
                note={item}
                category={getCat(item.category_id)}
                onPress={() => navigation.navigate('NoteEditor', { noteId: item.id })}
                onLongPress={() => togglePin(item.id)}
              />
            )}
          />
        )
      )}

      {/* ── FAB — hidden if user cannot create notes ── */}
      {canCreateNote() && (
        <TouchableOpacity
          style={[s.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => setShowCreate(true)}>
          <Icon name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      <CreateModal    visible={showCreate}  onClose={() => setShowCreate(false)}  onSelect={createNote} />
      <AddCategoryModal visible={showAddCat} onClose={() => setShowAddCat(false)} onSave={handleAddCategory} />

      {/* ── Sidebar overlay ── */}
      {sidebarOpen && (
        <TouchableOpacity style={s.overlay} onPress={closeSidebar} activeOpacity={1} />
      )}
      <Animated.View style={[s.sidebar, { backgroundColor: colors.surface, borderRightColor: colors.border, transform: [{ translateX: slideX }] }]}>
        <View style={[s.sidebarTop, { borderBottomColor: colors.border }]}>
          <Text style={[s.sidebarTitle, { color: colors.text }]}>Notes</Text>
          <TouchableOpacity onPress={closeSidebar}>
            <Icon name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={[s.sideRow, !selCat && !selTag && { backgroundColor: colors.primary + '15' }]}
            onPress={() => { setSelCat(null); setSelTag(null); setViewMode('notes'); closeSidebar(); }}>
            <Icon name="documents-outline" size={16} color={!selCat && !selTag ? colors.primary : colors.textSecondary} />
            <Text style={[s.sideRowText, { color: !selCat && !selTag ? colors.primary : colors.text }, !selCat && !selTag && { fontWeight: '700' }]}>All Notes</Text>
            <Text style={[s.sideRowBadge, { color: colors.textLight }]}>{notes.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.sideRow}
            onPress={() => { setSelCat(null); setSelTag('pinned'); closeSidebar(); }}>
            <Icon name="pin-outline" size={16} color={colors.warning} />
            <Text style={[s.sideRowText, { color: colors.text }]}>Pinned</Text>
            <Text style={[s.sideRowBadge, { color: colors.textLight }]}>{pinnedCount}</Text>
          </TouchableOpacity>

          <View style={[s.sideSectionRow, { borderBottomColor: colors.border }]}>
            <Text style={[s.sideSectionLabel, { color: colors.textLight }]}>Categories</Text>
            <TouchableOpacity onPress={() => { closeSidebar(); setShowAddCat(true); }} style={s.sideAddBtn}>
              <Icon name="add" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {categories.map(cat => {
            const cnt    = noteCatCount(cat.id);
            const active = selCat === cat.id;
            return (
              <TouchableOpacity key={cat.id}
                style={[s.sideRow, active && { backgroundColor: cat.color + '15' }]}
                onPress={() => { setSelCat(active ? null : cat.id); setSelTag(null); setViewMode('notes'); closeSidebar(); }}>
                <View style={[s.sideIcon, { backgroundColor: cat.color + '20' }]}>
                  <Icon name={cat.icon} size={12} color={cat.color} />
                </View>
                <Text style={[s.sideRowText, { color: active ? cat.color : colors.text }, active && { fontWeight: '700' }]}>{cat.name}</Text>
                {cnt > 0 && <Text style={[s.sideRowBadge, { color: colors.textLight }]}>{cnt}</Text>}
              </TouchableOpacity>
            );
          })}

          {allTags.length > 0 && (
            <>
              <Text style={[s.sideSectionLabel, { color: colors.textLight, paddingTop: 16, paddingHorizontal: spacing.md }]}>Tags</Text>
              <View style={s.sideTagsWrap}>
                {allTags.map(tag => (
                  <TouchableOpacity key={tag}
                    style={[s.sideTag, { borderColor: colors.border }, selTag === tag && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => { setSelTag(selTag === tag ? null : tag); setSelCat(null); setViewMode('notes'); closeSidebar(); }}>
                    <Text style={[s.sideTagText, { color: selTag === tag ? '#fff' : colors.textSecondary }]}>#{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },

  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: 8 },
  hBtn:       { padding: 6 },
  searchBox:  { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: layout.borderRadius.round, borderWidth: 1 },
  searchInput:{ flex: 1, paddingVertical: 9, paddingHorizontal: 8, fontSize: typography.body2 },

  tabRow:  { flexDirection: 'row', marginHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: layout.borderRadius.md, padding: 3, borderWidth: 1 },
  tab:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: layout.borderRadius.sm },
  tabText: { fontSize: 12 },

  filterRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, marginBottom: spacing.sm, gap: 8 },
  filterChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  filterChipText:{ fontSize: 12, fontWeight: '600' },
  filterCount:   { fontSize: 12 },

  grid: { paddingHorizontal: spacing.md, paddingBottom: 100 },

  card:       { borderRadius: layout.borderRadius.lg, padding: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10, overflow: 'hidden' },
  catStrip:   { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  pinDot:     { position: 'absolute', top: 7, right: 7 },
  cardTitle:  { fontSize: 13, fontWeight: '700', marginBottom: 5, marginTop: 5 },
  previewRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 1 },
  pText:      { fontSize: 11, lineHeight: 16, flex: 1 },
  pStrike:    { textDecorationLine: 'line-through', opacity: 0.45 },
  pH1:        { fontSize: 12, fontWeight: '700', flex: 1 },
  pH2:        { fontSize: 11, fontWeight: '600', flex: 1 },
  pCode:      { fontSize: 10, fontFamily: 'monospace', paddingHorizontal: 3, borderRadius: 3, flex: 1 },
  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  progressBar:  { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: 9 },
  cardTags:   { flexDirection: 'row', gap: 4, marginTop: 5, flexWrap: 'wrap' },
  cardTag:    { fontSize: 9, fontWeight: '600' },
  cardDate:   { fontSize: 9, marginTop: 5 },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
  emptyTitle: { fontSize: typography.body1, fontWeight: '700' },
  emptyText:  { fontSize: typography.body2 },

  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },

  createOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  createCard:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: 36 },
  createTitle:   { fontSize: typography.h5, fontWeight: '700', marginBottom: spacing.md },
  createItem:    { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  createItemIcon:{ width: 40, height: 40, borderRadius: layout.borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  createItemLabel:{ fontSize: typography.body2, fontWeight: '600' },
  createItemSub:  { fontSize: typography.caption, marginTop: 1 },

  tagsViewGrid: { padding: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 100 },
  tagsViewHint: { width: '100%', fontSize: typography.caption, marginBottom: spacing.xs },
  tagViewChip:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  tagViewText:  { fontSize: 13, fontWeight: '600' },
  tagViewBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  tagViewBadgeText: { fontSize: 11, fontWeight: '700' },

  catGrid:     { padding: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 100 },
  catCard:     { width: (SW - spacing.md * 2 - 12) / 2 - 6, borderRadius: layout.borderRadius.lg, padding: spacing.md, alignItems: 'center', gap: 8, borderWidth: 1, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  catCardAdd:  { borderStyle: 'dashed' },
  catCardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catCardName: { fontSize: typography.body2, fontWeight: '700' },
  catCardCount:{ fontSize: typography.caption, fontWeight: '600' },

  overlay:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 10 },
  sidebar:      { position: 'absolute', top: 0, bottom: 0, left: 0, width: 260, zIndex: 20, borderRightWidth: 1, paddingTop: 52 },
  sidebarTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, marginBottom: spacing.xs },
  sidebarTitle: { fontSize: typography.h5, fontWeight: '800' },
  sideSectionRow:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: 16, paddingBottom: 4 },
  sideSectionLabel: { flex: 1, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  sideAddBtn:   { padding: 4 },
  sideRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: layout.borderRadius.md, marginHorizontal: 6 },
  sideRowText:  { flex: 1, fontSize: typography.body2 },
  sideRowBadge: { fontSize: 11, fontWeight: '600' },
  sideIcon:     { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  sideTagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  sideTag:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  sideTagText:  { fontSize: 12 },

  // Add category sheet
  sheetCard:   { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: 36, position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle:  { fontSize: typography.h5, fontWeight: '700', marginBottom: spacing.md },
  sheetLabel:  { fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  catInput:    { borderWidth: 1, borderRadius: layout.borderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: typography.body2 },
  colorRow:    { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot:    { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  colorDotActive: { transform: [{ scale: 1.15 }] },
  iconRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  iconBtn:     { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtn:     { marginTop: 20, borderRadius: layout.borderRadius.md, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.body1 },
});

export default NotesScreen;
