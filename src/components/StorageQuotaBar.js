import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import StorageQuotaService from '../services/storage/quotaService';

const StorageQuotaBar = ({ usedGb, limitGb }) => {
  const { colors } = useTheme();

  if (!limitGb) {
    return null; // No limit for enterprise
  }

  const percentage = StorageQuotaService.getUsagePercentage(usedGb, limitGb);
  const status = StorageQuotaService.getStorageStatus(usedGb, limitGb);
  const availableGb = limitGb - usedGb;

  // Color based on usage
  const getBarColor = () => {
    if (percentage >= 95) return '#D32F2F'; // Critical red
    if (percentage >= 80) return '#F57C00'; // Warning orange
    if (percentage >= 50) return '#FBC02D'; // Moderate yellow
    return '#4CAF50'; // OK green
  };

  const getIconName = () => {
    if (percentage >= 95) return 'alert-circle';
    if (percentage >= 80) return 'warning';
    return 'checkmark-circle';
  };

  return (
    <View style={s.container}>
      {/* Header with icon and status */}
      <View style={s.header}>
        <View style={s.titleRow}>
          <Icon name="cloud-outline" size={16} color={colors.textSecondary} />
          <Text style={[s.title, { color: colors.text }]}>Storage Usage</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: getBarColor() + '15' }]}>
          <Icon name={getIconName()} size={14} color={getBarColor()} />
          <Text style={[s.statusText, { color: getBarColor() }]}>
            {percentage}%
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[s.barBackground, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View
          style={[
            s.barProgress,
            {
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: getBarColor(),
            },
          ]}
        />
      </View>

      {/* Details */}
      <View style={s.details}>
        <Text style={[s.detailText, { color: colors.textSecondary }]}>
          {StorageQuotaService.formatGB(usedGb)} of {StorageQuotaService.formatGB(limitGb)} used
        </Text>
        <Text style={[s.detailText, { color: colors.textSecondary }]}>
          {StorageQuotaService.formatGB(availableGb)} available
        </Text>
      </View>

      {/* Warning message */}
      {percentage >= 80 && (
        <View style={[s.warningBox, { backgroundColor: getBarColor() + '10', borderColor: getBarColor() }]}>
          <Icon name={getIconName()} size={14} color={getBarColor()} />
          <Text style={[s.warningText, { color: getBarColor() }]}>
            {percentage >= 95
              ? 'Storage is full! Delete files or upgrade your plan.'
              : 'You are approaching your storage limit. Consider upgrading your plan.'}
          </Text>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  barBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 0.5,
    marginBottom: 8,
  },
  barProgress: {
    height: '100%',
    borderRadius: 3,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 11,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  warningText: {
    fontSize: 11,
    flex: 1,
  },
});

export default StorageQuotaBar;
