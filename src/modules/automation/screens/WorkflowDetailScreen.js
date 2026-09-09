import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch, Modal,
  FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import AutomationService from '../automationService';
import { friendlyError } from '../../../utils/errorUtils';

// ── Constants ───────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: 'manual',         label: 'Manual Only',      icon: 'play-outline' },
  { value: 'scheduled',      label: 'Scheduled',         icon: 'time-outline' },
  { value: 'webhook',        label: 'Webhook / API',     icon: 'globe-outline' },
  { value: 'record_created', label: 'Record Created',    icon: 'document-outline' },
  { value: 'record_updated', label: 'Record Updated',    icon: 'create-outline' },
];

const INTERVAL_OPTIONS = ['minutes', 'hours', 'days', 'weeks'];

const CATEGORY_ORDER  = ['trigger', 'logic', 'action', 'utility'];
const CATEGORY_LABELS = { trigger: 'Trigger', logic: 'Logic', action: 'Actions', utility: 'Utility' };

// ── Node type picker modal ───────────────────────────────────────────────────

const NodeTypePicker = ({ visible, nodeTypes, onSelect, onClose, colors }) => {
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = nodeTypes.filter(n => n.category === cat);
    if (items.length) acc.push({ cat, items });
    return acc;
  }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[np.overlay]}>
        <View style={[np.sheet, { backgroundColor: colors.surface }]}>
          <View style={[np.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[np.sheetTitle, { color: colors.text }]}>Add Node</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={np.scroll}>
            {grouped.map(({ cat, items }) => (
              <View key={cat}>
                <Text style={[np.catLabel, { color: colors.textLight }]}>
                  {CATEGORY_LABELS[cat] || cat}
                </Text>
                 {items.map(nt => (
                   <TouchableOpacity
                     key={nt.type}
                     style={[np.item, { borderColor: colors.border }]}
                     onPress={() => { onSelect(nt); onClose(); }}
                     activeOpacity={0.7}>
                     <View style={[np.nodeIcon, { backgroundColor: nt.color + '20' }]}>
                       <Icon name={nt.icon} size={20} color={nt.color} />
                     </View>
                     <Text style={[np.nodeLabel, { color: colors.text }]}>{nt.label}</Text>
                     <Icon name="add-circle-outline" size={18} color={colors.textLight} />
                   </TouchableOpacity>
                 ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const np = StyleSheet.create({
  overlay:     { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:       { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetTitle:  { fontSize: 16, fontWeight: '700' },
  scroll:      { paddingHorizontal: 16, paddingBottom: 40 },
  catLabel:    { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingVertical: 10, paddingTop: 16 },
  item:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  nodeIcon:    { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  nodeLabel:   { flex: 1, fontSize: 14, fontWeight: '500' },
});

// ── Node config form ─────────────────────────────────────────────────────────

const NodeConfigForm = ({ node, nodeType, onChange, colors }) => {
  if (!nodeType?.config_schema) return null;
  return (
    <View style={cf.form}>
      {Object.entries(nodeType.config_schema).map(([key, schema]) => {
        const value = node.config?.[key] ?? schema.default ?? '';
        return (
          <View key={key} style={cf.field}>
            <Text style={[cf.label, { color: colors.textSecondary }]}>{schema.label}</Text>
            {schema.type === 'select' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={cf.chips}>
                  {(schema.options || []).map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[cf.chip, value === opt && { backgroundColor: colors.primary }]}
                      onPress={() => onChange(key, opt)}>
                      <Text style={[cf.chipText, { color: value === opt ? '#fff' : colors.textSecondary }]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : schema.type === 'textarea' ? (
              <TextInput
                style={[cf.input, cf.textarea, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                value={String(value)}
                onChangeText={v => onChange(key, v)}
                placeholder={schema.placeholder || ''}
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
              />
            ) : schema.type === 'key_value' ? (
              <TextInput
                style={[cf.input, cf.textarea, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                value={typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                onChangeText={v => {
                  try { onChange(key, JSON.parse(v)); } catch { onChange(key, v); }
                }}
                placeholder={schema.placeholder || 'key: value'}
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
              />
            ) : (
              <TextInput
                style={[cf.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                value={String(value)}
                onChangeText={v => onChange(key, schema.type === 'number' ? (Number(v) || 0) : v)}
                placeholder={schema.placeholder || ''}
                placeholderTextColor={colors.textLight}
                keyboardType={schema.type === 'number' ? 'numeric' : 'default'}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};

const cf = StyleSheet.create({
  form:      { gap: 12 },
  field:     { gap: 4 },
  label:     { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input:     { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  textarea:  { minHeight: 72, textAlignVertical: 'top' },
  chips:     { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  chip:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#0000000A' },
  chipText:  { fontSize: 12, fontWeight: '600' },
});

// ── Node card ────────────────────────────────────────────────────────────────

const NodeCard = ({ node, nodeType, index, isExpanded, onExpand, onConfigChange, onDelete, colors }) => {
  const color = nodeType?.color || '#6B7280';
  return (
    <View style={[nc.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity style={nc.header} onPress={onExpand} activeOpacity={0.7}>
        <View style={[nc.iconWrap, { backgroundColor: color + '20' }]}>
          <Icon name={nodeType?.icon || 'ellipse-outline'} size={18} color={color} />
        </View>
        <Text style={[nc.label, { color: colors.text }]}>{node.label || nodeType?.label}</Text>
        <View style={nc.headerRight}>
          <View style={[nc.stepBadge, { backgroundColor: colors.inputBackground }]}>
            <Text style={[nc.stepNum, { color: colors.textSecondary }]}>{index + 1}</Text>
          </View>
          <TouchableOpacity
            onPress={() => onDelete(node.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="trash-outline" size={16} color={colors.error} />
          </TouchableOpacity>
          <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textLight} />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={[nc.body, { borderTopColor: colors.border }]}>
          {/* Node label override */}
          <View style={cf.field}>
            <Text style={[cf.label, { color: colors.textSecondary }]}>Label (optional)</Text>
            <TextInput
              style={[cf.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              value={node.label || ''}
              onChangeText={v => onConfigChange(node.id, '__label__', v)}
              placeholder={nodeType?.label || 'Node label'}
              placeholderTextColor={colors.textLight}
            />
          </View>
          <NodeConfigForm
            node={node}
            nodeType={nodeType}
            onChange={(key, val) => onConfigChange(node.id, key, val)}
            colors={colors}
          />
        </View>
      )}
    </View>
  );
};

const nc = StyleSheet.create({
  card:       { borderRadius: 12, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  iconWrap:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label:      { flex: 1, fontSize: 14, fontWeight: '600' },
  headerRight:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBadge:  { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepNum:    { fontSize: 11, fontWeight: '700' },
  body:       { padding: 14, borderTopWidth: StyleSheet.hairlineWidth, gap: 12 },
});

// ── Main WorkflowDetailScreen ─────────────────────────────────────────────────

const WorkflowDetailScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { workflowId, mode } = route.params || {};
  const isCreate = mode === 'create';

  const [workflow,    setWorkflow]    = useState(null);
  const [nodeTypes,   setNodeTypes]   = useState([]);
  const [loading,     setLoading]     = useState(!isCreate);
  const [saving,      setSaving]      = useState(false);
  const [triggering,  setTriggering]  = useState(false);
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [expandedNode, setExpandedNode] = useState(null);

  // Local editable state
  const [name,         setName]         = useState('New Workflow');
  const [description,  setDescription]  = useState('');
  const [triggerType,  setTriggerType]  = useState('manual');
  const [triggerModel, setTriggerModel] = useState('');
  const [triggerField, setTriggerField] = useState('');
  const [cronNumber,   setCronNumber]   = useState('1');
  const [cronUnit,     setCronUnit]     = useState('days');
  const [nodes,        setNodes]        = useState([]);
  const [active,       setActive]       = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [nt, wf] = await Promise.all([
        AutomationService.getNodeTypes(),
        isCreate ? Promise.resolve(null) : AutomationService.get(workflowId),
      ]);
      setNodeTypes(nt);
      if (wf) {
        setWorkflow(wf);
        setName(wf.name);
        setDescription(wf.description || '');
        setTriggerType(wf.trigger_type);
        setTriggerModel(wf.trigger_model || '');
        setTriggerField(wf.trigger_field || '');
        setCronNumber(String(wf.cron_interval_number || 1));
        setCronUnit(wf.cron_interval_type || 'days');
        setNodes(wf.nodes || []);
        setActive(wf.active);
      }
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [workflowId, isCreate]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddNode = (nodeType) => {
    const id = `node_${Date.now()}`;
    setNodes(prev => [...prev, { id, type: nodeType.type, label: nodeType.label, config: {} }]);
    setExpandedNode(id);
  };

  const handleConfigChange = (nodeId, key, val) => {
    setNodes(prev => prev.map(n => {
      if (n.id !== nodeId) return n;
      if (key === '__label__') return { ...n, label: val };
      return { ...n, config: { ...n.config, [key]: val } };
    }));
  };

  const handleDeleteNode = (nodeId) => {
    Alert.alert('Delete Node', 'Remove this node?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setNodes(prev => prev.filter(n => n.id !== nodeId)) },
    ]);
  };

  const buildEdges = (nodeList) => {
    // Auto-generate linear edges: each node → next node
    return nodeList.slice(0, -1).map((n, i) => ({
      id:     `e_${n.id}_${nodeList[i + 1].id}`,
      source: n.id,
      target: nodeList[i + 1].id,
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter a workflow name'); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        trigger_type: triggerType,
        trigger_model: triggerModel,
        trigger_field: triggerField,
        cron_interval_number: parseInt(cronNumber, 10) || 1,
        cron_interval_type: cronUnit,
        nodes,
        edges: buildEdges(nodes),
      };
      if (isCreate) {
        const created = await AutomationService.create(payload);
        navigation.replace('WorkflowDetail', { workflowId: created.id, workflowName: created.name });
      } else {
        const updated = await AutomationService.update(workflowId, payload);
        setWorkflow(updated);
        Alert.alert('Saved', 'Workflow saved successfully');
      }
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleTrigger = async () => {
    if (!workflow) { Alert.alert('Save first', 'Save the workflow before running it'); return; }
    setTriggering(true);
    try {
      await AutomationService.trigger(workflow.id);
      Alert.alert('Triggered', 'Workflow is now running');
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setTriggering(false);
    }
  };

  const handleToggle = async () => {
    if (!workflow) return;
    try {
      const newActive = await AutomationService.toggle(workflow.id, active);
      setActive(newActive);
      setWorkflow(prev => ({ ...prev, active: newActive }));
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    }
  };

  const handleDelete = () => {
    if (!workflow) return;
    Alert.alert('Delete Workflow', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await AutomationService.delete(workflow.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', friendlyError(e));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.container, { backgroundColor: colors.background }]}>

        {/* Header */}
        <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Icon name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {isCreate ? 'New Workflow' : name}
          </Text>
          <View style={s.headerRight}>
            {!isCreate && (
              <TouchableOpacity
                style={[s.iconBtn, active && { backgroundColor: '#4CAF5020' }]}
                onPress={handleToggle}>
                <Icon name={active ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={active ? '#4CAF50' : colors.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Basic info */}
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Workflow Details</Text>
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Name</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder="Workflow name"
                placeholderTextColor={colors.textLight}
              />
            </View>
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[s.input, s.textarea, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={2}
              />
            </View>
          </View>

          {/* Trigger */}
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Trigger</Text>
            <View style={s.triggerGrid}>
              {TRIGGER_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.triggerChip, triggerType === opt.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setTriggerType(opt.value)}>
                  <Icon name={opt.icon} size={14} color={triggerType === opt.value ? '#fff' : colors.textSecondary} />
                  <Text style={[s.triggerChipText, { color: triggerType === opt.value ? '#fff' : colors.textSecondary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(triggerType === 'record_created' || triggerType === 'record_updated') && (
              <View style={s.fieldGroup}>
                <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Model (e.g. crm.lead)</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                  value={triggerModel}
                  onChangeText={setTriggerModel}
                  placeholder="crm.lead"
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="none"
                />
                {triggerType === 'record_updated' && (
                  <>
                    <Text style={[s.fieldLabel, { color: colors.textSecondary, marginTop: 8 }]}>
                      Watch Field (optional)
                    </Text>
                    <TextInput
                      style={[s.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                      value={triggerField}
                      onChangeText={setTriggerField}
                      placeholder="stage_id"
                      placeholderTextColor={colors.textLight}
                      autoCapitalize="none"
                    />
                  </>
                )}
              </View>
            )}

            {triggerType === 'scheduled' && (
              <View style={s.scheduleRow}>
                <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Every</Text>
                <TextInput
                  style={[s.scheduleInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                  value={cronNumber}
                  onChangeText={setCronNumber}
                  keyboardType="numeric"
                />
                <View style={s.unitChips}>
                  {INTERVAL_OPTIONS.map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[s.unitChip, cronUnit === u && { backgroundColor: colors.primary }]}
                      onPress={() => setCronUnit(u)}>
                      <Text style={[s.unitChipText, { color: cronUnit === u ? '#fff' : colors.textSecondary }]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {triggerType === 'webhook' && workflow?.webhook_token ? (
              <View style={[s.webhookBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Text style={[s.webhookLabel, { color: colors.textSecondary }]}>Webhook URL</Text>
                <Text style={[s.webhookUrl, { color: colors.primary }]} selectable>
                  /api/automation/webhook/{workflow.webhook_token}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Nodes */}
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.nodeHeader}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>
                Nodes ({nodes.length})
              </Text>
              <TouchableOpacity
                style={[s.addNodeBtn, { backgroundColor: colors.primary }]}
                onPress={() => setPickerOpen(true)}>
                <Icon name="add" size={16} color="#fff" />
                <Text style={s.addNodeBtnText}>Add Node</Text>
              </TouchableOpacity>
            </View>

            {nodes.length === 0 ? (
              <TouchableOpacity
                style={[s.emptyNodes, { borderColor: colors.border }]}
                onPress={() => setPickerOpen(true)}>
                <Icon name="add-circle-outline" size={32} color={colors.textLight} />
                <Text style={[s.emptyNodesText, { color: colors.textSecondary }]}>
                  Tap to add your first node
                </Text>
              </TouchableOpacity>
            ) : (
              nodes.map((node, idx) => {
                const nt = nodeTypes.find(t => t.type === node.type);
                return (
                  <NodeCard
                    key={node.id}
                    node={node}
                    nodeType={nt}
                    index={idx}
                    isExpanded={expandedNode === node.id}
                    onExpand={() => setExpandedNode(expandedNode === node.id ? null : node.id)}
                    onConfigChange={handleConfigChange}
                    onDelete={handleDeleteNode}
                    colors={colors}
                  />
                );
              })
            )}
          </View>

          {/* Action buttons */}
          {!isCreate && workflow && (
            <View style={s.actions}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#2563EB' }, triggering && { opacity: 0.6 }]}
                onPress={handleTrigger}
                disabled={triggering}>
                {triggering
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Icon name="play-circle-outline" size={18} color="#fff" /><Text style={s.actionBtnText}>Run Now</Text></>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => navigation.navigate('WorkflowRuns', { workflowId: workflow.id, workflowName: name })}>
                <Icon name="list-outline" size={18} color={colors.text} />
                <Text style={[s.actionBtnText, { color: colors.text }]}>View History</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#FEE2E2' }]}
                onPress={handleDelete}>
                <Icon name="trash-outline" size={18} color="#DC2626" />
                <Text style={[s.actionBtnText, { color: '#DC2626' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <NodeTypePicker
          visible={pickerOpen}
          nodeTypes={nodeTypes}
          onSelect={handleAddNode}
          onClose={() => setPickerOpen(false)}
          colors={colors}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container:      { flex: 1 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:        { padding: 4 },
  headerTitle:    { flex: 1, fontSize: 16, fontWeight: '700' },
  headerRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn:        { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  saveBtn:        { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 60, alignItems: 'center' },
  saveBtnText:    { color: '#fff', fontWeight: '600', fontSize: 13 },
  scroll:         { padding: 12, gap: 12, paddingBottom: 100 },
  section:        { borderRadius: 14, padding: 16, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  sectionTitle:   { fontSize: 14, fontWeight: '700' },
  fieldGroup:     { gap: 4 },
  fieldLabel:     { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input:          { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea:       { minHeight: 64, textAlignVertical: 'top' },
  triggerGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  triggerChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#0000001A', backgroundColor: '#0000000A' },
  triggerChipText:{ fontSize: 12, fontWeight: '600' },
  scheduleRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  scheduleInput:  { width: 56, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, textAlign: 'center' },
  unitChips:      { flexDirection: 'row', gap: 6 },
  unitChip:       { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#0000000A' },
  unitChipText:   { fontSize: 12, fontWeight: '600' },
  webhookBox:     { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 4 },
  webhookLabel:   { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  webhookUrl:     { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  nodeHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addNodeBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  addNodeBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyNodes:     { alignItems: 'center', paddingVertical: 30, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', gap: 8 },
  emptyNodesText: { fontSize: 13 },
  actions:        { gap: 10, paddingTop: 4 },
  actionBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  actionBtnText:  { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default WorkflowDetailScreen;
