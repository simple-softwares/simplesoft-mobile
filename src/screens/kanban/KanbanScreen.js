import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import ProjectService from '../../services/project/projectService';
import backend from '../../backend/BackendService';
import { useTheme } from '../../theme/ThemeContext';
import { friendlyError } from '../../utils/errorUtils';

const { width: SW } = Dimensions.get('window');
const COL_W = Math.min(SW * 0.72, 260);

const PRIORITY_COLORS = {
  '0': '#9E9E9E', '1': '#2196F3', '2': '#FF9800', '3': '#F44336',
};

const UNASSIGNED_STAGE = { id: -1, name: 'No Stage', sequence: -1, fold: false };

// ── KanbanCard — no hooks that reference outer scope ─────────
const KanbanCard = ({ task, onPress, onMovePress }) => {
  const { colors } = useTheme();
  const pc      = PRIORITY_COLORS[String(task.priority)] || '#9E9E9E';
  const today   = new Date().toISOString().split('T')[0];
  const overdue = task.date_deadline && task.date_deadline < today;

  return (
    <TouchableOpacity
      style={[styles.card, {
        backgroundColor: colors.card,
        borderColor:     colors.border,
        borderLeftColor: pc,
      }]}
      onPress={onPress} activeOpacity={0.82}>
      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
        {task.name}
      </Text>
      {task.project_id?.[1] && (
        <Text style={[styles.cardProject, { color: colors.primary }]} numberOfLines={1}>
          {task.project_id[1]}
        </Text>
      )}
      <View style={styles.cardMeta}>
        {task.date_deadline && (
          <View style={[styles.chip, { backgroundColor: overdue ? colors.error + '18' : colors.blockSelected }]}>
            <Icon name="calendar-outline" size={10} color={overdue ? colors.error : colors.textSecondary} />
            <Text style={[styles.chipText, { color: overdue ? colors.error : colors.textSecondary }]}>
              {new Date(task.date_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        )}
        {task.user_ids?.length > 0 && (
          <View style={[styles.chip, { backgroundColor: colors.blockSelected }]}>
            <Icon name="person-outline" size={10} color={colors.textSecondary} />
            <Text style={[styles.chipText, { color: colors.textSecondary }]}>{task.user_ids.length}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={[styles.moveBtn, { borderColor: colors.border }]} onPress={onMovePress}>
        <Icon name="swap-horizontal-outline" size={11} color={colors.textSecondary} />
        <Text style={[styles.moveBtnText, { color: colors.textSecondary }]}>Move</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ── Column ────────────────────────────────────────────────────
const Column = ({ stage, tasks, onCardPress, onMovePress }) => {
  const { colors } = useTheme();
  const isVirtual = stage.id === -1;
  return (
    <View style={[styles.column, {
      width: COL_W,
      backgroundColor: colors.surface,
      borderColor: isVirtual ? colors.warning + '60' : colors.border,
    }]}>
      <View style={[styles.colHeader, { borderBottomColor: colors.border }]}>
        <View style={[styles.colDot, {
          backgroundColor: isVirtual ? colors.warning : stage.fold ? colors.success : colors.primary,
        }]} />
        <Text style={[styles.colTitle, { color: colors.text }]} numberOfLines={1}>{stage.name}</Text>
        <View style={[styles.colBadge, { backgroundColor: colors.blockSelected }]}>
          <Text style={[styles.colCount, { color: colors.textSecondary }]}>{tasks.length}</Text>
        </View>
      </View>
      <ScrollView style={styles.colScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {tasks.length === 0 ? (
          <View style={styles.colEmpty}>
            <Icon name="radio-button-off-outline" size={20} color={colors.border} />
            <Text style={[styles.colEmptyText, { color: colors.textLight }]}>Empty</Text>
          </View>
        ) : (
          tasks.map(t => (
            <KanbanCard key={t.id} task={t}
              onPress={() => onCardPress(t)}
              onMovePress={() => onMovePress(t)} />
          ))
        )}
        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
};

// ── Main screen ───────────────────────────────────────────────
const KanbanScreen = ({ route, navigation }) => {
  const { colors }  = useTheme();
  // ✅ user declared HERE in KanbanScreen, not inside child components
  const user        = useSelector(s => s.auth.user);
  const projectId   = route?.params?.projectId   || null;
  const projectName = route?.params?.projectName || 'Board';

  const [stages,  setStages]  = useState([]);
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: projectName });
  }, [projectName]);

  const load = useCallback(async () => {
    try {
      const uid = user?.uid || user?.id;

      // ── Stages via ProjectService ─────────────────────────────
      const stagesRaw = await ProjectService.getTaskStages(projectId || null);

      const stageMap  = {};
      const seenNames = {};
      const displayStages = [];
      for (const s of stagesRaw) {
        stageMap[s.id] = s;
        const key = s.name.toLowerCase().trim();
        if (!seenNames[key]) { seenNames[key] = s; displayStages.push(s); }
      }

      // ── Tasks via backend REST adapter ────────────────────────
      const tasksRaw = projectId
        ? await backend.getProjectTasks(projectId, 500)
        : await backend.getMyTasks(uid, 500);

      setStages(displayStages);
      setTasks(tasksRaw || []);
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
    return () => {};
  }, [load]));

  const handleMove = (task) => {
    const currentId = Array.isArray(task.stage_id) ? task.stage_id[0] : null;
    Alert.alert('Move to stage', `"${task.name.slice(0, 40)}"`, [
      ...stages.map(s => ({
        text:    currentId === s.id ? `✓ ${s.name}` : s.name,
        style:   currentId === s.id ? 'cancel' : 'default',
        onPress: currentId === s.id ? undefined : () => moveTask(task, s),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const moveTask = async (task, stage) => {
    const original = task.stage_id;
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, stage_id: [stage.id, stage.name] } : t
    ));
    try {
      await ProjectService.updateTask(task.id, { stage_id: stage.id });
    } catch (e) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, stage_id: original } : t));
      Alert.alert('Could not move', friendlyError(e));
    }
  };

  // ── Group tasks by stage ──────────────────────────────────
  const seenNamesLocal = {};
  stages.forEach(s => { seenNamesLocal[s.name.toLowerCase().trim()] = s.id; });

  const byStage = {};
  stages.forEach(s => { byStage[s.id] = []; });
  byStage[-1] = [];

  tasks.forEach(t => {
    const sid   = Array.isArray(t.stage_id) ? t.stage_id[0] : null;
    const sname = Array.isArray(t.stage_id) ? (t.stage_id[1] || '').toLowerCase().trim() : '';

    if (!sid) {
      byStage[-1].push(t);
    } else if (byStage[sid] !== undefined) {
      byStage[sid].push(t);
    } else if (sname && seenNamesLocal[sname] !== undefined) {
      byStage[seenNamesLocal[sname]].push(t);
    } else {
      byStage[-1].push(t);
    }
  });

  const displayColumns = [...stages];
  if (byStage[-1].length > 0) displayColumns.unshift(UNASSIGNED_STAGE);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading board...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.statsText, { color: colors.textSecondary }]}>
          {tasks.length} tasks · {stages.length} stages
          {byStage[-1]?.length > 0 ? ` · ${byStage[-1].length} unassigned` : ''}
        </Text>
        <TouchableOpacity onPress={() => { setLoading(true); load(); }}>
          <Icon name="refresh-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.board}>
        {displayColumns.map(stage => (
          <Column
            key={stage.id}
            stage={stage}
            tasks={byStage[stage.id] || []}
            onCardPress={t => navigation.navigate('Tasks', {
              screen: 'TaskDetail',
              params: { taskId: t.id },
            })}
            onMovePress={handleMove}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const S = StyleSheet;
const styles = S.create({
  container:    { flex: 1 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:  { fontSize: 14 },
  statsBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: S.hairlineWidth },
  statsText:    { fontSize: 13 },
  board:        { padding: 12, gap: 10, paddingBottom: 40, alignItems: 'flex-start' },
  column:       { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  colHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderBottomWidth: S.hairlineWidth },
  colDot:       { width: 8, height: 8, borderRadius: 4 },
  colTitle:     { flex: 1, fontSize: 14, fontWeight: '700' },
  colBadge:     { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  colCount:     { fontSize: 11, fontWeight: '700' },
  colScroll:    { padding: 10, maxHeight: 560 },
  colEmpty:     { alignItems: 'center', paddingVertical: 32, gap: 8 },
  colEmptyText: { fontSize: 12 },
  card:         { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderLeftWidth: 3 },
  cardTitle:    { fontSize: 13, fontWeight: '600', lineHeight: 19, marginBottom: 4 },
  cardProject:  { fontSize: 11, fontWeight: '500', marginBottom: 6 },
  cardMeta:     { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  chipText:     { fontSize: 10, fontWeight: '500' },
  moveBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  moveBtnText:  { fontSize: 10, fontWeight: '600' },
});

export default KanbanScreen;
