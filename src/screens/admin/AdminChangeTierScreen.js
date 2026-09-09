import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import adminService from '../../services/admin/adminService';
import { colors, spacing } from '../../theme';

const tiers = [
  { id: 'foundation', label: 'Foundation — Free', price: 'Free', color: '#9E9E9E' },
  { id: 'operations', label: 'Operations — ₹599/mo', price: '₹599', color: '#2196F3' },
  { id: 'automated', label: 'Automated — ₹999/mo', price: '₹999', color: '#9C27B0' },
  { id: 'enterprise', label: 'Enterprise — Custom', price: 'Custom', color: '#FF9800' },
];

const AdminChangeTierScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { workspace, onComplete } = route.params;

  const [selectedTier, setSelectedTier] = useState(workspace.subscription?.tier || 'foundation');
  const [endDate, setEndDate] = useState(
    workspace.subscription?.end_date ? new Date(workspace.subscription.end_date) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDateChange = (event, date) => {
    if (date) {
      setEndDate(date);
    }
    setShowDatePicker(false);
  };

  const handleChangeTier = async () => {
    if (selectedTier === workspace.subscription?.tier) {
      Alert.alert('No Change', 'Please select a different tier');
      return;
    }

    Alert.alert(
      'Change Tier',
      `Change ${workspace.company_name} to ${adminService.getTierLabel(selectedTier)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              await adminService.changeTier(
                workspace.slug,
                selectedTier,
                endDate.toISOString().split('T')[0],
                reason || null
              );
              Alert.alert('Success', 'Tier changed successfully');
              onComplete?.();
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Could not change tier: ' + error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const selectedTierData = tiers.find(t => t.id === selectedTier);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Change Tier</Text>
          <Text style={styles.headerSubtitle}>
            {workspace.company_name} ({workspace.slug})
          </Text>
        </View>

        {/* Current Tier */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Tier</Text>
          <View style={styles.currentTierCard}>
            <Text style={styles.currentTierLabel}>
              {adminService.getTierLabel(workspace.subscription?.tier || 'N/A')}
            </Text>
            <Text style={styles.currentTierDate}>
              Expires: {workspace.subscription?.end_date ? new Date(workspace.subscription.end_date).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Tier Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select New Tier</Text>
          {tiers.map(tier => (
            <TouchableOpacity
              key={tier.id}
              style={[
                styles.tierOption,
                selectedTier === tier.id && styles.tierOptionSelected,
              ]}
              onPress={() => setSelectedTier(tier.id)}
            >
              <View style={styles.tierOptionContent}>
                <View
                  style={[
                    styles.tierOptionRadio,
                    selectedTier === tier.id && styles.tierOptionRadioSelected,
                  ]}
                >
                  {selectedTier === tier.id && (
                    <View style={styles.tierOptionRadioDot} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierOptionLabel}>{tier.label}</Text>
                  <Text style={styles.tierOptionPrice}>{tier.price}</Text>
                </View>
              </View>
              <MaterialIcons
                name={selectedTier === tier.id ? 'check-circle' : 'radio-button-unchecked'}
                size={24}
                color={selectedTier === tier.id ? tier.color : '#ddd'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* End Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription End Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
            <Text style={styles.dateInputText}>
              {endDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* Reason */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason for Change (Optional)</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="E.g., Customer request, trial upgrade, etc."
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholderTextColor="#999"
          />
        </View>

        {/* Summary */}
        {selectedTier !== workspace.subscription?.tier && (
          <View style={[styles.summaryCard, { borderLeftColor: selectedTierData?.color }]}>
            <Text style={styles.summaryTitle}>Change Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>From:</Text>
              <Text style={styles.summaryValue}>
                {adminService.getTierLabel(workspace.subscription?.tier || 'N/A')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>To:</Text>
              <Text style={[styles.summaryValue, { color: selectedTierData?.color }]}>
                {adminService.getTierLabel(selectedTier)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>End Date:</Text>
              <Text style={styles.summaryValue}>
                {endDate.toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.m }]}>
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            loading && styles.confirmBtnDisabled,
            selectedTier === workspace.subscription?.tier && styles.confirmBtnDisabled,
          ]}
          onPress={handleChangeTier}
          disabled={loading || selectedTier === workspace.subscription?.tier}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.confirmBtnText}>Change Tier</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.m,
  },
  header: {
    marginTop: spacing.m,
    marginBottom: spacing.l,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: spacing.s,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  section: {
    marginBottom: spacing.l,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: spacing.m,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentTierCard: {
    backgroundColor: '#fff',
    padding: spacing.m,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  currentTierLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: spacing.s,
  },
  currentTierDate: {
    fontSize: 12,
    color: '#999',
  },
  tierOption: {
    backgroundColor: '#fff',
    padding: spacing.m,
    borderRadius: 12,
    marginBottom: spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tierOptionSelected: {
    borderColor: colors.primary,
  },
  tierOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  tierOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  tierOptionRadioSelected: {
    borderColor: colors.primary,
  },
  tierOptionRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  tierOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  tierOptionPrice: {
    fontSize: 12,
    color: '#999',
  },
  dateInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateInputText: {
    marginLeft: spacing.m,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  reasonInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 14,
    color: '#333',
    maxHeight: 100,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: spacing.m,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: spacing.m,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: spacing.m,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.m,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.s,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdminChangeTierScreen;
