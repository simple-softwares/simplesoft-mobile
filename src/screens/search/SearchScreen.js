import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../services/api/httpClient';
import NotesService from '../../services/notes/notesService';
import { useTheme } from '../../theme/ThemeContext';
import Analytics from '../../services/analytics/analyticsService';
import { searchStorage } from '../../services/storage/storageRegistry';

const storage   = searchStorage;
const MAX_HIST  = 8;

const getHistory = () => {
  try { return JSON.parse(storage.getString('history') || '[]'); } catch { return []; }
};
const addHistory = (q) => {
  if (!q.trim()) return;
  const h = [q, ...getHistory().filter(x => x !== q)].slice(0, MAX_HIST);
  storage.set('history', JSON.stringify(h));
};

// ── Result types ──────────────────────────────────────────────
const ICONS = {
  task:    'checkbox-outline',
  project: 'folder-outline',
  contact: 'people-outline',
  note:    'document-text-outline',
  member:  'person-outline',
};
const COLORS = {
  task:    '#2196F3',
  project: '#9C27B0',
  contact: '#00BCD4',
  note:    '#FF9800',
  member:  '#059669',
};

const ResultRow = ({ item, onPress }) => {
  const { colors } = useTheme();
  const ic = ICONS[item.type]  || 'search-outline';
  const ac = COLORS[item.type] || '#2563EB';

  return (
    <TouchableOpacity style={[styles.result, { borderBottomColor: colors.divider }]}
      onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.resultIcon, { backgroundColor: ac + '18' }]}>
        <Icon name={ic} size={16} color={ac} />
      </View>
      <View style={styles.resultContent}>
        <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        {!!item.subtitle && (
          <Text style={[styles.resultSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.subtitle}
          </Text>
        )}
      </View>
      <View style={[styles.typePill, { backgroundColor: ac + '18' }]}>
        <Text style={[styles.typeText, { color: ac }]}>{item.type}</Text>
      </View>
    </TouchableOpacity>
  );
};

const GroupHeader = ({ type }) => {
  const { colors } = useTheme();
  const TYPE_LABELS = { task:'Tasks', project:'Projects', contact:'Contacts', note:'Notes', member:'Members' };
  return (
    <Text style={[styles.groupHeader, { color: colors.textSecondary }]}>
      {TYPE_LABELS[type] || type}
    </Text>
  );
};

