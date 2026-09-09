import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, FlatList, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import LeaveService from '../leaveService';
import { useTheme } from '../../../theme/ThemeContext';
import { friendlyError } from '../../../utils/errorUtils';

const LeaveRequestScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState({});
  const [selectedType, setSelectedType] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [estimatedDays, setEstimatedDays] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [types, balance] = await Promise.all([
        LeaveService.getLeaveTypes(),
        LeaveService.getLeaveBalance(),
      ]);

      setLeaveTypes(types);

      // Map balances by leave type ID for quick lookup
      const balanceMap = {};
      balance.forEach(b => {
        balanceMap[b.leaveTypeId] = b;
      });
      setBalances(balanceMap);

      // Select first leave type by default
      if (types.length > 0) {
        setSelectedType(types[0]);
      }
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;

    let count = 0;
    const current = new Date(start);

    while (current <= new Date(end)) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  };

  useEffect(() => {
    if (startDate && endDate) {
      const days = calculateDays(startDate, endDate);
      setEstimatedDays(days);
    }
  }, [startDate, endDate]);

  const handleDateSelect = (type) => {
    // Simple date picker simulation - in production, use react-native-date-picker
    Alert.prompt(`Enter ${type} date (YYYY-MM-DD)`, '', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'OK',
        onPress: (date) => {
          try {
            const parsed = new Date(date);
            if (isNaN(parsed)) {
              Alert.alert('Invalid Date', 'Please use YYYY-MM-DD format');
              return;
            }
            if (type === 'start') {
              setStartDate(parsed);
            } else {
              setEndDate(parsed);
            }
          } catch (e) {
            Alert.alert('Error', 'Invalid date format');
          }
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Validation', 'Please select leave type');
      return;
    }
    if (!startDate) {
      Alert.alert('Validation', 'Please select start date');
      return;
    }
    if (!endDate) {
      Alert.alert('Validation', 'Please select end date');
      return;
    }
    if (endDate < startDate) {
      Alert.alert('Validation', 'End date must be after start date');
      return;
    }

    const balance = balances[selectedType.id];
    if (balance && estimatedDays > parseFloat(balance.remaining)) {
      Alert.alert(
        'Insufficient Balance',
        `You only have ${balance.remaining} days remaining for ${balance.leaveTypeName}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Request Anyway', onPress: performSubmit },
        ]
      );
    } else {
      performSubmit();
    }
  };

  const performSubmit = async () => {
    setSubmitting(true);
    try {
      await LeaveService.createLeaveRequest({
        leaveTypeId: selectedType.id,
        startDate,
        endDate,
        reason,
      });

      Alert.alert('Success', 'Leave request submitted', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedBalance = selectedType ? balances[selectedType.id] : null;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Leave Type */}
        <View style={s.field}>
          <Text style={[s.label, { color: colors.text }]}>Leave Type *</Text>
          <TouchableOpacity
            style={[s.picker, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => setShowTypePicker(true)}>
            <Text style={[s.pickerText, { color: selectedType ? colors.text : colors.textLight }]}>
              {selectedType?.name || 'Select leave type'}
            </Text>
            <Icon name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Balance */}
        {selectedBalance && (
          <View style={[s.balanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.balanceItem}>
              <Text style={[s.balanceLabel, { color: colors.textSecondary }]}>Allocated</Text>
              <Text style={[s.balanceValue, { color: colors.text }]}>{selectedBalance.allocated} days</Text>
            </View>
            <View style={s.balanceDivider} />
            <View style={s.balanceItem}>
              <Text style={[s.balanceLabel, { color: colors.textSecondary }]}>Used</Text>
              <Text style={[s.balanceValue, { color: colors.text }]}>{selectedBalance.used} days</Text>
            </View>
            <View style={s.balanceDivider} />
            <View style={s.balanceItem}>
              <Text style={[s.balanceLabel, { color: colors.textSecondary }]}>Remaining</Text>
              <Text style={[s.balanceValue, parseFloat(selectedBalance.remaining) < 1 && { color: '#DC2626' }, { color: colors.text }]}>
                {selectedBalance.remaining} days
              </Text>
            </View>
          </View>
        )}

        {/* Start Date */}
        <View style={s.field}>
          <Text style={[s.label, { color: colors.text }]}>Start Date *</Text>
          <TouchableOpacity
            style={[s.picker, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => handleDateSelect('start')}>
            <Text style={[s.pickerText, { color: startDate ? colors.text : colors.textLight }]}>
              {startDate ? startDate.toLocaleDateString('en-IN') : 'Select start date'}
            </Text>
            <Icon name="calendar" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* End Date */}
        <View style={s.field}>
          <Text style={[s.label, { color: colors.text }]}>End Date *</Text>
          <TouchableOpacity
            style={[s.picker, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => handleDateSelect('end')}>
            <Text style={[s.pickerText, { color: endDate ? colors.text : colors.textLight }]}>
              {endDate ? endDate.toLocaleDateString('en-IN') : 'Select end date'}
            </Text>
            <Icon name="calendar" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Estimated Days */}
        {estimatedDays > 0 && (
          <View style={[s.daysCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
            <Icon name="alert-circle-outline" size={16} color={colors.primary} />
            <View style={s.daysInfo}>
              <Text style={[s.daysLabel, { color: colors.primary }]}>Estimated</Text>
              <Text style={[s.daysValue, { color: colors.primary }]}>{estimatedDays} working days</Text>
            </View>
          </View>
        )}

        {/* Reason */}
        <View style={s.field}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Reason (optional)</Text>
          <View style={[s.reasonInput, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <TextInput
              style={[s.reasonTextInput, { color: colors.text }]}
              placeholder="e.g., Family visit, personal..."
              placeholderTextColor={colors.textLight}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        <View style={s.spacer} />
      </ScrollView>

      {/* Submit Button */}
      <View style={[s.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.submitBtnText}>Submit Request</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Leave Type Picker Modal */}
      <Modal visible={showTypePicker} transparent animationType="slide" onRequestClose={() => setShowTypePicker(false)}>
        <View style={s.modalWrap}>
          <TouchableOpacity style={s.modalBg} onPress={() => setShowTypePicker(false)} activeOpacity={1} />
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Select Leave Type</Text>
            <FlatList
              data={leaveTypes}
              keyExtractor={t => String(t.id)}
              scrollEnabled={false}
              renderItem={({ item: type }) => (
                <TouchableOpacity
                  style={[s.option, selectedType?.id === type.id && { backgroundColor: colors.primary + '15' }]}
                  onPress={() => {
                    setSelectedType(type);
                    setShowTypePicker(false);
                  }}>
                  <View style={s.optionContent}>
                    <Text style={[s.optionText, { color: colors.text }]}>{type.name}</Text>
                    {selectedBalance && selectedType?.id === type.id && (
                      <Text style={[s.optionSubtext, { color: colors.textSecondary }]}>
                        {balances[type.id]?.remaining} days remaining
                      </Text>
                    )}
                  </View>
                  {selectedType?.id === type.id && <Icon name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 120 },
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  picker: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerText: { flex: 1, fontSize: 14 },
  balanceCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row' },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  balanceValue: { fontSize: 16, fontWeight: '700' },
  balanceDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  daysCard: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  daysInfo: { flex: 1 },
  daysLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  daysValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  reasonInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  reasonTextInput: { fontSize: 14, minHeight: 80 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: 16 },
  submitBtn: { borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  spacer: { height: 40 },
  // Modals
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '60%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  option: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionContent: { flex: 1 },
  optionText: { fontSize: 14, fontWeight: '500' },
  optionSubtext: { fontSize: 12, marginTop: 2 },
});

export default LeaveRequestScreen;
