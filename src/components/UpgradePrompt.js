import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { TIER_NAMES, TIER_PRICES, TIER_DESCRIPTIONS } from '../config/tierFeatures';

/**
 * Reusable upgrade prompt modal
 * Shows when user tries to access a locked feature
 */
const UpgradePrompt = ({
  visible,
  onClose,
  moduleKey,
  moduleName,
  requiredTier,
  currentTier,
}) => {
  const { colors } = useTheme();

  if (!visible) return null;

  const requiredTierName = TIER_NAMES[requiredTier];
  const currentTierName = TIER_NAMES[currentTier];

  const handleUpgradePress = () => {
    // Navigate to billing/upgrade screen
    // This will be linked to your billing navigation
    onClose();
    // TODO: Navigate to upgrade screen
    // navigation.navigate('UpgradePlan');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          {/* Handle */}
          <View style={[s.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={s.header}>
            <View style={[s.lockIcon, { backgroundColor: colors.primary + '15' }]}>
              <Icon name="lock-closed" size={28} color={colors.primary} />
            </View>
            <Text style={[s.title, { color: colors.text }]}>
              {moduleName || 'Feature'} Locked
            </Text>
            <Text style={[s.subtitle, { color: colors.textSecondary }]}>
              Available in {requiredTierName} tier
            </Text>
          </View>

          {/* Content */}
          <ScrollView contentContainerStyle={s.content}>
            <View style={[s.currentTierBox, { backgroundColor: colors.background }]}>
              <Text style={[s.boxLabel, { color: colors.textSecondary }]}>
                Your Current Plan
              </Text>
              <Text style={[s.boxTier, { color: colors.text }]}>
                {currentTierName}
              </Text>
            </View>

            <View style={s.arrow}>
              <Icon name="chevron-down" size={20} color={colors.textSecondary} />
            </View>

            <View style={[s.requiredTierBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
              <View style={[s.checkIcon, { backgroundColor: colors.primary + '30' }]}>
                <Icon name="checkmark-circle" size={24} color={colors.primary} />
              </View>
              <View style={s.tierInfo}>
                <Text style={[s.boxLabel, { color: colors.primary }]}>
                  Upgrade to
                </Text>
                <Text style={[s.boxTier, { color: colors.primary }]}>
                  {requiredTierName}
                </Text>
              </View>
            </View>

            {/* Price info */}
            <View style={[s.priceCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={s.priceRow}>
                <Text style={[s.priceLabel, { color: colors.textSecondary }]}>
                  Monthly
                </Text>
                <Text style={[s.priceValue, { color: colors.text }]}>
                  ₹{TIER_PRICES[requiredTier]?.monthly || 'Custom'}
                </Text>
              </View>
              <View style={[s.priceDivider, { backgroundColor: colors.border }]} />
              <View style={s.priceRow}>
                <Text style={[s.priceLabel, { color: colors.textSecondary }]}>
                  Annual (Save 17%)
                </Text>
                <Text style={[s.priceValue, { color: colors.text }]}>
                  ₹{TIER_PRICES[requiredTier]?.annual || 'Custom'}
                </Text>
              </View>
            </View>

            {/* Benefits */}
            <Text style={[s.benefitsTitle, { color: colors.text }]}>
              What you'll unlock:
            </Text>
            <BenefitsList requiredTier={requiredTier} colors={colors} />
          </ScrollView>

          {/* Footer Buttons */}
          <View style={[s.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[s.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[s.cancelBtnText, { color: colors.text }]}>
                Maybe Later
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.upgradeBtn, { backgroundColor: colors.primary }]}
              onPress={handleUpgradePress}
            >
              <Icon name="arrow-up-outline" size={18} color="#fff" />
              <Text style={s.upgradeBtnText}>Upgrade Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Benefits list for the upgrade tier
 */
const BenefitsList = ({ requiredTier, colors }) => {
  const benefits = {
    operations: [
      'Manage unlimited team members',
      'Complete HR & attendance tracking',
      'CRM & sales pipeline',
      'Inventory management',
      'Field operations & routing',
    ],
    automated: [
      'Everything in Operations, plus:',
      'AI-powered assistant',
      'Custom automation pipelines',
      'Advanced performance analytics',
      'Predictive insights',
    ],
    enterprise: [
      'Custom integrations',
      'Dedicated support',
      'SLA guarantees',
      'White-label options',
    ],
  };

  const benefitList = benefits[requiredTier] || [];

  return (
    <View>
      {benefitList.map((benefit, idx) => (
        <View key={idx} style={s.benefitRow}>
          <Icon name="checkmark" size={16} color={colors.primary} />
          <Text style={[s.benefitText, { color: colors.text }]}>
            {benefit}
          </Text>
        </View>
      ))}
    </View>
  );
};

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  lockIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currentTierBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  requiredTierBox: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierInfo: {
    flex: 1,
  },
  boxLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  boxTier: {
    fontSize: 16,
    fontWeight: '700',
  },
  arrow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  priceCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  priceDivider: {
    height: 1,
    marginVertical: 8,
  },
  priceLabel: {
    fontSize: 12,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  benefitsTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 10,
  },
  benefitText: {
    fontSize: 13,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  upgradeBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  upgradeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default UpgradePrompt;
