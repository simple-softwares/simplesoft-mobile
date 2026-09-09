import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Share, Linking, Modal, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import invoiceService, { INVOICE_STATES, fmtINR, fmtDate } from '../invoiceService';

function SectionHeader({ label, colors }) {
  return (
    <Text style={[s.sectionLabel, { color: colors.textLight }]}>{label.toUpperCase()}</Text>
  );
}

function InfoRow({ label, value, colors, highlight }) {
  return (
    <View style={s.infoRow}>
      <Text style={[s.infoLabel, { color: colors.textLight }]}>{label}</Text>
      <Text style={[s.infoValue, { color: highlight ? colors.primary : colors.text }]} numberOfLines={2}>{value || '—'}</Text>
    </View>
  );
}

function LineItem({ line, colors }) {
  return (
    <View style={[s.lineItem, { borderBottomColor: colors.divider }]}>
      <View style={s.lineLeft}>
        <Text style={[s.lineDesc, { color: colors.text }]} numberOfLines={2}>{line.description}</Text>
        {line.hsn_code && (
          <Text style={[s.lineHSN, { color: colors.textLight }]}>HSN: {line.hsn_code}</Text>
        )}
        <Text style={[s.lineQty, { color: colors.textSecondary }]}>
          {line.qty} × {fmtINR(line.unit_price)}
        </Text>
      </View>
      <View style={s.lineRight}>
        <Text style={[s.lineAmount, { color: colors.text }]}>{fmtINR(line.line_total)}</Text>
        {line.gst_rate > 0 && (
          <Text style={[s.lineGST, { color: colors.textLight }]}>GST {line.gst_rate}%</Text>
        )}
      </View>
    </View>
  );
}

