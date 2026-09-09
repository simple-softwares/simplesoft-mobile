import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import inventoryService from '../inventoryService';

const QuantCard = ({ quant, colors }) => {
  const qty       = quant.quantity || 0;
  const reserved  = quant.reserved_quantity || 0;
  const available = qty - reserved;
  const color     = inventoryService.stockColor(available);

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[s.colorBar, { backgroundColor: color }]} />
      <View style={s.body}>
        <View style={s.topRow}>
          <Text style={[s.productName, { color: colors.text }]} numberOfLines={1}>
            {quant.product_id?.[1] || 'Unknown'}
          </Text>
          <Text style={[s.qtyNum, { color: color }]}>{inventoryService.formatQty(qty)}</Text>
        </View>
        <View style={s.bottomRow}>
          <View style={s.locRow}>
            <Icon name="location-outline" size={12} color={colors.textSecondary} />
            <Text style={[s.locText, { color: colors.textSecondary }]} numberOfLines={1}>
              {quant.location_id?.[1] || '—'}
            </Text>
          </View>
          {reserved > 0 ? (
            <Text style={[s.reserved, { color: colors.textSecondary }]}>
              {inventoryService.formatQty(reserved)} reserved
            </Text>
          ) : (
            <Text style={[s.available, { color: color }]}>all available</Text>
          )}
        </View>
        {quant.lot_id ? (
          <Text style={[s.lot, { color: colors.textSecondary }]}>Lot: {quant.lot_id[1]}</Text>
        ) : null}
      </View>
    </View>
  );
};

const InventoryStockScreen = () => {
  const { colors } = useTheme();

  const [quants,    setQuants]    = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [search,    setSearch]    = useState('');
  const [locFilter, setLocFilter] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [qnts, locs] = await Promise.all([
        inventoryService.getStockQuants({}),
        inventoryService.getLocations(),
      ]);
      setQuants(qnts   || []);
      setLocations(locs || []);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  // Internal locations only for filter
  const internalLocs = locations.filter(l => l.usage === 'internal');

  const visible = quants
    .filter(q => !locFilter || q.location_id?.[0] === locFilter)
    .filter(q => !search  || q.product_id?.[1]?.toLowerCase().includes(search.toLowerCase()));

  // Summary
  const totalLines    = visible.length;
  const lowStockCount = visible.filter(q => inventoryService.stockColor(q.quantity - q.reserved_quantity) === '#F44336').length;

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Stock</Text>
        <Text style={[s.headerSub, { color: colors.textSecondary }]}>{totalLines} lines</Text>
      </View>

      <FlatList
        data={visible}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <QuantCard quant={item} colors={colors} />}
        ListHeaderComponent={
          <View style={s.listHeader}>
            {/* Summary cards */}
            <View style={s.summaryRow}>
              <View style={[s.summaryCard, { backgroundColor: '#4CAF5015', borderColor: '#4CAF5030' }]}>
                <Icon name="layers-outline" size={20} color="#4CAF50" />
                <Text style={[s.summaryNum, { color: '#4CAF50' }]}>{totalLines}</Text>
                <Text style={[s.summaryLabel, { color: '#4CAF50' }]}>Stock Lines</Text>
              </View>
              <View style={[s.summaryCard, { backgroundColor: '#F4433615', borderColor: '#F4433630' }]}>
                <Icon name="warning-outline" size={20} color="#F44336" />
                <Text style={[s.summaryNum, { color: '#F44336' }]}>{lowStockCount}</Text>
                <Text style={[s.summaryLabel, { color: '#F44336' }]}>Out of Stock</Text>
              </View>
            </View>

            {/* Search */}
            <View style={[s.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Icon name="search-outline" size={17} color={colors.textSecondary} />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                placeholder="Search product..."
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Icon name="close-circle" size={17} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Location filter pills */}
            {internalLocs.length > 0 && (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[{ id: null, complete_name: 'All Locations' }, ...internalLocs]}
                keyExtractor={item => String(item.id ?? 'all')}
                renderItem={({ item: loc }) => {
                  const active = locFilter === loc.id;
                  return (
                    <TouchableOpacity
                      style={[s.pill, {
                        backgroundColor: active ? colors.primary : colors.inputBackground,
                        borderColor: active ? colors.primary : colors.border,
                      }]}
                      onPress={() => setLocFilter(loc.id)}>
                      <Text style={[s.pillText, { color: active ? '#fff' : colors.textSecondary }]}>
                        {loc.complete_name || loc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={s.pills}
              />
            )}
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />
        }
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name="layers-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No stock records</Text>
          </View>
        }
      />
    </View>
  );
};

const s = StyleSheet.create({
  container:    { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:  { fontSize: 20, fontWeight: '700', flex: 1 },
  headerSub:    { fontSize: 13 },
  list:         { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 100 },
  listHeader:   { gap: 10, marginBottom: 4 },
  summaryRow:   { flexDirection: 'row', gap: 10 },
  summaryCard:  { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 4 },
  summaryNum:   { fontSize: 26, fontWeight: '800' },
  summaryLabel: { fontSize: 11, fontWeight: '600' },
  searchBar:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  searchInput:  { flex: 1, fontSize: 14, padding: 0 },
  pills:        { paddingBottom: 4, gap: 8 },
  pill:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  pillText:     { fontSize: 12, fontWeight: '500' },
  card:         { flexDirection: 'row', borderRadius: 12, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  colorBar:     { width: 4 },
  body:         { flex: 1, padding: 12, gap: 5 },
  topRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productName:  { flex: 1, fontSize: 14, fontWeight: '600', marginRight: 8 },
  qtyNum:       { fontSize: 20, fontWeight: '800' },
  bottomRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  locText:      { fontSize: 11, flex: 1 },
  reserved:     { fontSize: 11 },
  available:    { fontSize: 11, fontWeight: '600' },
  lot:          { fontSize: 11 },
  empty:        { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:    { fontSize: 15 },
});

export default InventoryStockScreen;
