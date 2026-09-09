import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, TextInput, ActivityIndicator, Modal, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import ProjectService from '../../../services/project/projectService';
import MemberPicker from '../../../components/team/MemberPicker';
import { AvatarStack } from '../../../components/team/Avatar';
import { useTheme } from '../../../theme/ThemeContext';
import { TASK_PRIORITIES } from '../../../config';
import TaskChatter from '../../../components/tasks/TaskChatter';
import { undoDelete } from '../../../utils/undoDelete';

const PC = Object.entries(TASK_PRIORITIES).reduce((acc, [k, v]) => ({ ...acc, [k]: v.color }), {});
const PL = Object.entries(TASK_PRIORITIES).reduce((acc, [k, v]) => ({ ...acc, [k]: v.label }), {});
const PI = Object.entries(TASK_PRIORITIES).reduce((acc, [k, v]) => ({ ...acc, [k]: v.icon }), {});

const TaskDetailsScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { taskId } = route.params || {};

  const [task,          setTask]          = useState(null);
  const [stages,        setStages]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [editingTitle,  setEditingTitle]  = useState(false);
  const [editedName,    setEditedName]    = useState('');
  const [editingDesc,   setEditingDesc]   = useState(false);
  const [editedDesc,    setEditedDesc]    = useState('');
  const [showStages,    setShowStages]    = useState(false);
  const [showPriority,  setShowPriority]  = useState(false);
  const [showDatePicker,setShowDatePicker]= useState(false);
  const [showAssign,    setShowAssign]    = useState(false);

  useEffect(() => { load(); }, [taskId]);

  const load = async () => {
    try {
      setLoading(true);
      const [t, s] = await Promise.all([
        ProjectService.getTaskById(taskId),
        ProjectService.getTaskStages(),
      ]);
      if (t) {
        setTask(t);
        setEditedName(t.name || '');
        setEditedDesc(t.description ? t.description.replace(/<[^>]+>/g, '').trim() : '');
      }
      setStages(s || []);
    } catch {
      Alert.alert('Error', 'Could not load task');
    } finally {
      setLoading(false);
    }
  };

  const patch = async (vals, optimistic = {}) => {
    try {
      setSaving(true);
      setTask(prev => ({ ...prev, ...optimistic }));
      await ProjectService.updateTask(taskId, vals);
    } catch (e) {
      Alert.alert('Error', 'Could not save changes');
      load(); // revert
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!editedName.trim()) return;
    setEditingTitle(false);
    await patch({ name: editedName }, { name: editedName });
  };

  const handleSaveDesc = async () => {
    setEditingDesc(false);
    await patch({ description: editedDesc }, {});
  };

  const handleStageChange = async stage => {
    setShowStages(false);
    await patch({ stage_id: stage.id }, { stage_id: [stage.id, stage.name] });
  };

  const handlePriorityChange = async priority => {
    setShowPriority(false);
    await patch({ priority }, { priority });
  };

  const handleDeadlineChange = async (_, date) => {
    setShowDatePicker(false);
    if (!date) return;
    const ds = date.toISOString().split('T')[0];
    await patch({ date_deadline: ds }, { date_deadline: ds });
  };

  const clearDeadline = async () => {
    await patch({ date_deadline: false }, { date_deadline: false });
  };

  const handleAssignChange = async members => {
    setShowAssign(false);
    const ids  = members.map(m => m.id);
    const data = members.map(m => [m.id, m.name]);
    await patch({ user_ids: ids }, { user_ids: data });
  };

  const handleDelete = () => {
    navigation.goBack();
    undoDelete(
      'Task',
      () => ProjectService.deleteTask(taskId),
      () => navigation.push('TaskDetail', { taskId }),
    );
  };

  const handleMarkDone = async () => {
    const doneStage = stages.find(s => s.name?.toLowerCase().includes('done') || s.fold);
    if (!doneStage) { Alert.alert('No done stage', 'No "Done" stage found in this project'); return; }
    await handleStageChange(doneStage);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: colors.background }}>
        <Icon name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={{ fontSize: 16, color: colors.error }}>Task not found</Text>
      </View>
    );
  }

  const priorityColor = PC[task.priority] || '#9E9E9E';
  const currentStage  = stages.find(s => s.id === task.stage_id?.[0]);
  const stageColor    = ProjectService.getStageColor(currentStage);
  const isOverdue     = task.date_deadline && task.date_deadline < new Date().toISOString().split('T')[0];
  const isDone        = currentStage?.fold || task.stage_id?.[1]?.toLowerCase().includes('done');
  const assignees     = (task.user_ids || []).map(u =>
    Array.isArray(u) ? { id: u[0], name: u[1] } : { id: u, name: String(u) }
  );

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Priority strip ── */}
        <TouchableOpacity
          style={[styles.priorityStrip, { backgroundColor: priorityColor }]}
          onPress={() => setShowPriority(true)}
          activeOpacity={0.85}>
          <Text style={styles.priorityStripText}>
            {PI[task.priority]} {PL[task.priority]} Priority
          </Text>
          <Icon name="chevron-down" size={14} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        {/* ── Title ── */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface }]}>
          <View style={styles.titleRow}>
            {editingTitle ? (
              <TextInput
                style={styles.titleInput}
                value={editedName}
                onChangeText={setEditedName}
                multiline
                autoFocus
                placeholderTextColor={colors.textLight}
                onBlur={handleSaveTitle}
              />
            ) : (
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setEditingTitle(true)} activeOpacity={0.7}>
                <Text style={[styles.taskTitle, isDone && styles.titleDone]}>{task.name}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.titleAction}
              onPress={() => editingTitle ? handleSaveTitle() : setEditingTitle(true)}>
              {saving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Icon name={editingTitle ? 'checkmark-circle' : 'create-outline'} size={22} color={colors.primary} />}
            </TouchableOpacity>
          </View>

          {/* Stage pill */}
          <TouchableOpacity
            style={[styles.stagePill, { backgroundColor: stageColor + '20', borderColor: stageColor }]}
            onPress={() => setShowStages(true)}>
            <View style={[styles.stageDot, { backgroundColor: stageColor }]} />
            <Text style={[styles.stageText, { color: stageColor }]}>
              {task.stage_id?.[1] || 'No Stage'}
            </Text>
            <Icon name="chevron-down" size={13} color={stageColor} />
          </TouchableOpacity>

          {/* Mark done shortcut */}
          {!isDone && (
            <TouchableOpacity
              style={[styles.markDoneBtn, { backgroundColor: '#4CAF5015', borderColor: '#4CAF5040' }]}
              onPress={handleMarkDone}>
              <Icon name="checkmark-circle-outline" size={16} color="#4CAF50" />
              <Text style={[styles.markDoneText, { color: '#4CAF50' }]}>Mark as Done</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Details card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>

          {/* Project */}
          {task.project_id && (
            <View style={styles.infoRow}>
              <Icon name="folder-outline" size={16} color={colors.primary} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Project</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>{task.project_id[1]}</Text>
              </View>
            </View>
          )}

          {/* Deadline — tappable */}
          <TouchableOpacity style={styles.infoRow} onPress={() => setShowDatePicker(true)}>
            <Icon
              name="calendar-outline" size={16}
              color={isOverdue ? colors.error : colors.textSecondary}
              style={styles.infoIcon}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Deadline</Text>
              <Text style={[styles.infoValue, isOverdue && { color: colors.error }]}>
                {task.date_deadline
                  ? new Date(task.date_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Tap to set deadline'}
                {isOverdue ? ' ⚠' : ''}
              </Text>
            </View>
            {task.date_deadline ? (
              <TouchableOpacity onPress={clearDeadline} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close-circle-outline" size={18} color={colors.textLight} />
              </TouchableOpacity>
            ) : (
              <Icon name="chevron-forward" size={16} color={colors.textLight} />
            )}
          </TouchableOpacity>

          {/* Assignees — tappable */}
          <TouchableOpacity style={styles.infoRow} onPress={() => setShowAssign(true)}>
            <Icon name="people-outline" size={16} color={colors.textSecondary} style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Assigned to</Text>
              {assignees.length > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <AvatarStack users={assignees} size={24} max={4} />
                  <Text style={styles.infoValue}>
                    {assignees.length === 1 ? assignees[0].name : `${assignees.length} people`}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.infoValue, { color: colors.textLight }]}>Tap to assign</Text>
              )}
            </View>
            <Icon name="chevron-forward" size={16} color={colors.textLight} />
          </TouchableOpacity>

          {/* Contact */}
          {task.partner_id && (
            <View style={styles.infoRow}>
              <Icon name="business-outline" size={16} color={colors.textSecondary} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Contact</Text>
                <Text style={styles.infoValue}>{task.partner_id[1]}</Text>
              </View>
            </View>
          )}

          {/* Created */}
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <Icon name="time-outline" size={16} color={colors.textSecondary} style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Created</Text>
              <Text style={styles.infoValue}>
                {task.create_date ? new Date(task.create_date).toLocaleDateString('en-IN') : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Description card ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Description</Text>
            <TouchableOpacity onPress={() => editingDesc ? handleSaveDesc() : setEditingDesc(true)}>
              <Icon
                name={editingDesc ? 'checkmark-circle' : 'create-outline'}
                size={18}
                color={editingDesc ? '#4CAF50' : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {editingDesc ? (
            <TextInput
              style={[styles.descInput, { borderColor: colors.border, color: colors.text }]}
              value={editedDesc}
              onChangeText={setEditedDesc}
              placeholder="Add a description..."
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              autoFocus
            />
          ) : (
            <TouchableOpacity onPress={() => setEditingDesc(true)} activeOpacity={0.7}>
              <Text style={[styles.descText, !editedDesc && { color: colors.textLight }]}>
                {editedDesc || 'Tap to add a description...'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Tags ── */}
        {task.tag_ids?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tags</Text>
            <View style={styles.tagRow}>
              {task.tag_ids.map((t, i) => (
                <View key={i} style={[styles.tag, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>
                    #{Array.isArray(t) ? t[1] : t}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Delete ── */}
        <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.error + '40', backgroundColor: colors.error + '08' }]} onPress={handleDelete}>
          <Icon name="trash-outline" size={18} color={colors.error} />
          <Text style={[styles.deleteBtnText, { color: colors.error }]}>Delete Task</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
        <TaskChatter taskId={taskId} />
      </ScrollView>

      {/* ── Stage picker ── */}
      {showStages && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBg} onPress={() => setShowStages(false)} />
          <View style={[styles.sheetCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Move to Stage</Text>
            <ScrollView>
              {stages.map(stage => {
                const sc = ProjectService.getStageColor(stage);
                const active = stage.id === task.stage_id?.[0];
                return (
                  <TouchableOpacity
                    key={stage.id}
                    style={[styles.sheetRow, { borderBottomColor: colors.border }, active && { backgroundColor: colors.primary + '12' }]}
                    onPress={() => handleStageChange(stage)}>
                    <View style={[styles.stageDot, { backgroundColor: sc }]} />
                    <Text style={[styles.sheetRowText, { color: active ? colors.primary : colors.text }, active && { fontWeight: '700' }]}>
                      {stage.name}
                    </Text>
                    {active && <Icon name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowStages(false)}>
              <Text style={[styles.sheetCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Priority picker ── */}
      {showPriority && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBg} onPress={() => setShowPriority(false)} />
          <View style={[styles.sheetCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Set Priority</Text>
            {Object.entries(TASK_PRIORITIES).map(([key, val]) => {
              const active = task.priority === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.sheetRow, { borderBottomColor: colors.border }, active && { backgroundColor: val.color + '12' }]}
                  onPress={() => handlePriorityChange(key)}>
                  <View style={[styles.priDot, { backgroundColor: val.color }]} />
                  <Text style={styles.priIcon}>{val.icon}</Text>
                  <Text style={[styles.sheetRowText, { color: active ? val.color : colors.text }, active && { fontWeight: '700' }]}>
                    {val.label}
                  </Text>
                  {active && <Icon name="checkmark" size={18} color={val.color} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowPriority(false)}>
              <Text style={[styles.sheetCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Assignee picker ── */}
      <MemberPicker
        visible={showAssign}
        onClose={() => setShowAssign(false)}
        onSelect={handleAssignChange}
        selectedIds={assignees.map(a => a.id)}
        multi
        title="Assign to"
      />

      {/* ── Date picker ── */}
      {showDatePicker && (
        <DateTimePicker
          value={task.date_deadline ? new Date(task.date_deadline) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDeadlineChange}
        />
      )}
    </View>
  );
};

const makeStyles = colors => StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  priorityStrip:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  priorityStripText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  headerCard:     { marginBottom: 8 },
  titleRow:       { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 10 },
  taskTitle:      { flex: 1, fontSize: 20, fontWeight: '700', color: colors.text, lineHeight: 28 },
  titleDone:      { textDecorationLine: 'line-through', opacity: 0.6 },
  titleInput:     { flex: 1, fontSize: 20, fontWeight: '700', color: colors.text, borderBottomWidth: 2, borderBottomColor: colors.primary, paddingVertical: 4, lineHeight: 28 },
  titleAction:    { padding: 4, marginTop: 4 },
  stagePill:      { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  stageDot:       { width: 8, height: 8, borderRadius: 4 },
  stageText:      { fontSize: 13, fontWeight: '600' },
  markDoneBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginHorizontal: 20, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  markDoneText:   { fontSize: 13, fontWeight: '600' },
  card:           { backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  cardTitle:      { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitleRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  infoRow:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  infoIcon:       { marginTop: 2, marginRight: 12, width: 18 },
  infoContent:    { flex: 1 },
  infoLabel:      { fontSize: 10, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue:      { fontSize: 14, color: colors.text },
  descText:       { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  descInput:      { fontSize: 14, color: colors.text, borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 100, lineHeight: 22, textAlignVertical: 'top' },
  tagRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag:            { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  tagText:        { fontSize: 12, fontWeight: '600' },
  deleteBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 4, padding: 16, borderRadius: 12, borderWidth: 1 },
  deleteBtnText:  { fontSize: 14, fontWeight: '600' },
  sheetOverlay:   { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheetBg:        { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetCard:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%' },
  sheetTitle:     { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 16 },
  sheetRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 4 },
  sheetRowText:   { flex: 1, fontSize: 14 },
  sheetCancel:    { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  sheetCancelText:{ fontSize: 14, fontWeight: '600' },
  priDot:         { width: 8, height: 8, borderRadius: 4 },
  priIcon:        { fontSize: 16 },
});

export default TaskDetailsScreen;
