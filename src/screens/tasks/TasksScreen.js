import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Modal, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import ProjectService from '../../services/project/projectService';
import { AvatarStack } from '../../components/team/Avatar';
import { useTheme } from '../../theme/ThemeContext';
import { TASK_PRIORITIES } from '../../config';
import { friendlyError } from '../../utils/errorUtils';
import { SkeletonList } from '../../components/common/SkeletonLoader';
import { usePermissions } from '../../hooks/usePermissions';

const PC = Object.fromEntries(Object.entries(TASK_PRIORITIES).map(([k, v]) => [k, v.color]));
const PI = Object.fromEntries(Object.entries(TASK_PRIORITIES).map(([k, v]) => [k, v.icon]));

const PRIORITY_ORDER = { '3': 0, '2': 1, '1': 2, '0': 3 };

const STAGE_FILTERS = [
  { key: 'all',         label: 'All'         },
  { key: 'todo',        label: 'To Do'       },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done',        label: 'Done'        },
  { key: 'overdue',     label: 'Overdue'     },
];

const SORT_OPTIONS = [
  { key: 'deadline',  label: 'Deadline (soonest)',  icon: 'calendar-outline'     },
  { key: 'priority',  label: 'Priority (highest)',  icon: 'flag-outline'         },
  { key: 'name',      label: 'Name (A–Z)',           icon: 'text-outline'         },
  { key: 'stage',     label: 'Stage',                icon: 'layers-outline'       },
];

const getStageCategory = stageName => {
  const s = (stageName || '').toLowerCase();
  if (s.includes('done') || s.includes('complet'))        return 'done';
  if (s.includes('progress') || s.includes('doing'))      return 'in_progress';
  return 'todo';
};

const STAGE_COLORS = {
  done:        '#4CAF50',
  in_progress: '#2196F3',
  todo:        null,
};

