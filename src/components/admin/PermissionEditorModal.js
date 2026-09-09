import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeContext';

const TABS = [
  { id: 'modules',    label: '🧩 Modules'    },
  { id: 'projects',   label: '📊 Projects'   },
  { id: 'tasks',      label: '✓ Tasks'       },
  { id: 'notes',      label: '📝 Notes'      },
  { id: 'contacts',   label: '👥 Contacts'   },
  { id: 'visibility', label: '👁️ Visibility' },
  { id: 'features',   label: '⚙️ Features'   },
];

const PermissionEditorModal = ({ visible, employee, permissions, workspaceAddons = [], onSave, onClose, saving }) => {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [activeTab, setActiveTab] = useState('modules');
  const [editedPermissions, setEditedPermissions] = useState(permissions);

  useEffect(() => {
    if (permissions) {
      let addon_access = {};
      try { addon_access = JSON.parse(permissions.addon_access_json || '{}'); } catch {}
      setEditedPermissions({ ...permissions, addon_access });
    }
  }, [permissions, visible]);

  const togglePermission = (field) =>
    setEditedPermissions((prev) => ({ ...prev, [field]: !prev[field] }));

  const toggleAddonAccess = (addonId) =>
    setEditedPermissions((prev) => {
      const current = prev.addon_access || {};
      return { ...prev, addon_access: { ...current, [addonId]: !(current[addonId] !== false) } };
    });

  const isAddonAllowed = (addonId) => (editedPermissions.addon_access || {})[addonId] !== false;

  const updateAdminNotes = (text) =>
    setEditedPermissions((prev) => ({ ...prev, admin_notes: text }));

  const renderPermissionItem = (label, field, description) => (
    <View key={field} style={s.permissionItem}>
      <View style={s.permissionText}>
        <Text style={s.permissionLabel}>{label}</Text>
        {description && <Text style={s.permissionDescription}>{description}</Text>}
      </View>
      <Switch
        value={editedPermissions[field] || false}
        onValueChange={() => togglePermission(field)}
        disabled={saving}
        trackColor={{ false: colors.border, true: '#81C784' }}
        thumbColor={editedPermissions[field] ? '#4CAF50' : colors.textSecondary}
      />
    </View>
  );

  const renderModulesTab = () => (
    <View style={s.tabContent}>
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Core Modules</Text></View>
      {renderPermissionItem('Projects',  'module_projects',   'Access the Projects module')}
      {renderPermissionItem('Tasks',     'module_tasks',      'Access the Tasks module')}
      {renderPermissionItem('Notes',     'module_notes',      'Access the Notes module')}
      {renderPermissionItem('Contacts',  'module_contacts',   'Access the Contacts module')}
      {renderPermissionItem('Chat',      'module_chat',       'Access team chat')}
      {renderPermissionItem('Files',     'module_files',      'Access file storage')}

      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Business Modules</Text></View>
      {renderPermissionItem('CRM',        'module_crm',        'Access CRM and leads')}
      {renderPermissionItem('Sales',      'module_sales',      'Access Sales module')}
      {renderPermissionItem('HR',         'module_hr',         'Access HR module')}
      {renderPermissionItem('Attendance', 'module_attendance', 'Access attendance tracking')}
      {renderPermissionItem('Inventory',  'module_inventory',  'Access inventory management')}

      {workspaceAddons.length > 0 && (
        <>
          <View style={s.sectionHeader}><Text style={s.sectionTitle}>Custom Add-ons</Text></View>
          {workspaceAddons.map((addon) => (
            <View key={addon.id} style={s.permissionItem}>
              <View style={s.permissionText}>
                <Text style={s.permissionLabel}>{addon.name}</Text>
                {addon.category ? <Text style={s.permissionDescription}>{addon.category}</Text> : null}
              </View>
              <Switch
                value={isAddonAllowed(addon.id)}
                onValueChange={() => toggleAddonAccess(addon.id)}
                disabled={saving}
                trackColor={{ false: colors.border, true: '#81C784' }}
                thumbColor={isAddonAllowed(addon.id) ? '#4CAF50' : colors.textSecondary}
              />
            </View>
          ))}
        </>
      )}
    </View>
  );

  const renderProjectsTab = () => (
    <View style={s.tabContent}>
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Read & View</Text></View>
      {renderPermissionItem('Can Read Projects', 'project_read', 'View and list projects')}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Create & Edit</Text></View>
      {renderPermissionItem('Can Create Projects',      'project_create',     'Create new projects')}
      {renderPermissionItem('Can Edit Projects',        'project_edit',       'Edit projects they own or are assigned to')}
      {renderPermissionItem('Can Edit All Projects',    'project_edit_all',   'Edit ANY project')}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Delete</Text></View>
      {renderPermissionItem('Can Delete Projects',      'project_delete',     'Delete projects they own')}
      {renderPermissionItem('Can Delete All Projects',  'project_delete_all', 'Delete ANY project')}
    </View>
  );

  const renderTasksTab = () => (
    <View style={s.tabContent}>
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Read & View</Text></View>
      {renderPermissionItem('Can Read Tasks', 'task_read', 'View and list tasks')}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Create & Edit</Text></View>
      {renderPermissionItem('Can Create Tasks',    'task_create',   'Create new tasks')}
      {renderPermissionItem('Can Edit Tasks',      'task_edit',     'Edit assigned tasks')}
      {renderPermissionItem('Can Edit All Tasks',  'task_edit_all', 'Edit ANY task')}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Delete & Stage</Text></View>
      {renderPermissionItem('Can Delete Tasks',     'task_delete',       'Delete assigned tasks')}
      {renderPermissionItem('Can Delete All Tasks', 'task_delete_all',   'Delete ANY task')}
      {renderPermissionItem('Can Change Task Stage','task_change_stage', 'Move tasks between stages')}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Assignment</Text></View>
      {renderPermissionItem('Can Assign Tasks', 'task_assign_users', 'Assign tasks to other users')}
    </View>
  );

  const renderNotesTab = () => (
    <View style={s.tabContent}>
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Read & View</Text></View>
      {renderPermissionItem('Can Read Notes', 'note_read', 'View notes')}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Create & Edit</Text></View>
      {renderPermissionItem('Can Create Notes',   'note_create',   'Create new notes')}
      {renderPermissionItem('Can Edit Notes',     'note_edit',     'Edit notes they created')}
      {renderPermissionItem('Can Edit All Notes', 'note_edit_all', 'Edit ANY note')}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Delete & Share</Text></View>
      {renderPermissionItem('Can Delete Notes',     'note_delete',     'Delete notes they created')}
      {renderPermissionItem('Can Delete All Notes', 'note_delete_all', 'Delete ANY note')}
      {renderPermissionItem('Can Share Notes',      'note_share',      'Share notes with others')}
    </View>
  );

  const renderContactsTab = () => (
    <View style={s.tabContent}>
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Operations</Text></View>
      {renderPermissionItem('Can Read Contacts',   'contact_read',   'View contacts')}
      {renderPermissionItem('Can Create Contacts', 'contact_create', 'Create new contacts')}
      {renderPermissionItem('Can Edit Contacts',   'contact_edit',   'Edit contacts')}
      {renderPermissionItem('Can Delete Contacts', 'contact_delete', 'Delete contacts')}
    </View>
  );

  const renderVisibilityTab = () => (
    <View style={s.tabContent}>
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Department & Team</Text></View>
      {renderPermissionItem('See All Departments', 'can_see_all_departments', 'View items from ALL departments')}
      {renderPermissionItem('See All Teams',       'can_see_all_teams',       'View all teams in workspace')}
      {renderPermissionItem('See Team Items',      'can_view_team_items',     'See items from own department')}
      {renderPermissionItem('See Own Items Only',  'can_view_own_only',       'Only see items they created or are assigned to')}
      <View style={s.infoBox}>
        <MaterialIcons name="info" size={16} color={colors.primary} />
        <Text style={s.infoText}>
          Use "Own Items Only" for most restrictive access. Department filters are applied if set.
        </Text>
      </View>
    </View>
  );

  const renderFeaturesTab = () => (
    <View style={s.tabContent}>
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Advanced Tools</Text></View>
      {renderPermissionItem('Can Use AI',          'can_use_ai',          'Use AI Assistant features')}
      {renderPermissionItem('Can Use Automation',  'can_use_automation',  'Create and manage automations')}
      {renderPermissionItem('Can Use Performance', 'can_use_performance', 'View performance metrics and leaderboards')}
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Data & Management</Text></View>
      {renderPermissionItem('Can Export Data',  'can_export_data',  'Export data from workspace')}
      {renderPermissionItem('Can Manage Team',  'can_manage_team',  'Manage team members')}
    </View>
  );

  const getTabContent = () => {
    switch (activeTab) {
      case 'modules':    return renderModulesTab();
      case 'projects':   return renderProjectsTab();
      case 'tasks':      return renderTasksTab();
      case 'notes':      return renderNotesTab();
      case 'contacts':   return renderContactsTab();
      case 'visibility': return renderVisibilityTab();
      case 'features':   return renderFeaturesTab();
      default:           return null;
    }
  };

  if (!permissions) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.container}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} disabled={saving}>
            <MaterialIcons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={s.headerTitle}>
            <Text style={s.employeeName}>{employee.name}</Text>
            <Text style={s.headerSubtitle}>Edit Permissions</Text>
          </View>
          <TouchableOpacity onPress={() => onSave(editedPermissions)} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={s.saveButton}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Status Toggle */}
        <View style={s.statusBar}>
          <Text style={s.statusLabel}>Account Status</Text>
          <View style={s.statusToggle}>
            <Text style={s.statusText}>{editedPermissions.active ? 'Active' : 'Inactive'}</Text>
            <Switch
              value={editedPermissions.active}
              onValueChange={() => togglePermission('active')}
              disabled={saving}
              trackColor={{ false: colors.border, true: '#81C784' }}
              thumbColor={editedPermissions.active ? '#4CAF50' : colors.textSecondary}
            />
          </View>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[s.tabButton, activeTab === tab.id && s.tabButtonActive]}
              onPress={() => setActiveTab(tab.id)}
              disabled={saving}
            >
              <Text style={[s.tabButtonText, activeTab === tab.id && s.tabButtonTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Content */}
        <ScrollView style={s.contentContainer} showsVerticalScrollIndicator={false}>
          {getTabContent()}

          {/* Admin Notes */}
          <View style={s.adminNotesSection}>
            <Text style={s.adminNotesLabel}>Admin Notes</Text>
            <TextInput
              style={s.adminNotesInput}
              placeholder="Add internal notes about these permissions…"
              placeholderTextColor={colors.textSecondary}
              value={editedPermissions.admin_notes || ''}
              onChangeText={updateAdminNotes}
              multiline
              numberOfLines={3}
              editable={!saving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container:         { flex: 1, backgroundColor: colors.background },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, marginTop: 16 },
  headerTitle:       { flex: 1, marginLeft: 12 },
  employeeName:      { fontSize: 18, fontWeight: '600', color: colors.text },
  headerSubtitle:    { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  saveButton:        { fontSize: 16, fontWeight: '600', color: colors.primary },
  statusBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, marginBottom: 8 },
  statusLabel:       { fontSize: 14, fontWeight: '600', color: colors.text },
  statusToggle:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText:        { fontSize: 13, color: colors.textSecondary },
  tabBar:            { backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingHorizontal: 8, flexGrow: 0, flexShrink: 0 },
  tabButton:         { paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive:   { borderBottomColor: colors.primary },
  tabButtonText:     { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  tabButtonTextActive: { color: colors.primary },
  contentContainer:  { flex: 1 },
  tabContent:        { paddingHorizontal: 12, paddingBottom: 12 },
  sectionHeader:     { marginTop: 12, marginBottom: 8 },
  sectionTitle:      { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  permissionItem:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.surface, borderRadius: 8, marginBottom: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  permissionText:    { flex: 1, marginRight: 12 },
  permissionLabel:   { fontSize: 15, fontWeight: '500', color: colors.text, marginBottom: 2 },
  permissionDescription: { fontSize: 12, color: colors.textSecondary },
  infoBox:           { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.primary + '18', borderRadius: 8, marginTop: 16, gap: 8 },
  infoText:          { flex: 1, fontSize: 12, color: colors.primary },
  adminNotesSection: { paddingHorizontal: 12, paddingVertical: 16, backgroundColor: colors.surface, marginHorizontal: 12, marginVertical: 12, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  adminNotesLabel:   { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 },
  adminNotesInput:   { fontSize: 14, color: colors.text, padding: 10, backgroundColor: colors.inputBackground, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, minHeight: 60, textAlignVertical: 'top' },
});

export default PermissionEditorModal;
