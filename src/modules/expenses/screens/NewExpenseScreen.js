import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, Switch,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../../../theme/ThemeContext';
import expenseService, { EXPENSE_TYPES, GST_RATES, fmtDate, toISODate } from '../expenseService';

// ── Sub-components ────────────────────────────────────────────────────────────

function Label({ text, colors }) {
  return <Text style={[s.label, { color: colors.textSecondary }]}>{text}</Text>;
}

function Field({ children }) {
  return <View style={s.fieldWrap}>{children}</View>;
}

function SelectChips({ options, value, onChange, colors, keyExtractor, labelExtractor }) {
  return (
    <View style={s.chipsRow}>
      {options.map(opt => {
        const k = keyExtractor(opt);
        const active = value === k;
        return (
          <TouchableOpacity
            key={k}
            style={[s.chip, { borderColor: active ? colors.primary : colors.border,
              backgroundColor: active ? colors.primary + '18' : colors.background }]}
            onPress={() => onChange(k)}>
            <Text style={[s.chipText, { color: active ? colors.primary : colors.textSecondary }]}>
              {labelExtractor(opt)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function NewExpenseScreen({ navigation }) {
  const { colors } = useTheme();

  // Form state
  const [expenseType, setExpenseType] = useState('reimbursement');
  const [categories,  setCategories]  = useState([]);
  const [categoryId,  setCategoryId]  = useState(null);
  const [description, setDescription] = useState('');
  const [vendorName,  setVendorName]  = useState('');
  const [vendorGSTIN, setVendorGSTIN] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDate,    setShowDate]    = useState(false);
  const [amount,      setAmount]      = useState('');
  const [gstRate,     setGstRate]     = useState(0);
  const [hasITC,      setHasITC]      = useState(false);
  const [paymentMode, setPaymentMode] = useState('bank');
  const [notes,       setNotes]       = useState('');
  const [receiptUri,       setReceiptUri]       = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [saving,           setSaving]           = useState(false);

  // Computed GST
  const baseAmt  = parseFloat(amount) || 0;
  const taxTotal = gstRate > 0 ? parseFloat((baseAmt * gstRate / 100).toFixed(2)) : 0;
  const totalAmt = parseFloat((baseAmt + taxTotal).toFixed(2));

  useEffect(() => {
    expenseService.listCategories().then(setCategories);
  }, []);

  // ── Receipt photo ──────────────────────────────────────────────────────────

  const pickReceipt = useCallback(() => {
    Alert.alert('Receipt Photo', 'Choose source', [
      {
        text: 'Camera',
        onPress: () =>
          launchCamera(
            { mediaType: 'photo', quality: 0.7, saveToPhotos: false },
            res => { if (res.assets?.[0]) setReceiptUri(res.assets[0].uri); },
          ),
      },
      {
        text: 'Gallery',
        onPress: () =>
          launchImageLibrary(
            { mediaType: 'photo', quality: 0.7 },
            res => { if (res.assets?.[0]) setReceiptUri(res.assets[0].uri); },
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!description.trim()) { Alert.alert('Error', 'Description is required'); return; }
    if (!amount || baseAmt <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }

    setSaving(true);
    try {
      // Upload receipt photo first if one was selected
      let receiptUrl;
      if (receiptUri) {
        setUploadingReceipt(true);
        try {
          receiptUrl = await expenseService.uploadReceipt(receiptUri);
        } catch {
          // Non-fatal — proceed without receipt URL
        } finally {
          setUploadingReceipt(false);
        }
      }

      const body = {
        expense_type:  expenseType,
        category_id:   categoryId || undefined,
        description:   description.trim(),
        vendor_name:   vendorName.trim() || undefined,
        vendor_gstin:  vendorGSTIN.trim() || undefined,
        expense_date:  toISODate(expenseDate),
        amount:        baseAmt,
        gst_rate:      gstRate,
        has_itc:       hasITC,
        payment_mode:  paymentMode,
        notes:         notes.trim() || undefined,
        receipt_url:   receiptUrl || undefined,
      };
      await expenseService.createExpense(body);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not save expense');
    }
    setSaving(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const inputStyle = [s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }];

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="close-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[s.topTitle, { color: colors.text }]}>New Expense</Text>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: colors.primary, opacity: (saving || uploadingReceipt) ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving || uploadingReceipt}>
          {uploadingReceipt
            ? <ActivityIndicator size="small" color="#fff" />
            : saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Expense Type */}
        <Field>
          <Label text="Expense Type" colors={colors} />
          <SelectChips
            options={Object.entries(EXPENSE_TYPES).map(([k, v]) => ({ key: k, ...v }))}
            value={expenseType}
            onChange={setExpenseType}
            colors={colors}
            keyExtractor={o => o.key}
            labelExtractor={o => o.label}
          />
        </Field>

        {/* Description */}
        <Field>
          <Label text="Description *" colors={colors} />
          <TextInput
            style={inputStyle}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Business travel to Mumbai"
            placeholderTextColor={colors.textLight}
          />
        </Field>

        {/* Category */}
        {categories.length > 0 && (
          <Field>
            <Label text="Category" colors={colors} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.chipsRow}>
                <TouchableOpacity
                  style={[s.chip, { borderColor: categoryId === null ? colors.primary : colors.border,
                    backgroundColor: categoryId === null ? colors.primary + '18' : colors.background }]}
                  onPress={() => setCategoryId(null)}>
                  <Text style={[s.chipText, { color: categoryId === null ? colors.primary : colors.textSecondary }]}>
                    None
                  </Text>
                </TouchableOpacity>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[s.chip, { borderColor: categoryId === cat.id ? colors.primary : colors.border,
                      backgroundColor: categoryId === cat.id ? colors.primary + '18' : colors.background }]}
                    onPress={() => setCategoryId(cat.id)}>
                    <Text style={[s.chipText, { color: categoryId === cat.id ? colors.primary : colors.textSecondary }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Field>
        )}

        {/* Vendor fields (vendor_bill only) */}
        {expenseType === 'vendor_bill' && (
          <>
            <Field>
              <Label text="Vendor Name" colors={colors} />
              <TextInput
                style={inputStyle}
                value={vendorName}
                onChangeText={setVendorName}
                placeholder="Vendor / Supplier name"
                placeholderTextColor={colors.textLight}
              />
            </Field>
            <Field>
              <Label text="Vendor GSTIN" colors={colors} />
              <TextInput
                style={inputStyle}
                value={vendorGSTIN}
                onChangeText={t => setVendorGSTIN(t.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                placeholderTextColor={colors.textLight}
                autoCapitalize="characters"
                maxLength={15}
              />
            </Field>
          </>
        )}

        {/* Date */}
        <Field>
          <Label text="Expense Date" colors={colors} />
          <TouchableOpacity
            style={[s.input, s.dateRow, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => setShowDate(true)}>
            <Icon name="calendar-outline" size={16} color={colors.primary} />
            <Text style={[s.dateText, { color: colors.text }]}>{fmtDate(expenseDate.toISOString())}</Text>
          </TouchableOpacity>
          {showDate && (
            <DateTimePicker
              value={expenseDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, d) => { setShowDate(false); if (d) setExpenseDate(d); }}
            />
          )}
        </Field>

        {/* Amount */}
        <Field>
          <Label text="Base Amount (₹) *" colors={colors} />
          <TextInput
            style={inputStyle}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textLight}
          />
        </Field>

        {/* GST Rate */}
        <Field>
          <Label text="GST Rate" colors={colors} />
          <SelectChips
            options={GST_RATES}
            value={gstRate}
            onChange={setGstRate}
            colors={colors}
            keyExtractor={r => r}
            labelExtractor={r => r === 0 ? 'None' : `${r}%`}
          />
        </Field>

        {/* ITC toggle (vendor_bill only) */}
        {expenseType === 'vendor_bill' && gstRate > 0 && (
          <Field>
            <View style={s.switchRow}>
              <View>
                <Text style={[s.switchLabel, { color: colors.text }]}>Claim Input Tax Credit (ITC)</Text>
                <Text style={[s.switchSub, { color: colors.textLight }]}>
                  Post GST to Input Credit accounts
                </Text>
              </View>
              <Switch
                value={hasITC}
                onValueChange={setHasITC}
                trackColor={{ true: colors.primary }}
                thumbColor={hasITC ? '#fff' : '#f4f3f4'}
              />
            </View>
          </Field>
        )}

        {/* Payment Mode */}
        <Field>
          <Label text="Payment Mode" colors={colors} />
          <SelectChips
            options={[
              { key: 'bank',   label: 'Bank'   },
              { key: 'cash',   label: 'Cash'   },
              { key: 'credit', label: 'Credit' },
            ]}
            value={paymentMode}
            onChange={setPaymentMode}
            colors={colors}
            keyExtractor={o => o.key}
            labelExtractor={o => o.label}
          />
          {paymentMode === 'credit' && (
            <Text style={[s.hintText, { color: colors.textLight }]}>
              Credit — journal entry on approval, separate pay step required
            </Text>
          )}
          {paymentMode !== 'credit' && (
            <Text style={[s.hintText, { color: colors.textLight }]}>
              Bank / Cash — marked paid immediately on approval
            </Text>
          )}
        </Field>

        {/* Notes */}
        <Field>
          <Label text="Notes" colors={colors} />
          <TextInput
            style={[inputStyle, s.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes…"
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Field>

        {/* Receipt photo */}
        <Field>
          <Label text="Receipt Photo" colors={colors} />
          {receiptUri ? (
            <View style={s.receiptWrap}>
              <Image source={{ uri: receiptUri }} style={s.receiptImage} resizeMode="cover" />
              <TouchableOpacity
                style={[s.receiptRemove, { backgroundColor: colors.error || '#EF4444' }]}
                onPress={() => setReceiptUri(null)}>
                <Icon name="close" size={14} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.receiptChange, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={pickReceipt}>
                <Icon name="camera-outline" size={14} color={colors.primary} />
                <Text style={[s.receiptChangeText, { color: colors.primary }]}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.receiptPicker, { borderColor: colors.primary + '60', backgroundColor: colors.primary + '08' }]}
              onPress={pickReceipt}>
              <Icon name="camera-outline" size={28} color={colors.primary} />
              <Text style={[s.receiptPickerText, { color: colors.primary }]}>Take / Choose Receipt</Text>
              <Text style={[s.receiptPickerSub, { color: colors.textLight }]}>Camera or Gallery</Text>
            </TouchableOpacity>
          )}
        </Field>

        {/* Amount summary card */}
        {baseAmt > 0 && (
          <View style={[s.summaryCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Base Amount</Text>
              <Text style={[s.summaryValue, { color: colors.text }]}>₹{baseAmt.toLocaleString('en-IN')}</Text>
            </View>
            {taxTotal > 0 && (
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>GST ({gstRate}%)</Text>
                <Text style={[s.summaryValue, { color: colors.text }]}>₹{taxTotal.toLocaleString('en-IN')}</Text>
              </View>
            )}
            <View style={[s.summaryRow, s.summaryTotal]}>
              <Text style={[s.summaryTotalLabel, { color: colors.primary }]}>Total</Text>
              <Text style={[s.summaryTotalValue, { color: colors.primary }]}>
                ₹{totalAmt.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1 },
  topBar:    { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 12,
               paddingHorizontal: 12, borderBottomWidth: 0.5 },
  backBtn:   { padding: 6 },
  topTitle:  { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  saveBtn:   { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll:    { padding: 16, gap: 4 },
  fieldWrap: { marginBottom: 16 },
  label:     { fontSize: 12, fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 },
  input:     { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
               fontSize: 14 },
  textArea:  { minHeight: 72, paddingTop: 10 },
  dateRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText:  { fontSize: 14, fontWeight: '500' },
  chipsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText:  { fontSize: 13, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               paddingVertical: 4 },
  switchLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  switchSub:   { fontSize: 12 },
  hintText:  { fontSize: 11, marginTop: 6 },
  receiptWrap:   { position: 'relative' },
  receiptImage:  { width: '100%', height: 180, borderRadius: 12 },
  receiptRemove: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13,
                   alignItems: 'center', justifyContent: 'center' },
  receiptChange: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center',
                   gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  receiptChangeText: { fontSize: 12, fontWeight: '600' },
  receiptPicker: { alignItems: 'center', justifyContent: 'center', gap: 6,
                   height: 110, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed' },
  receiptPickerText: { fontSize: 14, fontWeight: '700' },
  receiptPickerSub:  { fontSize: 11 },
  summaryCard:  { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6, marginTop: 4 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '600' },
  summaryTotal: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)', paddingTop: 8, marginTop: 4 },
  summaryTotalLabel: { fontSize: 15, fontWeight: '700' },
  summaryTotalValue: { fontSize: 16, fontWeight: '900' },
});
