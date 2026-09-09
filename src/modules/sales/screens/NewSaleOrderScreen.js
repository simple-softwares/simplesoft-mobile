import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, FlatList, Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import salesService from '../salesService';
import api from '../../../services/api/httpClient';
import { INDIAN_STATES, stateByCode } from '../../../utils/indianStates';

const GST_RATES = [0, 5, 12, 18, 28];

function calcLine(line, wsState, pos) {
  if (line.line_type !== 'product') return { cgst: 0, sgst: 0, igst: 0, taxable: 0, total: 0 };
  const taxable = Math.max(
    0,
    (parseFloat(line.qty_ordered) || 0) * (parseFloat(line.unit_price) || 0) -
    (parseFloat(line.discount_amount) || 0)
  );
  const tax = taxable * (parseFloat(line.gst_rate) || 0) / 100;
  if (wsState === pos) {
    const half = Math.round(tax / 2 * 100) / 100;
    return { cgst: half, sgst: Math.round((tax - half) * 100) / 100, igst: 0, taxable, total: taxable + tax };
  }
  return { cgst: 0, sgst: 0, igst: Math.round(tax * 100) / 100, taxable, total: taxable + tax };
}

function calcTotals(lines, wsState, pos) {
  let subtotal = 0, discount = 0, cgst = 0, sgst = 0, igst = 0;
  for (const l of lines) {
    if (l.line_type !== 'product') continue;
    subtotal  += (parseFloat(l.qty_ordered) || 0) * (parseFloat(l.unit_price) || 0);
    discount  += parseFloat(l.discount_amount) || 0;
    const g = calcLine(l, wsState, pos);
    cgst += g.cgst; sgst += g.sgst; igst += g.igst;
  }
  const taxable = subtotal - discount;
  return {
    subtotal:  Math.round(subtotal * 100) / 100,
    discount:  Math.round(discount * 100) / 100,
    taxable:   Math.round(taxable  * 100) / 100,
    cgst:      Math.round(cgst * 100) / 100,
    sgst:      Math.round(sgst * 100) / 100,
    igst:      Math.round(igst * 100) / 100,
    total:     Math.round((taxable + cgst + sgst + igst) * 100) / 100,
  };
}

function emptyProductLine() {
  return { _key: Math.random(), line_type: 'product', description: '', hsn_code: '', qty_ordered: '1', unit_price: '', discount_amount: '0', gst_rate: 18 };
}
function emptySectionLine() {
  return { _key: Math.random(), line_type: 'section', description: '' };
}
function emptyNoteLine() {
  return { _key: Math.random(), line_type: 'note', description: '' };
}

function fmtINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

// ── State Picker Modal ────────────────────────────────────────────────────────

