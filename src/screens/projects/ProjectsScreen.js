import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput, Alert, Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import backend from '../../backend/BackendService';
import TeamService from '../../services/team/teamService';
import { AvatarStack } from '../../components/team/Avatar';
import { useTheme } from '../../theme/ThemeContext';
import { friendlyError } from '../../utils/errorUtils';
import { undoDelete } from '../../utils/undoDelete';
import { usePermissions } from '../../hooks/usePermissions';

const PROJ_COLORS = ['#2196F3','#9C27B0','#00BCD4','#4CAF50','#FF5722','#607D8B','#FF9800','#E91E63'];
const pColor = id => PROJ_COLORS[(id || 0) % PROJ_COLORS.length];

const SORT_OPTIONS = [
  { key: 'name',     label: 'Name (A–Z)',       icon: 'text-outline'         },
  { key: 'tasks',    label: 'Most tasks',        icon: 'checkbox-outline'     },
  { key: 'progress', label: 'Highest progress',  icon: 'trending-up-outline'  },
  { key: 'overdue',  label: 'Most overdue',      icon: 'alert-circle-outline' },
];

// ── Project card ──────────────────────────────────────────────
const ProjectCard = React.memo(({ project, onPress, onAddTask, onLongPress, colors, canAddTask, canDelete }) => {
  const pc       = pColor(project.id);
  const total    = project.task_count    || 0;
  const done     = project.done_count    || 0;
  const overdue  = project.overdue_count || 0;
  const members  = project.members       || [];
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const progressColor =
    progress === 100 ? '#4CAF50' :
    overdue   >  0   ? '#F44336' :
    progress  > 50   ? pc :
    '#FF9800';

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      onLongPress={canDelete ? onLongPress : undefined}
      activeOpacity={0.82}>

      {/* Top accent bar */}
      <View style={[s.cardTopBar, { backgroundColor: pc }]} />

      <View style={s.cardContent}>
        {/* Header row */}
        <View style={s.cardHeader}>
          <View style={[s.cardIcon, { backgroundColor: pc + '20' }]}>
            <Icon name="folder" size={20} color={pc} />
          </View>
          <View style={s.cardMeta}>
            <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>{project.name}</Text>
            {project.partner_id && (
              <Text style={[s.cardClient, { color: colors.textSecondary }]} numberOfLines={1}>
                {project.partner_id[1]}
              </Text>
            )}
          </View>
          {canAddTask && (
            <TouchableOpacity
              style={[s.addBtn, { backgroundColor: pc + '12', borderColor: pc + '50' }]}
              onPress={onAddTask}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="add" size={18} color={pc} />
            </TouchableOpacity>
          )}
        </View>

        {/* Progress bar */}
        <View style={s.progressRow}>
          <View style={[s.progressBg, { backgroundColor: colors.border }]}>
            <View style={[s.progressFill, { width: `${progress}%`, backgroundColor: progressColor }]} />
          </View>
          <Text style={[s.progressPct, { color: progressColor }]}>{progress}%</Text>
        </View>

        {/* Footer */}
        <View style={s.cardFooter}>
          <View style={s.chips}>
            <View style={[s.chip, { backgroundColor: colors.inputBackground }]}>
              <Icon name="checkbox-outline" size={11} color={colors.textSecondary} />
              <Text style={[s.chipText, { color: colors.textSecondary }]}>{total} tasks</Text>
            </View>
            {done > 0 && (
              <View style={[s.chip, { backgroundColor: '#4CAF5015' }]}>
                <Icon name="checkmark-circle-outline" size={11} color="#4CAF50" />
                <Text style={[s.chipText, { color: '#4CAF50' }]}>{done} done</Text>
              </View>
            )}
            {overdue > 0 && (
              <View style={[s.chip, { backgroundColor: '#F4433615' }]}>
                <Icon name="time-outline" size={11} color="#F44336" />
                <Text style={[s.chipText, { color: '#F44336' }]}>{overdue} late</Text>
              </View>
            )}
          </View>
          {members.length > 0 && <AvatarStack users={members} size={24} max={4} />}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ── Main screen ───────────────────────────────────────────────
const ProjectsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const user = useSelector(st => st.auth.user);
  const workspace = useSelector(st => st.workspace.current);

  const {
    canCreateProject,
    canCreateTask,
    canDeleteAllProjects,
    isAdmin,
    permissionSummary,
  } = usePermissions(user?.id);

  const [projects,   setProjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName,    setNewName]    = useState('');
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy,     setSortBy]     = useState('name');
  const [showSort,   setShowSort]   = useState(false);

  const loadingRef = React.useRef(false);

  // Permission check removed — backend enforces via access rules
  // Allows graceful fallback if user lacks permission

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', paddingRight: 8 }}>
          <TouchableOpacity
            onPress={() => { setShowSearch(v => { if (v) setSearch(''); return !v; }); }}
            style={{ padding: 10 }}>
            <Icon name={showSearch ? 'close-outline' : 'search-outline'} size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSort(true)} style={{ padding: 10 }}>
            <Icon name="funnel-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, colors, showSearch]);

  const load = useCallback(async (isRefresh = false) => {
    if (loadingRef.current && !isRefresh) return; // Prevent multiple simultaneous loads
    loadingRef.current = true;
    if (!isRefresh) setLoading(true);
    try {
      // Backend enforces permission via access rules and domain filtering
      // Client-side check removed to allow fallback behavior

      const projs = await backend.getProjects();

      if (!projs?.length) { setProjects([]); return; }

      // Projects from backend already include done_count and overdue_count
      setProjects(projs);
    } catch (e) {
      console.error('[ProjectsScreen] Load error:', e);
      setProjects([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, [workspace?.id]);

  useEffect(() => {
    load();
  }, [workspace?.id]);

  const createProject = async () => {
    if (!newName.trim()) { Alert.alert('Required', 'Enter a project name'); return; }
    setSaving(true);
    try {
      await backend.createProject({ name: newName.trim() });
      setNewName(''); setShowCreate(false); load();
    } catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setSaving(false); }
  };

  const confirmDelete = async project => {
    setProjects(prev => prev.filter(p => p.id !== project.id));
    undoDelete(
      `"${project.name}"`,
      () => backend.deleteProject(project.id).catch(() => load()),
      () => setProjects(prev => [project, ...prev]),
    );
  };

  const displayed = useMemo(() => {
    let list = [...projects];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.partner_id?.[1] || '').toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case 'progress':
        list.sort((a, b) => {
          const ap = a.task_count ? (a.done_count / a.task_count) : 0;
          const bp = b.task_count ? (b.done_count / b.task_count) : 0;
          return bp - ap;
        });
        break;
      case 'tasks':
        list.sort((a, b) => (b.task_count || 0) - (a.task_count || 0));
        break;
      case 'overdue':
        list.sort((a, b) => (b.overdue_count || 0) - (a.overdue_count || 0));
        break;
      default:
        list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [projects, search, sortBy]);

  const totalTasks   = projects.reduce((n, p) => n + (p.task_count    || 0), 0);
  const totalOverdue = projects.reduce((n, p) => n + (p.overdue_count || 0), 0);
  const avgProgress  = projects.length
    ? Math.round(projects.reduce((n, p) => {
        const t = p.task_count || 0;
        return n + (t > 0 ? (p.done_count || 0) / t : 0);
      }, 0) / projects.length * 100)
    : 0;

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentSort = SORT_OPTIONS.find(o => o.key === sortBy);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={displayed}
        keyExtractor={p => String(p.id)}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            {showSearch && (
              <View style={[s.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Icon name="search-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[s.searchInput, { color: colors.text }]}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search projects..."
                  placeholderTextColor={colors.textLight}
                  autoFocus
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Icon name="close-circle" size={18} color={colors.textLight} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Summary tiles */}
            <View style={s.summaryRow}>
              {[
                { val: projects.length,   label: 'Projects', color: colors.primary                              },
                { val: totalTasks,         label: 'Tasks',    color: '#2196F3'                                   },
                { val: `${avgProgress}%`,  label: 'Progress', color: '#4CAF50'                                   },
                { val: totalOverdue,       label: 'Overdue',  color: totalOverdue > 0 ? '#F44336' : colors.primary },
              ].map((item, i) => (
                <View key={i} style={[s.summaryTile, { backgroundColor: colors.surface, borderColor: colors.border, borderTopColor: item.color }]}>
                  <Text style={[s.summaryValue, { color: item.color }]}>{item.val}</Text>
                  <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Sort row */}
            <View style={s.sortRow}>
              <Text style={[s.count, { color: colors.textSecondary }]}>
                {displayed.length} project{displayed.length !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity
                style={[s.sortBtn, { borderColor: colors.border }]}
                onPress={() => setShowSort(true)}>
                <Icon name="swap-vertical-outline" size={13} color={colors.textSecondary} />
                <Text style={[s.sortBtnText, { color: colors.textSecondary }]}>{currentSort?.label}</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            colors={colors}
            canAddTask={canCreateTask()}
            canDelete={canDeleteAllProjects()}
            onPress={() => navigation.navigate('Tasks', { screen: 'TasksList', params: { projectId: item.id, projectName: item.name } })}
            onAddTask={() => navigation.navigate('Tasks', { screen: 'CreateTask', params: { project: { id: item.id, name: item.name } } })}
            onLongPress={() => confirmDelete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name={search ? 'search-outline' : 'folder-open-outline'} size={56} color={colors.textLight} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>
              {search ? 'No matching projects' : 'No projects yet'}
            </Text>
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>
              {search ? 'Try a different search' : 'Tap + to create your first project'}
            </Text>
          </View>
        }
      />

      {canCreateProject() && (
        <TouchableOpacity
          style={[s.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => setShowCreate(true)}>
          <Icon name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create project sheet */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={s.sheetWrap}>
          <TouchableOpacity style={s.sheetBg} onPress={() => { setShowCreate(false); setNewName(''); }} />
          <View style={[s.sheetCard, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>New Project</Text>
            <TextInput
              style={[s.sheetInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="Project name"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              onSubmitEditing={createProject}
              returnKeyType="done"
            />
            <View style={s.sheetBtns}>
              <TouchableOpacity
                style={[s.cancelBtn, { borderColor: colors.border }]}
                onPress={() => { setShowCreate(false); setNewName(''); }}>
                <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.createBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
                onPress={createProject}
                disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.createText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort sheet */}
      <Modal visible={showSort} transparent animationType="slide">
        <View style={s.sheetWrap}>
          <TouchableOpacity style={s.sheetBg} onPress={() => setShowSort(false)} />
          <View style={[s.sheetCard, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Sort by</Text>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[s.sortOption, sortBy === opt.key && { backgroundColor: colors.primary + '12' }]}
                onPress={() => { setSortBy(opt.key); setShowSort(false); }}>
                <Icon name={opt.icon} size={20} color={sortBy === opt.key ? colors.primary : colors.textSecondary} />
                <Text style={[s.sortOptionText, { color: sortBy === opt.key ? colors.primary : colors.text }]}>
                  {opt.label}
                </Text>
                {sortBy === opt.key && <Icon name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const S = StyleSheet;
const s = S.create({
  container:     { flex: 1 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:          { padding: 16, paddingBottom: 100 },
  searchBar:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: S.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  searchInput:   { flex: 1, fontSize: 15 },
  summaryRow:    { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryTile:   { flex: 1, borderRadius: 10, borderTopWidth: 3, borderWidth: S.hairlineWidth, padding: 10, alignItems: 'center' },
  summaryValue:  { fontSize: 20, fontWeight: '800' },
  summaryLabel:  { fontSize: 9, fontWeight: '500', marginTop: 2 },
  sortRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  count:         { fontSize: 12, fontWeight: '600' },
  sortBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: S.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  sortBtnText:   { fontSize: 11, fontWeight: '500' },
  card:          { borderRadius: 14, marginBottom: 10, borderWidth: S.hairlineWidth, overflow: 'hidden' },
  cardTopBar:    { height: 3 },
  cardContent:   { padding: 14 },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIcon:      { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cardMeta:      { flex: 1 },
  cardName:      { fontSize: 15, fontWeight: '700' },
  cardClient:    { fontSize: 12, marginTop: 2 },
  addBtn:        { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  progressRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  progressBg:    { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },
  progressPct:   { fontSize: 12, fontWeight: '700', minWidth: 36, textAlign: 'right' },
  cardFooter:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips:         { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  chip:          { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  chipText:      { fontSize: 11, fontWeight: '500' },
  empty:         { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle:    { fontSize: 15, fontWeight: '700' },
  emptyText:     { fontSize: 14 },
  fab:           { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
  sheetWrap:     { ...S.absoluteFillObject, justifyContent: 'flex-end' },
  sheetBg:       { ...S.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetCard:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:        { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:    { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  sheetInput:    { borderWidth: S.hairlineWidth, borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 16 },
  sheetBtns:     { flexDirection: 'row', gap: 12 },
  cancelBtn:     { flex: 1, alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1 },
  cancelText:    { fontWeight: '600', fontSize: 14 },
  createBtn:     { flex: 2, alignItems: 'center', padding: 14, borderRadius: 10 },
  createText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  sortOption:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderRadius: 10, paddingHorizontal: 8, marginHorizontal: -8 },
  sortOptionText:{ flex: 1, fontSize: 14, fontWeight: '500' },
});

export default ProjectsScreen;
