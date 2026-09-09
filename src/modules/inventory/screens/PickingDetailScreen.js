import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../../theme/ThemeContext';
import inventoryService, { PICKING_STATE_LABELS, PICKING_TYPE_ICONS } from '../inventoryService';
import { friendlyError } from '../../../utils/errorUtils';

const MoveRow = ({ move, colors }) => {
  const done  = move.quantity || 0;
  const total = move.product_uom_qty || 0;
  const pct   = total > 0 ? Math.min(done / total, 1) : 0;
  const color = done >= total ? '#4CAF50' : done > 0 ? '#FF9800' : colors.border;

  return (
    <View style={[s.moveRow, { borderBottomColor: colors.border }]}>
      <View style={s.moveInfo}>
        <Text style={[s.moveName, { color: colors.text }]} numberOfLines={1}>
          {move.product_id?.[1] || 'Unknown'}
        </Text>
        <Text style={[s.moveRoute, { color: colors.textSecondary }]} numberOfLines={1}>
          {move.location_id?.[1]} → {move.location_dest_id?.[1]}
        </Text>
      </View>
      <View style={s.moveQty}>
        <Text style={[s.moveQtyText, { color: done >= total ? '#4CAF50' : colors.text }]}>
          {inventoryService.formatQty(done)} / {inventoryService.formatQty(total)}
        </Text>
        <Text style={[s.moveUom, { color: colors.textSecondary }]}>
          {move.product_uom?.[1] || ''}
        </Text>
        <View style={[s.progressBg, { backgroundColor: colors.border }]}>
          <View style={[s.progressFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
};

const PickingDetailScreen = () => {
  const { colors }  = useTheme();
  const navigation  = useNavigation();
  const route       = useRoute();
  const { pickingId, name } = route.params;

  const [picking,    setPicking]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [validating, setValidating] = useState(false);

  const load = () => {
    setLoading(true);
    inventoryService.getPicking(pickingId)
      .then(p => setPicking(p))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [pickingId]);

  const handleValidate = () => {
    Alert.alert('Validate Transfer', `Mark ${name} as done?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Validate', onPress: async () => {
        setValidating(true);
        try {
          await inventoryService.validatePicking(pickingId);
          load();
        } catch (e) {
          Alert.alert('Error', friendlyError(e));
        } finally {
          setValidating(false);
        }
      }},
    ]);
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!picking) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Icon name="swap-horizontal-outline" size={48} color={colors.textLight} />
        <Text style={[s.emptyText, { color: colors.textSecondary }]}>Transfer not found</Text>
      </View>
    );
  }

  const stateInfo = PICKING_STATE_LABELS[picking.state] || { label: picking.state, color: '#9E9E9E' };
  const typeCode  = picking.picking_type_code;
  const typeIcon  = PICKING_TYPE_ICONS[typeCode] || 'swap-horizontal-outline';
  const typeColor = typeCode === 'incoming' ? '#4CAF50' : typeCode === 'outgoing' ? '#F44336' : '#2196F3';
  const canValidate = ['assigned', 'confirmed'].includes(picking.state);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>{name}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Hero */}
        <View style={[s.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.heroIcon, { backgroundColor: typeColor + '15' }]}>
            <Icon name={typeIcon} size={30} color={typeColor} />
          </View>
          <View style={s.heroText}>
            <Text style={[s.heroName, { color: colors.text }]}>{picking.name}</Text>
            {picking.origin ? (
              <Text style={[s.heroOrigin, { color: colors.textSecondary }]}>Origin: {picking.origin}</Text>
            ) : null}
          </View>
          <View style={[s.stateBadge, { backgroundColor: stateInfo.color + '20' }]}>
            <Text style={[s.stateText, { color: stateInfo.color }]}>{stateInfo.label}</Text>
          </View>
        </View>

        {/* Info section */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>DETAILS</Text>
          {picking.partner_id && (
            <View style={[s.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[s.infoLabel, { color: colors.textSecondary }]}>Partner</Text>
              <Text style={[s.infoValue, { color: colors.text }]}>{picking.partner_id[1]}</Text>
            </View>
          )}
          {picking.picking_type_id && (
            <View style={[s.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[s.infoLabel, { color: colors.textSecondary }]}>Operation Type</Text>
              <Text style={[s.infoValue, { color: colors.text }]}>{picking.picking_type_id[1]}</Text>
            </View>
          )}
          <View style={[s.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[s.infoLabel, { color: colors.textSecondary }]}>Scheduled Date</Text>
            <Text style={[s.infoValue, { color: colors.text }]}>
              {inventoryService.formatDate(picking.scheduled_date || picking.date)}
            </Text>
          </View>
          {picking.date_done && (
            <View style={[s.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[s.infoLabel, { color: colors.textSecondary }]}>Done Date</Text>
              <Text style={[s.infoValue, { color: '#4CAF50' }]}>
                {inventoryService.formatDate(picking.date_done)}
              </Text>
            </View>
          )}
          {picking.note ? (
            <View style={[s.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[s.infoLabel, { color: colors.textSecondary }]}>Note</Text>
              <Text style={[s.infoValue, { color: colors.text, flex: 1 }]}>{picking.note}</Text>
            </View>
          ) : null}
        </View>

        {/* Moves */}
        {picking.moves?.length > 0 && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>
              PRODUCTS ({picking.moves.length})
            </Text>
            {picking.moves.map(move => (
              <MoveRow key={move.id} move={move} colors={colors} />
            ))}
          </View>
        )}

        {/* Validate button */}
        {canValidate && (
          <TouchableOpacity
            style={[s.validateBtn, { backgroundColor: '#4CAF50', opacity: validating ? 0.7 : 1 }]}
            onPress={handleValidate}
            disabled={validating}>
            {validating
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Icon name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={s.validateText}>Validate Transfer</Text>
                </>}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container:    { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText:    { fontSize: 15 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:      { padding: 2 },
  headerTitle:  { fontSize: 18, fontWeight: '600', flex: 1 },
  scroll:       { padding: 12, paddingBottom: 100, gap: 12 },
  hero:         { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth },
  heroIcon:     { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heroText:     { flex: 1, gap: 3 },
  heroName:     { fontSize: 16, fontWeight: '700' },
  heroOrigin:   { fontSize: 12 },
  stateBadge:   { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  stateText:    { fontSize: 12, fontWeight: '700' },
  section:      { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  infoLabel:    { fontSize: 13 },
  infoValue:    { fontSize: 14, fontWeight: '500', textAlign: 'right' },
  moveRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  moveInfo:     { flex: 1 },
  moveName:     { fontSize: 13, fontWeight: '600' },
  moveRoute:    { fontSize: 11 },
  moveQty:      { alignItems: 'flex-end', gap: 2 },
  moveQtyText:  { fontSize: 14, fontWeight: '700' },
  moveUom:      { fontSize: 10 },
  progressBg:   { width: 60, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  validateBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14 },
  validateText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default PickingDetailScreen;
