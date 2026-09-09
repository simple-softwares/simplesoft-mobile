import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Switch, Platform, Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import exportService from '../../services/export/exportService';
import RNFS from 'react-native-fs';
import { Share } from 'react-native';

/**
 * ExportDataModal
 *
 * Modal for manual data export configuration and execution.
 * Allows users to select:
 * - Export type (My Data vs Full Workspace - admin only)
 * - File format (CSV or XLSX)
 * - Field scope (Essential or All fields - admin only)
 * - Data sources (tasks, projects, contacts, notes, members, timesheets, payments)
 * - Optional date range filter
 */

const ExportDataModal = ({ visible, onClose, isAdmin = false }) => {
  const { colors } = useTheme();

  // ── STATE ──────────────────────────────────────────────────────
  const [exportType, setExportType] = useState('mydata');
  const [format, setFormat] = useState('csv');
  const [fieldScope, setFieldScope] = useState('essential');
  const [selectedSources, setSelectedSources] = useState({
    tasks: true,
    projects: true,
    contacts: true,
    notes: true,
    members: true,
    timesheets: true,
    payments: false,  // admin-only, default off
  });
  const [dateRangeEnabled, setDateRangeEnabled] = useState(false);
  const [dateRangeStart, setDateRangeStart] = useState(null);
  const [dateRangeEnd, setDateRangeEnd] = useState(null);
  const [exporting, setExporting] = useState(false);

  // ── DATA SOURCES CONFIGURATION ─────────────────────────────────
  const DATA_SOURCES = [
    { key: 'tasks', label: 'Tasks', icon: 'checkbox-outline', adminOnly: false },
    { key: 'projects', label: 'Projects', icon: 'folder-outline', adminOnly: false },
    { key: 'contacts', label: 'Contacts', icon: 'people-outline', adminOnly: false },
    { key: 'notes', label: 'Notes', icon: 'document-text-outline', adminOnly: false },
    { key: 'members', label: 'Team Members', icon: 'person-outline', adminOnly: false },
    { key: 'timesheets', label: 'Timesheets', icon: 'time-outline', adminOnly: false },
    { key: 'payments', label: 'Payments', icon: 'card-outline', adminOnly: true },
  ];

  // ── HANDLERS ───────────────────────────────────────────────────

  const toggleSource = (key) => {
    setSelectedSources(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleExport = async () => {
    // ── VALIDATION ──
    const sourceCount = Object.values(selectedSources).filter(v => v).length;
    if (sourceCount === 0) {
      Alert.alert('Select Data', 'Please select at least one data source to export');
      return;
    }

    // ── BUILD PAYLOAD ──
    const payload = {
      export_type: exportType,
      format,
      field_scope: fieldScope,
      sources: selectedSources,
      date_range: dateRangeEnabled
        ? {
            start: dateRangeStart ? dateRangeStart.toISOString().split('T')[0] : null,
            end: dateRangeEnd ? dateRangeEnd.toISOString().split('T')[0] : null,
          }
        : {},
    };

    // ── VALIDATE PAYLOAD ──
    try {
      exportService.validatePayload(payload);
    } catch (error) {
      Alert.alert('Invalid Configuration', error.message);
      return;
    }

    // ── EXECUTE EXPORT ──
    setExporting(true);
    try {
      const response = await exportService.exportData(payload);
      const { filename, file_content, mime_type } = response;

      // ── DOWNLOAD FILE ──
      const filePath = await exportService.downloadFile(filename, file_content, mime_type);

      // ── OPEN SHARE SHEET ──
      await Share.open({
        url: filePath,
        filename,
        type: mime_type,
      });

      // Success message
      Alert.alert('Export Successful', `Your ${format.toUpperCase()} file is ready to share.`);

      // Close modal after successful export
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      const errorMsg = error.message || 'Export failed. Please try again.';
      Alert.alert('Export Failed', errorMsg);
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    setExportType('mydata');
    setFormat('csv');
    setFieldScope('essential');
    setSelectedSources({
      tasks: true,
      projects: true,
      contacts: true,
      notes: true,
      members: true,
      timesheets: true,
      payments: false,
    });
    setDateRangeEnabled(false);
  };

  // ── RENDER ────────────────────────────────────────────────────

  const sourceCount = Object.values(selectedSources).filter(v => v).length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: colors.text }]}>Export Data</Text>
            <Text style={[s.subtitle, { color: colors.textSecondary }]}>
              {sourceCount} source{sourceCount !== 1 ? 's' : ''} selected
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Icon name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={s.content} showsVerticalScrollIndicator={false}>

          {/* Export Type Section */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Export Type</Text>

            {/* My Data */}
            <TouchableOpacity
              style={[
                s.option,
                { borderColor: colors.border, backgroundColor: exportType === 'mydata' ? colors.primary + '10' : colors.surface },
              ]}
              onPress={() => setExportType('mydata')}>
              <View style={[s.radio, { borderColor: colors.primary }]}>
                {exportType === 'mydata' && <View style={[s.radioDot, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.optionLabel, { color: colors.text }]}>My Data Only</Text>
                <Text style={[s.optionDesc, { color: colors.textSecondary }]}>
                  Your tasks, notes, and timesheets
                </Text>
              </View>
            </TouchableOpacity>

            {/* Workspace Export (Admin Only) */}
            <TouchableOpacity
              style={[
                s.option,
                {
                  borderColor: colors.border,
                  backgroundColor: exportType === 'workspace' ? colors.primary + '10' : colors.surface,
                  opacity: isAdmin ? 1 : 0.5,
                },
              ]}
              onPress={() => isAdmin && setExportType('workspace')}
              disabled={!isAdmin}>
              <View style={[s.radio, { borderColor: colors.primary }]}>
                {exportType === 'workspace' && <View style={[s.radioDot, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.optionLabel, { color: colors.text }]}>Full Workspace</Text>
                <Text style={[s.optionDesc, { color: colors.textSecondary }]}>
                  {isAdmin ? 'All modules + payments' : 'Admin access required'}
                </Text>
              </View>
              {!isAdmin && <Icon name="lock-closed" size={18} color={colors.textSecondary} />}
            </TouchableOpacity>
          </View>

          {/* File Format Section */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>File Format</Text>

            <View style={s.segmentedControl}>
              <TouchableOpacity
                style={[
                  s.segment,
                  { backgroundColor: format === 'csv' ? colors.primary : colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setFormat('csv')}>
                <Icon
                  name="document-outline"
                  size={16}
                  color={format === 'csv' ? '#fff' : colors.text}
                  style={{ marginRight: 6 }}
                />
                <Text style={[s.segmentText, { color: format === 'csv' ? '#fff' : colors.text }]}>CSV</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  s.segment,
                  { backgroundColor: format === 'xlsx' ? colors.primary : colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setFormat('xlsx')}>
                <Icon
                  name="document-text-outline"
                  size={16}
                  color={format === 'xlsx' ? '#fff' : colors.text}
                  style={{ marginRight: 6 }}
                />
                <Text style={[s.segmentText, { color: format === 'xlsx' ? '#fff' : colors.text }]}>Excel</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Field Scope Section (Admin Only) */}
          {isAdmin && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Field Scope</Text>
              <Text style={[s.sectionDesc, { color: colors.textSecondary }]}>
                Essential: key fields only | All: includes descriptions & notes
              </Text>

              <View style={s.scopeToggle}>
                <TouchableOpacity
                  style={[
                    s.scopeBtn,
                    { backgroundColor: fieldScope === 'essential' ? colors.primary : colors.surface },
                  ]}
                  onPress={() => setFieldScope('essential')}>
                  <Text style={[s.scopeText, { color: fieldScope === 'essential' ? '#fff' : colors.text }]}>
                    Essential
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    s.scopeBtn,
                    { backgroundColor: fieldScope === 'all' ? colors.primary : colors.surface },
                  ]}
                  onPress={() => setFieldScope('all')}>
                  <Text style={[s.scopeText, { color: fieldScope === 'all' ? '#fff' : colors.text }]}>All Fields</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Data Sources Section */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Data Sources</Text>
            <Text style={[s.sectionDesc, { color: colors.textSecondary }]}>
              Select what to include in your export
            </Text>

            {DATA_SOURCES.map(source => {
              const isSelected = selectedSources[source.key];
              const isDisabled = source.adminOnly && !isAdmin;

              return (
                <TouchableOpacity
                  key={source.key}
                  style={[
                    s.sourceItem,
                    { borderBottomColor: colors.divider, opacity: isDisabled ? 0.5 : 1 },
                  ]}
                  onPress={() => !isDisabled && toggleSource(source.key)}
                  disabled={isDisabled}>
                  <Icon name={source.icon} size={20} color={colors.primary} style={{ marginRight: 12 }} />
                  <Text style={[s.sourceLabel, { color: colors.text, flex: 1 }]}>{source.label}</Text>
                  {isDisabled && <Icon name="lock-closed" size={16} color={colors.textSecondary} />}
                  {!isDisabled && (
                    <View style={[s.checkbox, { borderColor: colors.primary, backgroundColor: isSelected ? colors.primary : 'transparent' }]}>
                      {isSelected && <Icon name="checkmark" size={14} color="#fff" />}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date Range Section (Optional) */}
          <View style={s.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Date Range (Optional)</Text>
              <Switch
                value={dateRangeEnabled}
                onValueChange={setDateRangeEnabled}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={dateRangeEnabled ? colors.primary : colors.textLight}
              />
            </View>

            {dateRangeEnabled && (
              <Text style={[s.sectionDesc, { color: colors.textSecondary, marginTop: 4 }]}>
                Note: Date range support coming soon. For now, exports all records.
              </Text>
            )}
          </View>

        </ScrollView>

        {/* Footer Buttons */}
        <View style={[s.footer, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: colors.error + '20' }]}
            onPress={handleReset}
            disabled={exporting}>
            <Text style={[s.btnText, { color: colors.error }]}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btn, s.btnPrimary, { backgroundColor: colors.primary, opacity: exporting ? 0.7 : 1 }]}
            onPress={handleExport}
            disabled={exporting}>
            {exporting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="download-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[s.btnText, { color: '#fff' }]}>Export</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 12, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: { padding: 8, marginRight: -8 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  sectionDesc: { fontSize: 12, marginBottom: 12, lineHeight: 16 },
  option: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  optionDesc: { fontSize: 12 },
  segmentedControl: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 13, fontWeight: '600' },
  scopeToggle: { flexDirection: 'row', gap: 8 },
  scopeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  scopeText: { fontSize: 13, fontWeight: '600' },
  sourceItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  sourceLabel: { fontSize: 14, fontWeight: '500' },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { flex: 2 },
  btnText: { fontSize: 14, fontWeight: '600' },
});

export default ExportDataModal;
