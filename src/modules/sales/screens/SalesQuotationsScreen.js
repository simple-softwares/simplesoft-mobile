import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import salesService from '../salesService';

const QuotationCard = ({ order, onPress, colors }) => {
  const amount = `₹${Number(order.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
  const date   = order.order_date
    ? new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
    : null;

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}>
      <View style={s.cardTop}>
        <Text style={[s.orderName, { color: colors.text }]}>{order.so_number || `DRAFT #${order.id}`}</Text>
        <View style={[s.stateBadge, { backgroundColor: '#9E9E9E15' }]}>
          <Text style={[s.stateText, { color: '#9E9E9E' }]}>Draft</Text>
        </View>
      </View>

      {order.customer_name && (
        <Text style={[s.customer, { color: colors.textSecondary }]} numberOfLines={1}>
          <Icon name="person-outline" size={12} /> {order.customer_name}
        </Text>
      )}

      <View style={s.cardBottom}>
        <Text style={[s.amount, { color: colors.primary }]}>{amount}</Text>
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
    </TouchableOpacity>
  );
};

const SalesQuotationsScreen = ({ navigation }) => {
  const { colors } = useTheme();

  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await salesService.getQuotations();
      setOrders(data || []);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const visible = orders.filter(o =>
    !search ||
    o.so_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <View style={[s.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Quotations</Text>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('NewSaleOrder')}>
          <Icon name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={visible}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <QuotationCard
            order={item}
            colors={colors}
            onPress={() => navigation.navigate('SaleDetail', { orderId: item.id, orderName: item.so_number || `DRAFT #${item.id}` })}
          />
        )}
        ListHeaderComponent={
          <View style={s.searchWrap}>
            <View style={[s.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Icon name="search-outline" size={17} color={colors.textSecondary} />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                placeholder="Search quotations..."
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
              />
              {search ? <TouchableOpacity onPress={() => setSearch('')}>
                <Icon name="close-circle" size={17} color={colors.textSecondary} />
              </TouchableOpacity> : null}
            </View>
            <Text style={[s.count, { color: colors.textSecondary }]}>{visible.length} quotations</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} colors={[colors.primary]} />}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name="document-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No quotations found</Text>
          </View>
        }
      />
    </View>
  );
};

const s = StyleSheet.create({
  container:   { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700' },
  addBtn:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  list:        { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 100 },
  searchWrap:  { marginBottom: 8, gap: 6 },
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  count:       { fontSize: 12 },
  card:        { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, gap: 6 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderName:   { flex: 1, fontSize: 15, fontWeight: '700' },
  stateBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stateText:   { fontSize: 11, fontWeight: '700' },
  customer:    { fontSize: 13 },
  cardBottom:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount:      { fontSize: 16, fontWeight: '800' },
  metaRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  date:        { fontSize: 12 },
  avatar:      { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 12, fontWeight: '700' },
  empty:       { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:   { fontSize: 15 },
});

export default SalesQuotationsScreen;
