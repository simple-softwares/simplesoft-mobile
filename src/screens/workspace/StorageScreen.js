import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../theme/ThemeContext';
import { fetchStorageQuota, fetchStorageBreakdown } from '../../store/slices/storageSlice';
import StorageQuotaService from '../../services/storage/quotaService';

const StorageScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();

  const workspace = useSelector(s => s.workspace);
  const plan = useSelector(s => s.plan);
  const tierPricing = useSelector(s => s.tierPricing.tiers);
  const storage = useSelector(s => s.storage);

  const currentTier = plan?.tier || 'foundation';
  const tierData = tierPricing[currentTier] || {};
  const storageLimit = tierData.storage_limit_gb || 2;
  const { quota, breakdown, loading } = storage;

  // Fetch storage data on screen focus
  useFocusEffect(
    useCallback(() => {
      if (workspace.slug) {
        dispatch(fetchStorageQuota(workspace.slug));
        dispatch(fetchStorageBreakdown(workspace.slug));
      }
    }, [workspace.slug, dispatch])
  );

  const usedGb = quota?.used_gb || 0;
  const availableGb = storageLimit - usedGb;
  const percentage = StorageQuotaService.getUsagePercentage(usedGb, storageLimit);
  const status = StorageQuotaService.getStorageStatus(usedGb, storageLimit);

  const handleUpgrade = () => {
    Alert.alert(
      'Upgrade Your Plan',
      `Upgrade to ${tierData.name} or higher to increase storage limits.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'View Plans',
          onPress: () => navigation.navigate('Subscription'),
        },
      ]
    );
  };

  const StorageCategory = ({ name, icon, usageGb, percentage, color }) => {
    return (
      <View style={[s.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.categoryHeader}>
          <View style={[s.categoryIcon, { backgroundColor: color + '20' }]}>
            <Icon name={icon} size={20} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.categoryName, { color: colors.text }]}>{name}</Text>
            <Text style={[s.categorySubtext, { color: colors.textSecondary }]}>
              {StorageQuotaService.formatGB(usageGb)}
            </Text>
          </View>
          <Text style={[s.categoryPercent, { color: colors.text }]}>
            {percentage}%
          </Text>
        </View>
        <View style={[s.categoryBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View
            style={[
              s.categoryProgress,
              {
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[s.loadingText, { color: colors.textSecondary }]}>
            Loading storage info...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Icon name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.text }]}>Storage Usage</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Main Storage Meter */}
        <View style={[s.mainMeterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.meterHeader}>
            <View>
              <Text style={[s.meterLabel, { color: colors.textSecondary }]}>
                {status.status === 'unlimited' ? 'Unlimited Storage' : 'Storage Available'}
              </Text>
              <Text style={[s.meterValue, { color: colors.text }]}>
                {StorageQuotaService.formatGB(usedGb)} / {StorageQuotaService.formatGB(storageLimit)}
              </Text>
            </View>
            <View style={[s.percentBadge, { backgroundColor: status.status === 'ok' ? colors.success + '20' : colors.warning + '20' }]}>
              <Text style={[s.percentText, { color: status.status === 'ok' ? colors.success : colors.warning }]}>
                {percentage}%
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={[s.mainBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View
              style={[
                s.mainProgress,
                {
                  width: `${Math.min(percentage, 100)}%`,
                  backgroundColor: status.status === 'critical' ? '#D32F2F' :
                    status.status === 'warning' ? '#F57C00' :
                    status.status === 'moderate' ? '#FBC02D' : colors.success,
                },
              ]}
            />
          </View>

          {/* Status Message */}
          <Text style={[s.statusMessage, { color: colors.textSecondary }]}>
            {status.message}
          </Text>

          {/* Tier Info */}
          <View style={[s.tierInfo, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <View style={s.tierDetail}>
              <Text style={[s.tierLabel, { color: colors.textSecondary }]}>Current Plan</Text>
              <Text style={[s.tierValue, { color: colors.text }]}>
                {tierData.name} Tier
              </Text>
            </View>
            {percentage >= 80 && (
              <TouchableOpacity
                style={[s.upgradeBtn, { backgroundColor: colors.primary }]}
                onPress={handleUpgrade}
              >
                <Icon name="arrow-up-circle-outline" size={16} color="#fff" />
                <Text style={s.upgradeBtnText}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Warning Alert */}
        {percentage >= 80 && (
          <View style={[s.alertBox, { backgroundColor: '#F57C00' + '15', borderColor: '#F57C00' }]}>
            <Icon name="warning" size={18} color="#F57C00" />
            <View style={{ flex: 1 }}>
              <Text style={[s.alertTitle, { color: '#F57C00' }]}>
                {percentage >= 95 ? 'Storage Full' : 'Storage Running Low'}
              </Text>
              <Text style={[s.alertText, { color: '#F57C00' }]}>
                {percentage >= 95
                  ? 'You cannot upload more files. Delete some or upgrade your plan.'
                  : 'You are approaching your storage limit. Consider upgrading to a higher plan.'}
              </Text>
            </View>
          </View>
        )}

        {/* Storage Breakdown */}
        <View>
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>
            Storage Breakdown
          </Text>

          {breakdown.documents && (
            <StorageCategory
              name="Documents"
              icon="document-outline"
              usageGb={breakdown.documents.size_gb}
              percentage={Math.round((breakdown.documents.size_gb / storageLimit) * 100)}
              color="#2196F3"
            />
          )}

          {breakdown.images && (
            <StorageCategory
              name="Images"
              icon="image-outline"
              usageGb={breakdown.images.size_gb}
              percentage={Math.round((breakdown.images.size_gb / storageLimit) * 100)}
              color="#4CAF50"
            />
          )}

          {breakdown.videos && (
            <StorageCategory
              name="Videos"
              icon="play-circle-outline"
              usageGb={breakdown.videos.size_gb}
              percentage={Math.round((breakdown.videos.size_gb / storageLimit) * 100)}
              color="#FF5722"
            />
          )}

          {breakdown.other && (
            <StorageCategory
              name="Other Files"
              icon="folder-outline"
              usageGb={breakdown.other.size_gb}
              percentage={Math.round((breakdown.other.size_gb / storageLimit) * 100)}
              color="#9C27B0"
            />
          )}
        </View>

        {/* Tier Comparison */}
        <View style={s.tierComparison}>
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>
            Upgrade to More Storage
          </Text>

          {['operations', 'automated', 'enterprise'].map(tierKey => {
            if (tierKey === currentTier) return null;

            const tier = tierPricing[tierKey];
            return (
              <TouchableOpacity
                key={tierKey}
                style={[s.tierCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Subscription')}
              >
                <View style={s.tierCardContent}>
                  <View>
                    <Text style={[s.tierCardName, { color: colors.text }]}>
                      {tier.name}
                    </Text>
                    <Text style={[s.tierCardStorage, { color: colors.textSecondary }]}>
                      {tier.storage_limit_gb ? `${tier.storage_limit_gb} GB storage` : 'Unlimited storage'}
                    </Text>
                    <Text style={[s.tierCardPrice, { color: colors.primary }]}>
                      ₹{tier.monthly}/mo
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={24} color={colors.primary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Storage Tips */}
        <View style={[s.tipsBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
          <Icon name="bulb-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[s.tipsTitle, { color: colors.primary }]}>Storage Tips</Text>
            <Text style={[s.tipsText, { color: colors.text }]}>
              • Compress images before uploading{'\n'}
              • Delete old project files{'\n'}
              • Archive completed projects{'\n'}
              • Clean up temporary files regularly
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 20 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 13 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'space-between' },
  backBtn: { width: 24 },
  title: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },

  // Main Meter
  mainMeterCard: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
  meterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  meterLabel: { fontSize: 12 },
  meterValue: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  percentBadge: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  percentText: { fontSize: 20, fontWeight: '700' },

  mainBar: { height: 8, borderRadius: 4, overflow: 'hidden', borderWidth: 0.5, marginBottom: 12 },
  mainProgress: { height: '100%', borderRadius: 4 },
  statusMessage: { fontSize: 12, marginBottom: 12 },

  tierInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1 },
  tierDetail: {},
  tierLabel: { fontSize: 11, marginBottom: 2 },
  tierValue: { fontSize: 13, fontWeight: '600' },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  upgradeBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Alert
  alertBox: { margin: 16, padding: 12, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 12 },
  alertTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  alertText: { fontSize: 12 },

  // Section
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', paddingHorizontal: 16, marginTop: 20, marginBottom: 12, letterSpacing: 0.5 },

  // Category Cards
  categoryCard: { marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
  categoryIcon: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  categoryName: { fontSize: 13, fontWeight: '600' },
  categorySubtext: { fontSize: 11, marginTop: 2 },
  categoryPercent: { fontSize: 12, fontWeight: '600' },
  categoryBar: { height: 4, borderRadius: 2, overflow: 'hidden', borderWidth: 0.5 },
  categoryProgress: { height: '100%', borderRadius: 2 },

  // Tier Comparison
  tierComparison: { paddingHorizontal: 16, marginTop: 12 },
  tierCard: { marginBottom: 12, padding: 14, borderRadius: 10, borderWidth: 1 },
  tierCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierCardName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  tierCardStorage: { fontSize: 12, marginBottom: 6 },
  tierCardPrice: { fontSize: 13, fontWeight: '600' },

  // Tips
  tipsBox: { margin: 16, padding: 12, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 12 },
  tipsTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  tipsText: { fontSize: 11, lineHeight: 16 },
});

export default StorageScreen;
