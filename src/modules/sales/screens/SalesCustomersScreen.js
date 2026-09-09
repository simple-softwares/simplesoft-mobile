import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import salesService from '../salesService';

const CustomerCard = ({ customer, onPress, colors }) => {
  const initial = customer.name?.[0]?.toUpperCase() || '?';
  const bgColors = ['#E91E6320','#2196F320','#4CAF5020','#FF980020','#9C27B020'];
  const fgColors = ['#E91E63',  '#2196F3',  '#4CAF50',  '#FF9800',  '#9C27B0' ];
  const idx      = customer.name?.charCodeAt(0) % 5 || 0;

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}>
      <View style={[s.avatar, { backgroundColor: bgColors[idx] }]}>
        <Text style={[s.avatarText, { color: fgColors[idx] }]}>{initial}</Text>
      </View>
      <View style={s.info}>
        <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>{customer.name}</Text>
        {customer.email && (
          <Text style={[s.sub, { color: colors.textSecondary }]} numberOfLines={1}>
            <Icon name="mail-outline" size={11} /> {customer.email}
          </Text>
        )}
        {(customer.phone || customer.mobile) && (
          <Text style={[s.sub, { color: colors.textSecondary }]} numberOfLines={1}>
            <Icon name="call-outline" size={11} /> {customer.phone || customer.mobile}
          </Text>
        )}
      </View>
      {customer.is_company && (
        <View style={[s.companyBadge, { backgroundColor: colors.primary + '15' }]}>
          <Icon name="business-outline" size={12} color={colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const SalesCustomersScreen = ({ navigation }) => {
  const { colors } = useTheme();

  const [customers,  setCustomers]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [searching,  setSearching]  = useState(false);

  const fetchCustomers = useCallback(async (q = '', isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else if (!q) setLoading(true);
    try {
      const data = await salesService.getCustomers({ search: q });
      setCustomers(data || []);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSearching(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, []);

  // Debounce search
  useEffect(() => {
    setSearching(true);
    const t = setTimeout(() => fetchCustomers(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  if (loading) {
    return <View style={[s.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Customers</Text>
      </View>

      <FlatList
        data={customers}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <CustomerCard
            customer={item}
            colors={colors}
            onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id, customerName: item.name })}
          />
        )}
        ListHeaderComponent={
          <View style={[s.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Icon name="search-outline" size={17} color={colors.textSecondary} />
            <TextInput
              style={[s.searchInput, { color: colors.text }]}
              placeholder="Search customers..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            {searching
              ? <ActivityIndicator size="small" color={colors.primary} />
              : search
                ? <TouchableOpacity onPress={() => setSearch('')}>
                    <Icon name="close-circle" size={17} color={colors.textSecondary} />
                  </TouchableOpacity>
                : null}
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchCustomers('', true)} colors={[colors.primary]} />}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name="people-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No customers found</Text>
          </View>
        }
      />
    </View>
  );
};

const s = StyleSheet.create({
  container:    { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:       { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:  { fontSize: 20, fontWeight: '700' },
  list:         { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 100 },
  searchBar:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10 },
  searchInput:  { flex: 1, fontSize: 14, padding: 0 },
  card:         { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  avatar:       { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 18, fontWeight: '700' },
  info:         { flex: 1, gap: 2 },
  name:         { fontSize: 15, fontWeight: '600' },
  sub:          { fontSize: 12 },
  companyBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  empty:        { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:    { fontSize: 15 },
});

export default SalesCustomersScreen;
