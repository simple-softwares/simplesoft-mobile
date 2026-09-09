import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Share, Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import invoiceService, { QUOTATION_STATES, fmtINR, fmtDate } from '../invoiceService';

function SectionHeader({ label, colors }) {
  return <Text style={[s.sectionLabel, { color: colors.textLight }]}>{label.toUpperCase()}</Text>;
}

function InfoRow({ label, value, colors }) {
  return (
    <View style={s.infoRow}>
      <Text style={[s.infoLabel, { color: colors.textLight }]}>{label}</Text>
      <Text style={[s.infoValue, { color: colors.text }]} numberOfLines={2}>{value || '—'}</Text>
    </View>
  );
}

export default function QuotationDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { colors } = useTheme();
  const [quote,   setQuote]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    invoiceService.getQuotation(id)
      .then(data => { setQuote(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const reload = () => invoiceService.getQuotation(id).then(setQuote);

  const handleSend = async () => {
    Alert.alert('Send Quotation', `Mark ${quote.quote_number} as sent?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send', onPress: async () => {
          try { await invoiceService.sendQuotation(id); reload(); }
          catch (e) { Alert.alert('Error', e.response?.data?.detail || 'Failed'); }
        }
      },
    ]);
  };

  const handleConvert = async () => {
    Alert.alert('Convert to Invoice', `Convert ${quote.quote_number} to a tax invoice?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Convert', onPress: async () => {
          setConverting(true);
          try {
            const inv = await invoiceService.convertToInvoice(id);
            Alert.alert('Done', `Invoice ${inv.invoice_number} created.`, [
              { text: 'View Invoice', onPress: () => navigation.replace('InvoiceDetail', { id: inv.id }) },
              { text: 'OK' },
            ]);
            reload();
          } catch (e) {
            Alert.alert('Error', e.response?.data?.detail || 'Conversion failed');
          }
          setConverting(false);
        }
      },
    ]);
  };

  const handleSharePDF = async () => {
    const url = invoiceService.quotationPdfUrl(id);
    try {
      await Share.share({ url, title: `Quotation ${quote?.quote_number}`, message: url });
    } catch { }
  };

  if (loading) {
    return <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
  }

  if (!quote) {
    return <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: colors.textSecondary }}>Quotation not found</Text>
    </View>;
  }

  const st        = QUOTATION_STATES[quote.state] || QUOTATION_STATES.draft;
  const lines     = quote.lines || [];
  const canSend   = quote.state === 'draft';
  const canConvert = ['draft', 'sent', 'accepted'].includes(quote.state);
  const canEdit   = quote.state === 'draft' || quote.state === 'sent';

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={[s.topTitle, { color: colors.text }]}>{quote.quote_number}</Text>
          <View style={[s.badge, { backgroundColor: st.bg }]}>
            <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
        {canEdit && (
          <TouchableOpacity onPress={() => navigation.navigate('NewQuotation', { id })} style={s.shareBtn}>
            <Icon name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleSharePDF} style={s.shareBtn}>
          <Icon name="share-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Amount hero */}
        <View style={[s.amountHero, { backgroundColor: colors.primary + 'E8' }]}>
          <Text style={s.amountLabel}>Quotation Value</Text>
          <Text style={s.amountValue}>{fmtINR(quote.total_amount)}</Text>
          {quote.valid_until && (
            <Text style={s.validText}>Valid until {fmtDate(quote.valid_until)}</Text>
          )}
        </View>

        {/* Quote info */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader label="Quotation Details" colors={colors} />
          <InfoRow label="Date"           value={fmtDate(quote.quote_date)} colors={colors} />
          <InfoRow label="Valid Until"    value={fmtDate(quote.valid_until)} colors={colors} />
          <InfoRow label="Place of Supply" value={quote.place_of_supply} colors={colors} />
        </View>

        {/* Customer */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader label="Customer" colors={colors} />
          <Text style={[s.custName, { color: colors.text }]}>{quote.customer_name}</Text>
          {quote.customer_email && (
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${quote.customer_email}`)}>
              <Text style={[s.custContact, { color: colors.primary }]}>{quote.customer_email}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lines */}
        {lines.length > 0 && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader label={`Items (${lines.length})`} colors={colors} />
            {lines.map((line, i) => (
              <View key={i} style={[s.lineItem, { borderBottomColor: colors.divider }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[s.lineDesc, { color: colors.text }]} numberOfLines={2}>{line.description}</Text>
                  <Text style={[s.lineQty, { color: colors.textSecondary }]}>
                    {line.qty} × {fmtINR(line.unit_price)}
                  </Text>
                </View>
                <Text style={[s.lineAmount, { color: colors.text }]}>{fmtINR(line.line_total)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tax summary */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader label="Summary" colors={colors} />
          <InfoRow label="Subtotal" value={fmtINR(quote.subtotal)} colors={colors} />
          {quote.cgst_total > 0 && <InfoRow label="CGST" value={fmtINR(quote.cgst_total)} colors={colors} />}
          {quote.sgst_total > 0 && <InfoRow label="SGST" value={fmtINR(quote.sgst_total)} colors={colors} />}
          {quote.igst_total > 0 && <InfoRow label="IGST" value={fmtINR(quote.igst_total)} colors={colors} />}
          <View style={[s.totalRow, { borderTopColor: colors.divider }]}>
            <Text style={[s.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[s.totalValue, { color: colors.primary }]}>{fmtINR(quote.total_amount)}</Text>
          </View>
        </View>

        {quote.terms_conditions && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader label="Terms & Conditions" colors={colors} />
            <Text style={[s.notes, { color: colors.textSecondary }]}>{quote.terms_conditions}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action bar */}
      <View style={[s.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[s.outlineBtn, { borderColor: colors.border }]} onPress={handleSharePDF}>
          <Icon name="share-outline" size={18} color={colors.primary} />
          <Text style={[s.outlineBtnText, { color: colors.primary }]}>Share PDF</Text>
        </TouchableOpacity>

        {canSend && (
          <TouchableOpacity style={[s.outlineBtn, { borderColor: colors.info || '#6366F1' }]} onPress={handleSend}>
            <Icon name="send-outline" size={18} color={colors.info || '#6366F1'} />
            <Text style={[s.outlineBtnText, { color: colors.info || '#6366F1' }]}>Mark Sent</Text>
          </TouchableOpacity>
        )}

        {canConvert && (
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleConvert}
            disabled={converting}>
            {converting
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Icon name="receipt-outline" size={16} color="#fff" />
                  <Text style={s.primaryBtnText}>Convert to Invoice</Text>
                </>}
          </TouchableOpacity>
        )}
      </View>
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
  shareBtn:   { padding: 8 },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  amountHero: { alignItems: 'center', paddingVertical: 24 },
  amountLabel:{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  amountValue:{ fontSize: 34, fontWeight: '900', color: '#fff' },
  validText:  { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  section:    { marginHorizontal: 14, marginTop: 12, borderRadius: 14,
                borderWidth: 1, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 12 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  infoRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  infoLabel:  { fontSize: 13 },
  infoValue:  { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  custName:   { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  custContact:{ fontSize: 13, marginBottom: 2 },
  lineItem:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5 },
  lineDesc:   { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  lineQty:    { fontSize: 12 },
  lineAmount: { fontSize: 14, fontWeight: '700' },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 6, borderTopWidth: 1 },
  totalLabel: { fontSize: 15, fontWeight: '700' },
  totalValue: { fontSize: 17, fontWeight: '900' },
  notes:      { fontSize: 14, lineHeight: 20 },
  actionBar:  { position: 'absolute', bottom: 0, left: 0, right: 0,
                flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 28, borderTopWidth: 0.5 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 5,
                paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  outlineBtnText: { fontSize: 13, fontWeight: '600' },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 6, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
