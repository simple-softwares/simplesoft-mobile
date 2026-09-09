import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import api from '../../../services/api/httpClient';
import HRService from '../hrService';
import { useTheme } from '../../../theme/ThemeContext';
import { friendlyError } from '../../../utils/errorUtils';

const GENDERS = ['male', 'female', 'other'];
const GENDER_LABELS = { male: 'Male', female: 'Female', other: 'Other' };

function autoEmail(name, slug) {
  if (!name || !slug) return '';
  const first = name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  return first ? `${first}@${slug}.in` : '';
}

const CreateEmployeeScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const workspaceSlug = useSelector(s => s.workspace?.slug || '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailManual, setEmailManual] = useState(false); // true when user has manually edited email
  const [jobTitle, setJobTitle] = useState('');
  const [workPhone, setWorkPhone] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [gender, setGender] = useState('male');
  const [departmentId, setDepartmentId] = useState(null);
  const [managerId, setManagerId] = useState(null);

  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showManagerPicker, setShowManagerPicker] = useState(false);
  const [managers, setManagers] = useState([]);
  const [managerSearch, setManagerSearch] = useState('');
  const [managerLoading, setManagerLoading] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setDeptLoading(true);
    try {
      const depts = await HRService.getDepartments();
      setDepartments(depts);
    } catch (e) {
    } finally {
      setDeptLoading(false);
    }
  };

  const searchManagers = async (query) => {
    setManagerSearch(query);
    if (!query.trim()) {
      setManagers([]);
      return;
    }
    setManagerLoading(true);
    try {
      const { data } = await api.get('/users', { params: { search: query, limit: 20 } });
      setManagers(data || []);
    } catch (e) {
      setManagers([]);
    } finally {
      setManagerLoading(false);
    }
  };

  const handleNameChange = useCallback((val) => {
    setName(val);
    if (!emailManual) {
      setEmail(autoEmail(val, workspaceSlug));
    }
  }, [emailManual, workspaceSlug]);

  const handleEmailChange = useCallback((val) => {
    setEmail(val);
    setEmailManual(true); // user is manually overriding — stop auto-fill
  }, []);

  const handleEmailClear = useCallback(() => {
    setEmailManual(false);
    setEmail(autoEmail(name, workspaceSlug));
  }, [name, workspaceSlug]);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required');
      return;
    }

    setSaving(true);
    try {
      await api.post('/hr/employees', {
        name:         name.trim(),
        work_email:   email.trim() || null, // backend auto-generates if blank
        job_title:    jobTitle.trim() || null,
        work_phone:   workPhone.trim() || null,
        mobile_phone: mobilePhone.trim() || null,
        gender,
        department_id: departmentId || null,
        manager_id:    managerId || null,
      });

      Alert.alert('Success', 'Employee created', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  const selectedDept = departments.find(d => d.id === departmentId);
  const selectedManager = managers.find(m => m.id === managerId);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Name */}
        <View style={s.field}>
          <Text style={[s.label, { color: colors.text }]}>Name *</Text>
          <View style={[s.input, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <TextInput
              style={[s.textInput, { color: colors.text }]}
              placeholder="Full name"
              placeholderTextColor={colors.textLight}
              value={name}
              onChangeText={handleNameChange}
              editable={!saving}
            />
          </View>
        </View>

        {/* Work Email — auto-generated from name */}
        <View style={s.field}>
          <View style={s.labelRow}>
            <Text style={[s.label, { color: colors.text }]}>Work Email</Text>
            {emailManual && (
              <TouchableOpacity onPress={handleEmailClear}>
                <Text style={[s.resetLink, { color: colors.primary }]}>Auto-generate</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[s.input, { borderColor: emailManual ? colors.border : colors.primary + '60', backgroundColor: colors.surface }]}>
            <TextInput
              style={[s.textInput, { color: colors.text }]}
              placeholder={workspaceSlug ? `firstname@${workspaceSlug}.in` : 'user@company.in'}
              placeholderTextColor={colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={handleEmailChange}
              editable={!saving}
            />
            {!emailManual && !!email && (
              <Icon name="flash-outline" size={16} color={colors.primary} style={{ marginRight: 10 }} />
            )}
          </View>
          {!emailManual && (
            <Text style={[s.autoHint, { color: colors.textLight }]}>
              Auto-generated from name · tap to override
            </Text>
          )}
        </View>

        {/* Job Title */}
        <View style={s.field}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Job Title</Text>
          <View style={[s.input, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <TextInput
              style={[s.textInput, { color: colors.text }]}
              placeholder="e.g. Software Engineer"
              placeholderTextColor={colors.textLight}
              value={jobTitle}
              onChangeText={setJobTitle}
              editable={!saving}
            />
          </View>
        </View>

        {/* Department */}
        <View style={s.field}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Department</Text>
          <TouchableOpacity
            style={[s.input, { borderColor: colors.border, backgroundColor: colors.surface }, !saving && { opacity: 0.8 }]}
            onPress={() => setShowDeptPicker(true)}
            disabled={saving || deptLoading}>
            <Text style={[s.pickerText, { color: selectedDept ? colors.text : colors.textLight }]}>
              {selectedDept?.name || 'Select a department'}
            </Text>
            <Icon name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Work Phone */}
        <View style={s.field}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Work Phone</Text>
          <View style={[s.input, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <TextInput
              style={[s.textInput, { color: colors.text }]}
              placeholder="+91 XXXXX XXXXX"
              placeholderTextColor={colors.textLight}
              keyboardType="phone-pad"
              value={workPhone}
              onChangeText={setWorkPhone}
              editable={!saving}
            />
          </View>
        </View>

        {/* Mobile Phone */}
        <View style={s.field}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Mobile Phone</Text>
          <View style={[s.input, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <TextInput
              style={[s.textInput, { color: colors.text }]}
              placeholder="+91 XXXXX XXXXX"
              placeholderTextColor={colors.textLight}
              keyboardType="phone-pad"
              value={mobilePhone}
              onChangeText={setMobilePhone}
              editable={!saving}
            />
          </View>
        </View>

        {/* Gender */}
        <View style={s.field}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Gender</Text>
          <TouchableOpacity
            style={[s.input, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => setShowGenderPicker(true)}
            disabled={saving}>
            <Text style={[s.pickerText, { color: colors.text }]}>
              {GENDER_LABELS[gender]}
            </Text>
            <Icon name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Manager */}
        <View style={s.field}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Manager</Text>
          <TouchableOpacity
            style={[s.input, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => setShowManagerPicker(true)}
            disabled={saving}>
            <Text style={[s.pickerText, { color: selectedManager ? colors.text : colors.textLight }]}>
              {selectedManager?.name || 'Select a manager'}
            </Text>
            <Icon name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={s.spacer} />
      </ScrollView>

      {/* Save Button */}
      <View style={[s.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveBtnText}>Create Employee</Text>}
        </TouchableOpacity>
      </View>

      {/* Department Picker Modal */}
      <Modal visible={showDeptPicker} transparent animationType="slide" onRequestClose={() => setShowDeptPicker(false)}>
        <View style={s.modalWrap}>
          <TouchableOpacity style={s.modalBg} onPress={() => setShowDeptPicker(false)} activeOpacity={1} />
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Select Department</Text>
            {deptLoading ? (
              <ActivityIndicator color={colors.primary} style={s.loader} />
            ) : (
              <FlatList
                data={departments}
                keyExtractor={d => String(d.id)}
                scrollEnabled={false}
                renderItem={({ item: dept }) => (
                  <TouchableOpacity
                    style={[s.option, departmentId === dept.id && { backgroundColor: colors.primary + '15' }]}
                    onPress={() => { setDepartmentId(dept.id); setShowDeptPicker(false); }}>
                    <Text style={[s.optionText, { color: colors.text }]}>{dept.name}</Text>
                    {departmentId === dept.id && <Icon name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Gender Picker Modal */}
      <Modal visible={showGenderPicker} transparent animationType="slide" onRequestClose={() => setShowGenderPicker(false)}>
        <View style={s.modalWrap}>
          <TouchableOpacity style={s.modalBg} onPress={() => setShowGenderPicker(false)} activeOpacity={1} />
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Select Gender</Text>
            <FlatList
              data={GENDERS}
              keyExtractor={g => g}
              scrollEnabled={false}
              renderItem={({ item: g }) => (
                <TouchableOpacity
                  style={[s.option, gender === g && { backgroundColor: colors.primary + '15' }]}
                  onPress={() => { setGender(g); setShowGenderPicker(false); }}>
                  <Text style={[s.optionText, { color: colors.text }]}>{GENDER_LABELS[g]}</Text>
                  {gender === g && <Icon name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Manager Picker Modal */}
      <Modal visible={showManagerPicker} transparent animationType="slide" onRequestClose={() => setShowManagerPicker(false)}>
        <View style={s.modalWrap}>
          <TouchableOpacity style={s.modalBg} onPress={() => setShowManagerPicker(false)} activeOpacity={1} />
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Select Manager</Text>
            <View style={[s.searchBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Icon name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                placeholder="Search..."
                placeholderTextColor={colors.textLight}
                value={managerSearch}
                onChangeText={searchManagers}
              />
            </View>
            {managerLoading ? (
              <ActivityIndicator color={colors.primary} style={s.loader} />
            ) : (
              <FlatList
                data={managers}
                keyExtractor={m => String(m.id)}
                scrollEnabled={false}
                renderItem={({ item: mgr }) => (
                  <TouchableOpacity
                    style={[s.option, managerId === mgr.id && { backgroundColor: colors.primary + '15' }]}
                    onPress={() => { setManagerId(mgr.id); setShowManagerPicker(false); }}>
                    <View style={s.optionContent}>
                      <Text style={[s.optionText, { color: colors.text }]}>{mgr.name}</Text>
                      <Text style={[s.optionSubtext, { color: colors.textSecondary }]}>{mgr.email}</Text>
                    </View>
                    {managerId === mgr.id && <Icon name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 120 },
  field: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  resetLink: { fontSize: 12, fontWeight: '600' },
  autoHint: { fontSize: 11, marginTop: 4, marginLeft: 2 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  textInput: { flex: 1, fontSize: 14 },
  pickerText: { flex: 1, fontSize: 14 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: 16 },
  saveBtn: { borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  spacer: { height: 40 },
  // Modals
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '60%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  loader: { paddingVertical: 24 },
  option: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionContent: { flex: 1 },
  optionText: { fontSize: 14, fontWeight: '500' },
  optionSubtext: { fontSize: 12, marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginBottom: 12, gap: 6 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
});

export default CreateEmployeeScreen;
