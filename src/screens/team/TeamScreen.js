import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import TeamService from '../../services/team/teamService';
import Avatar from '../../components/team/Avatar';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, layout } from '../../theme/spacing';
import typography from '../../theme/typography';


const MemberCard = ({ member, isMe, onPress }) => {
  const color = TeamService.getColor(member.id);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardLeft}>
        <Avatar user={member} size={48} />
        {isMe && <View style={styles.meBadge}><Text style={styles.meBadgeText}>me</Text></View>}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName}>{member.name}</Text>
        <Text style={styles.cardSub} numberOfLines={1}>
          {member.phone || member.email || member.login}
        </Text>
        <View style={styles.cardStats}>
          <View style={[styles.taskBadge, { backgroundColor: color + '18' }]}>
            <Icon name="checkbox-outline" size={11} color={color} />
            <Text style={[styles.taskBadgeText, { color }]}>
              {member.task_count} {member.task_count === 1 ? 'task' : 'tasks'}
            </Text>
          </View>
        </View>
      </View>
      <Icon name="chevron-forward" size={18} color={colors.textLight} />
    </TouchableOpacity>
  );
};

const TeamScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const user      = useSelector(s => s.auth.user);
  const [members, setMembers]   = useState([]);
  const [search,  setSearch]    = useState('');
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    try {
      const data = await TeamService.getMembers(force);
      setMembers(data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = members.filter(m =>
    !search.trim() ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.phone || '').includes(search) ||
    (m.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const myId = user?.uid || user?.id;

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Stats header */}
      <View style={styles.statsRow}>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>{members.length}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>{members.reduce((n, m) => n + m.task_count, 0)}</Text>
          <Text style={styles.statLabel}>Open tasks</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>{members.filter(m => m.task_count > 0).length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Icon name="search-outline" size={16} color={colors.textLight} style={{ marginLeft: 12 }} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
          placeholder="Search members..." placeholderTextColor={colors.textLight} />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: 10 }}>
            <Icon name="close-circle" size={16} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={m => String(m.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(true); }}
          tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <MemberCard
            member={item}
            isMe={item.id === myId}
            onPress={() => navigation.navigate('MemberDetail', { member: item })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="people-outline" size={48} color={colors.border} />
            <Text style={styles.emptyTitle}>No team members found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#FAFAF7' },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow:   { flexDirection: 'row', padding: spacing.md, gap: 10 },
  statTile:   { flex: 1, backgroundColor: '#FFFFFF', borderRadius: layout.borderRadius.lg, padding: spacing.md, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  statValue:  { fontSize: typography.h4, fontWeight: '800', color: '#0D0D14' },
  statLabel:  { fontSize: 11, color: '#3A3A4A', fontWeight: '500', marginTop: 2 },
  searchRow:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: '#FFFFFF', borderRadius: layout.borderRadius.round, borderWidth: 1, borderColor: '#E8E8E0' },
  searchInput:{ flex: 1, paddingVertical: 9, paddingHorizontal: 8, fontSize: typography.body2, color: '#0D0D14' },
  list:       { padding: spacing.md, paddingBottom: 40 },
  card:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: layout.borderRadius.lg, marginBottom: 8, padding: spacing.md, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  cardLeft:   { position: 'relative', marginRight: spacing.md },
  meBadge:    { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#2563EB', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 },
  meBadgeText:{ fontSize: 9, color: '#fff', fontWeight: '800' },
  cardContent:{ flex: 1 },
  cardName:   { fontSize: typography.body2, fontWeight: '700', color: '#0D0D14' },
  cardSub:    { fontSize: typography.caption, color: '#3A3A4A', marginTop: 1 },
  cardStats:  { flexDirection: 'row', gap: 6, marginTop: 5 },
  taskBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  taskBadgeText: { fontSize: 11, fontWeight: '600' },
  empty:      { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: typography.body2, fontWeight: '700', color: '#0D0D14' },
});

export default TeamScreen;
