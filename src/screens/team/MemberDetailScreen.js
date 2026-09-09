import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../services/api/httpClient';
import Avatar from '../../components/team/Avatar';
import { useTheme } from '../../theme/ThemeContext';

const PRIORITY_COLOR = { '0':'#9E9E9E', '1':'#2196F3', '2':'#FF9800', '3':'#F44336' };

const MemberDetailScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { member } = route.params;
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
    navigation.setOptions({ title: member.name });
  }, []);

  const loadTasks = async () => {
    try {
      const { data } = await api.get('/tasks', { params: { user_id: member.id, limit: 30 } });
      setTasks(data || []);
    } catch {
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={s.content}>

      {/* Profile header */}
      <View style={[s.profileHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Avatar user={member} size={80} />
        <Text style={[s.profileName, { color: colors.text }]}>{member.name}</Text>
        {(member.phone || member.email) && (
          <Text style={[s.profileSub, { color: colors.textSecondary }]}>
            {member.phone || member.email}
          </Text>
        )}

        {/* Quick actions */}
        <View style={s.actions}>
          {member.phone && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => Linking.openURL(`tel:${member.phone}`)}>
              <Icon name="call-outline" size={20} color={colors.primary} />
              <Text style={[s.actionText, { color: colors.textSecondary }]}>Call</Text>
            </TouchableOpacity>
          )}
          {member.phone && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => Linking.openURL(`https://wa.me/${member.phone.replace(/\D/g,'')}`)}>
              <Icon name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={[s.actionText, { color: colors.textSecondary }]}>WhatsApp</Text>
            </TouchableOpacity>
          )}
          {member.email && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => Linking.openURL(`mailto:${member.email}`)}>
              <Icon name="mail-outline" size={20} color={colors.primary} />
              <Text style={[s.actionText, { color: colors.textSecondary }]}>Email</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tasks section */}
      <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>
          Open Tasks ({loading ? '…' : tasks.length})
        </Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />
        ) : tasks.length === 0 ? (
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>No open tasks assigned</Text>
        ) : (
          tasks.map(t => {
            const pc      = PRIORITY_COLOR[t.priority] || '#9E9E9E';
            const overdue = t.date_deadline && t.date_deadline < new Date().toISOString().split('T')[0];
            return (
              <TouchableOpacity key={t.id} style={[s.taskRow, { borderBottomColor: colors.divider }]}
                onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: t.id } })}>
                <View style={[s.priDot, { backgroundColor: pc }]} />
                <View style={s.taskContent}>
                  <Text style={[s.taskName, { color: colors.text }]} numberOfLines={1}>{t.name}</Text>
                  <Text style={[s.taskMeta, { color: colors.textSecondary }]}>
                    {t.project_id?.[1] || 'No project'}
                    {t.date_deadline ? ` · ${overdue ? '⚠ ' : ''}${new Date(t.date_deadline).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}` : ''}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={16} color={colors.textLight} />
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container:     { flex: 1 },
  content:       { paddingBottom: 40 },
  profileHeader: { alignItems: 'center', padding: 24, borderBottomWidth: StyleSheet.hairlineWidth },
  profileName:   { fontSize: 18, fontWeight: '800', marginTop: 16 },
  profileSub:    { fontSize: 14, marginTop: 4 },
  actions:       { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn:     { alignItems: 'center', gap: 4, borderRadius: 12, padding: 16, minWidth: 72, borderWidth: 1 },
  actionText:    { fontSize: 11, fontWeight: '600' },
  section:       { margin: 16, borderRadius: 12, padding: 16, borderWidth: StyleSheet.hairlineWidth },
  sectionTitle:  { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  emptyText:     { fontSize: 14, paddingVertical: 16 },
  taskRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  priDot:        { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  taskContent:   { flex: 1 },
  taskName:      { fontSize: 14, fontWeight: '600' },
  taskMeta:      { fontSize: 12, marginTop: 2 },
});

export default MemberDetailScreen;
