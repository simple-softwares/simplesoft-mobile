import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../theme/ThemeContext';
import axios from 'axios';
import { PROVISION_BASE } from '../../config';

const BuyTeamSeatsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const workspace = useSelector(s => s.workspace);
  const user = useSelector(s => s.auth?.user);

  const [currentTeamSize, setCurrentTeamSize] = useState(workspace?.team_size || 1);
  const [additionalSeats, setAdditionalSeats] = useState(1);
  const [purchasing, setPurchasing] = useState(false);

  const costPerSeat = 50;
  const totalCost = additionalSeats * costPerSeat;
  const newTeamSize = currentTeamSize + additionalSeats;

  const handlePurchase = async () => {
    try {
      setPurchasing(true);

      const res = await axios.post(
        `${PROVISION_BASE}/api/workspace/${workspace.slug}/team/update-size`,
        { team_size: newTeamSize },
        { headers: { 'X-User-Email': user?.email } }
      );

      Alert.alert(
        'Success ✓',
        `Team size increased to ${res.data.team_size} members.\n` +
        `New monthly cost: ₹${res.data.new_monthly_cost}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      const errorMsg = e.response?.data?.detail || e.message || 'Failed to purchase seats';
      Alert.alert('Error', errorMsg);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Current Status */}
        <View style={[s.statusBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statusLabel, { color: colors.textSecondary }]}>Current Team Size</Text>
          <Text style={[s.statusValue, { color: colors.primary }]}>
            {currentTeamSize} member{currentTeamSize > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Seat Selector */}
        <View style={s.selectorBox}>
          <Text style={[s.selectorLabel, { color: colors.text }]}>Number of Seats to Add</Text>
          <View style={s.seatButtons}>
            {[1, 2, 5, 10].map(num => (
              <TouchableOpacity
                key={num}
                style={[
                  s.seatBtn,
                  { borderColor: colors.border },
                  additionalSeats === num && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary
                  }
                ]}
                onPress={() => setAdditionalSeats(num)}
              >
                <Text style={[
                  s.seatBtnText,
                  { color: colors.text },
                  additionalSeats === num && { color: '#fff' }
                ]}>
                  +{num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Team Size Preview */}
        <View style={[s.previewBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
          <View style={s.previewRow}>
            <Text style={[s.previewLabel, { color: colors.text }]}>Current:</Text>
            <Text style={[s.previewValue, { color: colors.text }]}>{currentTeamSize}</Text>
          </View>
          <View style={[s.previewDivider, { backgroundColor: colors.border }]} />
          <View style={s.previewRow}>
            <Text style={[s.previewLabel, { color: colors.text }]}>After Purchase:</Text>
            <Text style={[s.previewValue, { color: colors.primary, fontWeight: '700' }]}>
              {newTeamSize}
            </Text>
          </View>
        </View>

        {/* Pricing Breakdown */}
        <View style={[s.breakdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.breakdownTitle, { color: colors.text }]}>Monthly Cost Breakdown</Text>

          <View style={s.breakdownRow}>
            <Text style={[s.breakdownLabel, { color: colors.textSecondary }]}>
              Additional Seats:
            </Text>
            <Text style={[s.breakdownValue, { color: colors.text }]}>
              {additionalSeats} × ₹{costPerSeat}
            </Text>
          </View>

          <View style={s.breakdownRow}>
            <Text style={[s.breakdownLabel, { color: colors.textSecondary }]}>
              Duration:
            </Text>
            <Text style={[s.breakdownValue, { color: colors.text }]}>
              Per month
            </Text>
          </View>

          <View style={[s.breakdownRow, s.breakdownTotal, {
            borderTopColor: colors.border,
            backgroundColor: colors.primary + '05'
          }]}>
            <Text style={[s.breakdownTotalLabel, { color: colors.text }]}>
              Monthly Cost:
            </Text>
            <Text style={[s.breakdownTotalValue, { color: colors.primary }]}>
              ₹{totalCost}
            </Text>
          </View>
        </View>

        {/* Info Box */}
        <View style={s.infoBox}>
          <Icon name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[s.infoText, { color: colors.textSecondary }]}>
            After purchase, you can immediately invite new team members up to your new quota.
          </Text>
        </View>

        {/* Pricing Info */}
        <View style={[s.pricingInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.pricingInfoTitle, { color: colors.text }]}>How it works</Text>
          <View style={s.pricingInfoItem}>
            <Icon name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={[s.pricingInfoText, { color: colors.textSecondary }]}>
              ₹50 per team member per month
            </Text>
          </View>
          <View style={s.pricingInfoItem}>
            <Icon name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={[s.pricingInfoText, { color: colors.textSecondary }]}>
              Admin always free
            </Text>
          </View>
          <View style={s.pricingInfoItem}>
            <Icon name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={[s.pricingInfoText, { color: colors.textSecondary }]}>
              Cancel anytime
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Purchase Button */}
      <TouchableOpacity
        style={[s.purchaseBtn, { backgroundColor: colors.primary }]}
        onPress={handlePurchase}
        disabled={purchasing}
      >
        {purchasing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Icon name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={s.purchaseBtnText}>Purchase for ₹{totalCost}/month</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={s.cancelBtn}
        onPress={() => navigation.goBack()}
        disabled={purchasing}
      >
        <Text style={[s.cancelBtnText, { color: colors.primary }]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, padding: 16 },
  statusBox: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  statusLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  statusValue: { fontSize: 28, fontWeight: '700' },
  selectorBox: { marginBottom: 24 },
  selectorLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  seatButtons: { flexDirection: 'row', gap: 10 },
  seatBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 2, alignItems: 'center' },
  seatBtnText: { fontSize: 14, fontWeight: '700' },
  previewBox: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  previewLabel: { fontSize: 13 },
  previewValue: { fontSize: 16, fontWeight: '700' },
  previewDivider: { height: 1, marginVertical: 8 },
  breakdown: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  breakdownTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  breakdownLabel: { fontSize: 13 },
  breakdownValue: { fontSize: 13, fontWeight: '600' },
  breakdownTotal: { borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  breakdownTotalLabel: { fontSize: 14, fontWeight: '700' },
  breakdownTotalValue: { fontSize: 18, fontWeight: '700' },
  infoBox: { flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 12, lineHeight: 16 },
  pricingInfo: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24 },
  pricingInfoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  pricingInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  pricingInfoText: { fontSize: 12, flex: 1 },
  purchaseBtn: { paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  purchaseBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  cancelBtnText: { fontSize: 14, fontWeight: '600' }
});

export default BuyTeamSeatsScreen;
