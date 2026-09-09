import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../theme/ThemeContext';
import serviceService, { TICKET_STATUSES, URGENCY_CONFIGS, fmtDate } from '../serviceService';

const FILTERS = [
  { key: null,          label: 'All'     },
  { key: 'open',        label: 'Open'    },
  { key: 'assigned',    label: 'Assigned'},
  { key: 'wip',         label: 'WIP'     },
  { key: 'pending_parts', label: 'Parts' },
  { key: 'resolved',    label: 'Resolved'},
];

function UrgencyDot({ urgency }) {
  const cfg = URGENCY_CONFIGS[urgency] || URGENCY_CONFIGS.Normal;
  return <View style={[s.urgencyDot, { backgroundColor: cfg.color }]} />;
}

function TicketCard({ ticket, onPress, colors }) {
  const st = TICKET_STATUSES[ticket.status] || TICKET_STATUSES.open;
  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.78}>
      <View style={[s.accent, { backgroundColor: st.color }]} />
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <View style={s.cardTopLeft}>
            <UrgencyDot urgency={ticket.urgency} />
            <Text style={[s.ticketNum, { color: colors.text }]}>{ticket.ticket_number}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: st.bg }]}>
            <Icon name={st.icon} size={10} color={st.color} style={{ marginRight: 3 }} />
            <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>

        <Text style={[s.instrument, { color: colors.text }]} numberOfLines={1}>
          {ticket.instrument}
        </Text>
        <Text style={[s.customer, { color: colors.textSecondary }]} numberOfLines={1}>
          {ticket.customer_name}
        </Text>

        <View style={s.cardFoot}>
          <Text style={[s.meta, { color: colors.textLight }]}>
            {ticket.nature_of_call}
          </Text>
          <Text style={[s.meta, { color: colors.textLight }]}>
            {fmtDate(ticket.created_at)}
          </Text>
        </View>
      </View>
      <Icon name="chevron-forward" size={16} color={colors.textLight} />
    </TouchableOpacity>
  );
}

export default function ServiceListScreen({ navigation }) {
  const { colors } = useTheme();
  const user = useSelector(s => s.auth?.user);
  const isAdmin = user?.is_admin || user?.role === 'admin';

  const [tickets,     setTickets]   = useState([]);
  const [loading,     setLoading]   = useState(true);
  const [refreshing,  setRefreshing]= useState(false);
  const [search,      setSearch]    = useState('');
  const [statusFilter,setFilter]    = useState(null);
  const [myTickets,   setMyTickets] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const data = await serviceService.listTickets({
      status:      statusFilter,
      assigned_to: myTickets ? user?.id : null,
    });
    setTickets(data);
    setLoading(false);
    setRefreshing(false);
  }, [statusFilter, myTickets, user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visible = tickets.filter(t =>
    !search ||
    t.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.instrument?.toLowerCase().includes(search.toLowerCase())
  );

  const openCount = visible.filter(t => ['open', 'assigned', 'wip', 'pending_parts'].includes(t.status)).length;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[s.title, { color: colors.text }]}>Service</Text>
          {openCount > 0 && (
            <Text style={[s.subtitle, { color: colors.textLight }]}>{openCount} active</Text>
          )}
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity
            style={[s.mineBtn, myTickets && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
            onPress={() => setMyTickets(v => !v)}>
            <Icon name="person-outline" size={14} color={myTickets ? colors.primary : colors.textSecondary} />
            <Text style={[s.mineBtnText, { color: myTickets ? colors.primary : colors.textSecondary }]}>Mine</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.iconBtn, { borderColor: colors.border }]}
            onPress={() => navigation.navigate('ServiceDailyReport')}>
            <Icon name="bar-chart-outline" size={17} color={colors.primary} />
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity
              style={[s.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('NewTicket')}>
              <Icon name="add" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Icon name="search-outline" size={16} color={colors.textLight} style={s.searchIcon} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Ticket no., customer, instrument…"
          placeholderTextColor={colors.textLight}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close-circle" size={16} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={[s.filterWrap, { borderBottomColor: colors.border }]}>
        <FlatList
          data={FILTERS}
          keyExtractor={f => String(f.key)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
          renderItem={({ item: f }) => {
            const active = statusFilter === f.key;
            const st = f.key ? TICKET_STATUSES[f.key] : null;
            return (
              <TouchableOpacity
                style={[s.chip, active && {
                  backgroundColor: (st?.color || colors.primary) + '20',
                  borderColor: st?.color || colors.primary,
                }]}
                onPress={() => setFilter(f.key)}>
                <Text style={[s.chipText, { color: active ? (st?.color || colors.primary) : colors.textSecondary }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={t => String(t.id)}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />
          }
          renderItem={({ item }) => (
            <TicketCard
              ticket={item}
              colors={colors}
              onPress={() => navigation.navigate('ServiceDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Icon name="construct-outline" size={48} color={colors.textLight} />
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No service tickets</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14, borderBottomWidth: 0.5 },
  title:       { fontSize: 20, fontWeight: '800' },
  subtitle:    { fontSize: 12, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mineBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10,
                 paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'transparent',
                 backgroundColor: '#00000008' },
  mineBtnText: { fontSize: 12, fontWeight: '600' },
  iconBtn:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                 borderWidth: 1 },
  addBtn:      { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
                 paddingVertical: 10, borderBottomWidth: 0.5 },
  searchIcon:  { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 2 },
  filterWrap:  { borderBottomWidth: 0.5, paddingVertical: 10 },
  chip:        { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                 borderWidth: 1, borderColor: 'transparent', backgroundColor: '#00000008' },
  chipText:    { fontSize: 12, fontWeight: '600' },
  card:        { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginTop: 10,
                 borderRadius: 14, borderWidth: 1, overflow: 'hidden',
                 shadowColor: '#0EA5E9', shadowOpacity: 0.04,
                 shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 1 },
  accent:      { width: 4, alignSelf: 'stretch' },
  cardBody:    { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  urgencyDot:  { width: 7, height: 7, borderRadius: 4 },
  ticketNum:   { fontSize: 13, fontWeight: '700' },
  badge:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7,
                 paddingVertical: 2, borderRadius: 10 },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  instrument:  { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  customer:    { fontSize: 12, marginBottom: 6 },
  cardFoot:    { flexDirection: 'row', justifyContent: 'space-between' },
  meta:        { fontSize: 11 },
  empty:       { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText:   { fontSize: 15 },
});
