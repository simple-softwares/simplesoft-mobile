import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import PricingService from '../../services/billing/pricingService';
import { transformPricingTiers } from '../../utils/pricingCalculator';

const MONTH_OPTIONS = [
  { months: 1,  discount: 0,  label: 'Monthly'           },
  { months: 12, discount: 10, label: 'Annual (10% off)'  },
];

const ModulePurchaseModal = ({ visible, onClose, module, onPaymentSuccess }) => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [selectedMonths, setSelectedMonths] = useState(1);
  const [pricingTiers, setPricingTiers] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(true);

  // Fetch module pricing tiers on open
  useEffect(() => {
    if (visible && module) {
      loadPricingTiers();
    }
  }, [visible, module]);

  const loadPricingTiers = async () => {
    setLoadingPricing(true);
    try {
      const modules = await PricingService.getModules(null, true); // Force refresh
      const moduleData = modules?.find(m => m.key === module.key);
      if (moduleData?.pricing_tiers) {
        // Transform pricing tiers: calculate discounts dynamically and keep only 1/12 months
        const transformedTiers = transformPricingTiers(moduleData.pricing_tiers);
        setPricingTiers(transformedTiers);
      }
    } catch (e) {
    } finally {
      setLoadingPricing(false);
    }
  };

  // Get pricing for selected months
  const getPricingForMonths = () => {
    if (!pricingTiers) return null;

    const tierMap = {
      1: '1_month',
      12: '12_months',
    };
    return pricingTiers[tierMap[selectedMonths]];
  };

  const pricing = getPricingForMonths();
  const monthOption = MONTH_OPTIONS.find(m => m.months === selectedMonths);

  const handleGoToCheckout = () => {
    if (!pricing) return;
    onClose();
    navigation.navigate('Checkout', {
      mode: 'modules',
      data: {
        key:           module.key,
        name:          module.name,
        icon:          module.icon  || 'apps-outline',
        color:         module.color || '#6B7280',
        months:        selectedMonths,
        monthlyPrice:  pricing.monthly_price   || 0,
        totalPrice:    pricing.total_price      || 0,
        discount:      pricing.discount         || 0,
        discountAmount: pricing.discount_amount || 0,
      },
      total: pricing.total_price || 0,
    });
  };

  if (!module || !visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} disabled={processing}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Purchase Module</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            {/* Module Info */}
            <View style={[styles.moduleInfo, { backgroundColor: colors.background }]}>
              <View style={[styles.moduleIcon, { backgroundColor: module.color + '15' }]}>
                <Icon name={module.icon || 'apps-outline'} size={32} color={module.color} />
              </View>
              <Text style={[styles.moduleName, { color: colors.text }]}>{module.name}</Text>
              {module.description && (
                <Text style={[styles.moduleDesc, { color: colors.textSecondary }]}>
                  {module.description}
                </Text>
              )}
            </View>

            {/* Pricing Tiers */}
            {!loadingPricing && pricing ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Select Duration
                </Text>
                <View style={styles.tiersGrid}>
                  {MONTH_OPTIONS.map(option => (
                    <TouchableOpacity
                      key={option.months}
                      style={[
                        styles.tierButton,
                        {
                          backgroundColor: selectedMonths === option.months ? colors.primary + '15' : colors.background,
                          borderColor: selectedMonths === option.months ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedMonths(option.months)}
                      disabled={processing}>
                      <Text
                        style={[
                          styles.tierLabel,
                          { color: selectedMonths === option.months ? colors.primary : colors.text },
                        ]}>
                        {option.label}
                      </Text>
                      {option.discount > 0 && (
                        <View style={[styles.discountBadge, { backgroundColor: colors.success + '20' }]}>
                          <Text style={[styles.discountText, { color: colors.success }]}>
                            {option.discount}% OFF
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}

            {/* Price Breakdown */}
            {pricing && (
              <View style={[styles.priceBreakdown, { backgroundColor: colors.background }]}>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                    Monthly Price
                  </Text>
                  <Text style={[styles.priceValue, { color: colors.text }]}>
                    ₹{(pricing.monthly_price || 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                    Duration
                  </Text>
                  <Text style={[styles.priceValue, { color: colors.text }]}>
                    {pricing.months} months
                  </Text>
                </View>

                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                    Subtotal
                  </Text>
                  <Text style={[styles.priceValue, { color: colors.text }]}>
                    ₹{((pricing.monthly_price || 0) * pricing.months).toLocaleString('en-IN')}
                  </Text>
                </View>

                {pricing.discount > 0 && (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.priceRow}>
                      <Text style={[styles.priceLabel, { color: colors.success }]}>
                        Discount ({pricing.discount}%)
                      </Text>
                      <Text style={[styles.priceValue, { color: colors.success }]}>
                        -₹{(pricing.discount_amount || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </>
                )}

                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.priceRow}>
                  <Text style={[styles.finalLabel, { color: colors.text }]}>Final Price</Text>
                  <Text style={[styles.finalPrice, { color: colors.primary }]}>
                    ₹{(pricing.total_price || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            )}

            {/* Checkout info */}
            <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
              <Icon name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>
                You'll choose UPI, bank transfer, or other payment methods on the next screen.
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.border }]}
              onPress={onClose}>
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: colors.primary }, !pricing && { opacity: 0.5 }]}
              onPress={handleGoToCheckout}
              disabled={!pricing || loadingPricing}>
              <Icon name="arrow-forward-outline" size={16} color="#fff" />
              <Text style={styles.payBtnText}>
                Proceed · ₹{(pricing?.total_price || 0).toLocaleString('en-IN')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  moduleInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  moduleIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  moduleDesc: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  tiersGrid: {
    gap: 10,
  },
  tierButton: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    position: 'relative',
  },
  tierLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 6,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  priceBreakdown: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 13,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  finalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  finalPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  payBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  payBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ModulePurchaseModal;