// ── Manage Stages Modal ───────────────────────────────────────
const ManageStagesModal = ({ visible, onClose, projectId, colors, onChanged }) => {
  const [stages,     setStages]     = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [newName,    setNewName]    = useState('');
  const [adding,     setAdding]     = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [editedName, setEditedName] = useState('');

  useEffect(() => { if (visible) loadStages(); }, [visible, projectId]);

  const loadStages = async () => {
    setLoading(true);
    try { setStages(await ProjectService.getTaskStages(projectId)); }
    catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await ProjectService.createStage(newName.trim(), projectId);
      setNewName('');
      await loadStages();
      onChanged?.();
    } catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setAdding(false); }
  };

  const handleRename = async stageId => {
    if (!editedName.trim()) { setEditingId(null); return; }
    try {
      await ProjectService.updateStage(stageId, { name: editedName.trim() });
      setStages(prev => prev.map(s => s.id === stageId ? { ...s, name: editedName.trim() } : s));
      onChanged?.();
    } catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setEditingId(null); }
  };

  const handleDelete = stage => {
    Alert.alert(
      'Delete Stage',
      `Delete "${stage.name}"? Tasks in this stage will lose their stage assignment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await ProjectService.deleteStage(stage.id);
            setStages(prev => prev.filter(s => s.id !== stage.id));
            onChanged?.();
          } catch (e) { Alert.alert('Cannot delete', friendlyError(e, 'Stage may still have tasks')); }
        }},
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={ms.wrap}>
        <TouchableOpacity style={ms.bg} onPress={onClose} />
        <View style={[ms.card, { backgroundColor: colors.surface }]}>
          <View style={[ms.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={ms.header}>
            <Text style={[ms.title, { color: colors.text }]}>Manage Stages</Text>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <Icon name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
          ) : stages.length === 0 ? (
            <View style={ms.empty}>
              <Icon name="layers-outline" size={40} color={colors.textLight} />
              <Text style={[ms.emptyText, { color: colors.textSecondary }]}>No stages yet</Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {stages.map(stage => {
                const sc = ProjectService.getStageColor(stage);
                return (
                  <View key={stage.id} style={[ms.row, { borderBottomColor: colors.border }]}>
                    <View style={[ms.dot, { backgroundColor: sc }]} />
                    {editingId === stage.id ? (
                      <TextInput
                        style={[ms.editInput, { color: colors.text, borderBottomColor: colors.primary }]}
                        value={editedName}
                        onChangeText={setEditedName}
                        autoFocus
                        onBlur={() => handleRename(stage.id)}
                        onSubmitEditing={() => handleRename(stage.id)}
                        returnKeyType="done"
                      />
                    ) : (
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => { setEditingId(stage.id); setEditedName(stage.name); }}>
                        <Text style={[ms.rowName, { color: colors.text }]}>{stage.name}</Text>
                        {stage.fold && (
                          <Text style={[ms.foldBadge, { color: colors.textSecondary }]}>Done stage</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleDelete(stage)}
                      style={ms.deleteBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Icon name="remove-circle-outline" size={22} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Add new stage */}
          <View style={[ms.addRow, { borderTopColor: colors.border }]}>
            <TextInput
              style={[ms.addInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="New stage name..."
              placeholderTextColor={colors.textLight}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[ms.addBtn, { backgroundColor: colors.primary, opacity: adding ? 0.6 : 1 }]}
              onPress={handleAdd}
              disabled={adding}>
              {adding
                ? <ActivityIndicator size="small" color="#fff" />
                : <Icon name="add" size={22} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ms = StyleSheet.create({
  wrap:      { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  bg:        { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  card:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '80%' },
  handle:    { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title:     { fontSize: 17, fontWeight: '700' },
  closeBtn:  { padding: 4 },
  empty:     { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14 },
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  dot:       { width: 10, height: 10, borderRadius: 5, marginRight: 12, flexShrink: 0 },
  rowName:   { fontSize: 15 },
  foldBadge: { fontSize: 11, marginTop: 2 },
  editInput: { flex: 1, fontSize: 15, borderBottomWidth: 1.5, paddingVertical: 2 },
  deleteBtn: { paddingLeft: 12 },
  addRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  addInput:  { flex: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  addBtn:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

// ── Task Card ─────────────────────────────────────────────────
const TaskCard = ({ task, onPress, colors }) => {
  const pc       = PC[task.priority] || '#9E9E9E';
  const today    = new Date().toISOString().split('T')[0];
  const overdue  = task.date_deadline && task.date_deadline < today;
  const cat      = getStageCategory(task.stage_id?.[1]);
  const stageColor = STAGE_COLORS[cat] || colors.textSecondary;
  const assignees = (task.user_ids || []).map(u =>
    Array.isArray(u) ? { id: u[0], name: u[1] } : { id: u, name: String(u) }
  );

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}>
      <View style={[s.cardAccent, { backgroundColor: pc }]} />
      <View style={s.cardBody}>

        {/* Title + priority icon */}
        <View style={s.cardTitleRow}>
          <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={2}>{task.name}</Text>
          <View style={[s.priBadge, { backgroundColor: pc + '18' }]}>
            <Text style={s.priIcon}>{PI[task.priority] || '➡️'}</Text>
          </View>
        </View>

        {/* Meta chips */}
        <View style={s.cardMeta}>
          {task.project_id?.[1] && (
            <View style={[s.metaChip, { backgroundColor: colors.primary + '15' }]}>
              <Icon name="folder-outline" size={11} color={colors.primary} />
              <Text style={[s.metaChipText, { color: colors.primary }]} numberOfLines={1}>
                {task.project_id[1]}
              </Text>
            </View>
          )}
          {task.stage_id?.[1] && (
            <View style={[s.metaChip, { backgroundColor: stageColor + '18' }]}>
              <View style={[s.stageDot, { backgroundColor: stageColor }]} />
              <Text style={[s.metaChipText, { color: stageColor, fontWeight: '600' }]}>
                {task.stage_id[1]}
              </Text>
            </View>
          )}
          {task.date_deadline && (
            <View style={[s.metaChip, { backgroundColor: overdue ? '#DC262615' : colors.inputBackground }]}>
              <Icon name="calendar-outline" size={11} color={overdue ? '#DC2626' : colors.textSecondary} />
              <Text style={[s.metaChipText, { color: overdue ? '#DC2626' : colors.textSecondary }]}>
                {overdue ? '⚠ ' : ''}
                {new Date(task.date_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          )}
        </View>

        {/* Assignee row */}
        {assignees.length > 0 && (
          <View style={s.cardFooter}>
            <AvatarStack users={assignees} size={22} max={3} />
            {assignees.length === 1 && (
              <Text style={[s.assigneeName, { color: colors.textSecondary }]} numberOfLines={1}>
                {assignees[0].name}
              </Text>
            )}
            {assignees.length > 1 && (
              <Text style={[s.assigneeName, { color: colors.textSecondary }]}>
                {assignees.length} assignees
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ── Main screen ───────────────────────────────────────────────
const TasksScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const user = useSelector(st => st.auth.user);
  const workspace = useSelector(st => st.workspace.current);
  const projectFilter = route?.params?.projectId  || null;
  const projectName   = route?.params?.projectName || null;

  // Get permission hooks
  const {
    canReadTasks,
    canCreateTask,
    canChangeTaskStage,
    isAdmin,
    viewOwnOnly,
    permissionSummary,
  } = usePermissions(user?.id);

  const [tasks,        setTasks]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [filter,       setFilter]       = useState('all');
  const [search,       setSearch]       = useState('');
  const [showSearch,   setShowSearch]   = useState(false);
  const [sortBy,       setSortBy]       = useState('deadline');
  const [showSort,     setShowSort]     = useState(false);
  const [showStagesMgr,setShowStagesMgr]= useState(false);

  // Backend already enforces task visibility via API filters
  // No need for redundant UI-level permission checks

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
          {canChangeTaskStage() && (
            <TouchableOpacity onPress={() => setShowStagesMgr(true)} style={{ padding: 10 }}>
              <Icon name="layers-outline" size={21} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('Kanban', {})}
            style={{ padding: 10 }}>
            <Icon name="grid-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, colors, showSearch]);

  const load = useCallback(async () => {
    try {
      const uid = user?.uid || user?.id || 1;
      let data;
      if (projectFilter) {
        data = await ProjectService.getProjectTasks(projectFilter, 200);
      } else if (isAdmin || !viewOwnOnly()) {
        data = await ProjectService.getAllTasks(200);
      } else {
        data = await ProjectService.getMyTasks(uid, 200);
      }
      setTasks(data || []);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, projectFilter, isAdmin]);

  useEffect(() => {
    load();
    if (projectName) navigation.setOptions({ title: projectName });
  }, [load]);

  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => ({
    total:    tasks.length,
    todo:     tasks.filter(t => getStageCategory(t.stage_id?.[1]) === 'todo').length,
    progress: tasks.filter(t => getStageCategory(t.stage_id?.[1]) === 'in_progress').length,
    done:     tasks.filter(t => getStageCategory(t.stage_id?.[1]) === 'done').length,
    overdue:  tasks.filter(t =>
      t.date_deadline && t.date_deadline < today &&
      getStageCategory(t.stage_id?.[1]) !== 'done'
    ).length,
  }), [tasks, today]);

  const displayed = useMemo(() => {
    let list = [...tasks];

    if (filter !== 'all') {
      list = list.filter(t => {
        const cat = getStageCategory(t.stage_id?.[1]);
        if (filter === 'overdue')
          return t.date_deadline && t.date_deadline < today && cat !== 'done';
        return cat === filter;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.project_id?.[1] || '').toLowerCase().includes(q) ||
        (t.stage_id?.[1]   || '').toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case 'priority':
        list.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2));
        break;
      case 'name':
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'stage':
        list.sort((a, b) => (a.stage_id?.[1] || '').localeCompare(b.stage_id?.[1] || ''));
        break;
      default: // deadline — nulls last
        list.sort((a, b) => {
          if (!a.date_deadline && !b.date_deadline) return 0;
          if (!a.date_deadline) return 1;
          if (!b.date_deadline) return -1;
          return a.date_deadline.localeCompare(b.date_deadline);
        });
    }
    return list;
  }, [tasks, filter, search, sortBy, today]);

  if (loading) return <SkeletonList count={7} />;

  const currentSort = SORT_OPTIONS.find(o => o.key === sortBy);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={displayed}
        keyExtractor={t => String(t.id)}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            {projectName && (
              <View style={[s.projectBanner, { backgroundColor: colors.primary + '15', borderLeftColor: colors.primary }]}>
                <Icon name="folder" size={16} color={colors.primary} />
                <Text style={[s.projectBannerText, { color: colors.primary }]}>{projectName}</Text>
              </View>
            )}

            {/* Stats row */}
            <View style={s.statsRow}>
              {[
                { label: 'Total',  value: stats.total,    color: colors.primary, key: 'all'         },
                { label: 'To Do',  value: stats.todo,     color: '#FF9800',       key: 'todo'        },
                { label: 'Doing',  value: stats.progress, color: '#2196F3',       key: 'in_progress' },
                { label: 'Done',   value: stats.done,     color: '#4CAF50',       key: 'done'        },
                { label: 'Late',   value: stats.overdue,  color: '#F44336',       key: 'overdue'     },
              ].map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[s.statTile, {
                    backgroundColor: filter === item.key ? item.color + '20' : colors.surface,
                    borderTopColor:  item.color,
                    borderColor:     filter === item.key ? item.color : colors.border,
                  }]}
                  onPress={() => setFilter(item.key)}>
                  <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
                  <Text style={[s.statLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Search bar */}
            {showSearch && (
              <View style={[s.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Icon name="search-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[s.searchInput, { color: colors.text }]}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search tasks..."
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

            {/* Filter chips + sort button */}
            <View style={s.filterRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}>
                {STAGE_FILTERS.map(f => (
                  <TouchableOpacity
                    key={f.key}
                    style={[s.chip, {
                      backgroundColor: filter === f.key ? colors.primary : colors.inputBackground,
                      borderColor:     filter === f.key ? colors.primary : colors.border,
                    }]}
                    onPress={() => setFilter(f.key)}>
                    <Text style={[s.chipText, { color: filter === f.key ? '#fff' : colors.textSecondary }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[s.sortIconBtn, { borderColor: colors.border }]}
                onPress={() => setShowSort(true)}>
                <Icon name="swap-vertical-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[s.resultCount, { color: colors.textLight }]}>
              {displayed.length} task{displayed.length !== 1 ? 's' : ''}
              {search.trim() ? ` matching "${search}"` : ''}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            colors={colors}
            onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name={search ? 'search-outline' : 'checkbox-outline'} size={48} color={colors.textLight} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>
              {search ? 'No matching tasks' :
               filter === 'all' ? 'No tasks yet' :
               `No ${filter.replace('_', ' ')} tasks`}
            </Text>
            {!search && filter === 'all' && (
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>Tap + to create a task</Text>
            )}
          </View>
        }
      />

      {canCreateTask() && (
        <TouchableOpacity
          style={[s.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => navigation.navigate('CreateTask',
            projectFilter ? { project: { id: projectFilter, name: projectName } } : {}
          )}>
          <Icon name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Manage Stages */}
      <ManageStagesModal
        visible={showStagesMgr}
        onClose={() => setShowStagesMgr(false)}
        projectId={projectFilter}
        colors={colors}
        onChanged={load}
      />

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

const s = StyleSheet.create({
  container:         { flex: 1 },
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:              { padding: 16, paddingBottom: 100 },
  projectBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, padding: 10, marginBottom: 10, borderLeftWidth: 3 },
  projectBannerText: { fontSize: 14, fontWeight: '700' },
  statsRow:          { flexDirection: 'row', gap: 6, marginBottom: 12 },
  statTile:          { flex: 1, borderRadius: 8, borderTopWidth: 3, borderWidth: StyleSheet.hairlineWidth, padding: 8, alignItems: 'center' },
  statValue:         { fontSize: 18, fontWeight: '800' },
  statLabel:         { fontSize: 9, fontWeight: '500', marginTop: 1 },
  searchBar:         { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  searchInput:       { flex: 1, fontSize: 15 },
  filterRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  chip:              { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText:          { fontSize: 12, fontWeight: '500' },
  sortIconBtn:       { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, flexShrink: 0 },
  resultCount:       { fontSize: 12, marginBottom: 10 },
  card:              { flexDirection: 'row', borderRadius: 12, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cardAccent:        { width: 4 },
  cardBody:          { flex: 1, padding: 12 },
  cardTitleRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  cardTitle:         { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  priBadge:          { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  priIcon:           { fontSize: 14 },
  cardMeta:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 6 },
  metaChip:          { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  metaChipText:      { fontSize: 11 },
  stageDot:          { width: 6, height: 6, borderRadius: 3 },
  cardFooter:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  assigneeName:      { fontSize: 11, flex: 1 },
  empty:             { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle:        { fontSize: 15, fontWeight: '700' },
  emptyText:         { fontSize: 14 },
  fab:               { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
  sheetWrap:         { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheetBg:           { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetCard:         { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:            { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:        { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  sortOption:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderRadius: 10, paddingHorizontal: 8, marginHorizontal: -8 },
  sortOptionText:    { flex: 1, fontSize: 14, fontWeight: '500' },
});

export default TasksScreen;
