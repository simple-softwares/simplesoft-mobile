import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import expenseService, { EXPENSE_STATES, EXPENSE_TYPES, fmtINR, fmtDate } from '../expenseService';

function SectionHeader({ label, colors }) {
  return <Text style={[s.sectionLabel, { color: colors.textLight }]}>{label.toUpperCase()}</Text>;
}

function InfoRow({ label, value, colors, highlight }) {
  if (!value && value !== 0) return null;
  return (
    <View style={s.infoRow}>
      <Text style={[s.infoLabel, { color: colors.textLight }]}>{label}</Text>
      <Text style={[s.infoValue, { color: highlight ? colors.primary : colors.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function Divider({ colors }) {
  return <View style={[s.divider, { backgroundColor: colors.divider }]} />;
}

export default function ExpenseDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { colors } = useTheme();
  const [expense,       setExpense]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    expenseService.getExpense(id)
      .then(data => { setExpense(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const reload = () => expenseService.getExpense(id).then(setExpense);

  const confirm = (title, message, onConfirm) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: onConfirm },
    ]);
  };

  const doAction = async (actionFn, successMsg) => {
    setActionLoading(true);
    try {
      await actionFn();
      await reload();
      Alert.alert('Done', successMsg);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Action failed');
    }
    setActionLoading(false);
  };

  const handleSubmit = () => confirm(
    'Submit Expense',
    'Submit this expense for approval?',
    () => doAction(() => expenseService.submitExpense(id), 'Expense submitted for approval.'),
  );

  const handleApprove = () => confirm(
    'Approve Expense',
    'Approve and post the journal entry?',
    () => doAction(() => expenseService.approveExpense(id), 'Expense approved.'),
  );

  const handleReject = () => confirm(
    'Reject Expense',
    'Reject this expense?',
    () => doAction(() => expenseService.rejectExpense(id), 'Expense rejected.'),
  );

  const handlePay = () => confirm(
    'Mark as Paid',
    'Record payment via bank transfer?',
    () => doAction(() => expenseService.payExpense(id), 'Expense marked as paid.'),
  );

  const handleDelete = () => confirm(
    'Delete Expense',
    'Delete this draft expense?',
    async () => {
      setActionLoading(true);
      try {
        await expenseService.deleteExpense(id);
        navigation.goBack();
      } catch (e) {
        Alert.alert('Error', e.response?.data?.detail || 'Could not delete');
        setActionLoading(false);
      }
    },
  );

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!expense) {
    return (
      <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>Expense not found</Text>
      </View>
    );
  }

  const st   = EXPENSE_STATES[expense.state] || EXPENSE_STATES.draft;
  const type = EXPENSE_TYPES[expense.expense_type] || EXPENSE_TYPES.reimbursement;

  const isDraft     = expense.state === 'draft';
  const isSubmitted = expense.state === 'submitted';
  const isApproved  = expense.state === 'approved';
  const isCreditMode = expense.payment_mode === 'credit';

  const hasTax = expense.cgst_amount > 0 || expense.sgst_amount > 0 || expense.igst_amount > 0;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={[s.topTitle, { color: colors.text }]}>{expense.expense_number}</Text>
          <View style={[s.badge, { backgroundColor: st.bg }]}>
            <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
        {isDraft && (
          <TouchableOpacity style={s.topRight} onPress={handleDelete}>
            <Icon name="trash-outline" size={18} color={colors.error || '#EF4444'} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Amount hero */}
        <View style={[s.amountHero, { backgroundColor: st.color + 'E8' }]}>
          <View style={[s.typeTag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Icon name={type.icon} size={12} color="#fff" />
            <Text style={s.typeLabel}>{type.label}</Text>
          </View>
          <Text style={s.amountValue}>{fmtINR(expense.total_amount)}</Text>
          {expense.gst_rate > 0 && (
            <Text style={s.amountSub}>
              Base {fmtINR(expense.amount)} + GST {expense.gst_rate}%
              {expense.has_itc ? ' (ITC claimed)' : ''}
            </Text>
          )}
        </View>

        {/* Expense details */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader label="Expense Details" colors={colors} />
          <InfoRow label="Description"    value={expense.description}  colors={colors} />
          <InfoRow label="Category"       value={expense.category_name} colors={colors} />
          <InfoRow label="Expense Date"   value={fmtDate(expense.expense_date)} colors={colors} />
          <InfoRow label="Payment Mode"   value={expense.payment_mode?.toUpperCase()} colors={colors} />
          {expense.notes && <InfoRow label="Notes" value={expense.notes} colors={colors} />}
        </View>

        {/* Vendor info (vendor_bill only) */}
        {expense.expense_type === 'vendor_bill' && (expense.vendor_name || expense.vendor_gstin) && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader label="Vendor" colors={colors} />
            <InfoRow label="Vendor Name"  value={expense.vendor_name}  colors={colors} />
            <InfoRow label="GSTIN"        value={expense.vendor_gstin} colors={colors} />
          </View>
        )}

        {/* Amount breakdown */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader label="Amount Breakdown" colors={colors} />
          <InfoRow label="Base Amount"  value={fmtINR(expense.amount)}   colors={colors} />
          {hasTax && (
            <>
              {expense.cgst_amount > 0 && <InfoRow label="CGST" value={fmtINR(expense.cgst_amount)} colors={colors} />}
              {expense.sgst_amount > 0 && <InfoRow label="SGST" value={fmtINR(expense.sgst_amount)} colors={colors} />}
              {expense.igst_amount > 0 && <InfoRow label="IGST" value={fmtINR(expense.igst_amount)} colors={colors} />}
              <Divider colors={colors} />
            </>
          )}
          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[s.totalValue, { color: colors.primary }]}>{fmtINR(expense.total_amount)}</Text>
          </View>
        </View>

        {/* Workflow timeline */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader label="Timeline" colors={colors} />
          <InfoRow label="Created"  value={fmtDate(expense.created_at)} colors={colors} />
          {expense.approved_at && <InfoRow label="Approved" value={fmtDate(expense.approved_at)} colors={colors} />}
          {expense.paid_at      && <InfoRow label="Paid"    value={fmtDate(expense.paid_at)}     colors={colors} />}
        </View>
      </ScrollView>

      {/* Action bar */}
      <View style={[s.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {isDraft && (
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={actionLoading}>
            {actionLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Icon name="send-outline" size={16} color="#fff" />
                  <Text style={s.primaryBtnText}>Submit for Approval</Text>
                </>}
          </TouchableOpacity>
        )}

        {isSubmitted && (
          <>
            <TouchableOpacity
              style={[s.secondaryBtn, { borderColor: colors.error || '#EF4444' }]}
              onPress={handleReject}
              disabled={actionLoading}>
              <Icon name="close-outline" size={16} color={colors.error || '#EF4444'} />
              <Text style={[s.secondaryBtnText, { color: colors.error || '#EF4444' }]}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: '#10B981', flex: 1 }]}
              onPress={handleApprove}
              disabled={actionLoading}>
              {actionLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Icon name="checkmark-outline" size={16} color="#fff" />
                    <Text style={s.primaryBtnText}>Approve</Text>
                  </>}
            </TouchableOpacity>
          </>
        )}

        {isApproved && isCreditMode && (
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: '#7C3AED' }]}
            onPress={handlePay}
            disabled={actionLoading}>
            {actionLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Icon name="cash-outline" size={16} color="#fff" />
                  <Text style={s.primaryBtnText}>Mark as Paid</Text>
                </>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1 },
  topBar:       { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 12,
                  paddingHorizontal: 8, borderBottomWidth: 0.5 },
  backBtn:      { padding: 8 },
  topCenter:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  topTitle:     { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  topRight:     { padding: 8 },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText:    { fontSize: 11, fontWeight: '700' },
  amountHero:   { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16 },
  typeTag:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10,
                  paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
  typeLabel:    { fontSize: 11, color: '#fff', fontWeight: '600' },
  amountValue:  { fontSize: 36, fontWeight: '900', color: '#fff' },
  amountSub:    { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 6, textAlign: 'center' },
  section:      { marginHorizontal: 14, marginTop: 12, borderRadius: 14,
                  borderWidth: 1, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 12 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  infoLabel:    { fontSize: 13 },
  infoValue:    { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  divider:      { height: 1, marginVertical: 8 },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6 },
  totalLabel:   { fontSize: 15, fontWeight: '700' },
  totalValue:   { fontSize: 17, fontWeight: '900' },
  actionBar:    { position: 'absolute', bottom: 0, left: 0, right: 0,
                  flexDirection: 'row', gap: 8, padding: 12,
                  paddingBottom: 28, borderTopWidth: 0.5 },
  primaryBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5 },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },
});
