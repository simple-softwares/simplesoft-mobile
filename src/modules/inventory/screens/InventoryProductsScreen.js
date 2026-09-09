import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../theme/ThemeContext';
import { useFeatureAccess } from '../../../hooks/useFeatureAccess';
import UpgradePrompt from '../../../components/UpgradePrompt';
import inventoryService from '../inventoryService';

const ProductCard = ({ product, colors, onPress }) => {
  const qty       = product.qty_available || 0;
  const stockCol  = inventoryService.stockColor(qty);
  const ref       = product.default_code;

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[s.iconBox, { backgroundColor: '#FF980015' }]}>
        <Icon name="cube-outline" size={22} color="#FF9800" />
      </View>
      <View style={s.info}>
        <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>{product.name}</Text>
        <View style={s.metaRow}>
          {ref ? <Text style={[s.ref, { color: colors.textSecondary }]}>[{ref}]</Text> : null}
          <Text style={[s.categ, { color: colors.textSecondary }]} numberOfLines={1}>
            {product.categ_id?.[1] || 'Uncategorised'}
          </Text>
        </View>
      </View>
      <View style={s.right}>
        <Text style={[s.qty, { color: stockCol }]}>{inventoryService.formatQty(qty)}</Text>
        <Text style={[s.qtyLabel, { color: stockCol }]}>on hand</Text>
      </View>
    </TouchableOpacity>
  );
};

const InventoryProductsScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { hasAccess, upgradePrompt, closePrompt } = useFeatureAccess();

  const [products,    setProducts]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [search,      setSearch]      = useState('');
  const [categFilter, setCategFilter] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        inventoryService.getProducts({}),
        inventoryService.getCategories(),
      ]);
      setProducts(prods || []);
      setCategories(cats || []);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  if (!hasAccess('inventory')) {
    return <UpgradePrompt {...upgradePrompt} onClose={closePrompt} />;
  }

  const visible = products
    .filter(p => !categFilter || p.categ_id?.[0] === categFilter)
    .filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase())
                          || p.default_code?.toLowerCase().includes(search.toLowerCase()));

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
        <Text style={[s.headerTitle, { color: colors.text }]}>Products</Text>
        <Text style={[s.headerSub, { color: colors.textSecondary }]}>{products.length} items</Text>
        <TouchableOpacity
          style={[s.scanBtn, { backgroundColor: '#FF9800' }]}
          onPress={() => navigation.navigate('BarcodeScanner')}>
          <Icon name="scan-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={visible}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            colors={colors}
            onPress={() => navigation.navigate('ProductDetail', { productId: item.id, name: item.name })}
          />
        )}
        ListHeaderComponent={
          <View style={s.listHeader}>
            <View style={[s.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Icon name="search-outline" size={17} color={colors.textSecondary} />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                placeholder="Search products or ref..."
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
            {categories.length > 0 && (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[{ id: null, name: 'All' }, ...categories]}
                keyExtractor={item => String(item.id ?? 'all')}
                renderItem={({ item: cat }) => {
                  const active = categFilter === cat.id;
                  return (
                    <TouchableOpacity
                      style={[s.pill, {
                        backgroundColor: active ? '#FF9800' : colors.inputBackground,
                        borderColor: active ? '#FF9800' : colors.border,
                      }]}
                      onPress={() => setCategFilter(cat.id)}>
                      <Text style={[s.pillText, { color: active ? '#fff' : colors.textSecondary }]}>
                        {cat.name}
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
            <Icon name="cube-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No products found</Text>
          </View>
        }
      />
    </View>
  );
};

const s = StyleSheet.create({
  container:   { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 20, fontWeight: '700', flex: 1 },
  headerSub:   { fontSize: 13 },
  scanBtn:     { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  list:        { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 100 },
  listHeader:  { gap: 10, marginBottom: 4 },
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  pills:       { paddingBottom: 4, gap: 8 },
  pill:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  pillText:    { fontSize: 13, fontWeight: '500' },
  card:        { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  iconBox:     { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  info:        { flex: 1, gap: 3 },
  name:        { fontSize: 14, fontWeight: '600' },
  metaRow:     { flexDirection: 'row', gap: 6, alignItems: 'center' },
  ref:         { fontSize: 11, fontWeight: '500' },
  categ:       { fontSize: 11, flex: 1 },
  right:       { alignItems: 'flex-end' },
  qty:         { fontSize: 18, fontWeight: '800' },
  qtyLabel:    { fontSize: 10, fontWeight: '600' },
  empty:       { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:   { fontSize: 15 },
});

export default InventoryProductsScreen;
