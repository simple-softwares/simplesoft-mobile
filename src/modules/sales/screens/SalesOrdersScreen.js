import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import { useFeatureAccess } from '../../../hooks/useFeatureAccess';
import UpgradePrompt from '../../../components/UpgradePrompt';
import salesService from '../salesService';

const STATUS_CONFIG = {
  draft:                { label: 'Draft',       color: '#9E9E9E', bg: '#9E9E9E15' },
  confirmed:            { label: 'Confirmed',   color: '#4CAF50', bg: '#4CAF5015' },
  partially_dispatched: { label: 'In Progress', color: '#FF9800', bg: '#FF980015' },
  fully_fulfilled:      { label: 'Fulfilled',   color: '#2196F3', bg: '#2196F315' },
  cancelled:            { label: 'Cancelled',   color: '#F44336', bg: '#F4433615' },
};

const FILTERS = [
  { key: 'all',                  label: 'All'         },
  { key: 'confirmed',            label: 'Confirmed'   },
  { key: 'partially_dispatched', label: 'In Progress' },
  { key: 'fully_fulfilled',      label: 'Fulfilled'   },
  { key: 'cancelled',            label: 'Cancelled'   },
];

function fmtAmount(n) {
  const v = Number(n || 0);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)     return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toLocaleString('en-IN')}`;
}

const OrderCard = ({ order, onPress, colors }) => {
  const cfg  = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
  const date = order.order_date
    ? new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
    : null;

  const productLines  = (order.lines || []).filter(l => l.line_type === 'product');
  const totalOrdered  = productLines.reduce((s, l) => s + parseFloat(l.qty_ordered || 0), 0);
  const totalDelivered = productLines.reduce((s, l) => s + parseFloat(l.qty_delivered || 0), 0);
  const dispatchPct   = totalOrdered > 0 ? Math.round((totalDelivered / totalOrdered) * 100) : 0;
  const showProgress  = (order.status === 'confirmed' || order.status === 'partially_dispatched') && totalOrdered > 0;

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}>
      <View style={[s.accentBar, { backgroundColor: cfg.color }]} />
      <View style={s.cardContent}>
        <View style={s.cardTop}>
          <Text style={[s.orderName, { color: colors.text }]}>{order.so_number || `SO #${order.id}`}</Text>
          <View style={[s.stateBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[s.stateText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {order.customer_name && (
          <Text style={[s.customer, { color: colors.textSecondary }]} numberOfLines={1}>
            {order.customer_name}
          </Text>
        )}

        <View style={s.cardBottom}>
          <Text style={[s.amount, { color: '#4CAF50' }]}>{fmtAmount(order.grand_total)}</Text>
          <View style={s.metaRight}>
            {date && <Text style={[s.date, { color: colors.textSecondary }]}>{date}</Text>}
            {order.sales_rep_id?.[1] && (
              <View style={[s.avatar, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[s.avatarText, { color: colors.primary }]}>
                  {order.sales_rep_id[1][0]?.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {showProgress && (
          <View>
            <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
              <View style={[s.progressFill, { width: `${dispatchPct}%` }]} />
            </View>
            <Text style={[s.progressText, { color: colors.textSecondary }]}>{dispatchPct}% dispatched</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const SalesOrdersScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { hasAccess, upgradePrompt, closePrompt } = useFeatureAccess();

  if (!hasAccess('sales')) {
    return <UpgradePrompt {...upgradePrompt} onClose={closePrompt} />;
  }

  const [orders,     setOrders]     = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('all');
  const [search,     setSearch]     = useState('');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [ordersData, statsData] = await Promise.all([
        salesService.getOrders({ limit: 100 }),
        salesService.getStats(),
      ]);
      setOrders(ordersData || []);
      setStats(statsData);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const visible = orders.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (o.so_number?.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q));
    }
    return true;
  });

  const counts = stats?.counts || {};

  const renderHeader = () => (
    <View style={s.listHeader}>
      {/* Stats */}
      {stats && (
        <View style={[s.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: '#4CAF50' }]}>{counts.confirmed || 0}</Text>
            <Text style={[s.statLabel, { color: colors.textSecondary }]}>Confirmed</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: '#FF9800' }]}>{counts.partially_dispatched || 0}</Text>
            <Text style={[s.statLabel, { color: colors.textSecondary }]}>In Progress</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: '#2196F3' }]}>{counts.fully_fulfilled || 0}</Text>
            <Text style={[s.statLabel, { color: colors.textSecondary }]}>Fulfilled</Text>
          </View>
          {stats.active_revenue != null && (
            <>
              <View style={[s.statDivider, { backgroundColor: colors.border }]} />
              <View style={s.statItem}>
                <Text style={[s.statValue, { color: '#4CAF50', fontSize: 13 }]}>{fmtAmount(stats.active_revenue)}</Text>
                <Text style={[s.statLabel, { color: colors.textSecondary }]}>Active</Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Search */}
      <View style={[s.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
        <Icon name="search-outline" size={17} color={colors.textSecondary} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search orders..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search ? <TouchableOpacity onPress={() => setSearch('')}>
          <Icon name="close-circle" size={17} color={colors.textSecondary} />
        </TouchableOpacity> : null}
      </View>

      {/* Filter chips */}
      <View style={s.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.chip, filter === f.key && { backgroundColor: colors.primary }]}
            onPress={() => setFilter(f.key)}>
            <Text style={[s.chipText, { color: filter === f.key ? '#fff' : colors.textSecondary }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.count, { color: colors.textSecondary }]}>
        {visible.length} {visible.length === 1 ? 'order' : 'orders'}
      </Text>
    </View>
  );

  if (loading) {
    return <View style={[s.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Sales Orders</Text>
      </View>

      <FlatList
        data={visible}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            colors={colors}
            onPress={() => navigation.navigate('SaleDetail', { orderId: item.id, orderName: item.so_number || `SO #${item.id}` })}
          />
        )}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[colors.primary]} />}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name="bag-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No orders found</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('NewSaleOrder')}
        activeOpacity={0.85}>
        <Icon name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  container:    { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:       { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:  { fontSize: 20, fontWeight: '700' },
  list:         { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 100 },
  listHeader:   { gap: 10, marginBottom: 4 },
  statsRow:     { flexDirection: 'row', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  statItem:     { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statValue:    { fontSize: 18, fontWeight: '800' },
  statLabel:    { fontSize: 10, marginTop: 2 },
  statDivider:  { width: StyleSheet.hairlineWidth },
  searchBar:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  searchInput:  { flex: 1, fontSize: 14, padding: 0 },
  filters:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#0000000A' },
  chipText:     { fontSize: 12, fontWeight: '600' },
  count:        { fontSize: 12 },
  card:         { flexDirection: 'row', borderRadius: 12, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  accentBar:    { width: 4 },
  cardContent:  { flex: 1, padding: 14, gap: 6 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderName:    { flex: 1, fontSize: 15, fontWeight: '700' },
  stateBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stateText:    { fontSize: 11, fontWeight: '700' },
  customer:     { fontSize: 13 },
  cardBottom:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount:       { fontSize: 16, fontWeight: '800' },
  metaRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  date:         { fontSize: 12 },
  avatar:       { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 12, fontWeight: '700' },
  progressTrack:{ height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: '#FF9800' },
  progressText: { fontSize: 10, marginTop: 2 },
  empty:        { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:    { fontSize: 15 },
  fab:          { position: 'absolute', bottom: 90, right: 20, width: 56, height: 56,
                  borderRadius: 28, alignItems: 'center', justifyContent: 'center',
                  shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 8, elevation: 6 },
});

export default SalesOrdersScreen;
