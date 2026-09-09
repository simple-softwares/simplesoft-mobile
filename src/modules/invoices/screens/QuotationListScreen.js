import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../theme/ThemeContext';
import invoiceService, { QUOTATION_STATES, fmtINR, fmtDate } from '../invoiceService';

const FILTERS = [
  { key: null,       label: 'All'      },
  { key: 'draft',    label: 'Draft'    },
  { key: 'sent',     label: 'Sent'     },
  { key: 'accepted', label: 'Accepted' },
  { key: 'invoiced', label: 'Invoiced' },
];

function QuoteCard({ quote, onPress, colors }) {
  const st   = QUOTATION_STATES[quote.state] || QUOTATION_STATES.draft;
  const date = fmtDate(quote.quote_date);
  const exp  = fmtDate(quote.valid_until);

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.78}>
      <View style={[s.accent, { backgroundColor: st.color }]} />
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={[s.qNum, { color: colors.text }]}>{quote.quote_number}</Text>
          <View style={[s.badge, { backgroundColor: st.bg }]}>
            <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
        {quote.customer_name && (
          <Text style={[s.customer, { color: colors.textSecondary }]} numberOfLines={1}>
            {quote.customer_name}
          </Text>
        )}
        <View style={s.cardFoot}>
          <Text style={[s.amount, { color: colors.primary }]}>{fmtINR(quote.total_amount)}</Text>
          <View style={s.metaCol}>
            {exp && <Text style={[s.meta, { color: colors.textLight }]}>Valid till {exp}</Text>}
            {date && !exp && <Text style={[s.meta, { color: colors.textLight }]}>{date}</Text>}
          </View>
        </View>
      </View>
      <Icon name="chevron-forward" size={16} color={colors.textLight} />
    </TouchableOpacity>
  );
}

export default function QuotationListScreen({ navigation }) {
  const { colors } = useTheme();
  const [quotes,     setQuotes]    = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]    = useState('');
  const [stateFilter, setFilter]   = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const data = await invoiceService.listQuotations({ state: stateFilter });
    setQuotes(data);
    setLoading(false);
    setRefreshing(false);
  }, [stateFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visible = quotes.filter(q =>
    !search ||
    q.quote_number?.toLowerCase().includes(search.toLowerCase()) ||
    q.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.title, { color: colors.text }]}>Quotations</Text>
        <View style={[s.countBadge, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[s.countText, { color: colors.primary }]}>{visible.length}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Icon name="search-outline" size={16} color={colors.textLight} style={s.searchIcon} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search quotations…"
          placeholderTextColor={colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close-circle" size={16} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
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

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={q => String(q.id)}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />}
          renderItem={({ item }) => (
            <QuoteCard
              quote={item}
              colors={colors}
              onPress={() => navigation.navigate('QuotationDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Icon name="document-text-outline" size={48} color={colors.textLight} />
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No quotations found</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('NewQuotation')}
        activeOpacity={0.85}>
        <Icon name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14, borderBottomWidth: 0.5 },
  title:      { fontSize: 20, fontWeight: '800' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  countText:  { fontSize: 13, fontWeight: '700' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
                paddingVertical: 10, borderBottomWidth: 0.5 },
  searchIcon: { marginRight: 8 },
  searchInput:{ flex: 1, fontSize: 14, paddingVertical: 2 },
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
  qNum:       { fontSize: 14, fontWeight: '700' },
  badge:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  customer:   { fontSize: 13, marginBottom: 8 },
  cardFoot:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount:     { fontSize: 15, fontWeight: '800' },
  metaCol:    { alignItems: 'flex-end' },
  meta:       { fontSize: 11 },
  empty:      { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText:  { fontSize: 15 },
  fab:        { position: 'absolute', bottom: 90, right: 20, width: 56, height: 56,
                borderRadius: 28, alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 },
                shadowRadius: 8, elevation: 6 },
});
