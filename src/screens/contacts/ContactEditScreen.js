import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ContactsService from '../../services/contacts/contactsService';
import { useTheme } from '../../theme/ThemeContext';
import { friendlyError } from '../../utils/errorUtils';
import { undoDelete } from '../../utils/undoDelete';

const ContactEditScreen = ({ route, navigation }) => {
  const { contactId } = route.params;
  const { colors }    = useTheme();
  const isNew         = !contactId;

  const [vals,    setVals]    = useState({
    name: '', phone: '', mobile: '', email: '',
    company_name: '', function: '', is_company: false,
  });
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    navigation.setOptions({ title: isNew ? 'New contact' : 'Edit contact' });
    if (!isNew) {
      ContactsService.get(contactId).then(c => {
        if (c) setVals({
          name:         c.name         || '',
          phone:        c.phone        || '',
          mobile:       c.mobile       || '',
          email:        c.email        || '',
          company_name: c.company_name || '',
          function:     c.function     || '',   // job title
          is_company:   c.is_company   || false,
        });
        setLoading(false);
      });
    }
  }, [contactId]);

  const set = (k, v) => setVals(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!vals.name.trim()) { Alert.alert('Required', 'Name is required'); return; }
    setSaving(true);
    try {
      if (isNew) {
        const id = await ContactsService.create(vals);
        navigation.replace('ContactDetail', { contactId: id });
      } else {
        await ContactsService.update(contactId, vals);
        navigation.goBack();
      }
    } catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setSaving(false); }
  };

  const deleteContact = () => {
    navigation.pop(2);
    undoDelete(
      'Contact',
      () => ContactsService.delete(contactId),
      () => navigation.navigate('ContactDetail', { contactId }),
    );
  };

  const Field = ({ label, value, onChange, placeholder, keyboardType, icon }) => (
    <View style={[s.field, { borderBottomColor: colors.divider }]}>
      <View style={[s.fieldIcon, { backgroundColor: colors.primary + '15' }]}>
        <Icon name={icon} size={15} color={colors.primary} />
      </View>
      <View style={s.fieldContent}>
        <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
        <TextInput
          style={[s.fieldInput, { color: colors.text }]}
          value={value} onChangeText={onChange}
          placeholder={placeholder} placeholderTextColor={colors.textLight}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        />
      </View>
    </View>
  );

  if (loading) return (
    <View style={[s.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          {/* Company toggle */}
          <View style={[s.toggleRow, { borderBottomColor: colors.divider }]}>
            <Icon name={vals.is_company ? 'business-outline' : 'person-outline'}
              size={18} color={colors.primary} style={{ marginRight: 12 }} />
            <Text style={[s.toggleLabel, { color: colors.text }]}>
              {vals.is_company ? 'Company' : 'Person'}
            </Text>
            <Switch value={vals.is_company} onValueChange={v => set('is_company', v)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface} style={{ marginLeft: 'auto' }} />
          </View>

          <Field label="Name *"      value={vals.name}         onChange={v => set('name', v)}         placeholder="Full name"        icon="person-outline" />
          <Field label="Phone"       value={vals.phone}        onChange={v => set('phone', v)}        placeholder="+91 98765 43210"  icon="call-outline"   keyboardType="phone-pad" />
          <Field label="Mobile"      value={vals.mobile}       onChange={v => set('mobile', v)}       placeholder="+91 98765 43210"  icon="phone-portrait-outline" keyboardType="phone-pad" />
          <Field label="Email"       value={vals.email}        onChange={v => set('email', v)}        placeholder="email@example.com" icon="mail-outline"  keyboardType="email-address" />
          {!vals.is_company && (
            <Field label="Company"   value={vals.company_name} onChange={v => set('company_name', v)} placeholder="Company name"     icon="business-outline" />
          )}
          <Field label="Job title"   value={vals.function}     onChange={v => set('function', v)}     placeholder="CEO, Manager..."  icon="briefcase-outline" />
        </View>

        {!isNew && (
          <TouchableOpacity style={[s.deleteBtn, { borderColor: colors.error + '40' }]}
            onPress={deleteContact}>
            <Icon name="trash-outline" size={17} color={colors.error} />
            <Text style={[s.deleteBtnText, { color: colors.error }]}>Delete contact</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={[s.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[s.cancelBtn, { borderColor: colors.border }]} onPress={() => navigation.goBack()}>
          <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
          onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveText}>{isNew ? 'Create' : 'Save'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const S = StyleSheet;
const s = S.create({
  container:   { flex: 1 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card:        { margin: 12, borderRadius: 14, overflow: 'hidden', marginBottom: 8 },
  toggleRow:   { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: S.hairlineWidth },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  field:       { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: S.hairlineWidth },
  fieldIcon:   { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  fieldContent:{ flex: 1 },
  fieldLabel:  { fontSize: 11, fontWeight: '500', marginBottom: 3 },
  fieldInput:  { fontSize: 14, paddingVertical: 2 },
  deleteBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  deleteBtnText: { fontSize: 14, fontWeight: '700' },
  footer:      { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12, padding: 12, borderTopWidth: S.hairlineWidth },
  cancelBtn:   { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 10, borderWidth: 1 },
  cancelText:  { fontWeight: '600', fontSize: 14 },
  saveBtn:     { flex: 2, alignItems: 'center', paddingVertical: 13, borderRadius: 10 },
  saveText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default ContactEditScreen;
