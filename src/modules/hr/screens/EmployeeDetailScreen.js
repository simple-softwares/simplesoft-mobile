import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Linking, Alert,
  Modal, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../../theme/ThemeContext';
import hrService from '../hrService';
import { friendlyError } from '../../../utils/errorUtils';

const Row = ({ icon, label, value, colors, onPress, mono }) => {
  if (!value) return null;
  return (
    <TouchableOpacity
      style={[s.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}>
      <Icon name={icon} size={18} color={colors.primary} style={s.rowIcon} />
      <View style={s.rowContent}>
        <Text style={[s.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[s.rowValue, { color: colors.text, fontFamily: mono ? 'monospace' : undefined }]}>{value}</Text>
      </View>
      {onPress && <Icon name="chevron-forward" size={16} color={colors.textLight} />}
    </TouchableOpacity>
  );
};

const Section = ({ title, colors, children, action }) => (
  <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={s.sectionHeader}>
      <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{title.toUpperCase()}</Text>
      {action}
    </View>
    {children}
  </View>
);

// ── Edit Modal ────────────────────────────────────────────────
const EditModal = ({ visible, employee, onClose, onSave, colors }) => {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employee && visible) {
      setForm({
        name:                    employee.name || '',
        work_email:              employee.work_email || '',
        work_phone:              employee.work_phone || '',
        mobile_phone:            employee.mobile_phone || '',
        job_title:               employee.job_title || '',
        joining_date:            employee.joining_date || '',
        employment_type:         employee.employment_type || '',
        address:                 employee.address || '',
        emergency_contact_name:  employee.emergency_contact_name || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
        notes:                   employee.notes || '',
      });
    }
  }, [employee, visible]);

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, fieldKey, placeholder, keyboard, multiline }) => (
    <View style={s.formGroup}>
      <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground,
                            ...(multiline ? { minHeight: 80, textAlignVertical: 'top' } : {}) }]}
        placeholder={placeholder || label}
        placeholderTextColor={colors.textSecondary}
        keyboardType={keyboard || 'default'}
        value={form[fieldKey] || ''}
        onChangeText={set(fieldKey)}
        multiline={multiline}
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalWrap}>
        <TouchableOpacity style={s.modalBg} onPress={onClose} activeOpacity={1} />
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />
          <Text style={[s.modalTitle, { color: colors.text }]}>Edit Employee</Text>
          <ScrollView style={s.form} keyboardShouldPersistTaps="handled">
            <Field label="Name *"          fieldKey="name"                    placeholder="Full name" />
            <Field label="Work Email"       fieldKey="work_email"              placeholder="work@example.com" keyboard="email-address" />
            <Field label="Work Phone"       fieldKey="work_phone"              placeholder="+91 XXXXX XXXXX" keyboard="phone-pad" />
            <Field label="Mobile Phone"     fieldKey="mobile_phone"            placeholder="+91 XXXXX XXXXX" keyboard="phone-pad" />
            <Field label="Job Title"        fieldKey="job_title"               placeholder="e.g. Manager" />
            <Field label="Joining Date"     fieldKey="joining_date"            placeholder="YYYY-MM-DD" />
            <Field label="Employment Type"  fieldKey="employment_type"         placeholder="Full-time / Part-time / Contract" />
            <Field label="Address"          fieldKey="address"                 placeholder="Office or home address" />
            <Field label="Emergency Contact"fieldKey="emergency_contact_name"  placeholder="Contact person name" />
            <Field label="Emergency Phone"  fieldKey="emergency_contact_phone" placeholder="+91 XXXXX XXXXX" keyboard="phone-pad" />
            <Field label="Notes"            fieldKey="notes"                   placeholder="Any additional notes..." multiline />
          </ScrollView>
          <View style={s.modalBtns}>
            <TouchableOpacity style={[s.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Password Modal ────────────────────────────────────────────
const PasswordModal = ({ visible, onClose, onSave, colors }) => {
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => { if (visible) { setPassword(''); setConfirm(''); } }, [visible]);

  const handleSave = async () => {
    if (!password.trim()) { Alert.alert('Error', 'Password is required'); return; }
    if (password.length < 6) { Alert.alert('Error', 'Minimum 6 characters'); return; }
    if (password !== confirm) { Alert.alert('Error', 'Passwords do not match'); return; }
    setSaving(true);
    try { await onSave(password); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalWrap}>
        <TouchableOpacity style={s.modalBg} onPress={onClose} activeOpacity={1} />
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />
          <Text style={[s.modalTitle, { color: colors.text }]}>Set New Password</Text>
          <View style={s.form}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>New Password *</Text>
            <TextInput style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              placeholder="Min. 6 characters" placeholderTextColor={colors.textSecondary}
              secureTextEntry value={password} onChangeText={setPassword} />
            <Text style={[s.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>Confirm Password *</Text>
            <TextInput style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              placeholder="Re-enter password" placeholderTextColor={colors.textSecondary}
              secureTextEntry value={confirm} onChangeText={setConfirm} />
          </View>
          <View style={s.modalBtns}>
            <TouchableOpacity style={[s.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
              onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>Set Password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Create Account Modal ──────────────────────────────────────
const CreateAccountModal = ({ visible, employee, onClose, onCreated, colors }) => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (visible && employee) {
      setEmail(employee.work_email || '');
      setPassword('');
    }
  }, [visible, employee]);

  const handleCreate = async () => {
    if (!email.trim()) { Alert.alert('Error', 'Email is required'); return; }
    if (!password || password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      await onCreated(email.trim().toLowerCase(), password);
      onClose();
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalWrap}>
        <TouchableOpacity style={s.modalBg} onPress={onClose} activeOpacity={1} />
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />
          <Text style={[s.modalTitle, { color: colors.text }]}>Create Login Account</Text>
          <View style={s.form}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Email *</Text>
            <TextInput style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              placeholder="Login email" placeholderTextColor={colors.textSecondary}
              keyboardType="email-address" autoCapitalize="none"
              value={email} onChangeText={setEmail} />
            <Text style={[s.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>Password *</Text>
            <TextInput style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              placeholder="Min. 6 characters" placeholderTextColor={colors.textSecondary}
              secureTextEntry value={password} onChangeText={setPassword} />
          </View>
          <View style={s.modalBtns}>
            <TouchableOpacity style={[s.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
              onPress={handleCreate} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>Create Account</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Education Add Modal ───────────────────────────────────────
const EduModal = ({ visible, onClose, onSave, colors }) => {
  const [form, setForm]  = useState({ degree: '', institution: '', field_of_study: '', year_from: '', year_to: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setForm({ degree: '', institution: '', field_of_study: '', year_from: '', year_to: '' });
  }, [visible]);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.degree.trim() || !form.institution.trim()) {
      Alert.alert('Validation', 'Degree and Institution are required');
      return;
    }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalWrap}>
        <TouchableOpacity style={s.modalBg} onPress={onClose} activeOpacity={1} />
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />
          <Text style={[s.modalTitle, { color: colors.text }]}>Add Education</Text>
          <ScrollView style={s.form} keyboardShouldPersistTaps="handled">
            {[
              { k: 'degree',         l: 'Degree *',        p: 'e.g. B.Tech, MBA' },
              { k: 'institution',    l: 'Institution *',   p: 'College / University' },
              { k: 'field_of_study', l: 'Field of Study',  p: 'Computer Science, Finance...' },
              { k: 'year_from',      l: 'Year From',       p: 'e.g. 2016' },
              { k: 'year_to',        l: 'Year To',         p: 'e.g. 2020' },
            ].map(({ k, l, p }) => (
              <View key={k} style={s.formGroup}>
                <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{l}</Text>
                <TextInput style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                  placeholder={p} placeholderTextColor={colors.textSecondary}
                  value={form[k]} onChangeText={set(k)} />
              </View>
            ))}
          </ScrollView>
          <View style={s.modalBtns}>
            <TouchableOpacity style={[s.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
              onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>Add</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Experience Add Modal ──────────────────────────────────────
const ExpModal = ({ visible, onClose, onSave, colors }) => {
  const [form, setForm]  = useState({ company: '', job_title: '', from_date: '', to_date: '', is_current: false, description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setForm({ company: '', job_title: '', from_date: '', to_date: '', is_current: false, description: '' });
  }, [visible]);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.company.trim() || !form.job_title.trim()) {
      Alert.alert('Validation', 'Company and Job Title are required');
      return;
    }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalWrap}>
        <TouchableOpacity style={s.modalBg} onPress={onClose} activeOpacity={1} />
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />
          <Text style={[s.modalTitle, { color: colors.text }]}>Add Experience</Text>
          <ScrollView style={s.form} keyboardShouldPersistTaps="handled">
            {[
              { k: 'company',   l: 'Company *',   p: 'Company name' },
              { k: 'job_title', l: 'Job Title *',  p: 'Your role' },
              { k: 'from_date', l: 'From Date',    p: 'YYYY-MM-DD' },
              { k: 'to_date',   l: 'To Date',      p: 'YYYY-MM-DD (leave blank if current)' },
            ].map(({ k, l, p }) => (
              <View key={k} style={s.formGroup}>
                <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{l}</Text>
                <TextInput style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                  placeholder={p} placeholderTextColor={colors.textSecondary}
                  value={form[k]} onChangeText={set(k)} />
              </View>
            ))}
            <TouchableOpacity
              style={[s.checkRow]}
              onPress={() => setForm(f => ({ ...f, is_current: !f.is_current }))}>
              <View style={[s.checkbox, { borderColor: colors.primary, backgroundColor: form.is_current ? colors.primary : 'transparent' }]}>
                {form.is_current && <Icon name="checkmark" size={13} color="#fff" />}
              </View>
              <Text style={[s.checkLabel, { color: colors.text }]}>Currently working here</Text>
            </TouchableOpacity>
            <View style={s.formGroup}>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Description</Text>
              <TextInput style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground, minHeight: 64, textAlignVertical: 'top' }]}
                placeholder="Brief description of your role..."
                placeholderTextColor={colors.textSecondary}
                multiline value={form.description} onChangeText={set('description')} />
            </View>
          </ScrollView>
          <View style={s.modalBtns}>
            <TouchableOpacity style={[s.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
              onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>Add</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Main Screen ───────────────────────────────────────────────
const EmployeeDetailScreen = () => {
  const { colors }  = useTheme();
  const navigation  = useNavigation();
  const route       = useRoute();
  const { employeeId, name } = route.params;

  const [employee,  setEmployee]  = useState(null);
  const [education, setEducation] = useState([]);
  const [experience,setExperience]= useState([]);
  const [loading,   setLoading]   = useState(true);

  const [editVisible,    setEditVisible]    = useState(false);
  const [passwordVisible,setPasswordVisible]= useState(false);
  const [accountVisible, setAccountVisible] = useState(false);
  const [eduVisible,     setEduVisible]     = useState(false);
  const [expVisible,     setExpVisible]     = useState(false);

  const reload = useCallback(async () => {
    try {
      const [e, edu, exp] = await Promise.all([
        hrService.getEmployee(employeeId),
        hrService.getEducation(employeeId),
        hrService.getExperience(employeeId),
      ]);
      setEmployee(e);
      setEducation(edu || []);
      setExperience(exp || []);
    } catch {}
  }, [employeeId]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  const handleEdit = async (vals) => {
    try {
      await hrService.updateEmployee(employeeId, vals);
      await reload();
      Alert.alert('Success', 'Employee updated');
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
      throw e;
    }
  };

  const handleSetPassword = async (newPassword) => {
    if (!employee?.user_id) {
      Alert.alert('Error', 'No user account linked to this employee');
      return;
    }
    try {
      await hrService.setPassword(employeeId, newPassword);
      Alert.alert('Success', 'Password updated successfully');
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
      throw e;
    }
  };

  const handleCreateAccount = async (email, password) => {
    await hrService.createAccount(employeeId, email, password);
    await reload();
    Alert.alert('Success', 'Login account created successfully');
  };

  const handleArchive = () => {
    Alert.alert(
      'Archive Employee',
      `Are you sure you want to archive ${employee?.name}? They will no longer appear in employee lists.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: async () => {
          try {
            await hrService.deleteEmployee(employeeId);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', friendlyError(e));
          }
        }},
      ]
    );
  };

  const handleDeleteEdu = (eduId) => {
    Alert.alert('Remove', 'Remove this education record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await hrService.deleteEducation(employeeId, eduId); setEducation(e => e.filter(x => x.id !== eduId)); }
        catch (e) { Alert.alert('Error', friendlyError(e)); }
      }},
    ]);
  };

  const handleDeleteExp = (expId) => {
    Alert.alert('Remove', 'Remove this experience record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await hrService.deleteExperience(employeeId, expId); setExperience(e => e.filter(x => x.id !== expId)); }
        catch (e) { Alert.alert('Error', friendlyError(e)); }
      }},
    ]);
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!employee) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Icon name="person-outline" size={48} color={colors.textLight} />
        <Text style={[s.emptyText, { color: colors.textSecondary }]}>Employee not found</Text>
      </View>
    );
  }

  const initial = employee.name?.[0]?.toUpperCase() || '?';
  const dept    = employee.department_id?.[1];
  const job     = employee.job_title;
  const isIn    = employee.attendance_state === 'checked_in';

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>{name}</Text>
        <TouchableOpacity onPress={() => setEditVisible(true)} style={s.editBtn}>
          <Icon name="pencil" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Hero card */}
        <View style={[s.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.heroAvatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[s.heroInitial, { color: colors.primary }]}>{initial}</Text>
          </View>
          <Text style={[s.heroName, { color: colors.text }]}>{employee.name}</Text>
          {job  && <Text style={[s.heroJob,  { color: colors.textSecondary }]}>{job}</Text>}
          {dept && <Text style={[s.heroDept, { color: colors.textSecondary }]}>{dept}</Text>}

          <View style={[s.statusBadge, { backgroundColor: isIn ? '#4CAF5020' : '#9E9E9E20' }]}>
            <View style={[s.statusDot, { backgroundColor: isIn ? '#4CAF50' : '#9E9E9E' }]} />
            <Text style={[s.statusText, { color: isIn ? '#4CAF50' : '#9E9E9E' }]}>
              {isIn ? 'Checked In' : 'Checked Out'}
            </Text>
          </View>

          {/* Account buttons */}
          <View style={s.heroActions}>
            {employee.user_id ? (
              <TouchableOpacity
                style={[s.heroBtn, { borderColor: colors.primary }]}
                onPress={() => setPasswordVisible(true)}>
                <Icon name="key-outline" size={15} color={colors.primary} />
                <Text style={[s.heroBtnText, { color: colors.primary }]}>Set Password</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.heroBtn, { borderColor: '#4CAF50', backgroundColor: '#4CAF5010' }]}
                onPress={() => setAccountVisible(true)}>
                <Icon name="person-add-outline" size={15} color="#4CAF50" />
                <Text style={[s.heroBtnText, { color: '#4CAF50' }]}>Create Login</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Contact */}
        <Section title="Contact" colors={colors}>
          <Row icon="mail-outline"          label="Work Email"  value={employee.work_email}
               colors={colors} onPress={employee.work_email ? () => Linking.openURL(`mailto:${employee.work_email}`) : null} />
          <Row icon="call-outline"          label="Work Phone"  value={employee.work_phone}
               colors={colors} onPress={employee.work_phone ? () => Linking.openURL(`tel:${employee.work_phone}`) : null} />
          <Row icon="phone-portrait-outline" label="Mobile"     value={employee.mobile_phone}
               colors={colors} onPress={employee.mobile_phone ? () => Linking.openURL(`tel:${employee.mobile_phone}`) : null} />
          {!employee.work_email && !employee.work_phone && !employee.mobile_phone && (
            <Text style={[s.noInfo, { color: colors.textSecondary }]}>No contact info</Text>
          )}
        </Section>

        {/* Work info */}
        <Section title="Work" colors={colors}>
          <Row icon="briefcase-outline"  label="Job Title"        value={job}                        colors={colors} />
          <Row icon="business-outline"   label="Department"       value={dept}                       colors={colors} />
          <Row icon="calendar-outline"   label="Joining Date"     value={employee.joining_date}      colors={colors} />
          <Row icon="document-text-outline" label="Employment"    value={employee.employment_type}   colors={colors} />
          <Row icon="location-outline"   label="Address"          value={employee.address}           colors={colors} />
          {!job && !dept && !employee.joining_date && !employee.employment_type && (
            <Text style={[s.noInfo, { color: colors.textSecondary }]}>No work info</Text>
          )}
        </Section>

        {/* Personal */}
        {(employee.birthday || employee.gender || employee.marital || employee.notes) && (
          <Section title="Personal" colors={colors}>
            <Row icon="calendar-outline"  label="Birthday"  value={employee.birthday}  colors={colors} />
            <Row icon="person-outline"    label="Gender"
                 value={employee.gender ? employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1) : null}
                 colors={colors} />
            <Row icon="heart-outline"     label="Marital"
                 value={employee.marital ? employee.marital.charAt(0).toUpperCase() + employee.marital.slice(1) : null}
                 colors={colors} />
            {employee.notes && (
              <View style={[s.row, { borderBottomColor: colors.border }]}>
                <Icon name="document-outline" size={18} color={colors.primary} style={s.rowIcon} />
                <View style={s.rowContent}>
                  <Text style={[s.rowLabel, { color: colors.textSecondary }]}>Notes</Text>
                  <Text style={[s.rowValue, { color: colors.text }]}>{employee.notes}</Text>
                </View>
              </View>
            )}
          </Section>
        )}

        {/* Emergency */}
        {(employee.emergency_contact_name || employee.emergency_contact_phone) && (
          <Section title="Emergency" colors={colors}>
            <Row icon="person-add-outline" label="Contact" value={employee.emergency_contact_name}  colors={colors} />
            <Row icon="call-outline"       label="Phone"   value={employee.emergency_contact_phone}
                 colors={colors} onPress={employee.emergency_contact_phone ? () => Linking.openURL(`tel:${employee.emergency_contact_phone}`) : null} />
          </Section>
        )}

        {/* Education */}
        <Section
          title="Education"
          colors={colors}
          action={
            <TouchableOpacity onPress={() => setEduVisible(true)} style={s.sectionBtn}>
              <Icon name="add" size={16} color={colors.primary} />
              <Text style={[s.sectionBtnText, { color: colors.primary }]}>Add</Text>
            </TouchableOpacity>
          }>
          {education.length === 0 ? (
            <Text style={[s.noInfo, { color: colors.textSecondary }]}>No education records</Text>
          ) : (
            education.map(edu => (
              <View key={edu.id} style={[s.listItem, { borderBottomColor: colors.border }]}>
                <View style={s.listItemContent}>
                  <Text style={[s.listItemTitle, { color: colors.text }]}>{edu.degree}</Text>
                  <Text style={[s.listItemSub, { color: colors.textSecondary }]}>{edu.institution}</Text>
                  {edu.field_of_study ? <Text style={[s.listItemSub, { color: colors.textSecondary }]}>{edu.field_of_study}</Text> : null}
                  {(edu.year_from || edu.year_to) && (
                    <Text style={[s.listItemMeta, { color: colors.textSecondary }]}>
                      {edu.year_from || '?'} – {edu.year_to || 'Present'}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDeleteEdu(edu.id)} style={s.deleteBtn}>
                  <Icon name="trash-outline" size={16} color="#F44336" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </Section>

        {/* Experience */}
        <Section
          title="Experience"
          colors={colors}
          action={
            <TouchableOpacity onPress={() => setExpVisible(true)} style={s.sectionBtn}>
              <Icon name="add" size={16} color={colors.primary} />
              <Text style={[s.sectionBtnText, { color: colors.primary }]}>Add</Text>
            </TouchableOpacity>
          }>
          {experience.length === 0 ? (
            <Text style={[s.noInfo, { color: colors.textSecondary }]}>No experience records</Text>
          ) : (
            experience.map(exp => (
              <View key={exp.id} style={[s.listItem, { borderBottomColor: colors.border }]}>
                <View style={s.listItemContent}>
                  <Text style={[s.listItemTitle, { color: colors.text }]}>{exp.job_title}</Text>
                  <Text style={[s.listItemSub, { color: colors.textSecondary }]}>{exp.company}</Text>
                  <Text style={[s.listItemMeta, { color: colors.textSecondary }]}>
                    {exp.from_date || '?'} – {exp.is_current ? 'Present' : (exp.to_date || '?')}
                  </Text>
                  {exp.description ? <Text style={[s.listItemDesc, { color: colors.textSecondary }]} numberOfLines={2}>{exp.description}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => handleDeleteExp(exp.id)} style={s.deleteBtn}>
                  <Icon name="trash-outline" size={16} color="#F44336" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </Section>

        {/* Danger zone */}
        <TouchableOpacity
          style={[s.archiveBtn, { borderColor: '#F44336' }]}
          onPress={handleArchive}>
          <Icon name="archive-outline" size={16} color="#F44336" />
          <Text style={[s.archiveBtnText, { color: '#F44336' }]}>Archive Employee</Text>
        </TouchableOpacity>
      </ScrollView>

      <EditModal
        visible={editVisible}
        employee={employee}
        onClose={() => setEditVisible(false)}
        onSave={handleEdit}
        colors={colors}
      />
      <PasswordModal
        visible={passwordVisible}
        onClose={() => setPasswordVisible(false)}
        onSave={handleSetPassword}
        colors={colors}
      />
      <CreateAccountModal
        visible={accountVisible}
        employee={employee}
        onClose={() => setAccountVisible(false)}
        onCreated={handleCreateAccount}
        colors={colors}
      />
      <EduModal
        visible={eduVisible}
        onClose={() => setEduVisible(false)}
        onSave={async (vals) => {
          const created = await hrService.createEducation(employeeId, vals);
          setEducation(e => [...e, created]);
        }}
        colors={colors}
      />
      <ExpModal
        visible={expVisible}
        onClose={() => setExpVisible(false)}
        onSave={async (vals) => {
          const created = await hrService.createExperience(employeeId, vals);
          setExperience(e => [...e, created]);
        }}
        colors={colors}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container:       { flex: 1 },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText:       { fontSize: 15 },
  header:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:         { padding: 2 },
  editBtn:         { padding: 4 },
  headerTitle:     { fontSize: 18, fontWeight: '600', flex: 1 },
  scroll:          { padding: 12, paddingBottom: 100, gap: 12 },

  hero:            { alignItems: 'center', borderRadius: 16, padding: 24, gap: 6, borderWidth: StyleSheet.hairlineWidth },
  heroAvatar:      { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroInitial:     { fontSize: 30, fontWeight: '700' },
  heroName:        { fontSize: 20, fontWeight: '700' },
  heroJob:         { fontSize: 14 },
  heroDept:        { fontSize: 13 },
  statusBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  statusDot:       { width: 7, height: 7, borderRadius: 4 },
  statusText:      { fontSize: 12, fontWeight: '600' },
  heroActions:     { flexDirection: 'row', gap: 10, marginTop: 8 },
  heroBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  heroBtnText:     { fontSize: 13, fontWeight: '600' },

  section:         { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  sectionTitle:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, flex: 1 },
  sectionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sectionBtnText:  { fontSize: 13, fontWeight: '600' },
  row:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  rowIcon:         { width: 22 },
  rowContent:      { flex: 1, gap: 2 },
  rowLabel:        { fontSize: 11 },
  rowValue:        { fontSize: 14, fontWeight: '500' },
  noInfo:          { fontSize: 13, fontStyle: 'italic', paddingHorizontal: 16, paddingVertical: 12 },

  listItem:        { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  listItemContent: { flex: 1, gap: 2 },
  listItemTitle:   { fontSize: 14, fontWeight: '600' },
  listItemSub:     { fontSize: 13 },
  listItemMeta:    { fontSize: 12, marginTop: 2 },
  listItemDesc:    { fontSize: 12, marginTop: 4 },
  deleteBtn:       { padding: 4, marginTop: 2 },

  archiveBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  archiveBtnText:  { fontSize: 14, fontWeight: '600' },

  // Modal shared
  modalWrap:       { flex: 1, justifyContent: 'flex-end' },
  modalBg:         { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:           { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '90%' },
  handle:          { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle:      { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  form:            { maxHeight: 420, marginBottom: 16 },
  formGroup:       { marginBottom: 12 },
  fieldLabel:      { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input:           { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  modalBtns:       { flexDirection: 'row', gap: 12 },
  cancelBtn:       { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  cancelText:      { fontWeight: '600', fontSize: 14 },
  saveBtn:         { flex: 2, alignItems: 'center', paddingVertical: 12, borderRadius: 10 },
  saveText:        { color: '#fff', fontWeight: '700', fontSize: 14 },

  checkRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, paddingVertical: 4 },
  checkbox:        { width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkLabel:      { fontSize: 14 },
});

export default EmployeeDetailScreen;
