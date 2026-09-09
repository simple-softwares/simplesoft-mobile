import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, SectionList, Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../theme/ThemeContext';
import { fetchAppConfig } from '../../store/slices/configSlice';
import PlanService from '../../services/provision/planService';
import { TIER_FEATURES, TIER_DESCRIPTIONS } from '../../config/tierFeatures';

// ── Module display metadata ──────────────────────────────────
const MODULE_META = {
  tasks:       { name: 'Tasks',        icon: 'checkmark-circle-outline', color: '#2196F3', desc: 'Manage tasks and to-dos' },
  projects:    { name: 'Projects',     icon: 'folder-outline',           color: '#4CAF50', desc: 'Organize work into projects' },
  notes:       { name: 'Notes',        icon: 'document-text-outline',    color: '#FF9800', desc: 'Rich text notes and documents' },
  contacts:    { name: 'Contacts',     icon: 'people-outline',           color: '#9C27B0', desc: 'Customer and partner contacts' },
  chat:        { name: 'Chat',         icon: 'chatbubbles-outline',      color: '#00BCD4', desc: 'Team messaging and channels' },
  files:       { name: 'Files',        icon: 'cloud-upload-outline',     color: '#607D8B', desc: 'Document storage and sharing' },
  teams:       { name: 'Teams',        icon: 'people-circle-outline',    color: '#795548', desc: 'Team and member management' },
  crm:         { name: 'CRM',          icon: 'trending-up-outline',      color: '#FF5722', desc: 'Customer relationship management' },
  sales:       { name: 'Sales',        icon: 'cart-outline',             color: '#E91E63', desc: 'Sales pipeline and order tracking' },
  hr:          { name: 'HR',           icon: 'person-add-outline',       color: '#3F51B5', desc: 'Human resources and employees' },
  attendance:  { name: 'Attendance',   icon: 'time-outline',             color: '#009688', desc: 'Staff attendance and leaves' },
  inventory:   { name: 'Inventory',    icon: 'cube-outline',             color: '#FF6F00', desc: 'Stock and inventory management' },
  ai:          { name: 'AI Assistant', icon: 'sparkles-outline',         color: '#8B5CF6', desc: 'AI-powered insights and assistance' },
  automation:  { name: 'Automation',   icon: 'flash-outline',            color: '#F59E0B', desc: 'Workflow automation rules' },
  performance: { name: 'Performance',  icon: 'stats-chart-outline',      color: '#10B981', desc: 'Analytics and KPI dashboards' },
  calendar:    { name: 'Calendar',     icon: 'calendar-outline',         color: '#6366F1', desc: 'Calendar and scheduling' },
};

const TIER_INFO = {
  foundation: { label: 'Foundation', color: '#607D8B' },
  operations:  { label: 'Operations', color: '#2196F3' },
  automated:   { label: 'Automated',  color: '#8B5CF6' },
  enterprise:  { label: 'Enterprise', color: '#FF5722' },
};

// All known module keys in display order
const ALL_MODULE_KEYS = [
  'tasks', 'projects', 'notes', 'contacts', 'chat', 'files', 'teams',
  'crm', 'sales', 'hr', 'attendance', 'inventory',
  'ai', 'automation', 'performance', 'calendar',
];

const ModulesStatusScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const workspace = useSelector(s => s.workspace);
  const plan = useSelector(s => s.plan);

  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);

  const currentTier = plan?.tier || 'foundation';

  // Enabled = union of tier's own modules + whatever the plan explicitly enables
  // This ensures that e.g. automated tier always shows foundation/operations modules as included
  const planModules  = plan?.modules || plan?.selected_modules || [];
  const tierModules  = TIER_FEATURES[currentTier] || [];
  const enabledSet   = new Set([...tierModules, ...planModules]);
  const enabledModules = [...enabledSet];

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        try {
          dispatch(fetchAppConfig(true));
          if (workspace?.slug) {
            await PlanService.fetchPlan(workspace.slug);
          }
        } catch {}
        finally { setLoading(false); }
      };
      load();
    }, [dispatch, workspace?.slug])
  );

  // Included = in enabledModules; Locked = everything else in ALL_MODULE_KEYS
  const includedKeys = ALL_MODULE_KEYS.filter(k => enabledSet.has(k));
  // Add any plan extras not in our known list
  planModules.forEach(k => { if (!includedKeys.includes(k)) includedKeys.push(k); });

  const lockedKeys = ALL_MODULE_KEYS.filter(k => !enabledSet.has(k));

  const toModuleItem = key => ({
    key,
    ...(MODULE_META[key] || { name: key, icon: 'apps-outline', color: '#999', desc: '' }),
    enabled: enabledModules.includes(key),
  });

  const sections = [];
  if (includedKeys.length > 0) {
    sections.push({ title: `Included — ${includedKeys.length} modules`, data: includedKeys.map(toModuleItem) });
  }
  if (lockedKeys.length > 0) {
    sections.push({ title: 'Upgrade to Unlock', data: lockedKeys.map(toModuleItem) });
  }

  // ── Module Card ─────────────────────────────────────────────
  const ModuleCard = ({ item }) => (
    <TouchableOpacity
      style={[s.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }, !item.enabled && s.locked]}
      onPress={() => { setSelectedModule(item); setShowDetails(true); }}>
      <View style={s.cardHeader}>
        <View style={[s.moduleIcon, { backgroundColor: item.color + '18' }]}>
          <Icon name={item.icon} size={20} color={item.enabled ? item.color : colors.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.moduleName, { color: item.enabled ? colors.text : colors.textSecondary }]}>{item.name}</Text>
          <Text style={[s.moduleDesc, { color: colors.textSecondary }]} numberOfLines={1}>{item.desc}</Text>
        </View>
        {item.enabled
          ? (
            <View style={[s.badge, { backgroundColor: colors.success + '15' }]}>
              <Icon name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[s.badgeText, { color: colors.success }]}>Included</Text>
            </View>
          ) : (
            <View style={[s.badge, { backgroundColor: colors.textSecondary + '12' }]}>
              <Icon name="lock-closed-outline" size={13} color={colors.textSecondary} />
              <Text style={[s.badgeText, { color: colors.textSecondary }]}>Locked</Text>
            </View>
          )}
      </View>
    </TouchableOpacity>
  );

  // ── Detail Modal ────────────────────────────────────────────
  const ModuleDetailModal = () => {
    if (!selectedModule) return null;
    const upgradeTarget = ['operations', 'automated', 'enterprise'].find(t =>
      TIER_FEATURES[t]?.includes(selectedModule.key)
    ) || 'operations';
    const upgradeName = TIER_INFO[upgradeTarget]?.label || upgradeTarget;

    return (
      <Modal visible={showDetails} transparent animationType="slide" onRequestClose={() => setShowDetails(false)}>
        <View style={[s.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[s.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowDetails(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[s.modalTitle, { color: colors.text }]}>Module Details</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView style={s.modalBody}>
              <View style={s.detailHeader}>
                <View style={[s.detailIcon, { backgroundColor: selectedModule.color + '18' }]}>
                  <Icon name={selectedModule.icon} size={32} color={selectedModule.color} />
                </View>
                <Text style={[s.detailName, { color: colors.text }]}>{selectedModule.name}</Text>
              </View>
              <View style={s.section}>
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>About</Text>
                <Text style={[s.sectionText, { color: colors.text }]}>{selectedModule.desc || 'No description available.'}</Text>
              </View>
              <View style={s.section}>
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Status</Text>
                <View style={[s.statusBox, { backgroundColor: colors.background }]}>
                  <Icon
                    name={selectedModule.enabled ? 'checkmark-circle-outline' : 'lock-closed-outline'}
                    size={16}
                    color={selectedModule.enabled ? colors.success : colors.textSecondary}
                  />
                  <Text style={[s.statusBoxText, { color: colors.text }]}>
                    {selectedModule.enabled
                      ? 'This module is active in your current plan'
                      : `Upgrade to ${upgradeName} to access this module`}
                  </Text>
                </View>
              </View>
              {!selectedModule.enabled && (
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => { setShowDetails(false); navigation.navigate('Subscription'); }}>
                  <Icon name="arrow-up-circle-outline" size={16} color="#fff" />
                  <Text style={s.actionBtnText}>Upgrade Now</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const tierColor = TIER_INFO[currentTier]?.color || colors.primary;
  const tierLabel = TIER_INFO[currentTier]?.label || currentTier;
  const tierDesc  = TIER_DESCRIPTIONS?.[currentTier] || '';

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: colors.text }]}>All Modules</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>
            {tierLabel} • {includedKeys.length} active
          </Text>
        </View>
      </View>

      {/* Tier Badge */}
      <View style={[s.planBadge, { backgroundColor: tierColor + '10', borderColor: tierColor }]}>
        <Icon name="layers-outline" size={16} color={tierColor} />
        <Text style={[s.planText, { color: tierColor }]}>{tierDesc || tierLabel + ' Plan'}</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, idx) => item.key + idx}
        renderItem={({ item }) => <ModuleCard item={item} />}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={[s.sectionHeader, { color: colors.textSecondary, backgroundColor: colors.background }]}>
            {title}
          </Text>
        )}
        contentContainerStyle={s.listContent}
      />

      <ModuleDetailModal />
    </View>
  );
};

const s = StyleSheet.create({
  container:     { flex: 1 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn:       { marginRight: 12 },
  title:         { fontSize: 18, fontWeight: '700' },
  subtitle:      { fontSize: 12, marginTop: 2 },
  planBadge:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginVertical: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  planText:      { fontSize: 13, fontWeight: '600', flex: 1 },
  listContent:   { paddingHorizontal: 12, paddingBottom: 20 },
  sectionHeader: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', paddingHorizontal: 4, paddingVertical: 8, marginTop: 8 },
  moduleCard:    { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  locked:        { opacity: 0.55 },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moduleIcon:    { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moduleName:    { fontSize: 14, fontWeight: '600' },
  moduleDesc:    { fontSize: 11, marginTop: 2 },
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  badgeText:     { fontSize: 10, fontWeight: '600' },
  // Modal
  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalContent:  { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle:    { fontSize: 16, fontWeight: '700' },
  modalBody:     { padding: 16 },
  detailHeader:  { alignItems: 'center', marginBottom: 20 },
  detailIcon:    { width: 60, height: 60, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  detailName:    { fontSize: 18, fontWeight: '700' },
  section:       { marginBottom: 16 },
  sectionLabel:  { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  sectionText:   { fontSize: 13, lineHeight: 20 },
  statusBox:     { borderRadius: 10, padding: 12, flexDirection: 'row', gap: 8 },
  statusBoxText: { fontSize: 12, flex: 1, lineHeight: 18 },
  actionBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 10, marginVertical: 16 },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default ModulesStatusScreen;
