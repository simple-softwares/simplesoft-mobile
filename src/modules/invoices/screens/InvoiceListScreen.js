import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../theme/ThemeContext';
import invoiceService, { INVOICE_STATES, fmtINR, fmtDate } from '../invoiceService';

const FILTERS = [
  { key: null,      label: 'All'     },
  { key: 'draft',   label: 'Draft'   },
  { key: 'sent',    label: 'Sent'    },
  { key: 'paid',    label: 'Paid'    },
  { key: 'overdue', label: 'Overdue' },
];

function InvoiceCard({ invoice, onPress, colors }) {
  const st   = INVOICE_STATES[invoice.state] || INVOICE_STATES.draft;
  const date = fmtDate(invoice.invoice_date);
  const due  = fmtDate(invoice.due_date);

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.78}>
      <View style={[s.accent, { backgroundColor: st.color }]} />
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={[s.invNum, { color: colors.text }]}>{invoice.invoice_number}</Text>
          <View style={[s.badge, { backgroundColor: st.bg }]}>
            <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
        {invoice.customer_name && (
          <Text style={[s.customer, { color: colors.textSecondary }]} numberOfLines={1}>
            {invoice.customer_name}
          </Text>
        )}
        <View style={s.cardFoot}>
          <Text style={[s.amount, { color: colors.success || '#10B981' }]}>{fmtINR(invoice.total_amount)}</Text>
          <View style={s.metaRow}>
            {due && (
              <Text style={[s.meta, { color: invoice.state === 'overdue' ? colors.error : colors.textLight }]}>
                Due {due}
              </Text>
            )}
            {date && !due && (
              <Text style={[s.meta, { color: colors.textLight }]}>{date}</Text>
            )}
          </View>
        </View>
      </View>
      <Icon name="chevron-forward" size={16} color={colors.textLight} />
    </TouchableOpacity>
  );
}

export default function InvoiceListScreen({ navigation }) {
  const { colors } = useTheme();
  const [invoices,   setInvoices]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [stateFilter, setFilter]    = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const data = await invoiceService.listInvoices({ state: stateFilter });
    setInvoices(data);
    setLoading(false);
    setRefreshing(false);
  }, [stateFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visible = invoices.filter(inv =>
    !search ||
    inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = visible.reduce((s, i) => s + (i.total_amount || 0), 0);

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.title, { color: colors.text }]}>Invoices</Text>
        <View style={[s.summaryBadge, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[s.summaryText, { color: colors.primary }]}>{fmtINR(totalAmount)}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Icon name="search-outline" size={16} color={colors.textLight} style={s.searchIcon} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search invoices…"
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
      <View style={[s.filterRow, { borderBottomColor: colors.border }]}>
        {FILTERS.map(f => {
          const active = stateFilter === f.key;
          return (
            <TouchableOpacity
              key={String(f.key)}
              style={[s.chip, active && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
              onPress={() => setFilter(f.key)}>
              <Text style={[s.chipText, { color: active ? colors.primary : colors.textSecondary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />}
          renderItem={({ item }) => (
            <InvoiceCard
              invoice={item}
              colors={colors}
              onPress={() => navigation.navigate('InvoiceDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Icon name="receipt-outline" size={48} color={colors.textLight} />
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No invoices found</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('NewInvoice')}
        activeOpacity={0.85}>
        <Icon name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14,
                borderBottomWidth: 0.5 },
  title:      { fontSize: 20, fontWeight: '800' },
  summaryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  summaryText:  { fontSize: 13, fontWeight: '700' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
                paddingVertical: 10, borderBottomWidth: 0.5 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 2 },
  filterRow:  { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10,
                gap: 8, borderBottomWidth: 0.5 },
  chip:       { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                borderWidth: 1, borderColor: 'transparent', backgroundColor: '#00000008' },
  chipText:   { fontSize: 12, fontWeight: '600' },
  card:       { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14,
                marginTop: 10, borderRadius: 14, borderWidth: 1,
                overflow: 'hidden', shadowColor: '#7C3AED', shadowOpacity: 0.04,
                shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 1 },
  accent:     { width: 4, alignSelf: 'stretch' },
  cardBody:   { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  cardTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  invNum:     { fontSize: 14, fontWeight: '700' },
  badge:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  customer:   { fontSize: 13, marginBottom: 8 },
  cardFoot:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount:     { fontSize: 15, fontWeight: '800' },
  metaRow:    { alignItems: 'flex-end' },
  meta:       { fontSize: 11 },
  empty:      { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText:  { fontSize: 15 },
  fab:        { position: 'absolute', bottom: 90, right: 20, width: 56, height: 56,
                borderRadius: 28, alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 },
                shadowRadius: 8, elevation: 6 },
});
