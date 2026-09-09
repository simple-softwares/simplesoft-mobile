import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  ActivityIndicator, StyleSheet, FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PricingService from '../../services/billing/pricingService';
import { useTheme } from '../../theme/ThemeContext';
import { useSelector } from 'react-redux';
import { TIER_FEATURES } from '../../config/tierFeatures';

// --- FEATURE MAPPING ---
// Keys must match entries in TIER_FEATURES (tierFeatures.js)
const UI_FEATURES = [
  { key: 'projects',   label: 'Projects & Tasks' },
  { key: 'notes',      label: 'Notes & Contacts' },
  { key: 'chat',       label: 'Chat & File Sharing' },
  { key: 'crm',        label: 'CRM & Sales' },
  { key: 'inventory',  label: 'Inventory & Purchase' },
  { key: 'hr',         label: 'HR & Attendance' },
  { key: 'ai',         label: 'Local AI & Automations' },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. DASHBOARD SCREEN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DashboardScreen = ({ tiers, addons, colors, onOpenPlans, onOpenCheckout, navigation }) => {
  const [cartAddons, setCartAddons] = useState({});
  const [footerVisible, setFooterVisible] = useState(false);
  const s = useMemo(() => createStyles(colors), [colors]);
  const reduxPlan = useSelector(s => s.plan);
  const currentPlanKey = reduxPlan?.tier || 'foundation';
  const currentCycle = reduxPlan?.billing_cycle || 'monthly';

  const isFreePlan = currentPlanKey === 'foundation';
  const currentTier = tiers[currentPlanKey];

  const updateAddon = (code, delta) => {
    const newVal = (cartAddons[code] || 0) + delta;
    if (newVal >= 0) {
      setCartAddons({ ...cartAddons, [code]: newVal });
      let total = 0;
      addons.forEach(a => {
        total += ((code === a.code ? newVal : (cartAddons[a.code] || 0)) * a.price);
      });
      setFooterVisible(total > 0);
    }
  };

  const totalAddonPrice = useMemo(() => {
    let total = 0;
    addons.forEach(a => {
      total += ((cartAddons[a.code] || 0) * a.price);
    });
    return total;
  }, [cartAddons, addons]);

  const handleCheckout = () => {
    const selectedAddons = addons
      .filter(a => cartAddons[a.code] > 0)
      .map(a => ({ ...a, qty: cartAddons[a.code] }));
    onOpenCheckout('addons', selectedAddons, totalAddonPrice);
  };

  const renderAddonCard = ({ item: addon }) => (
    <View style={s.addonCard}>
      <View style={s.addonInfoWrap}>
        <View style={[s.addonIconWrap, { backgroundColor: (addon.color || colors.primary) + '15' }]}>
          <Icon name={addon.icon || 'cube-outline'} size={24} color={addon.color || colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.addonName}>{addon.name}</Text>
          <Text style={s.addonDesc}>{addon.short_description}</Text>
          <Text style={s.addonPrice}>₹{addon.price}/mo</Text>
        </View>
      </View>
      <View style={s.stepper}>
        <TouchableOpacity onPress={() => updateAddon(addon.code, -1)} style={s.stepBtn}>
          <Icon name="remove" size={18} color={colors.primary} />
        </TouchableOpacity>
        <Text style={s.stepVal}>{cartAddons[addon.code] || 0}</Text>
        <TouchableOpacity onPress={() => updateAddon(addon.code, 1)} style={s.stepBtn}>
          <Icon name="add" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}><Icon name="chevron-back" size={26} color={colors.primary} /></TouchableOpacity>
        <Text style={s.headerTitle}>All Modules</Text>
      </View>

      <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionTitle}>Current Subscription</Text>

        <View style={s.activePlanCard}>
          <View style={s.apcOverlayCircle} />
          <View style={s.apcHeader}>
            <Icon name="business" size={24} color="#fff" />
            <View style={s.apcBadge}><Text style={s.apcBadgeText}>ACTIVE</Text></View>
          </View>
          <Text style={s.apcName}>{currentTier?.name || 'Loading...'}</Text>
          <Text style={s.apcCycle}>
            {isFreePlan ? 'Free Tier' : `Billed ${currentCycle === 'annual' ? 'Annually' : 'Monthly'}`}
          </Text>
          <TouchableOpacity style={s.apcBtn} onPress={onOpenPlans} activeOpacity={0.9}>
            <Text style={s.apcBtnText}>{isFreePlan ? 'Upgrade Plan' : 'Change Plan'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>Add-ons Marketplace</Text>
        <Text style={s.sectionDesc}>Buy power-ups instantly. Add-ons are billed monthly and active immediately.</Text>

        <View style={s.addonsGroup}>
          <FlatList
            data={addons}
            renderItem={renderAddonCard}
            keyExtractor={(item) => item.code}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>

      {footerVisible && (
        <View style={s.footer}>
          <View>
            <Text style={s.footerLabel}>Add-ons Total</Text>
            <Text style={s.footerPrice}>₹{totalAddonPrice.toLocaleString('en-IN')}</Text>
          </View>
          <TouchableOpacity style={s.btnPrimary} onPress={handleCheckout} activeOpacity={0.8}>
            <Text style={s.btnPrimaryText}>Checkout</Text>
            <Icon name="arrow-forward" size={18} color={colors.surface} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. PLANS SCREEN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PlansScreen = ({ tiers, colors, onOpenCheckout, onBack }) => {
  const reduxPlan = useSelector(s => s.plan);
  const currentPlanKey = reduxPlan?.tier || 'foundation';
  const currentCycle = reduxPlan?.billing_cycle || 'monthly';
  const [selectedPlan, setSelectedPlan] = useState(currentPlanKey);
  const [billingCycle, setBillingCycle] = useState(currentCycle);
  const s = useMemo(() => createStyles(colors), [colors]);

  const planOrder = ['foundation', 'operations', 'automated'];
  const selectedTierData = tiers[selectedPlan];
  const selectedPrice = billingCycle === 'annual'
    ? selectedTierData?.annual || 0
    : selectedTierData?.monthly || 0;

  const showFooter = selectedPlan !== currentPlanKey || billingCycle !== currentCycle;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.iconBtn}><Icon name="chevron-back" size={26} color={colors.primary} /></TouchableOpacity>
        <Text style={s.headerTitle}>Available Plans</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>
        <View style={s.toggleWrap}>
          <TouchableOpacity
            style={[s.toggleBtn, billingCycle === 'monthly' && s.toggleBtnActive]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text style={[s.toggleBtnText, billingCycle === 'monthly' && s.toggleBtnTextActive]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, billingCycle === 'annual' && s.toggleBtnActive]}
            onPress={() => setBillingCycle('annual')}
          >
            <Text style={[s.toggleBtnText, billingCycle === 'annual' && s.toggleBtnTextActive]}>
              Annually (-10%)
            </Text>
          </TouchableOpacity>
        </View>

        {planOrder.map(planKey => {
          const tierData = tiers[planKey];
          if (!tierData) return null;

          const isSelected = selectedPlan === planKey;
          const isCurrent = currentPlanKey === planKey;
          const price = billingCycle === 'annual' ? tierData.annual : tierData.monthly;

          return (
            <TouchableOpacity
              key={planKey}
              style={[s.planCard, isSelected && s.planCardActive, isCurrent && s.planCardCurrent]}
              onPress={() => setSelectedPlan(planKey)}
              activeOpacity={0.9}
            >
              {isCurrent && (
                <View style={s.badgeCurrent}><Text style={s.badgeCurrentText}>YOUR PLAN</Text></View>
              )}

              <View style={s.planCardHeader}>
                <Text style={s.planCardName}>{tierData.name}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.planCardPrice}>{price === 0 ? 'FREE' : `₹${price.toLocaleString('en-IN')}`}</Text>
                  {price !== 0 && <Text style={s.planCardPeriod}>/{billingCycle === 'annual' ? 'yr' : 'mo'}</Text>}
                </View>
              </View>

              <View style={s.planFeatures}>
                {UI_FEATURES.map((feat) => {
                  const enabled = TIER_FEATURES[planKey]?.includes(feat.key);
                  return (
                    <View key={feat.key} style={s.featureItem}>
                      <Icon
                        name={enabled ? 'checkmark-circle' : 'close-circle'}
                        size={20}
                        color={enabled ? colors.success : colors.border}
                      />
                      <Text style={[s.featureText, !enabled && s.featureTextDisabled]}>
                        {feat.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {showFooter && (
        <View style={s.footer}>
          <View>
            <Text style={s.footerLabel}>New Plan Total</Text>
            <Text style={s.footerPrice}>₹{selectedPrice.toLocaleString('en-IN')}</Text>
          </View>
          <TouchableOpacity
            style={s.btnPrimary}
            onPress={() => onOpenCheckout('plan', {
              plan: selectedPlan,
              name: selectedTierData.name,
              cycle: billingCycle,
              modules: TIER_FEATURES[selectedPlan] || []
            }, selectedPrice)}
            activeOpacity={0.8}
          >
            <Text style={s.btnPrimaryText}>Review</Text>
            <Icon name="arrow-forward" size={18} color={colors.surface} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN CONTROLLER (Fetches API & Manages Screens)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function BillingPlanScreen({ navigation }) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeScreen, setActiveScreen] = useState('dashboard');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Run both API calls in parallel
      const [tiersData, addonsData] = await Promise.all([
        PricingService.getTierPricing(true),
        PricingService.getAddons(true)
      ]);

      setApiData({ tiers: tiersData, addons: addonsData });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color={colors.primary} style={s.loaderWrap} />
      </SafeAreaView>
    );
  }

  if (error || !apiData) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loaderWrap}>
          <Text style={{color: colors.error}}>Failed to load pricing data.</Text>
          <TouchableOpacity onPress={loadData} style={{marginTop: 10}}>
             <Text style={{color: colors.primary}}>Tap to Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Valid module keys that exist in the backend
  const VALID_MODULES = ['tasks', 'contacts', 'notes', 'teams', 'crm', 'sales', 'hr', 'inventory', 'accounting', 'purchase', 'manufacturing', 'ai', 'performance', 'automation', 'calendar', 'chat', 'files'];

  const handleCheckout = (mode, data, total) => {
    let checkoutData = { ...data };

    // Filter modules to only valid ones
    if (mode === 'plan' && checkoutData.modules) {
      checkoutData.modules = checkoutData.modules.filter(m => VALID_MODULES.includes(m));
      if (checkoutData.modules.length === 0) {
      }
    }

    // Navigate to standalone CheckoutScreen with params
    navigation.navigate('Checkout', {
      mode: mode,
      data: checkoutData,
      total: total,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {activeScreen === 'dashboard' && (
        <DashboardScreen
          tiers={apiData.tiers}
          addons={apiData.addons}
          colors={colors}
          navigation={navigation}
          onOpenPlans={() => setActiveScreen('plans')}
          onOpenCheckout={handleCheckout}
        />
      )}

      {activeScreen === 'plans' && (
        <PlansScreen
          tiers={apiData.tiers}
          colors={colors}
          onOpenCheckout={handleCheckout}
          onBack={() => setActiveScreen('dashboard')}
        />
      )}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DYNAMIC STYLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  iconBtn: { padding: 4 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  sectionDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: 12, lineHeight: 18 },

  activePlanCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  apcOverlayCircle: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  apcHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  apcBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  apcBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  apcName: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 2 },
  apcCycle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginBottom: 20 },
  apcBtn: { backgroundColor: colors.surface, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  apcBtnText: { fontSize: 15, fontWeight: '700', color: colors.primary },

  addonsGroup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addonCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addonInfoWrap: { flexDirection: 'row', flex: 1, alignItems: 'center', paddingRight: 12 },
  addonIconWrap: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  addonName: { fontSize: 16, fontWeight: '600', color: colors.text },
  addonDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  addonPrice: { fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  stepBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  stepVal: { width: 28, textAlign: 'center', fontSize: 16, fontWeight: '600', color: colors.text },

  lockedState: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  lockedTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  lockedDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },
  lockedCta: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: 16 },

  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: 8,
    padding: 3,
    marginBottom: 20,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  toggleBtnTextActive: { color: colors.text },

  planCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  planCardActive: { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
  planCardCurrent: { borderColor: colors.success },
  badgeCurrent: { position: 'absolute', top: -10, right: 20, backgroundColor: colors.success, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeCurrentText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  planCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  planCardName: { fontSize: 22, fontWeight: '700', color: colors.text },
  planCardPrice: { fontSize: 26, fontWeight: '800', color: colors.primary, lineHeight: 30 },
  planCardPeriod: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, alignSelf: 'flex-end', marginTop: 2 },
  planFeatures: { gap: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 15, color: colors.text, fontWeight: '500' },
  featureTextDisabled: { color: colors.textSecondary, fontWeight: '400', textDecorationLine: 'line-through' },

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 16, marginBottom: 8 },
  summaryLabel: { fontSize: 16, color: colors.text, fontWeight: '500' },
  summarySubtext: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  summaryValue: { fontSize: 16, fontWeight: '600', color: colors.text },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  summaryTotalLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  summaryTotalValue: { fontSize: 16, fontWeight: '700', color: colors.primary },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 10,
  },
  footerLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' },
  footerPrice: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 2 },
  btnPrimary: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

// import React, { useState, useEffect } from 'react';
// import { Text, ScrollView, SafeAreaView, ActivityIndicator, StyleSheet } from 'react-native';
// import PricingService from '../../services/billing/pricingService';

// const BillingPlanScreen = ({ navigation }) => {
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     loadData();
//   }, []);

//   const loadData = async () => {
//     try {
//       setLoading(true);
//       const tiersData = await PricingService.getTierPricing(true);
//       const addonsData = await PricingService.getAddons(true);

//       const apiData = {
//         tiers: tiersData,
//         addons: addonsData,
//       };

//       setData(apiData);
//     } catch (e) {
//       setError(e.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <ActivityIndicator size="large" color="#007AFF" />
//       </SafeAreaView>
//     );
//   }

//   if (error) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
//           <Text style={styles.title}>ERROR</Text>
//           <Text style={styles.text}>{error}</Text>
//         </ScrollView>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
//         <Text style={styles.title}>API Response Data</Text>
//         <Text style={styles.text}>{JSON.stringify(data, null, 2)}</Text>
//       </ScrollView>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F5F5F5' },
//   scroll: { flex: 1 },
//   content: { padding: 16, paddingBottom: 40 },
//   title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#000' },
//   text: { fontSize: 12, color: '#333', lineHeight: 18, fontFamily: 'monospace' },
// });

// export default BillingPlanScreen;
