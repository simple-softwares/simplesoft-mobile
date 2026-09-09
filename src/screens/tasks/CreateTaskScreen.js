import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Platform, Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';
import ProjectService from '../../services/project/projectService';
import MemberPicker from '../../components/team/MemberPicker';
import { AvatarStack } from '../../components/team/Avatar';
import { useTheme } from '../../theme/ThemeContext';
import { TASK_PRIORITIES } from '../../config';
import { friendlyError } from '../../utils/errorUtils';

const PRIORITIES = Object.entries(TASK_PRIORITIES).map(([key, val]) => ({
  value: key, label: val.label, color: val.color, icon: val.icon,
}));

const CreateTaskScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const user         = useSelector(s => s.auth.user);
  const routeProject = route?.params?.project || null;

  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [priority,     setPriority]     = useState('1');
  const [project,      setProject]      = useState(routeProject);
  const [projects,     setProjects]     = useState([]);
  const [stage,        setStage]        = useState(null);
  const [stages,       setStages]       = useState([]);
  const [assignees,    setAssignees]    = useState([]);
  const [deadline,     setDeadline]     = useState(null);
  const [showDate,     setShowDate]     = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showStages,   setShowStages]   = useState(false);
  const [showAssign,   setShowAssign]   = useState(false);
  const [saving,       setSaving]       = useState(false);

  useEffect(() => {
    loadProjects();
    const uid = user?.uid || user?.id;
    if (uid) setAssignees([{ id: uid, name: user?.name || 'Me' }]);
  }, []);

  // Load stages when project changes
  useEffect(() => {
    setStage(null);
    if (project?.id) {
      ProjectService.getTaskStages(project.id).then(s => setStages(s || [])).catch(() => setStages([]));
    } else {
      ProjectService.getTaskStages().then(s => setStages(s || [])).catch(() => setStages([]));
    }
  }, [project]);

  const loadProjects = async () => {
    const data = await ProjectService.getProjects().catch(() => []);
    setProjects(data || []);
    if (routeProject?.id && !routeProject.name) {
      const found = (data || []).find(p => p.id === routeProject.id);
      if (found) setProject(found);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Enter a task title'); return; }
    setSaving(true);
    try {
      const vals = {
        name:     title.trim(),
        priority: priority,
        ...(description.trim() && { description: description.trim() }),
        ...(project  && { project_id: project.id }),
        ...(stage    && { stage_id:   stage.id }),
        ...(deadline && { date_deadline: deadline.toISOString().split('T')[0] }),
        ...(assignees.length && { user_ids: assignees.map(a => a.id) }),
      };
      await ProjectService.createTask(vals);
      Alert.alert('Created', 'Task created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', friendlyError(e, 'Could not create task'));
    } finally { setSaving(false); }
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Title ── */}
        <View style={[s.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Title *</Text>
          <TextInput
            style={[s.titleInput, { color: colors.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to be done?"
            placeholderTextColor={colors.textLight}
            autoFocus
          />
        </View>

        {/* ── Description ── */}
        <View style={[s.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Description</Text>
          <TextInput
            style={[s.descInput, { color: colors.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add details (optional)..."
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* ── Priority ── */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Priority</Text>
          <View style={s.priorityRow}>
            {PRIORITIES.map(p => (
              <TouchableOpacity
                key={p.value}
                style={[s.priBtn, {
                  backgroundColor: priority === p.value ? p.color + '20' : colors.surface,
                  borderColor:     priority === p.value ? p.color : colors.border,
                }]}
                onPress={() => setPriority(p.value)}>
                <Text style={s.priBtnIcon}>{p.icon}</Text>
                <Text style={[s.priBtnLabel, { color: priority === p.value ? p.color : colors.textSecondary }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Project ── */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Project</Text>
          <TouchableOpacity
            style={[s.selector, { backgroundColor: colors.surface, borderColor: project ? colors.primary : colors.border }]}
            onPress={() => setShowProjects(true)}>
            <Icon name="folder-outline" size={18} color={project ? colors.primary : colors.textLight} />
            <Text style={[s.selectorText, { color: project ? colors.text : colors.textLight }]} numberOfLines={1}>
              {project ? project.name : 'Select project (optional)'}
            </Text>
            {project
              ? <TouchableOpacity onPress={() => setProject(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="close-circle" size={18} color={colors.textLight} />
                </TouchableOpacity>
              : <Icon name="chevron-down" size={18} color={colors.textLight} />}
          </TouchableOpacity>
        </View>

        {/* ── Stage ── */}
        {stages.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Stage</Text>
            <TouchableOpacity
              style={[s.selector, { backgroundColor: colors.surface, borderColor: stage ? colors.primary : colors.border }]}
              onPress={() => setShowStages(true)}>
              <Icon name="layers-outline" size={18} color={stage ? colors.primary : colors.textLight} />
              <Text style={[s.selectorText, { color: stage ? colors.text : colors.textLight }]} numberOfLines={1}>
                {stage ? stage.name : 'Select stage (optional)'}
              </Text>
              {stage
                ? <TouchableOpacity onPress={() => setStage(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="close-circle" size={18} color={colors.textLight} />
                  </TouchableOpacity>
                : <Icon name="chevron-down" size={18} color={colors.textLight} />}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Assignees ── */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Assign to</Text>
          <TouchableOpacity
            style={[s.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowAssign(true)}>
            {assignees.length > 0 ? (
              <View style={s.avatarRow}>
                <AvatarStack users={assignees} size={28} max={4} />
                <Text style={[s.selectorText, { color: colors.text }]}>
                  {assignees.length === 1 ? assignees[0].name : `${assignees.length} assignees`}
                </Text>
              </View>
            ) : (
              <>
                <Icon name="people-outline" size={18} color={colors.textLight} />
                <Text style={[s.selectorText, { color: colors.textLight }]}>Assign to team member</Text>
              </>
            )}
            <Icon name="chevron-down" size={18} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* ── Deadline ── */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Deadline</Text>
          <TouchableOpacity
            style={[s.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowDate(true)}>
            <Icon name="calendar-outline" size={18} color={deadline ? colors.primary : colors.textLight} />
            <Text style={[s.selectorText, { color: deadline ? colors.text : colors.textLight }]}>
              {deadline
                ? deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'Set deadline (optional)'}
            </Text>
            {deadline && (
              <TouchableOpacity onPress={() => setDeadline(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close-circle" size={18} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {showDate && (
          <DateTimePicker
            value={deadline || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(_, d) => { setShowDate(false); if (d) setDeadline(d); }}
          />
        )}
      </ScrollView>

      {/* ── Footer ── */}
      <View style={[s.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[s.cancelBtn, { borderColor: colors.border }]}
          onPress={() => navigation.goBack()}>
          <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Icon name="checkmark" size={20} color="#fff" /><Text style={s.saveText}>Create Task</Text></>}
        </TouchableOpacity>
      </View>

      {/* ── Project picker ── */}
      {showProjects && (
        <View style={s.sheet}>
          <TouchableOpacity style={s.sheetBg} onPress={() => setShowProjects(false)} />
          <View style={[s.sheetCard, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Select Project</Text>
            <ScrollView>
              <TouchableOpacity
                style={[s.sheetRow, { borderBottomColor: colors.border }]}
                onPress={() => { setProject(null); setShowProjects(false); }}>
                <Icon name="remove-circle-outline" size={18} color={colors.textSecondary} />
                <Text style={[s.sheetRowText, { color: colors.text }]}>No project</Text>
              </TouchableOpacity>
              {projects.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[s.sheetRow, { borderBottomColor: colors.border }, project?.id === p.id && { backgroundColor: colors.primary + '12' }]}
                  onPress={() => { setProject(p); setShowProjects(false); }}>
                  <Icon name="folder" size={18} color={colors.primary} />
                  <Text style={[s.sheetRowText, { color: project?.id === p.id ? colors.primary : colors.text }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {project?.id === p.id && <Icon name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── Stage picker ── */}
      {showStages && (
        <View style={s.sheet}>
          <TouchableOpacity style={s.sheetBg} onPress={() => setShowStages(false)} />
          <View style={[s.sheetCard, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Select Stage</Text>
            <ScrollView>
              <TouchableOpacity
                style={[s.sheetRow, { borderBottomColor: colors.border }]}
                onPress={() => { setStage(null); setShowStages(false); }}>
                <Icon name="remove-circle-outline" size={18} color={colors.textSecondary} />
                <Text style={[s.sheetRowText, { color: colors.text }]}>No stage</Text>
              </TouchableOpacity>
              {stages.map(st => (
                <TouchableOpacity
                  key={st.id}
                  style={[s.sheetRow, { borderBottomColor: colors.border }, stage?.id === st.id && { backgroundColor: colors.primary + '12' }]}
                  onPress={() => { setStage(st); setShowStages(false); }}>
                  <View style={[s.stageDot, { backgroundColor: ProjectService.getStageColor(st) }]} />
                  <Text style={[s.sheetRowText, { color: stage?.id === st.id ? colors.primary : colors.text }]} numberOfLines={1}>
                    {st.name}
                  </Text>
                  {stage?.id === st.id && <Icon name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── Assignee picker ── */}
      <MemberPicker
        visible={showAssign}
        onClose={() => setShowAssign(false)}
        onSelect={setAssignees}
        selectedIds={assignees.map(a => a.id)}
        multi
        title="Assign to"
      />
    </View>
  );
};

const S = StyleSheet;
const s = S.create({
  container:   { flex: 1 },
  scroll:      { padding: 16, paddingBottom: 120 },
  inputCard:   { borderWidth: S.hairlineWidth, borderRadius: 12, padding: 14, marginBottom: 12 },
  titleInput:  { fontSize: 16, fontWeight: '500', paddingTop: 4 },
  descInput:   { fontSize: 14, minHeight: 72, paddingTop: 4 },
  fieldLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  section:     { marginBottom: 12 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priBtn:      { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, gap: 3 },
  priBtnIcon:  { fontSize: 16 },
  priBtnLabel: { fontSize: 11, fontWeight: '600' },
  selector:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: S.hairlineWidth, borderRadius: 12, padding: 14 },
  selectorText:{ flex: 1, fontSize: 14 },
  avatarRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  footer:      { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12, padding: 14, borderTopWidth: S.hairlineWidth },
  cancelBtn:   { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 10, borderWidth: 1 },
  cancelText:  { fontSize: 14, fontWeight: '600' },
  saveBtn:     { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 10 },
  saveText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  sheet:       { ...S.absoluteFillObject, justifyContent: 'flex-end' },
  sheetBg:     { ...S.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetCard:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '70%' },
  handle:      { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetTitle:  { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  sheetRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: S.hairlineWidth, borderRadius: 6, paddingHorizontal: 4 },
  sheetRowText:{ flex: 1, fontSize: 14, fontWeight: '500' },
  stageDot:    { width: 8, height: 8, borderRadius: 4 },
});

export default CreateTaskScreen;
