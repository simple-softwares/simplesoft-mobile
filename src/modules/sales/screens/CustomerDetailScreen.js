import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import salesService from '../salesService';

const STATE_CONFIG = {
  draft:                { label: 'Draft',       color: '#9E9E9E' },
  confirmed:            { label: 'Confirmed',   color: '#4CAF50' },
  partially_dispatched: { label: 'In Progress', color: '#FF9800' },
  fully_fulfilled:      { label: 'Fulfilled',   color: '#2196F3' },
  cancelled:            { label: 'Cancelled',   color: '#F44336' },
};

const CustomerDetailScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { customerId, customerName } = route.params || {};

  const [customer, setCustomer] = useState(null);
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    if (!customerId) { setLoading(false); return; }
    try {
      const [cust, ords] = await Promise.all([
        salesService.getCustomer(customerId),
        salesService.getOrdersByPartner(customerId).catch(() => []),
      ]);
      setCustomer(cust);
      setOrders(ords || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  const initial   = customerName?.[0]?.toUpperCase() || '?';
  const bgColors  = ['#E91E6320','#2196F320','#4CAF5020','#FF980020','#9C27B020'];
  const fgColors  = ['#E91E63',  '#2196F3',  '#4CAF50',  '#FF9800',  '#9C27B0' ];
  const colorIdx  = (customerName?.charCodeAt(0) || 0) % 5;

  const totalRevenue = orders
    .filter(o => o.status === 'confirmed' || o.status === 'partially_dispatched' || o.status === 'fully_fulfilled')
    .reduce((sum, o) => sum + (o.grand_total || 0), 0);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {customerName || 'Customer'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Avatar + name */}
        <View style={[s.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.avatar, { backgroundColor: bgColors[colorIdx] }]}>
            <Text style={[s.avatarText, { color: fgColors[colorIdx] }]}>{initial}</Text>
          </View>
          <Text style={[s.companyName, { color: colors.text }]}>{customer?.name || customerName}</Text>
          {customer?.is_company && (
            <View style={[s.companyTag, { backgroundColor: colors.primary + '15' }]}>
              <Icon name="business-outline" size={12} color={colors.primary} />
              <Text style={[s.companyTagText, { color: colors.primary }]}>Company</Text>
            </View>
          )}

          {/* Contact actions */}
          <View style={s.actions}>
            {(customer?.phone || customer?.mobile) && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#4CAF5015' }]}
                onPress={() => Linking.openURL(`tel:${customer.phone || customer.mobile}`)}>
                <Icon name="call-outline" size={18} color="#4CAF50" />
                <Text style={[s.actionLabel, { color: '#4CAF50' }]}>Call</Text>
              </TouchableOpacity>
            )}
            {customer?.email && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#2196F315' }]}
                onPress={() => Linking.openURL(`mailto:${customer.email}`)}>
                <Icon name="mail-outline" size={18} color="#2196F3" />
                <Text style={[s.actionLabel, { color: '#2196F3' }]}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Contact info */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Contact Info</Text>
          {customer?.email && (
            <Row icon="mail-outline" value={customer.email} colors={colors} />
          )}
          {customer?.phone && (
            <Row icon="call-outline" value={customer.phone} colors={colors} />
          )}
          {customer?.mobile && customer.mobile !== customer.phone && (
            <Row icon="phone-portrait-outline" value={customer.mobile} colors={colors} />
          )}
          {(customer?.street || customer?.city) && (
            <Row
              icon="location-outline"
              value={[customer.street, customer.street2, customer.city].filter(Boolean).join(', ')}
              colors={colors}
            />
          )}
          {!customer?.email && !customer?.phone && !customer?.street && (
            <Text style={[s.noInfo, { color: colors.textSecondary }]}>No contact info available</Text>
          )}
        </View>

        {/* Revenue summary */}
        {orders.length > 0 && (
          <View style={[s.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Stat label="Total Orders" value={String(orders.length)} colors={colors} />
            <View style={[s.statDivider, { backgroundColor: colors.border }]} />
            <Stat
              label="Confirmed Revenue"
              value={`₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              colors={colors}
            />
          </View>
        )}

        {/* Orders list */}
        <Text style={[s.ordersTitle, { color: colors.text }]}>Orders & Quotations</Text>
        {orders.length === 0 ? (
          <View style={[s.emptyOrders, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="receipt-outline" size={36} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No orders yet</Text>
          </View>
        ) : (
          orders.map(order => {
            const cfg    = STATE_CONFIG[order.status] || STATE_CONFIG.draft;
            const amount = `₹${Number(order.grand_total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
            const date   = order.order_date
              ? new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
              : '';
            return (
              <TouchableOpacity
                key={order.id}
                style={[s.orderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate('SaleDetail', { orderId: order.id, orderName: order.so_number || `SO #${order.id}` })}
                activeOpacity={0.75}>
                <View style={s.orderTop}>
                  <Text style={[s.orderName, { color: colors.text }]}>{order.name}</Text>
                  <View style={[s.stateBadge, { backgroundColor: cfg.color + '20' }]}>
                    <Text style={[s.stateText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                <View style={s.orderBottom}>
                  <Text style={[s.orderAmount, { color: colors.primary }]}>{amount}</Text>
                  {date && <Text style={[s.orderDate, { color: colors.textSecondary }]}>{date}</Text>}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const Row = ({ icon, value, colors }) => (
  <View style={s.row}>
    <Icon name={icon} size={15} color={colors.textSecondary} />
    <Text style={[s.rowValue, { color: colors.textSecondary }]}>{value}</Text>
  </View>
);

const Stat = ({ label, value, colors }) => (
  <View style={s.stat}>
    <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
    <Text style={[s.statLabel, { color: colors.textSecondary }]}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  container:      { flex: 1 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  backBtn:        { padding: 4 },
  headerTitle:    { flex: 1, fontSize: 18, fontWeight: '700' },
  scroll:         { padding: 12, paddingBottom: 100, gap: 12 },

  profileCard:    { borderRadius: 14, padding: 20, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', gap: 8 },
  avatar:         { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText:     { fontSize: 28, fontWeight: '700' },
  companyName:    { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  companyTag:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  companyTagText: { fontSize: 12, fontWeight: '600' },
  actions:        { flexDirection: 'row', gap: 12, marginTop: 4 },
  actionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  actionLabel:    { fontSize: 14, fontWeight: '600' },

  section:        { borderRadius: 12, padding: 14, borderWidth: StyleSheet.hairlineWidth, gap: 10 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  row:            { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  rowValue:       { flex: 1, fontSize: 13, lineHeight: 18 },
  noInfo:         { fontSize: 13, fontStyle: 'italic' },

  statsRow:       { flexDirection: 'row', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  stat:           { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 2 },
  statValue:      { fontSize: 17, fontWeight: '700' },
  statLabel:      { fontSize: 11, textAlign: 'center' },
  statDivider:    { width: StyleSheet.hairlineWidth },

  ordersTitle:    { fontSize: 15, fontWeight: '700', marginTop: 4 },
  emptyOrders:    { borderRadius: 12, padding: 32, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', gap: 8 },
  emptyText:      { fontSize: 14 },
  orderCard:      { borderRadius: 12, padding: 12, borderWidth: StyleSheet.hairlineWidth, gap: 6 },
  orderTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderName:      { fontSize: 14, fontWeight: '600' },
  stateBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  stateText:      { fontSize: 11, fontWeight: '600' },
  orderBottom:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderAmount:    { fontSize: 15, fontWeight: '700' },
  orderDate:      { fontSize: 12 },
});

export default CustomerDetailScreen;
