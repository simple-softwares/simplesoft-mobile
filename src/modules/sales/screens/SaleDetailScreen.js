import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import salesService from '../salesService';

const STATUS_CONFIG = {
  draft:                { label: 'Draft',       color: '#9E9E9E', icon: 'document-outline'           },
  confirmed:            { label: 'Confirmed',   color: '#4CAF50', icon: 'checkmark-circle-outline'   },
  partially_dispatched: { label: 'In Progress', color: '#FF9800', icon: 'car-outline'                },
  fully_fulfilled:      { label: 'Fulfilled',   color: '#2196F3', icon: 'checkmark-done-circle-outline'},
  cancelled:            { label: 'Cancelled',   color: '#F44336', icon: 'close-circle-outline'       },
};

const TIMELINE = [
  { key: 'draft',                label: 'Draft',      icon: 'document-outline'            },
  { key: 'confirmed',            label: 'Confirmed',  icon: 'checkmark-circle-outline'    },
  { key: 'partially_dispatched', label: 'Dispatched', icon: 'car-outline'                 },
  { key: 'fully_fulfilled',      label: 'Fulfilled',  icon: 'checkmark-done-circle-outline'},
];
const STATUS_IDX = { draft: 0, confirmed: 1, partially_dispatched: 2, fully_fulfilled: 3, cancelled: -1 };

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Dispatch Modal ────────────────────────────────────────────────────────────
const DispatchModal = ({ visible, order, onDispatch, onClose, colors }) => {
  const productLines = (order?.lines || []).filter(l => l.line_type === 'product');
  const [qtys, setQtys] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      const init = {};
      productLines.forEach(l => {
        const remaining = Math.max(0, parseFloat(l.qty_ordered || 0) - parseFloat(l.qty_delivered || 0));
        init[l.id] = String(remaining);
      });
      setQtys(init);
    }
  }, [visible]);

  const handleSubmit = async () => {
    const lines = productLines
      .filter(l => parseFloat(qtys[l.id] || 0) > 0)
      .map(l => ({ line_id: l.id, qty_dispatched: parseFloat(qtys[l.id] || 0) }));
    if (!lines.length) { onClose(); return; }
    setSaving(true);
    await onDispatch(lines);
    setSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={dm.flex}>
        <TouchableOpacity style={dm.overlay} activeOpacity={1} onPress={onClose} />
        <View style={[dm.sheet, { backgroundColor: colors.surface }]}>
          <View style={dm.handleBar}>
            <View style={[dm.handle, { backgroundColor: colors.border }]} />
          </View>
          <View style={dm.titleRow}>
            <Icon name="car-outline" size={18} color="#FF9800" />
            <Text style={[dm.title, { color: colors.text }]}>Record Dispatch</Text>
          </View>
          <Text style={[dm.subtitle, { color: colors.textSecondary }]}>
            Enter quantity dispatched for each line.
          </Text>

          <ScrollView style={dm.lineList} keyboardShouldPersistTaps="handled">
            {productLines.length === 0 ? (
              <Text style={[dm.noLines, { color: colors.textSecondary }]}>No product lines to dispatch.</Text>
            ) : productLines.map(l => {
              const remaining = Math.max(0, parseFloat(l.qty_ordered || 0) - parseFloat(l.qty_delivered || 0));
              return (
                <View key={l.id} style={[dm.lineRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[dm.lineName, { color: colors.text }]} numberOfLines={2}>{l.description}</Text>
                    <Text style={[dm.lineSub, { color: colors.textSecondary }]}>
                      {parseFloat(l.qty_delivered || 0)} / {parseFloat(l.qty_ordered || 0)} delivered · {remaining} remaining
                    </Text>
                  </View>
                  <TextInput
                    style={[dm.qtyInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                    value={qtys[l.id] ?? '0'}
                    onChangeText={v => setQtys(q => ({ ...q, [l.id]: v }))}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                </View>
              );
            })}
          </ScrollView>

          <View style={dm.actions}>
            <TouchableOpacity style={[dm.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[dm.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[dm.saveBtn, { backgroundColor: '#FF9800', opacity: saving ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Icon name="car-outline" size={16} color="#fff" />}
              <Text style={dm.saveText}>Record Dispatch</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const dm = StyleSheet.create({
  flex:       { flex: 1 },
  overlay:    { flex: 1, backgroundColor: '#00000060' },
  sheet:      { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34, maxHeight: '80%' },
  handleBar:  { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handle:     { width: 36, height: 4, borderRadius: 2 },
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  title:      { fontSize: 17, fontWeight: '700' },
  subtitle:   { fontSize: 12, paddingHorizontal: 16, marginBottom: 12 },
  lineList:   { paddingHorizontal: 16, maxHeight: 320 },
  noLines:    { textAlign: 'center', paddingVertical: 20, fontSize: 14 },
  lineRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  lineName:   { fontSize: 14, fontWeight: '500' },
  lineSub:    { fontSize: 11, marginTop: 2 },
  qtyInput:   { width: 72, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, fontSize: 15, textAlign: 'center' },
  actions:    { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  cancelBtn:  { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600' },
  saveBtn:    { flex: 2, flexDirection: 'row', borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  saveText:   { color: '#fff', fontSize: 14, fontWeight: '700' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
const SaleDetailScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { orderId, orderName } = route.params || {};

  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) { setLoading(false); return; }
    try {
      const data = await salesService.getOrder(orderId);
      setOrder(data);
      navigation.setOptions({ title: data.so_number || orderName || 'Order' });
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { if (order) loadOrder(); });
    return unsub;
  }, [navigation, order]);

  const handleConfirm = () => {
    Alert.alert('Confirm Order', `Confirm ${order.so_number}? Stock will be reserved.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm Order', onPress: async () => {
        setActing(true);
        try { const updated = await salesService.confirmOrder(orderId); setOrder(updated); }
        catch (e) { Alert.alert('Error', e?.response?.data?.detail || 'Failed to confirm'); }
        finally { setActing(false); }
      }},
    ]);
  };

  const handleCancel = () => {
    Alert.alert('Cancel Order', `Cancel ${order.so_number}? This cannot be undone.`, [
      { text: 'No', style: 'cancel' },
      { text: 'Cancel Order', style: 'destructive', onPress: async () => {
        setActing(true);
        try { const updated = await salesService.cancelOrder(orderId); setOrder(updated); }
        catch (e) { Alert.alert('Error', e?.response?.data?.detail || 'Failed to cancel'); }
        finally { setActing(false); }
      }},
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Order', `Permanently delete ${order.so_number}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setActing(true);
        try { await salesService.deleteOrder(orderId); navigation.goBack(); }
        catch (e) { Alert.alert('Error', e?.response?.data?.detail || 'Failed to delete'); setActing(false); }
      }},
    ]);
  };

  const handleDispatch = async (lines) => {
    try {
      const updated = await salesService.dispatchOrder(orderId, lines);
      setOrder(updated);
      setShowDispatch(false);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || 'Dispatch failed');
    }
  };

  if (loading) {
    return <View style={[s.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
  }

  if (!order) {
    return <View style={[s.center, { backgroundColor: colors.background }]}>
      <Icon name="alert-circle-outline" size={48} color={colors.textLight} />
      <Text style={[s.emptyText, { color: colors.textSecondary }]}>Order not found</Text>
    </View>;
  }

  const cfg         = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
  const statusIdx   = STATUS_IDX[order.status] ?? 0;
  const isCancelled = order.status === 'cancelled';
  const canEdit     = order.status === 'draft';
  const canConfirm  = order.status === 'draft';
  const canDispatch = order.status === 'confirmed' || order.status === 'partially_dispatched';
  const canCancel   = !['fully_fulfilled', 'cancelled'].includes(order.status);

  const productLines   = (order.lines || []).filter(l => l.line_type === 'product');
  const totalOrdered   = productLines.reduce((s, l) => s + parseFloat(l.qty_ordered || 0), 0);
  const totalDelivered = productLines.reduce((s, l) => s + parseFloat(l.qty_delivered || 0), 0);
  const dispatchPct    = totalOrdered > 0 ? Math.round((totalDelivered / totalOrdered) * 100) : 0;
  const showProgress   = canDispatch && totalOrdered > 0;

  const intraState = parseFloat(order.cgst_total || 0) > 0 || parseFloat(order.sgst_total || 0) > 0;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Dispatch modal */}
      <DispatchModal
        visible={showDispatch}
        order={order}
        onDispatch={handleDispatch}
        onClose={() => setShowDispatch(false)}
        colors={colors}
      />

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {order.so_number || `SO #${order.id}`}
          </Text>
          <View style={[s.statusBadge, { backgroundColor: cfg.color + '20' }]}>
            <Icon name={cfg.icon} size={11} color={cfg.color} />
            <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        {canEdit && (
          <TouchableOpacity
            onPress={() => navigation.navigate('NewSaleOrder', { id: orderId })}
            style={s.backBtn}>
            <Icon name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* Status timeline */}
        {!isCancelled && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.timeline}>
              {TIMELINE.map((step, i) => {
                const done    = statusIdx >= i;
                const current = statusIdx === i;
                return (
                  <React.Fragment key={step.key}>
                    {i > 0 && (
                      <View style={[s.timelineLine, { backgroundColor: statusIdx >= i ? colors.primary : colors.border }]} />
                    )}
                    <View style={s.timelineStep}>
                      <View style={[s.timelineDot, {
                        backgroundColor: done ? colors.primary + '20' : colors.border,
                        borderWidth: current ? 2 : 0,
                        borderColor: colors.primary,
                      }]}>
                        <Icon name={step.icon} size={13} color={done ? colors.primary : colors.textSecondary} />
                      </View>
                      <Text style={[s.timelineLabel, { color: done ? colors.primary : colors.textSecondary }]}>
                        {step.label}
                      </Text>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
            {/* Dispatch progress */}
            {showProgress && (
              <View style={s.dispatchProgress}>
                <View style={s.dispatchProgressTop}>
                  <Text style={[s.dispatchProgressLabel, { color: colors.textSecondary }]}>Dispatch progress</Text>
                  <Text style={[s.dispatchProgressPct, { color: '#FF9800' }]}>
                    {totalDelivered} / {totalOrdered} units ({dispatchPct}%)
                  </Text>
                </View>
                <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
                  <View style={[s.progressFill, { width: `${dispatchPct}%` }]} />
                </View>
              </View>
            )}
          </View>
        )}

        {isCancelled && (
          <View style={[s.cancelledBanner, { backgroundColor: '#F4433612', borderColor: '#F4433630' }]}>
            <Icon name="close-circle-outline" size={16} color="#F44336" />
            <Text style={s.cancelledText}>This order has been cancelled.</Text>
          </View>
        )}

        {/* Summary banner */}
        <View style={[s.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.bannerItem}>
            <Text style={[s.bannerValue, { color: '#4CAF50' }]}>
              {fmt(order.grand_total)}
            </Text>
            <Text style={[s.bannerLabel, { color: colors.textSecondary }]}>Grand Total</Text>
          </View>
          <View style={[s.bannerDivider, { backgroundColor: colors.border }]} />
          <View style={s.bannerItem}>
            <Text style={[s.bannerValue, { color: colors.text }]}>
              {fmt(order.subtotal)}
            </Text>
            <Text style={[s.bannerLabel, { color: colors.textSecondary }]}>Subtotal</Text>
          </View>
          <View style={[s.bannerDivider, { backgroundColor: colors.border }]} />
          <View style={s.bannerItem}>
            <Text style={[s.bannerValue, { color: colors.text }]}>{order.lines?.length || 0}</Text>
            <Text style={[s.bannerLabel, { color: colors.textSecondary }]}>Items</Text>
          </View>
        </View>

        {/* Details */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Details</Text>
          <DetailRow icon="person-outline"   label="Customer"    value={order.customer_name} colors={colors} />
          <DetailRow icon="document-text-outline" label="GSTIN" value={order.customer_gstin} colors={colors} mono />
          <DetailRow icon="calendar-outline" label="Order Date"  value={order.order_date
            ? new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
            : null} colors={colors} />
          <DetailRow icon="calendar-outline" label="Delivery"    value={order.expected_delivery
            ? new Date(order.expected_delivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
            : null} colors={colors} />
          <DetailRow icon="location-outline" label="Place of Supply" value={order.place_of_supply} colors={colors} />
          <DetailRow icon="person-circle-outline" label="Sales Rep" value={order.sales_rep_id?.[1]} colors={colors} />
          <DetailRow icon="cash-outline"    label="Payment Terms" value={order.payment_terms} colors={colors} />
          {order.customer_address ? (
            <View style={s.addressRow}>
              <Icon name="home-outline" size={15} color={colors.textSecondary} style={s.rowIcon} />
              <View style={{ flex: 1 }}>
                <Text style={[s.rowLabel, { color: colors.textSecondary }]}>Address</Text>
                <Text style={[s.rowValue, { color: colors.text }]}>{order.customer_address}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Order lines */}
        {order.lines?.length > 0 && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Order Lines</Text>
            {order.lines.map((line, i) => {
              if (line.line_type === 'section') {
                return (
                  <View key={line.id || i} style={[s.sectionDivider, { borderBottomColor: colors.border }]}>
                    <Text style={[s.sectionDividerText, { color: colors.primary }]}>{line.description}</Text>
                  </View>
                );
              }
              if (line.line_type === 'note') {
                return (
                  <Text key={line.id || i} style={[s.noteLine, { color: colors.textSecondary }]}>
                    {line.description}
                  </Text>
                );
              }

              const qtyOrdered   = parseFloat(line.qty_ordered || 0);
              const qtyDelivered = parseFloat(line.qty_delivered || 0);
              const linePct      = qtyOrdered > 0 ? Math.round((qtyDelivered / qtyOrdered) * 100) : 0;

              return (
                <View key={line.id || i} style={[s.lineRow, i < order.lines.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                  <View style={s.lineInfo}>
                    <Text style={[s.lineName, { color: colors.text }]} numberOfLines={2}>{line.description}</Text>
                    <View style={s.lineMeta}>
                      {line.hsn_code ? (
                        <Text style={[s.lineHsn, { color: colors.textSecondary }]}>HSN {line.hsn_code}</Text>
                      ) : null}
                      <Text style={[s.lineQty, { color: colors.textSecondary }]}>
                        {qtyOrdered} × {fmt(line.unit_price)}
                      </Text>
                      {parseFloat(line.gst_rate || 0) > 0 && (
                        <Text style={[s.lineGst, { color: colors.textSecondary }]}>GST {line.gst_rate}%</Text>
                      )}
                    </View>
                    {qtyOrdered > 0 && (
                      <View style={s.lineDelivery}>
                        <View style={[s.miniTrack, { backgroundColor: colors.border }]}>
                          <View style={[s.miniFill, {
                            width: `${linePct}%`,
                            backgroundColor: linePct >= 100 ? '#4CAF50' : '#FF9800',
                          }]} />
                        </View>
                        <Text style={[s.lineDeliveredText, { color: linePct >= 100 ? '#4CAF50' : colors.textSecondary }]}>
                          {qtyDelivered}/{qtyOrdered} delivered
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.lineTotal, { color: colors.text }]}>{fmt(line.line_total)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Financial summary */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Financial Summary</Text>
          <TotRow label="Subtotal"      value={fmt(order.subtotal)}        colors={colors} />
          {parseFloat(order.discount_total || 0) > 0 && (
            <TotRow label="Discount"    value={`− ${fmt(order.discount_total)}`} colors={colors} accent="#F44336" />
          )}
          {intraState ? (
            <>
              <TotRow label="CGST"      value={fmt(order.cgst_total)}      colors={colors} />
              <TotRow label="SGST"      value={fmt(order.sgst_total)}      colors={colors} />
            </>
          ) : parseFloat(order.igst_total || 0) > 0 ? (
            <TotRow label="IGST"        value={fmt(order.igst_total)}      colors={colors} />
          ) : null}
          <View style={[s.totDivider, { borderTopColor: colors.border }]} />
          <TotRow label="Grand Total"   value={fmt(order.grand_total)}     colors={colors} bold />
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Notes</Text>
            <Text style={[s.noteText, { color: colors.text }]}>{order.notes}</Text>
          </View>
        )}

        {/* Terms & Conditions */}
        {order.terms_conditions && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Terms & Conditions</Text>
            <Text style={[s.noteText, { color: colors.text }]}>{order.terms_conditions}</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={s.actions}>
          {canConfirm && (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: '#4CAF50', opacity: acting ? 0.6 : 1 }]}
              onPress={handleConfirm}
              disabled={acting}>
              <Icon name="checkmark-circle-outline" size={17} color="#fff" />
              <Text style={s.actionBtnText}>Confirm</Text>
            </TouchableOpacity>
          )}
          {canDispatch && (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: '#FF9800', opacity: acting ? 0.6 : 1 }]}
              onPress={() => setShowDispatch(true)}
              disabled={acting}>
              <Icon name="car-outline" size={17} color="#fff" />
              <Text style={s.actionBtnText}>Dispatch</Text>
            </TouchableOpacity>
          )}
          {canCancel && !isCancelled && (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: '#F44336', opacity: acting ? 0.6 : 1 }]}
              onPress={handleCancel}
              disabled={acting}>
              <Icon name="close-circle-outline" size={17} color="#fff" />
              <Text style={s.actionBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
          {canEdit && (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: '#9E9E9E', opacity: acting ? 0.6 : 1 }]}
              onPress={handleDelete}
              disabled={acting}>
              <Icon name="trash-outline" size={17} color="#fff" />
              <Text style={s.actionBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </View>
  );
};

const DetailRow = ({ icon, label, value, colors, mono }) => {
  if (!value) return null;
  return (
    <View style={s.detailRow}>
      <Icon name={icon} size={15} color={colors.textSecondary} style={s.rowIcon} />
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[s.rowValue, { color: colors.text }, mono && s.mono]}>{value}</Text>
      </View>
    </View>
  );
};

const TotRow = ({ label, value, colors, bold, accent }) => (
  <View style={s.totRow}>
    <Text style={[s.totLabel, { color: bold ? colors.text : colors.textSecondary, fontWeight: bold ? '700' : '400' }]}>{label}</Text>
    <Text style={[s.totValue, { color: accent || (bold ? '#4CAF50' : colors.text), fontWeight: bold ? '800' : '600' }]}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  container:       { flex: 1 },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText:       { fontSize: 15 },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:         { padding: 8 },
  headerCenter:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 4, flexWrap: 'wrap' },
  headerTitle:     { fontSize: 17, fontWeight: '700' },
  statusBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText:      { fontSize: 11, fontWeight: '700' },
  scroll:          { padding: 12, paddingBottom: 100, gap: 12 },

  /* Timeline */
  section:         { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  timeline:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14 },
  timelineStep:    { alignItems: 'center', gap: 4 },
  timelineDot:     { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  timelineLabel:   { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  timelineLine:    { flex: 1, height: 2, marginHorizontal: 4, marginBottom: 14 },
  dispatchProgress:{ paddingHorizontal: 12, paddingBottom: 12 },
  dispatchProgressTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  dispatchProgressLabel: { fontSize: 11 },
  dispatchProgressPct:   { fontSize: 11, fontWeight: '700' },
  progressTrack:   { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:    { height: '100%', borderRadius: 3, backgroundColor: '#FF9800' },

  cancelledBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  cancelledText:   { fontSize: 14, color: '#F44336', fontWeight: '500' },

  banner:          { flexDirection: 'row', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  bannerItem:      { flex: 1, alignItems: 'center', padding: 14, gap: 3 },
  bannerValue:     { fontSize: 15, fontWeight: '800' },
  bannerLabel:     { fontSize: 11 },
  bannerDivider:   { width: StyleSheet.hairlineWidth },

  sectionTitle:    { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, padding: 12, paddingBottom: 6 },
  detailRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  addressRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  rowIcon:         { marginTop: 2 },
  rowLabel:        { fontSize: 11 },
  rowValue:        { fontSize: 14, fontWeight: '500', marginTop: 1 },
  mono:            { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  sectionDivider:     { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8, paddingHorizontal: 12 },
  sectionDividerText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  noteLine:           { fontSize: 13, fontStyle: 'italic', paddingHorizontal: 12, paddingVertical: 6 },
  lineRow:         { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  lineInfo:        { flex: 1, gap: 3 },
  lineName:        { fontSize: 14, fontWeight: '500' },
  lineMeta:        { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  lineHsn:         { fontSize: 11 },
  lineQty:         { fontSize: 11 },
  lineGst:         { fontSize: 11 },
  lineDelivery:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  miniTrack:       { height: 3, width: 50, borderRadius: 2, overflow: 'hidden' },
  miniFill:        { height: '100%', borderRadius: 2 },
  lineDeliveredText: { fontSize: 10 },
  lineTotal:       { fontSize: 14, fontWeight: '700', marginTop: 2 },

  totRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 5 },
  totLabel:        { fontSize: 13 },
  totValue:        { fontSize: 13 },
  totDivider:      { borderTopWidth: StyleSheet.hairlineWidth, marginHorizontal: 12, marginVertical: 4 },

  noteText:        { fontSize: 14, lineHeight: 21, padding: 12, paddingTop: 4 },
  actions:         { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  actionBtn:       { flex: 1, minWidth: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12 },
  actionBtnText:   { color: '#fff', fontSize: 13, fontWeight: '700' },
});

export default SaleDetailScreen;