// ── Main screen ───────────────────────────────────────────────
const SearchScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [query,        setQuery]        = useState('');
  const [results,      setResults]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [searched,     setSearched]     = useState(false);
  const [history,      setHistory]      = useState(getHistory());
  const [activeFilter, setActiveFilter] = useState('all');
  const inputRef   = useRef(null);
  const timer      = useRef(null);

  const FILTERS = [
    { key: 'all',     label: 'All',      icon: 'apps-outline' },
    { key: 'task',    label: 'Tasks',    icon: 'checkbox-outline' },
    { key: 'project', label: 'Projects', icon: 'folder-outline' },
    { key: 'contact', label: 'Contacts', icon: 'people-outline' },
    { key: 'note',    label: 'Notes',    icon: 'document-text-outline' },
    { key: 'member',  label: 'Members',  icon: 'person-outline' },
  ];

  const countFor = (k) => k === 'all' ? results.length : results.filter(r => r.type === k).length;

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setActiveFilter('all');
    setLoading(true);
    setSearched(true);
    try {
      const out = [];

      Analytics.search(q);

      const [tasksRes, projectsRes, contactsRes, membersRes] = await Promise.allSettled([
        api.get('/tasks',    { params: { search: q, limit: 8 } }),
        api.get('/projects', { params: { search: q, limit: 5 } }),
        api.get('/contacts', { params: { search: q, limit: 5 } }),
        api.get('/users',    { params: { search: q, limit: 5 } }),
      ]);

      // Tasks
      if (tasksRes.status === 'fulfilled') {
        (tasksRes.value.data || []).forEach(t => out.push({
          id:       `task-${t.id}`,
          type:     'task',
          title:    t.name,
          subtitle: t.project_name || 'No project',
          raw:      t,
        }));
      }

      // Projects
      if (projectsRes.status === 'fulfilled') {
        (projectsRes.value.data || []).forEach(p => out.push({
          id:       `proj-${p.id}`,
          type:     'project',
          title:    p.name,
          subtitle: `${p.task_count || 0} tasks`,
          raw:      p,
        }));
      }

      // Contacts
      if (contactsRes.status === 'fulfilled') {
        (contactsRes.value.data || []).forEach(c => out.push({
          id:       `contact-${c.id}`,
          type:     'contact',
          title:    c.name,
          subtitle: c.email || c.phone || 'Contact',
          raw:      c,
        }));
      }

      // Notes (local)
      try {
        const { notes } = await NotesService.list({ search: q });
        notes.slice(0, 4).forEach(n => out.push({
          id:       `note-${n.id}`,
          type:     'note',
          title:    n.title || '(Untitled)',
          subtitle: (n.body_plain || '').slice(0, 60),
          raw:      n,
        }));
      } catch {}

      // Members
      if (membersRes.status === 'fulfilled') {
        (membersRes.value.data || []).forEach(u => out.push({
          id:       `user-${u.id}`,
          type:     'member',
          title:    u.name,
          subtitle: u.email || '',
          raw:      u,
        }));
      }

      setResults(out);
    } catch { /* ignore search errors */ } finally { setLoading(false); }
  }, []);

  const onChangeText = (t) => {
    setQuery(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(t), 400);
  };

  const handleSubmit = () => {
    addHistory(query);
    setHistory(getHistory());
    search(query);
    Keyboard.dismiss();
  };

  const handleResult = (item) => {
    addHistory(query);
    setHistory(getHistory());
    Keyboard.dismiss();
    switch (item.type) {
      case 'task':
        navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: item.raw.id } });
        break;
      case 'project':
        navigation.navigate('Tasks', { screen: 'TasksList', params: { projectId: item.raw.id, projectName: item.raw.name } });
        break;
      case 'contact':
        navigation.navigate('Contacts', { screen: 'ContactDetail', params: { contactId: item.raw.id } });
        break;
      case 'note':
        navigation.navigate('Notes', { screen: 'NoteEditor', params: { noteId: item.raw.id } });
        break;
      case 'member':
        navigation.navigate('Team', { screen: 'MemberDetail', params: { member: item.raw } });
        break;
    }
  };

  const clearHistory = () => {
    storage.set('history', '[]');
    setHistory([]);
  };

  const visibleResults = activeFilter === 'all'
    ? (() => {
        const out = [];
        let lastType = null;
        results.forEach(r => {
          if (r.type !== lastType) {
            out.push({ id: `header-${r.type}`, isHeader: true, type: r.type });
            lastType = r.type;
          }
          out.push(r);
        });
        return out;
      })()
    : results.filter(r => r.type === activeFilter);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="search-outline" size={18} color={colors.textLight} style={{ marginLeft: 12 }} />
        <TextInput
          ref={inputRef}
          style={[styles.searchInput, { color: colors.text }]}
          value={query}
          onChangeText={onChangeText}
          onSubmitEditing={handleSubmit}
          placeholder="Search tasks, notes, projects, people..."
          placeholderTextColor={colors.textLight}
          autoFocus
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 12 }} />}
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }} style={{ paddingRight: 12 }}>
            <Icon name="close-circle" size={17} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      {searched && (
        <View style={[styles.chipBar, { backgroundColor: colors.background }]}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12 }}>
            {FILTERS.map(f => {
              const count = countFor(f.key);
              const isActive = activeFilter === f.key;
              return (
                <TouchableOpacity key={f.key}
                  style={[styles.chip, isActive && [styles.chipActive, { backgroundColor: colors.primary }]]}
                  onPress={() => setActiveFilter(f.key)}>
                  <Icon name={f.icon} size={13} color={isActive ? '#fff' : colors.textSecondary} />
                  <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                    {f.label}{count > 0 ? ` (${count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Results / history */}
      {!searched && query.length === 0 ? (
        // History
        history.length > 0 ? (
          <View>
            <View style={[styles.sectionRow, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recent searches</Text>
              <TouchableOpacity onPress={clearHistory}>
                <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
              </TouchableOpacity>
            </View>
            {history.map((h, i) => (
              <TouchableOpacity key={i}
                style={[styles.historyRow, { borderBottomColor: colors.divider }]}
                onPress={() => { setQuery(h); search(h); }}>
                <Icon name="time-outline" size={16} color={colors.textLight} />
                <Text style={[styles.historyText, { color: colors.text }]}>{h}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyHint}>
            <Icon name="search-outline" size={44} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Search everything</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Tasks, projects, notes, team members
            </Text>
          </View>
        )
      ) : searched && results.length === 0 && !loading ? (
        <View style={styles.emptyHint}>
          <Icon name="search-circle-outline" size={44} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No results</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Try different keywords
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleResults}
          keyExtractor={r => r.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) =>
            item.isHeader ? (
              <GroupHeader type={item.type} />
            ) : (
              <ResultRow item={item} onPress={() => handleResult(item)} />
            )
          }
          ListHeaderComponent={
            visibleResults.filter(r => !r.isHeader).length > 0 ? (
              <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
                {visibleResults.filter(r => !r.isHeader).length} result{visibleResults.filter(r => !r.isHeader).length !== 1 ? 's' : ''}
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
};

const S = StyleSheet;
const styles = S.create({
  container:      { flex: 1 },
  searchBar:      { flexDirection: 'row', alignItems: 'center', margin: 12, borderRadius: 12, borderWidth: 1 },
  searchInput:    { flex: 1, paddingVertical: 11, paddingHorizontal: 10, fontSize: 15 },
  chipBar:        { paddingHorizontal: 12, paddingVertical: 8, flexGrow: 0 },
  chip:           { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:12, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor: '#e0e0e0', marginRight:8 },
  chipActive:     { borderColor: 'transparent' },
  chipLabel:      { fontSize: 12, fontWeight: '600' },
  chipLabelActive:{ color: '#fff' },
  groupHeader:    { fontSize: 11, fontWeight: '700', paddingHorizontal: 16, paddingTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: S.hairlineWidth },
  sectionTitle:   { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  clearText:      { fontSize: 13, fontWeight: '600' },
  historyRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: S.hairlineWidth },
  historyText:    { fontSize: 14 },
  result:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: S.hairlineWidth },
  resultIcon:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  resultContent:  { flex: 1 },
  resultTitle:    { fontSize: 14, fontWeight: '600' },
  resultSub:      { fontSize: 12, marginTop: 2 },
  typePill:       { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  typeText:       { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  resultsCount:   { fontSize: 12, paddingHorizontal: 16, paddingVertical: 8 },
  emptyHint:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
  emptyTitle:     { fontSize: 16, fontWeight: '700' },
  emptyText:      { fontSize: 14, textAlign: 'center' },
});

export default SearchScreen;
