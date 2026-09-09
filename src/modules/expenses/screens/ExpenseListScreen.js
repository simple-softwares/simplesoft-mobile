import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../theme/ThemeContext';
import expenseService, { EXPENSE_STATES, EXPENSE_TYPES, fmtINR, fmtDate } from '../expenseService';

const FILTERS = [
  { key: null,        label: 'All'       },
  { key: 'draft',     label: 'Draft'     },
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved',  label: 'Approved'  },
  { key: 'paid',      label: 'Paid'      },
  { key: 'rejected',  label: 'Rejected'  },
];

function ExpenseCard({ expense, onPress, colors }) {
  const st   = EXPENSE_STATES[expense.state] || EXPENSE_STATES.draft;
  const type = EXPENSE_TYPES[expense.expense_type] || EXPENSE_TYPES.reimbursement;

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.78}>
      <View style={[s.accent, { backgroundColor: st.color }]} />
      <View style={[s.typeIcon, { backgroundColor: type.color + '15' }]}>
        <Icon name={type.icon} size={18} color={type.color} />
      </View>
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={[s.expNum, { color: colors.text }]}>{expense.expense_number}</Text>
          <View style={[s.badge, { backgroundColor: st.bg }]}>
            <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
        <Text style={[s.desc, { color: colors.textSecondary }]} numberOfLines={1}>
          {expense.description}
        </Text>
        {expense.category_name && (
          <Text style={[s.category, { color: colors.textLight }]}>{expense.category_name}</Text>
        )}
        <View style={s.cardFoot}>
          <Text style={[s.amount, { color: colors.primary }]}>{fmtINR(expense.total_amount)}</Text>
          <Text style={[s.date, { color: colors.textLight }]}>{fmtDate(expense.expense_date)}</Text>
        </View>
      </View>
      <Icon name="chevron-forward" size={16} color={colors.textLight} />
    </TouchableOpacity>
  );
}

export default function ExpenseListScreen({ navigation }) {
  const { colors } = useTheme();
  const [expenses,    setExpenses]   = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [refreshing,  setRefreshing] = useState(false);
  const [search,      setSearch]     = useState('');
  const [stateFilter, setFilter]     = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const data = await expenseService.listExpenses({ state: stateFilter });
    setExpenses(data);
    setLoading(false);
    setRefreshing(false);
  }, [stateFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visible = expenses.filter(exp =>
    !search ||
    exp.expense_number?.toLowerCase().includes(search.toLowerCase()) ||
    exp.description?.toLowerCase().includes(search.toLowerCase()) ||
    exp.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
    exp.category_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = visible.reduce((s, e) => s + (e.total_amount || 0), 0);

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[s.title, { color: colors.text }]}>Expenses</Text>
        </View>
        <View style={s.headerRight}>
          <View style={[s.summaryBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[s.summaryText, { color: colors.primary }]}>{fmtINR(totalAmount)}</Text>
          </View>
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('NewExpense')}>
            <Icon name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Icon name="search-outline" size={16} color={colors.textLight} style={s.searchIcon} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search expenses…"
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
            const active = stateFilter === f.key;
            const st = f.key ? EXPENSE_STATES[f.key] : null;
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

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />
          }
          renderItem={({ item }) => (
            <ExpenseCard
              expense={item}
              colors={colors}
              onPress={() => navigation.navigate('ExpenseDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Icon name="receipt-outline" size={48} color={colors.textLight} />
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No expenses found</Text>
              <TouchableOpacity
                style={[s.emptyBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}
                onPress={() => navigation.navigate('NewExpense')}>
                <Icon name="add" size={14} color={colors.primary} />
                <Text style={[s.emptyBtnText, { color: colors.primary }]}>New Expense</Text>
              </TouchableOpacity>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryBadge:{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  summaryText: { fontSize: 13, fontWeight: '700' },
  addBtn:      { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
                 paddingVertical: 10, borderBottomWidth: 0.5 },
  searchIcon:  { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 2 },
  filterWrap:  { borderBottomWidth: 0.5, paddingVertical: 10 },
  chip:        { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                 borderWidth: 1, borderColor: 'transparent', backgroundColor: '#00000008' },
  chipText:    { fontSize: 12, fontWeight: '600' },
  card:        { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14,
                 marginTop: 10, borderRadius: 14, borderWidth: 1,
                 overflow: 'hidden', shadowColor: '#7C3AED', shadowOpacity: 0.04,
                 shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 1 },
  accent:      { width: 4, alignSelf: 'stretch' },
  typeIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center',
                 justifyContent: 'center', marginHorizontal: 10 },
  cardBody:    { flex: 1, paddingVertical: 12, paddingRight: 4 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  expNum:      { fontSize: 13, fontWeight: '700' },
  badge:       { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText:   { fontSize: 11, fontWeight: '700' },
  desc:        { fontSize: 13, marginBottom: 1 },
  category:    { fontSize: 11, marginBottom: 6 },
  cardFoot:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount:      { fontSize: 15, fontWeight: '800' },
  date:        { fontSize: 11 },
  empty:       { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText:   { fontSize: 15 },
  emptyBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16,
                 paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  emptyBtnText:{ fontSize: 13, fontWeight: '600' },
});
