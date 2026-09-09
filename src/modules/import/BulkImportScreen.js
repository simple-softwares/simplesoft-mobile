import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, FlatList, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../services/api/httpClient';
import HRService from '../../modules/hr/hrService';
import { useTheme } from '../../theme/ThemeContext';
import { friendlyError } from '../../utils/errorUtils';
import DocumentPicker from 'react-native-document-picker';

const BulkImportScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);

  // CSV format: Name, Email, Job Title, Department Name, Manager Name
  const SAMPLE_CSV = `Name,Email,Job Title,Department,Manager
John Doe,john@company.com,Software Engineer,Engineering,
Jane Smith,jane@company.com,Product Manager,Product,John Doe
Bob Wilson,bob@company.com,Designer,Design,`;

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      Alert.alert('Error', 'CSV must have header row and at least one data row');
      return null;
    }

    const header = lines[0].split(',').map(h => h.trim());
    const requiredFields = ['Name', 'Email'];
    const missingFields = requiredFields.filter(f => !header.includes(f));

    if (missingFields.length > 0) {
      Alert.alert('Error', `Missing required fields: ${missingFields.join(', ')}`);
      return null;
    }

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.some(v => v)) { // Skip empty lines
        const row = {};
        header.forEach((field, idx) => {
          row[field] = values[idx] || '';
        });
        data.push(row);
      }
    }

    return data;
  };

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.pick({ type: [DocumentPicker.types.plainText] });
      const fileContent = await fetch(result.uri).then(r => r.text());
      setCsvText(fileContent);
      const parsed = parseCSV(fileContent);
      if (parsed) setPreview(parsed);
    } catch (e) {
    }
  };

  const handleTextInput = (text) => {
    setCsvText(text);
    if (text.trim()) {
      const parsed = parseCSV(text);
      if (parsed) setPreview(parsed);
    } else {
      setPreview([]);
    }
  };

  const loadDepartments = async () => {
    try {
      const depts = await HRService.getDepartments();
      setDepartments(depts);
    } catch (e) {
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      Alert.alert('Error', 'No valid records to import');
      return;
    }

    Alert.alert(
      'Confirm Import',
      `Import ${preview.length} employee(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'default',
          onPress: performImport,
        },
      ]
    );
  };

  const performImport = async () => {
    setImporting(true);
    let successful = 0;
    let failed = 0;

    try {
      const allDepts = await HRService.getDepartments();

      for (const row of preview) {
        try {
          let managerId = null;
          if (row.Manager) {
            const { data: managers } = await api.get('/users', { params: { search: row.Manager, limit: 1 } });
            if (managers?.length) managerId = managers[0].id;
          }

          let deptId = null;
          if (row.Department) {
            const dept = allDepts.find(d =>
              d.name.toLowerCase().includes(row.Department.toLowerCase())
            );
            if (dept) deptId = dept.id;
          }

          await api.post('/hr/employees', {
            name: row.Name.trim(),
            work_email: row.Email.trim(),
            job_title: row['Job Title']?.trim() || null,
            department_id: deptId || null,
            manager_id: managerId || null,
          });

          successful++;
        } catch (e) {
          failed++;
        }
      }

      Alert.alert(
        'Import Complete',
        `Successfully imported: ${successful}\nFailed: ${failed}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setImporting(false);
    }
  };

  const PreviewRow = ({ item, index }) => (
    <View style={[s.previewRow, { backgroundColor: index % 2 === 0 ? colors.surface : colors.background }]}>
      <View style={s.previewCell}>
        <Text style={[s.previewText, { color: colors.text }]} numberOfLines={1}>{item.Name}</Text>
      </View>
      <View style={s.previewCell}>
        <Text style={[s.previewText, { color: colors.textSecondary }]} numberOfLines={1}>{item.Email}</Text>
      </View>
      <View style={s.previewCell}>
        <Text style={[s.previewText, { color: colors.textSecondary }]} numberOfLines={1}>{item['Job Title'] || '—'}</Text>
      </View>
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Instructions */}
        <View style={[s.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="information-circle" size={18} color={colors.primary} />
          <Text style={[s.infoText, { color: colors.textSecondary }]}>
            Import employees via CSV. Required columns: Name, Email
          </Text>
        </View>

        {/* CSV Input */}
        <View style={s.field}>
          <Text style={[s.label, { color: colors.text }]}>CSV Data</Text>
          <View style={[s.csvInput, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <TextInput
              style={[s.csvTextInput, { color: colors.text }]}
              placeholder={SAMPLE_CSV}
              placeholderTextColor={colors.textLight}
              value={csvText}
              onChangeText={handleTextInput}
              multiline
              numberOfLines={8}
            />
          </View>
          <TouchableOpacity style={s.fileBtn} onPress={handleFileSelect}>
            <Icon name="document-outline" size={16} color={colors.primary} />
            <Text style={[s.fileBtnText, { color: colors.primary }]}>Upload CSV File</Text>
          </TouchableOpacity>
        </View>

        {/* Preview */}
        {preview.length > 0 && (
          <View style={s.field}>
            <View style={s.previewHeader}>
              <Text style={[s.label, { color: colors.text }]}>Preview ({preview.length} records)</Text>
              <Text style={[s.previewCount, { color: colors.textSecondary }]}>
                {preview.length} row{preview.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={[s.previewTable, { borderColor: colors.border }]}>
              <View style={[s.previewRowHeader, { backgroundColor: colors.surface }]}>
                <View style={s.previewCell}>
                  <Text style={[s.previewHeaderText, { color: colors.text }]}>Name</Text>
                </View>
                <View style={s.previewCell}>
                  <Text style={[s.previewHeaderText, { color: colors.text }]}>Email</Text>
                </View>
                <View style={s.previewCell}>
                  <Text style={[s.previewHeaderText, { color: colors.text }]}>Job Title</Text>
                </View>
              </View>
              <FlatList
                data={preview}
                keyExtractor={(_, idx) => String(idx)}
                scrollEnabled={false}
                renderItem={({ item, index }) => <PreviewRow item={item} index={index} />}
              />
            </View>
          </View>
        )}

        <View style={s.spacer} />
      </ScrollView>

      {/* Import Button */}
      {preview.length > 0 && (
        <View style={[s.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[s.importBtn, { backgroundColor: colors.primary }, importing && { opacity: 0.6 }]}
            onPress={handleImport}
            disabled={importing}>
            {importing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={s.importBtnText}>Import {preview.length} Employees</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 120 },
  infoCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: { fontSize: 12, flex: 1 },
  field: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  csvInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 120 },
  csvTextInput: { fontSize: 12, fontFamily: 'monospace' },
  fileBtn: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  fileBtnText: { fontSize: 12, fontWeight: '600' },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  previewCount: { fontSize: 11 },
  previewTable: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  previewRowHeader: { flexDirection: 'row', borderBottomWidth: 1 },
  previewRow: { flexDirection: 'row', borderBottomWidth: 1 },
  previewCell: { flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: 'rgba(0,0,0,0.05)' },
  previewHeaderText: { fontSize: 11, fontWeight: '700' },
  previewText: { fontSize: 11 },
  spacer: { height: 40 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: 16 },
  importBtn: { borderRadius: 8, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  importBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default BulkImportScreen;
