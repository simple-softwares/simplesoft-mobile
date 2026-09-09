import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../theme/ThemeContext';
import inventoryService, { PICKING_STATE_LABELS, PICKING_TYPE_ICONS } from '../inventoryService';

const TYPE_FILTERS = [
  { key: null,       label: 'All',      icon: 'grid-outline'              },
  { key: 'incoming', label: 'Incoming', icon: 'arrow-down-circle-outline' },
  { key: 'outgoing', label: 'Outgoing', icon: 'arrow-up-circle-outline'   },
  { key: 'internal', label: 'Internal', icon: 'swap-horizontal-outline'   },
];

const PickingCard = ({ picking, colors, onPress }) => {
  const state   = PICKING_STATE_LABELS[picking.state] || { label: picking.state, color: '#9E9E9E' };
  const typeCode = picking.picking_type_code;
  const typeIcon = PICKING_TYPE_ICONS[typeCode] || 'swap-horizontal-outline';
  const typeColor = typeCode === 'incoming' ? '#4CAF50' : typeCode === 'outgoing' ? '#F44336' : '#2196F3';
  const date    = picking.date_done
    ? inventoryService.formatDate(picking.date_done)
    : inventoryService.formatDate(picking.scheduled_date || picking.date);

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[s.typeIcon, { backgroundColor: typeColor + '15' }]}>
        <Icon name={typeIcon} size={22} color={typeColor} />
      </View>
      <View style={s.info}>
        <Text style={[s.pickingName, { color: colors.text }]}>{picking.name}</Text>
        <View style={s.metaRow}>
          {picking.origin ? (
            <Text style={[s.origin, { color: colors.textSecondary }]} numberOfLines={1}>
              {picking.origin}
            </Text>
          ) : null}
          {picking.partner_id ? (
            <Text style={[s.partner, { color: colors.textSecondary }]} numberOfLines={1}>
              {picking.partner_id[1]}
            </Text>
          ) : null}
        </View>
        <Text style={[s.date, { color: colors.textSecondary }]}>{date}</Text>
      </View>
      <View style={[s.stateBadge, { backgroundColor: state.color + '20' }]}>
        <Text style={[s.stateText, { color: state.color }]}>{state.label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const InventoryMovesScreen = () => {
  const { colors }  = useTheme();
  const navigation  = useNavigation();

  const [pickings,   setPickings]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState(null);
  const [stateFilter,setStateFilter]= useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await inventoryService.getPickings({
        typeCode: typeFilter,
        state:    stateFilter,
      });
      setPickings(data || []);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [typeFilter, stateFilter]);

  useEffect(() => { load(); }, [load]);

  // State filter tabs
  const STATE_TABS = [
    { key: null,      label: 'All'      },
    { key: 'assigned',label: 'Ready'    },
    { key: 'done',    label: 'Done'     },
    { key: 'cancel',  label: 'Cancelled'},
  ];

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
        <Text style={[s.headerTitle, { color: colors.text }]}>Transfers</Text>
        <Text style={[s.headerSub, { color: colors.textSecondary }]}>{pickings.length} records</Text>
      </View>

      {/* Type filter */}
      <View style={[s.typeBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TYPE_FILTERS.map(f => {
          const active = typeFilter === f.key;
          return (
            <TouchableOpacity
              key={String(f.key)}
              style={[s.typeBtn, active && { backgroundColor: colors.primary + '15' }]}
              onPress={() => setTypeFilter(f.key)}>
              <Icon name={f.icon} size={16} color={active ? colors.primary : colors.textSecondary} />
              <Text style={[s.typeBtnText, { color: active ? colors.primary : colors.textSecondary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* State tabs */}
      <View style={[s.stateBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {STATE_TABS.map(t => (
          <TouchableOpacity
            key={String(t.key)}
            style={[s.stateTab, stateFilter === t.key && [s.stateTabActive, { borderBottomColor: colors.primary }]]}
            onPress={() => setStateFilter(t.key)}>
            <Text style={[s.stateTabText, { color: stateFilter === t.key ? colors.primary : colors.textSecondary }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={pickings}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <PickingCard
            picking={item}
            colors={colors}
            onPress={() => navigation.navigate('PickingDetail', { pickingId: item.id, name: item.name })}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />
        }
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name="swap-horizontal-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No transfers found</Text>
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
  typeBar:      { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  typeBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: 8 },
  typeBtnText:  { fontSize: 12, fontWeight: '600' },
  stateBar:     { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  stateTab:     { flex: 1, alignItems: 'center', paddingVertical: 9, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  stateTabActive:{},
  stateTabText: { fontSize: 12, fontWeight: '600' },
  list:         { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 100 },
  card:         { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  typeIcon:     { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  info:         { flex: 1, gap: 3 },
  pickingName:  { fontSize: 14, fontWeight: '700' },
  metaRow:      { flexDirection: 'row', gap: 6 },
  origin:       { fontSize: 11, flex: 1 },
  partner:      { fontSize: 11, flex: 1 },
  date:         { fontSize: 11 },
  stateBadge:   { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, alignSelf: 'center' },
  stateText:    { fontSize: 11, fontWeight: '700' },
  empty:        { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:    { fontSize: 15 },
});

export default InventoryMovesScreen;
