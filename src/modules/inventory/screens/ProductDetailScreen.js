import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../../theme/ThemeContext';
import inventoryService from '../inventoryService';

const StatCard = ({ icon, label, value, color, colors }) => (
  <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Icon name={icon} size={20} color={color} />
    <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
    <Text style={[s.statLabel, { color: colors.textSecondary }]}>{label}</Text>
  </View>
);

const Section = ({ title, colors, children }) => (
  <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{title.toUpperCase()}</Text>
    {children}
  </View>
);

const Row = ({ label, value, colors }) => {
  if (!value && value !== 0) return null;
  return (
    <View style={[s.row, { borderBottomColor: colors.border }]}>
      <Text style={[s.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[s.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
};

const QuantRow = ({ quant, colors }) => {
  const qty       = quant.quantity || 0;
  const reserved  = quant.reserved_quantity || 0;
  const available = qty - reserved;
  const color     = inventoryService.stockColor(available);

  return (
    <View style={[s.quantRow, { borderBottomColor: colors.border }]}>
      <View style={s.quantInfo}>
        <Text style={[s.quantLoc, { color: colors.text }]} numberOfLines={1}>
          {quant.location_id?.[1] || 'Unknown'}
        </Text>
        {quant.lot_id ? (
          <Text style={[s.quantLot, { color: colors.textSecondary }]}>Lot: {quant.lot_id[1]}</Text>
        ) : null}
      </View>
      <View style={s.quantQtys}>
        <Text style={[s.quantOnHand, { color: color }]}>{inventoryService.formatQty(qty)}</Text>
        {reserved > 0 && (
          <Text style={[s.quantReserved, { color: colors.textSecondary }]}>
            {inventoryService.formatQty(reserved)} reserved
          </Text>
        )}
      </View>
    </View>
  );
};

const ProductDetailScreen = () => {
  const { colors }   = useTheme();
  const navigation   = useNavigation();
  const route        = useRoute();
  const { productId, name } = route.params;

  const [product,  setProduct]  = useState(null);
  const [quants,   setQuants]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showQR,   setShowQR]   = useState(false);

  useEffect(() => {
    Promise.all([
      inventoryService.getProduct(productId),
      inventoryService.getStockQuants({ productId }),
    ])
      .then(([prod, qnts]) => { setProduct(prod); setQuants(qnts || []); })
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Icon name="cube-outline" size={48} color={colors.textLight} />
        <Text style={[s.emptyText, { color: colors.textSecondary }]}>Product not found</Text>
      </View>
    );
  }

  const onHand    = product.qty_available    || 0;
  const forecast  = product.virtual_available || 0;
  const totalReserved = quants.reduce((sum, q) => sum + (q.reserved_quantity || 0), 0);
  const available = onHand - totalReserved;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>{name}</Text>
        <TouchableOpacity onPress={() => setShowQR(true)} style={s.qrBtn}>
          <Icon name="qr-code-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Hero */}
        <View style={[s.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.heroIcon, { backgroundColor: '#FF980020' }]}>
            <Icon name="cube-outline" size={36} color="#FF9800" />
          </View>
          <Text style={[s.heroName, { color: colors.text }]}>{product.name}</Text>
          {product.default_code ? (
            <Text style={[s.heroRef, { color: colors.textSecondary }]}>Ref: {product.default_code}</Text>
          ) : null}
          <Text style={[s.heroCateg, { color: colors.textSecondary }]}>
            {product.categ_id?.[1] || 'Uncategorised'}
          </Text>
        </View>

        {/* Stock stats */}
        <View style={s.statsRow}>
          <StatCard icon="layers-outline"  label="On Hand"   value={inventoryService.formatQty(onHand)}    color={inventoryService.stockColor(onHand)}    colors={colors} />
          <StatCard icon="checkmark-circle-outline" label="Available" value={inventoryService.formatQty(available)} color={inventoryService.stockColor(available)} colors={colors} />
          <StatCard icon="analytics-outline" label="Forecast" value={inventoryService.formatQty(forecast)} color="#2196F3" colors={colors} />
        </View>

        {/* Pricing */}
        <Section title="Pricing" colors={colors}>
          <Row label="Sales Price"  value={product.list_price    != null ? `₹ ${Number(product.list_price).toFixed(2)}`    : null} colors={colors} />
          <Row label="Cost"         value={product.standard_price != null ? `₹ ${Number(product.standard_price).toFixed(2)}` : null} colors={colors} />
          <Row label="Unit"         value={product.uom_id?.[1]}    colors={colors} />
        </Section>

        {/* Stock by location */}
        {quants.length > 0 && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>STOCK BY LOCATION</Text>
            {quants.map(q => <QuantRow key={q.id} quant={q} colors={colors} />)}
          </View>
        )}

        {/* Description */}
        {product.description_sale ? (
          <Section title="Description" colors={colors}>
            <Text style={[s.desc, { color: colors.text }]}>{product.description_sale}</Text>
          </Section>
        ) : null}
      </ScrollView>

      {/* QR Code Modal */}
      <Modal visible={showQR} transparent animationType="fade" onRequestClose={() => setShowQR(false)}>
        <TouchableOpacity style={s.qrOverlay} activeOpacity={1} onPress={() => setShowQR(false)}>
          <View style={[s.qrCard, { backgroundColor: colors.surface }]}>
            <Text style={[s.qrTitle, { color: colors.text }]} numberOfLines={2}>{product.name}</Text>
            {product.default_code ? (
              <Text style={[s.qrRef, { color: colors.textSecondary }]}>Ref: {product.default_code}</Text>
            ) : null}
            <View style={[s.qrBox, { backgroundColor: '#fff' }]}>
              <QRCode
                value={product.barcode || product.default_code || String(product.id)}
                size={180}
                color="#000"
                backgroundColor="#fff"
              />
            </View>
            <Text style={[s.qrValue, { color: colors.textSecondary }]}>
              {product.barcode || product.default_code || `ID: ${product.id}`}
            </Text>
            <Text style={[s.qrHint, { color: colors.textLight }]}>Tap anywhere to close</Text>
          </View>
        </TouchableOpacity>
      </Modal>
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
  qrBtn:        { padding: 4 },
  qrOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  qrCard:       { borderRadius: 24, padding: 28, alignItems: 'center', gap: 8, marginHorizontal: 24, maxWidth: 320, width: '100%' },
  qrTitle:      { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  qrRef:        { fontSize: 12 },
  qrBox:        { padding: 16, borderRadius: 16, marginVertical: 8 },
  qrValue:      { fontSize: 13, fontFamily: 'monospace' },
  qrHint:       { fontSize: 11, marginTop: 4 },
  scroll:       { padding: 12, paddingBottom: 100, gap: 12 },
  hero:         { alignItems: 'center', borderRadius: 16, padding: 24, gap: 4, borderWidth: StyleSheet.hairlineWidth },
  heroIcon:     { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  heroName:     { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  heroRef:      { fontSize: 13 },
  heroCateg:    { fontSize: 12 },
  statsRow:     { flexDirection: 'row', gap: 10 },
  statCard:     { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 4 },
  statValue:    { fontSize: 18, fontWeight: '800' },
  statLabel:    { fontSize: 10, fontWeight: '600' },
  section:      { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel:     { fontSize: 13 },
  rowValue:     { fontSize: 14, fontWeight: '600' },
  quantRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  quantInfo:    { flex: 1 },
  quantLoc:     { fontSize: 13, fontWeight: '500' },
  quantLot:     { fontSize: 11 },
  quantQtys:    { alignItems: 'flex-end' },
  quantOnHand:  { fontSize: 16, fontWeight: '700' },
  quantReserved:{ fontSize: 11 },
  desc:         { fontSize: 13, lineHeight: 20, paddingHorizontal: 16, paddingVertical: 12 },
});

export default ProductDetailScreen;