function PaymentModal({ visible, onClose, onSave, colors }) {
  const [amount,  setAmount]  = useState('');
  const [method,  setMethod]  = useState('bank');
  const [note,    setNote]    = useState('');
  const [saving,  setSaving]  = useState(false);

  const methods = ['bank', 'cash', 'upi', 'cheque'];

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
    setSaving(true);
    await onSave({ amount: amt, payment_method: method, notes: note });
    setSaving(false);
    onClose();
    setAmount(''); setMethod('bank'); setNote('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={[s.modalSheet, { backgroundColor: colors.surface }]}>
        <View style={s.modalHandle} />
        <Text style={[s.modalTitle, { color: colors.text }]}>Record Payment</Text>

        <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Amount Received (₹)</Text>
        <TextInput
          style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textLight}
        />

        <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Payment Method</Text>
        <View style={s.methodRow}>
          {methods.map(m => (
            <TouchableOpacity
              key={m}
              style={[s.methodChip, { borderColor: method === m ? colors.primary : colors.border,
                backgroundColor: method === m ? colors.primary + '15' : colors.background }]}
              onPress={() => setMethod(m)}>
              <Text style={[s.methodText, { color: method === m ? colors.primary : colors.textSecondary }]}>
                {m.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Note (optional)</Text>
        <TextInput
          style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          value={note}
          onChangeText={setNote}
          placeholder="e.g. NEFT ref #12345"
          placeholderTextColor={colors.textLight}
        />

        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveBtnText}>Record Payment</Text>}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function InvoiceDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { colors } = useTheme();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    invoiceService.getInvoice(id)
      .then(data => { setInvoice(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [id]);

  const reload = () => {
    invoiceService.getInvoice(id).then(setInvoice);
  };

  const handleSend = async () => {
    Alert.alert('Send Invoice', `Mark ${invoice.invoice_number} as sent?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send', onPress: async () => {
          setActionLoading(true);
          try {
            await invoiceService.sendInvoice(id);
            reload();
          } catch (e) {
            Alert.alert('Error', e.response?.data?.detail || 'Failed to send');
          }
          setActionLoading(false);
        }
      },
    ]);
  };

  const handleSharePDF = async () => {
    const url = invoiceService.invoicePdfUrl(id);
    try {
      await Share.share({ url, title: `Invoice ${invoice?.invoice_number}`, message: url });
    } catch { }
  };

  const handleOpenPDF = () => {
    const url = invoiceService.invoicePdfUrl(id);
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open PDF'));
  };

  const handleWhatsApp = async () => {
    if (!invoice?.customer_mobile && !invoice?.customer_phone) {
      Alert.alert('No number', 'Customer has no phone number on record.');
      return;
    }
    try {
      await invoiceService.sendWhatsApp(id);
      Alert.alert('Sent', 'Invoice sent via WhatsApp');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'WhatsApp send failed');
    }
  };

  const handleRecordPayment = async (body) => {
    try {
      await invoiceService.recordPayment(id, body);
      reload();
      Alert.alert('Recorded', 'Payment has been recorded.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not record payment');
    }
  };

  if (loading) {
    return <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
  }

  if (!invoice) {
    return <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: colors.textSecondary }}>Invoice not found</Text>
    </View>;
  }

  const st = INVOICE_STATES[invoice.state] || INVOICE_STATES.draft;
  const lines = invoice.lines || [];
  const canSend = invoice.state === 'draft';
  const canPay  = invoice.state === 'sent' || invoice.state === 'overdue';
  const canEdit = invoice.state === 'draft';

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={[s.topTitle, { color: colors.text }]}>{invoice.invoice_number}</Text>
          <View style={[s.badge, { backgroundColor: st.bg }]}>
            <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
        {canEdit && (
          <TouchableOpacity onPress={() => navigation.navigate('NewInvoice', { id })} style={s.pdfBtn}>
            <Icon name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleOpenPDF} style={s.pdfBtn}>
          <Icon name="document-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Amount hero */}
        <View style={[s.amountHero, { backgroundColor: colors.primary }]}>
          <Text style={s.amountLabel}>Total Amount</Text>
          <Text style={s.amountValue}>{fmtINR(invoice.total_amount)}</Text>
          {invoice.amount_paid > 0 && (
            <Text style={s.amountPaid}>Paid: {fmtINR(invoice.amount_paid)} · Due: {fmtINR(invoice.amount_due)}</Text>
          )}
        </View>

        {/* Invoice info */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader label="Invoice Details" colors={colors} />
          <InfoRow label="Invoice Date"     value={fmtDate(invoice.invoice_date)} colors={colors} />
          <InfoRow label="Due Date"         value={fmtDate(invoice.due_date)} colors={colors} />
          <InfoRow label="Place of Supply"  value={invoice.place_of_supply} colors={colors} />
          {invoice.gstin && <InfoRow label="Customer GSTIN" value={invoice.gstin} colors={colors} />}
        </View>

        {/* Customer */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader label="Bill To" colors={colors} />
          <Text style={[s.custName, { color: colors.text }]}>{invoice.customer_name}</Text>
          {invoice.customer_email && (
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${invoice.customer_email}`)}>
              <Text style={[s.custContact, { color: colors.primary }]}>{invoice.customer_email}</Text>
            </TouchableOpacity>
          )}
          {(invoice.customer_phone || invoice.customer_mobile) && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${invoice.customer_mobile || invoice.customer_phone}`)}>
              <Text style={[s.custContact, { color: colors.primary }]}>{invoice.customer_mobile || invoice.customer_phone}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Line items */}
        {lines.length > 0 && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader label={`Line Items (${lines.length})`} colors={colors} />
            {lines.map((line, i) => <LineItem key={i} line={line} colors={colors} />)}
          </View>
        )}

        {/* Tax summary */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader label="Tax Summary" colors={colors} />
          <InfoRow label="Sub-total"  value={fmtINR(invoice.subtotal)}     colors={colors} />
          {invoice.cgst_total > 0 && <InfoRow label="CGST"   value={fmtINR(invoice.cgst_total)}  colors={colors} />}
          {invoice.sgst_total > 0 && <InfoRow label="SGST"   value={fmtINR(invoice.sgst_total)}  colors={colors} />}
          {invoice.igst_total > 0 && <InfoRow label="IGST"   value={fmtINR(invoice.igst_total)}  colors={colors} />}
          <View style={[s.totalRow, { borderTopColor: colors.divider }]}>
            <Text style={[s.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[s.totalValue, { color: colors.primary }]}>{fmtINR(invoice.total_amount)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader label="Notes" colors={colors} />
            <Text style={[s.notes, { color: colors.textSecondary }]}>{invoice.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action bar */}
      <View style={[s.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[s.actionBtn, { borderColor: colors.border }]} onPress={handleSharePDF}>
          <Icon name="share-outline" size={18} color={colors.primary} />
          <Text style={[s.actionBtnText, { color: colors.primary }]}>Share PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.actionBtn, { borderColor: '#25D366' }]} onPress={handleWhatsApp}>
          <Icon name="logo-whatsapp" size={18} color="#25D366" />
          <Text style={[s.actionBtnText, { color: '#25D366' }]}>WhatsApp</Text>
        </TouchableOpacity>

        {canSend && (
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleSend}
            disabled={actionLoading}>
            {actionLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Icon name="send-outline" size={16} color="#fff" />
                  <Text style={s.primaryBtnText}>Mark Sent</Text>
                </>}
          </TouchableOpacity>
        )}

        {canPay && (
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: colors.success || '#10B981' }]}
            onPress={() => setShowPayment(true)}>
            <Icon name="cash-outline" size={16} color="#fff" />
            <Text style={s.primaryBtnText}>Record Payment</Text>
          </TouchableOpacity>
        )}
      </View>

      <PaymentModal
        visible={showPayment}
        onClose={() => setShowPayment(false)}
        onSave={handleRecordPayment}
        colors={colors}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  topBar:     { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 12,
                paddingHorizontal: 8, borderBottomWidth: 0.5 },
  backBtn:    { padding: 8 },
  topCenter:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  topTitle:   { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  pdfBtn:     { padding: 8 },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  amountHero: { alignItems: 'center', paddingVertical: 24 },
  amountLabel:{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  amountValue:{ fontSize: 34, fontWeight: '900', color: '#fff' },
  amountPaid: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  section:    { marginHorizontal: 14, marginTop: 12, borderRadius: 14,
                borderWidth: 1, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 12 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  infoRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  infoLabel:  { fontSize: 13 },
  infoValue:  { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  custName:   { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  custContact: { fontSize: 13, marginBottom: 2 },
  lineItem:   { flexDirection: 'row', justifyContent: 'space-between',
                paddingVertical: 10, borderBottomWidth: 0.5 },
  lineLeft:   { flex: 1, paddingRight: 8 },
  lineDesc:   { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  lineHSN:    { fontSize: 11, marginBottom: 2 },
  lineQty:    { fontSize: 12 },
  lineRight:  { alignItems: 'flex-end' },
  lineAmount: { fontSize: 14, fontWeight: '700' },
  lineGST:    { fontSize: 11, marginTop: 2 },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between',
                paddingTop: 10, marginTop: 6, borderTopWidth: 1 },
  totalLabel: { fontSize: 15, fontWeight: '700' },
  totalValue: { fontSize: 17, fontWeight: '900' },
  notes:      { fontSize: 14, lineHeight: 20 },
  actionBar:  { position: 'absolute', bottom: 0, left: 0, right: 0,
                flexDirection: 'row', gap: 8, padding: 12,
                paddingBottom: 28, borderTopWidth: 0.5 },
  actionBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5,
                paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 6, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  // Payment modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  modalHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  inputLabel:   { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input:        { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                  fontSize: 14, marginBottom: 4 },
  methodRow:    { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  methodChip:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  methodText:   { fontSize: 12, fontWeight: '700' },
  saveBtn:      { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});