function StatePickerModal({ visible, current, onSelect, onClose, colors }) {
  const [q, setQ] = useState('');
  const filtered  = INDIAN_STATES.filter(s =>
    s.name.toLowerCase().includes(q.toLowerCase()) || s.code.includes(q)
  );
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[mp.root, { backgroundColor: colors.background }]}>
        <View style={[mp.header, { borderBottomColor: colors.divider }]}>
          <Text style={[mp.title, { color: colors.text }]}>Place of Supply</Text>
          <TouchableOpacity onPress={onClose}><Icon name="close" size={22} color={colors.text} /></TouchableOpacity>
        </View>
        <View style={[mp.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="search-outline" size={16} color={colors.textLight} />
          <TextInput
            style={[mp.searchInput, { color: colors.text }]}
            placeholder="Search state…"
            placeholderTextColor={colors.textLight}
            value={q}
            onChangeText={setQ}
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={s => s.code}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[mp.item, { borderBottomColor: colors.divider, backgroundColor: item.code === current ? colors.primary + '18' : 'transparent' }]}
              onPress={() => { onSelect(item.code); onClose(); setQ(''); }}>
              <Text style={[mp.itemCode, { color: colors.primary }]}>{item.code}</Text>
              <Text style={[mp.itemName, { color: colors.text }]}>{item.name}</Text>
              {item.code === current && <Icon name="checkmark" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

const mp = StyleSheet.create({
  root:        { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 0 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title:       { fontSize: 17, fontWeight: '700' },
  searchBox:   { flexDirection: 'row', alignItems: 'center', margin: 12, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  item:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  itemCode:    { fontSize: 13, fontWeight: '700', width: 32 },
  itemName:    { fontSize: 14, marginLeft: 8, flex: 1 },
});

// ── Product Search Modal ──────────────────────────────────────────────────────

function ProductSearchModal({ visible, onSelect, onClose, colors }) {
  const [q, setQ]             = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => { if (!visible) { setQ(''); setResults([]); } }, [visible]);

  const search = (text) => {
    setQ(text);
    clearTimeout(timer.current);
    if (!text.trim()) { setResults([]); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/products', { params: { search: text, limit: 10 } });
        setResults(data || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[pp.root, { backgroundColor: colors.background }]}>
        <View style={[pp.header, { borderBottomColor: colors.divider }]}>
          <Text style={[pp.title, { color: colors.text }]}>Search Product</Text>
          <TouchableOpacity onPress={onClose}><Icon name="close" size={22} color={colors.text} /></TouchableOpacity>
        </View>
        <View style={[pp.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="search-outline" size={16} color={colors.textLight} />
          <TextInput
            style={[pp.searchInput, { color: colors.text }]}
            placeholder="Product name…"
            placeholderTextColor={colors.textLight}
            value={q}
            onChangeText={search}
            autoFocus
          />
          {loading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
        <FlatList
          data={results}
          keyExtractor={p => String(p.id)}
          ListEmptyComponent={q ? <Text style={[pp.empty, { color: colors.textLight }]}>No products found</Text> : null}
          renderItem={({ item }) => (
            <TouchableOpacity style={[pp.item, { borderBottomColor: colors.divider }]}
              onPress={() => { onSelect(item); onClose(); }}>
              <Text style={[pp.name, { color: colors.text }]}>{item.name}</Text>
              <View style={pp.meta}>
                <Text style={[pp.price, { color: colors.primary }]}>₹{item.selling_price}</Text>
                <Text style={[pp.gst, { color: colors.textLight }]}>GST {item.gst_rate}%</Text>
                {item.hsn_sac ? <Text style={[pp.gst, { color: colors.textLight }]}>HSN {item.hsn_sac}</Text> : null}
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

const pp = StyleSheet.create({
  root:      { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 0 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title:     { fontSize: 17, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 12, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  item:      { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  name:      { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  meta:      { flexDirection: 'row', gap: 12 },
  price:     { fontSize: 13, fontWeight: '700' },
  gst:       { fontSize: 12 },
  empty:     { textAlign: 'center', marginTop: 32, fontSize: 14 },
});

// ── Line Card ─────────────────────────────────────────────────────────────────

function LineCard({ line, onChange, onRemove, onSearchProduct, colors, wsState, pos }) {
  const g       = calcLine(line, wsState, pos);
  const isIntra = wsState === pos;

  if (line.line_type === 'section') {
    return (
      <View style={[lc.sectionWrap, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '08' }]}>
        <View style={lc.topRow}>
          <View style={[lc.typePill, { backgroundColor: colors.primary }]}>
            <Text style={lc.typePillText}>SECTION</Text>
          </View>
          <TouchableOpacity onPress={onRemove} style={lc.deleteBtn}>
            <Icon name="trash-outline" size={15} color="#EF4444" />
          </TouchableOpacity>
        </View>
        <TextInput
          style={[lc.sectionInput, { color: colors.primary, borderBottomColor: colors.primary + '40' }]}
          placeholder="Section heading…"
          placeholderTextColor={colors.primary + '60'}
          value={line.description}
          onChangeText={v => onChange({ description: v })}
        />
      </View>
    );
  }

  if (line.line_type === 'note') {
    return (
      <View style={[lc.noteWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <View style={lc.topRow}>
          <View style={[lc.typePill, { backgroundColor: colors.border }]}>
            <Text style={[lc.typePillText, { color: colors.textSecondary }]}>NOTE</Text>
          </View>
          <TouchableOpacity onPress={onRemove} style={lc.deleteBtn}>
            <Icon name="trash-outline" size={15} color="#EF4444" />
          </TouchableOpacity>
        </View>
        <TextInput
          style={[lc.noteInput, { color: colors.textSecondary }]}
          placeholder="Add a note…"
          placeholderTextColor={colors.textLight}
          value={line.description}
          onChangeText={v => onChange({ description: v })}
          multiline
          numberOfLines={2}
        />
      </View>
    );
  }

  return (
    <View style={[lc.wrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={lc.topRow}>
        <View style={[lc.typePill, { backgroundColor: colors.border }]}>
          <Text style={[lc.typePillText, { color: colors.textSecondary }]}>PRODUCT</Text>
        </View>
        <TouchableOpacity style={[lc.searchBtn, { backgroundColor: colors.primary + '15' }]} onPress={onSearchProduct}>
          <Icon name="search-outline" size={12} color={colors.primary} />
          <Text style={[lc.searchBtnText, { color: colors.primary }]}>{line.description ? 'Change' : 'Search'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRemove} style={lc.deleteBtn}>
          <Icon name="trash-outline" size={15} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <TextInput
        style={[lc.descInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        placeholder="Description *"
        placeholderTextColor={colors.textLight}
        value={line.description}
        onChangeText={v => onChange({ description: v })}
      />

      <View style={lc.row}>
        <View style={{ flex: 1 }}>
          <Text style={[lc.label, { color: colors.textLight }]}>HSN/SAC</Text>
          <TextInput
            style={[lc.smallInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            placeholder="HSN code"
            placeholderTextColor={colors.textLight}
            value={line.hsn_code}
            onChangeText={v => onChange({ hsn_code: v })}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[lc.label, { color: colors.textLight }]}>Qty</Text>
          <TextInput
            style={[lc.smallInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={String(line.qty_ordered)}
            onChangeText={v => onChange({ qty_ordered: v })}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={lc.row}>
        <View style={{ flex: 1 }}>
          <Text style={[lc.label, { color: colors.textLight }]}>Unit Price (₹)</Text>
          <TextInput
            style={[lc.smallInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            placeholder="0.00"
            placeholderTextColor={colors.textLight}
            value={String(line.unit_price)}
            onChangeText={v => onChange({ unit_price: v })}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[lc.label, { color: colors.textLight }]}>Discount (₹)</Text>
          <TextInput
            style={[lc.smallInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={String(line.discount_amount)}
            onChangeText={v => onChange({ discount_amount: v })}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <Text style={[lc.label, { color: colors.textLight }]}>GST Rate</Text>
      <View style={lc.gstRow}>
        {GST_RATES.map(r => (
          <TouchableOpacity
            key={r}
            style={[lc.gstChip, line.gst_rate === r && { backgroundColor: colors.primary }]}
            onPress={() => onChange({ gst_rate: r })}>
            <Text style={[lc.gstChipText, { color: line.gst_rate === r ? '#fff' : colors.textSecondary }]}>{r}%</Text>
          </TouchableOpacity>
        ))}
      </View>

      {g.total > 0 && (
        <View style={[lc.total, { borderTopColor: colors.divider }]}>
          <Text style={[lc.totalLabel, { color: colors.textLight }]}>
            Taxable: {fmtINR(g.taxable)}
            {isIntra ? `  CGST: ${fmtINR(g.cgst)}  SGST: ${fmtINR(g.sgst)}` : `  IGST: ${fmtINR(g.igst)}`}
          </Text>
          <Text style={[lc.totalAmt, { color: colors.text }]}>{fmtINR(g.total)}</Text>
        </View>
      )}
    </View>
  );
}

const lc = StyleSheet.create({
  wrap:         { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  sectionWrap:  { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  noteWrap:     { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  typePill:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typePillText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  searchBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 'auto' },
  searchBtnText:{ fontSize: 11, fontWeight: '600' },
  deleteBtn:    { padding: 4, marginLeft: 4 },
  sectionInput: { fontSize: 15, fontWeight: '700', borderBottomWidth: 1, paddingBottom: 4 },
  noteInput:    { fontSize: 13, textAlignVertical: 'top' },
  descInput:    { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, marginBottom: 8 },
  row:          { flexDirection: 'row', marginBottom: 8 },
  label:        { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  smallInput:   { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13 },
  gstRow:       { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  gstChip:      { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#9090AA18' },
  gstChipText:  { fontSize: 12, fontWeight: '600' },
  total:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  totalLabel:   { fontSize: 11 },
  totalAmt:     { fontSize: 14, fontWeight: '700' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function NewSaleOrderScreen({ route, navigation }) {
  const { colors } = useTheme();
  const orderId = route.params?.id;
  const isEdit  = Boolean(orderId);

  const today = new Date().toISOString().slice(0, 10);

  const [loading,  setLoading]  = useState(isEdit);
  const [saving,   setSaving]   = useState(false);
  const [wsState,  setWsState]  = useState('27');

  // Customer
  const [custQuery,   setCustQuery]   = useState('');
  const [custResults, setCustResults] = useState([]);
  const [customer,    setCustomer]    = useState(null);
  const custTimer = useRef(null);

  // Form fields
  const [orderDate,   setOrderDate]   = useState(today);
  const [pos,         setPos]         = useState('27');
  const [notes,       setNotes]       = useState('');
  const [lines,       setLines]       = useState([emptyProductLine()]);

  // UI
  const [showStatePicker,   setShowStatePicker]   = useState(false);
  const [productSearchLine, setProductSearchLine] = useState(null);
  const [showDatePicker,    setShowDatePicker]    = useState(false);

  useEffect(() => {
    api.get('/gst/config').then(r => {
      const code = r.data.state_code || '27';
      setWsState(code);
      if (!isEdit) setPos(code);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    salesService.getOrder(orderId).then(order => {
      if (order.state !== 'draft') { navigation.goBack(); return; }
      const partner = order.partner_id;
      if (partner) {
        setCustomer({ id: partner[0], name: partner[1], gstin: order.customer_gstin || '', address: order.customer_address || '' });
        setCustQuery(partner[1]);
      }
      setOrderDate((order.date_order || today).slice(0, 10));
      setPos(order.place_of_supply || wsState);
      setNotes(order.note || '');
      setLines((order.lines || []).map(l => ({
        _key:            Math.random(),
        line_type:       l.line_type || 'product',
        description:     l.description || l.name || '',
        hsn_code:        l.hsn_code || '',
        qty_ordered:     String(l.qty_ordered || l.product_uom_qty || 1),
        unit_price:      String(l.unit_price || l.price_unit || 0),
        discount_amount: String(l.discount_amount || 0),
        gst_rate:        l.gst_rate || 18,
      })));
    }).catch(() => navigation.goBack()).finally(() => setLoading(false));
  }, [orderId]);

  const isIntra = wsState === pos;
  const totals  = calcTotals(lines, wsState, pos);

  const onCustSearch = (text) => {
    setCustQuery(text);
    setCustomer(null);
    clearTimeout(custTimer.current);
    if (!text.trim()) { setCustResults([]); return; }
    custTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/contacts/customers', { params: { search: text, limit: 8 } });
        setCustResults(data || []);
      } catch { setCustResults([]); }
    }, 300);
  };

  const selectCustomer = (c) => {
    setCustomer({ id: c.id, name: c.name, gstin: c.gstin || '', address: c.billing_address || '' });
    setCustQuery(c.name);
    setCustResults([]);
  };

  const setLine = (idx, patch) =>
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, ...patch } : l));

  const applyProduct = (idx, product) => {
    setLine(idx, {
      description:  product.name,
      hsn_code:     product.hsn_sac || '',
      unit_price:   String(product.selling_price),
      gst_rate:     product.gst_rate,
    });
  };

  const handleSave = async () => {
    const name = (customer?.name || custQuery).trim();
    if (!name) { Alert.alert('Required', 'Customer name is required.'); return; }
    const hasProduct = lines.some(l => l.line_type === 'product' && l.description.trim());
    if (!hasProduct) { Alert.alert('Required', 'Add at least one product line.'); return; }

    setSaving(true);
    try {
      const payload = {
        customer_id:      customer?.id || null,
        customer_name:    name,
        customer_gstin:   customer?.gstin?.trim() || null,
        customer_address: customer?.address?.trim() || null,
        order_date:       orderDate,
        place_of_supply:  pos,
        notes:            notes.trim() || null,
        lines: lines.map((l, i) => ({
          line_type:       l.line_type,
          sequence:        (i + 1) * 10,
          description:     l.description || '',
          hsn_code:        l.hsn_code || null,
          qty_ordered:     parseFloat(l.qty_ordered) || 1,
          unit_price:      parseFloat(l.unit_price) || 0,
          discount_amount: parseFloat(l.discount_amount) || 0,
          gst_rate:        l.gst_rate || 0,
        })),
      };

      const result = isEdit
        ? await salesService.updateOrder(orderId, payload)
        : await salesService.createOrder(payload);

      navigation.replace('SaleDetail', { orderId: result.id, orderName: result.so_number || result.name });
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}>

      <StatePickerModal visible={showStatePicker} current={pos} onSelect={setPos} onClose={() => setShowStatePicker(false)} colors={colors} />

      <ProductSearchModal
        visible={productSearchLine !== null}
        onSelect={p => applyProduct(productSearchLine, p)}
        onClose={() => setProductSearchLine(null)}
        colors={colors}
      />

      {showDatePicker && (
        <DateTimePicker
          mode="date"
          value={new Date(orderDate)}
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) setOrderDate(date.toISOString().slice(0, 10));
          }}
        />
      )}

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>{isEdit ? 'Edit Order' : 'New Sales Order'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={[s.saveBtn, { backgroundColor: colors.primary }]}>
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveBtnText}>Save Draft</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardDismissMode="on-drag">

        {/* Customer */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.cardTitle, { color: colors.textLight }]}>CUSTOMER</Text>
          <TextInput
            style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="Search or type customer name *"
            placeholderTextColor={colors.textLight}
            value={custQuery}
            onChangeText={onCustSearch}
          />
          {custResults.length > 0 && (
            <View style={[s.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {custResults.map(c => (
                <TouchableOpacity key={c.id} style={[s.dropdownItem, { borderBottomColor: colors.divider }]} onPress={() => selectCustomer(c)}>
                  <Text style={[s.dropdownName, { color: colors.text }]}>{c.name}</Text>
                  {c.gstin && <Text style={[s.dropdownSub, { color: colors.textLight }]}>{c.gstin}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
          {customer && (
            <>
              <TextInput
                style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="GSTIN (optional)"
                placeholderTextColor={colors.textLight}
                value={customer.gstin}
                onChangeText={v => setCustomer(c => ({ ...c, gstin: v }))}
                autoCapitalize="characters"
              />
              <TextInput
                style={[s.input, s.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="Billing address"
                placeholderTextColor={colors.textLight}
                value={customer.address}
                onChangeText={v => setCustomer(c => ({ ...c, address: v }))}
                multiline
                numberOfLines={3}
              />
            </>
          )}
        </View>

        {/* Details */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.cardTitle, { color: colors.textLight }]}>DETAILS</Text>

          <Text style={[s.fieldLabel, { color: colors.textLight }]}>Order Date</Text>
          <TouchableOpacity
            style={[s.datePill, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => setShowDatePicker(true)}>
            <Icon name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={[s.datePillText, { color: colors.text }]}>{fmtDate(orderDate)}</Text>
          </TouchableOpacity>

          <Text style={[s.fieldLabel, { color: colors.textLight, marginTop: 10 }]}>Place of Supply</Text>
          <TouchableOpacity
            style={[s.statePill, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => setShowStatePicker(true)}>
            <Icon name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[s.statePillText, { color: colors.text }]}>{pos} — {stateByCode[pos] || ''}</Text>
            <Icon name="chevron-down" size={14} color={colors.textLight} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <View style={[s.gstBadge, { backgroundColor: isIntra ? '#6366F118' : '#F59E0B18' }]}>
            <Text style={[s.gstBadgeText, { color: isIntra ? '#6366F1' : '#F59E0B' }]}>
              {isIntra ? 'Intra-state · CGST + SGST' : 'Inter-state · IGST'}
            </Text>
          </View>
        </View>

        {/* Line Items */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.cardTitle, { color: colors.textLight }]}>LINE ITEMS</Text>

          {lines.map((line, idx) => (
            <LineCard
              key={line._key}
              line={line}
              idx={idx}
              onChange={patch => setLine(idx, patch)}
              onRemove={() => setLines(ls => ls.filter((_, i) => i !== idx))}
              onSearchProduct={() => setProductSearchLine(idx)}
              colors={colors}
              wsState={wsState}
              pos={pos}
            />
          ))}

          <View style={s.addRow}>
            <TouchableOpacity style={[s.addBtn, { borderColor: colors.primary }]}
              onPress={() => setLines(ls => [...ls, emptyProductLine()])}>
              <Icon name="add" size={15} color={colors.primary} />
              <Text style={[s.addBtnText, { color: colors.primary }]}>Product</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.addBtn, { borderColor: colors.textSecondary }]}
              onPress={() => setLines(ls => [...ls, emptySectionLine()])}>
              <Icon name="add" size={15} color={colors.textSecondary} />
              <Text style={[s.addBtnText, { color: colors.textSecondary }]}>Section</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.addBtn, { borderColor: colors.textSecondary }]}
              onPress={() => setLines(ls => [...ls, emptyNoteLine()])}>
              <Icon name="add" size={15} color={colors.textSecondary} />
              <Text style={[s.addBtnText, { color: colors.textSecondary }]}>Note</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.cardTitle, { color: colors.textLight }]}>NOTES</Text>
          <TextInput
            style={[s.input, s.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="Internal notes…"
            placeholderTextColor={colors.textLight}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Totals */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.cardTitle, { color: colors.textLight }]}>SUMMARY</Text>
          <View style={s.totalRow}>
            <Text style={[s.totalKey, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[s.totalVal, { color: colors.text }]}>{fmtINR(totals.subtotal)}</Text>
          </View>
          {totals.discount > 0 && (
            <View style={s.totalRow}>
              <Text style={[s.totalKey, { color: colors.textSecondary }]}>Discount</Text>
              <Text style={[s.totalVal, { color: '#EF4444' }]}>−{fmtINR(totals.discount)}</Text>
            </View>
          )}
          {isIntra ? (
            <>
              <View style={s.totalRow}><Text style={[s.totalKey, { color: colors.textSecondary }]}>CGST</Text><Text style={[s.totalVal, { color: colors.text }]}>{fmtINR(totals.cgst)}</Text></View>
              <View style={s.totalRow}><Text style={[s.totalKey, { color: colors.textSecondary }]}>SGST</Text><Text style={[s.totalVal, { color: colors.text }]}>{fmtINR(totals.sgst)}</Text></View>
            </>
          ) : (
            <View style={s.totalRow}><Text style={[s.totalKey, { color: colors.textSecondary }]}>IGST</Text><Text style={[s.totalVal, { color: colors.text }]}>{fmtINR(totals.igst)}</Text></View>
          )}
          <View style={[s.totalRow, s.grandTotal, { borderTopColor: colors.divider }]}>
            <Text style={[s.totalKey, { color: colors.text, fontWeight: '700', fontSize: 15 }]}>Total</Text>
            <Text style={[s.totalVal, { color: colors.primary, fontWeight: '800', fontSize: 18 }]}>{fmtINR(totals.total)}</Text>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingTop: Platform.OS === 'ios' ? 54 : 12 },
  backBtn:      { padding: 4 },
  title:        { flex: 1, fontSize: 17, fontWeight: '700', marginLeft: 8 },
  saveBtn:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  card:         { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 },
  cardTitle:    { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  input:        { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  textArea:     { minHeight: 72, textAlignVertical: 'top' },
  dropdown:     { borderWidth: 1, borderRadius: 10, marginTop: -6, marginBottom: 10, overflow: 'hidden' },
  dropdownItem: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  dropdownName: { fontSize: 14, fontWeight: '600' },
  dropdownSub:  { fontSize: 12, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  fieldLabel:   { fontSize: 11, fontWeight: '600', marginBottom: 5 },
  datePill:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 0 },
  datePillText: { fontSize: 13 },
  statePill:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9 },
  statePillText:{ fontSize: 13, flex: 1 },
  gstBadge:     { marginTop: 8, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  gstBadgeText: { fontSize: 12, fontWeight: '600' },
  addRow:       { flexDirection: 'row', gap: 8, marginTop: 4 },
  addBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 8 },
  addBtnText:   { fontSize: 12, fontWeight: '600' },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  totalKey:     { fontSize: 13 },
  totalVal:     { fontSize: 13, fontWeight: '600' },
  grandTotal:   { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 6, paddingTop: 10 },
});
