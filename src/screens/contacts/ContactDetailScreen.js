import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import ContactsService from '../../services/contacts/contactsService';
import { useTheme } from '../../theme/ThemeContext';

const ContactDetailScreen = ({ route, navigation }) => {
  const { contactId } = route.params;
  const { colors }    = useTheme();
  const [contact, setContact] = useState(null);
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    const load = async () => {
      try {
        const [c, t] = await Promise.all([
          ContactsService.get(contactId),
          ContactsService.getLinkedTasks(contactId),
        ]);
        if (active) { setContact(c); setTasks(t || []); }
      } catch {} finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [contactId]));

  React.useLayoutEffect(() => {
    if (contact) {
      navigation.setOptions({
        title: contact.name,
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('ContactEdit', { contactId })}
            style={{ paddingRight: 16 }}>
            <Icon name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        ),
      });
    }
  }, [contact, colors]);

  if (loading) return (
    <View style={[s.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
  if (!contact) return (
    <View style={[s.center, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.textSecondary }}>Contact not found</Text>
    </View>
  );

  const color    = ContactsService.getColor(contact.id);
  const initials = ContactsService.getInitials(contact.name);
  const phone    = contact.phone || contact.mobile;
  // 'function' is the job title field on res.partner
  const jobTitle = contact.function || '';
  const sub      = [jobTitle, contact.company_name].filter(Boolean).join(' · ');

  const InfoRow = ({ icon, label, value, onPress }) => !value ? null : (
    <TouchableOpacity
      style={[s.infoRow, { borderBottomColor: colors.divider }]}
      onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <View style={[s.infoIcon, { backgroundColor: colors.primary + '18' }]}>
        <Icon name={icon} size={15} color={colors.primary} />
      </View>
      <View style={s.infoContent}>
        <Text style={[s.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[s.infoValue, { color: onPress ? colors.primary : colors.text }]}>{value}</Text>
      </View>
      {onPress && <Icon name="chevron-forward" size={14} color={colors.textLight} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface }]}>
        <View style={[s.avatar, { backgroundColor: color }]}>
          {contact.is_company
            ? <Icon name="business" size={32} color="#fff" />
            : <Text style={s.avatarText}>{initials}</Text>}
        </View>
        <Text style={[s.name, { color: colors.text }]}>{contact.name}</Text>
        {!!sub && <Text style={[s.sub, { color: colors.textSecondary }]}>{sub}</Text>}

        {/* Quick actions */}
        <View style={s.actions}>
          {!!phone && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => Linking.openURL(`tel:${phone}`)}>
              <Icon name="call-outline" size={20} color={colors.primary} />
              <Text style={[s.actionLabel, { color: colors.textSecondary }]}>Call</Text>
            </TouchableOpacity>
          )}
          {!!phone && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/\D/g,'')}`)}>
              <Icon name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={[s.actionLabel, { color: colors.textSecondary }]}>WhatsApp</Text>
            </TouchableOpacity>
          )}
          {!!contact.email && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => Linking.openURL(`mailto:${contact.email}`)}>
              <Icon name="mail-outline" size={20} color={colors.primary} />
              <Text style={[s.actionLabel, { color: colors.textSecondary }]}>Email</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Info */}
      <View style={[s.card, { backgroundColor: colors.surface }]}>
        <Text style={[s.cardLabel, { color: colors.textLight }]}>Contact info</Text>
        <InfoRow icon="call-outline"   label="Phone"    value={contact.phone}  onPress={() => contact.phone && Linking.openURL(`tel:${contact.phone}`)} />
        <InfoRow icon="phone-portrait-outline" label="Mobile" value={contact.mobile} onPress={() => contact.mobile && Linking.openURL(`tel:${contact.mobile}`)} />
        <InfoRow icon="mail-outline"   label="Email"    value={contact.email}  onPress={() => contact.email && Linking.openURL(`mailto:${contact.email}`)} />
        <InfoRow icon="briefcase-outline" label="Job title" value={jobTitle} />
        <InfoRow icon="business-outline"  label="Company"   value={contact.company_name} />
        <InfoRow icon="location-outline"  label="City"      value={contact.city} />
        <InfoRow icon="flag-outline"      label="Country"   value={contact.country_id?.[1]} />
      </View>

      {/* Linked tasks */}
      {tasks.length > 0 && (
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <Text style={[s.cardLabel, { color: colors.textLight }]}>Linked tasks ({tasks.length})</Text>
          {tasks.map(t => {
            const pc = { '0':'#9E9E9E','1':'#2196F3','2':'#FF9800','3':'#F44336' }[t.priority] || '#9E9E9E';
            return (
              <TouchableOpacity key={t.id}
                style={[s.taskRow, { borderBottomColor: colors.divider }]}
                onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: t.id } })}>
                <View style={[s.taskDot, { backgroundColor: pc }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.taskName, { color: colors.text }]} numberOfLines={1}>{t.name}</Text>
                  <Text style={[s.taskMeta, { color: colors.textSecondary }]}>
                    {t.project_id?.[1] || 'No project'} · {t.stage_id?.[1] || '—'}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={14} color={colors.textLight} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const S = StyleSheet;
const s = S.create({
  container:  { flex: 1 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:     { alignItems: 'center', padding: 24, paddingBottom: 20, marginBottom: 12 },
  avatar:     { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name:       { fontSize: 20, fontWeight: '800' },
  sub:        { fontSize: 13, marginTop: 4, textAlign: 'center' },
  actions:    { flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' },
  actionBtn:  { alignItems: 'center', gap: 4, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  actionLabel:{ fontSize: 11, fontWeight: '600' },
  card:       { marginHorizontal: 12, marginBottom: 12, borderRadius: 14, overflow: 'hidden' },
  cardLabel:  { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, padding: 14, paddingBottom: 4 },
  infoRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: S.hairlineWidth },
  infoIcon:   { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoContent:{ flex: 1 },
  infoLabel:  { fontSize: 11 },
  infoValue:  { fontSize: 14, fontWeight: '500', marginTop: 1 },
  taskRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: S.hairlineWidth },
  taskDot:    { width: 8, height: 8, borderRadius: 4 },
  taskName:   { fontSize: 13, fontWeight: '600' },
  taskMeta:   { fontSize: 11, marginTop: 2 },
});

export default ContactDetailScreen;
