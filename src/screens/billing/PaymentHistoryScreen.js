import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, FlatList, Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../theme/ThemeContext';
import PricingService from '../../services/billing/pricingService';

const PaymentHistoryScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const workspace = useSelector(s => s.workspace);

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch payments on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchPayments();
    }, [workspace.slug])
  );

  const fetchPayments = async () => {
    if (!workspace.slug) return;
    setLoading(true);
    try {
      const paymentsList = await PricingService.getPayments(workspace.slug);
      setPayments(paymentsList);
    } catch (e) {
      // Show empty state instead of error if endpoint doesn't exist
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        icon: 'time-outline',
        label: 'Pending',
        color: '#FF9800',
        bgColor: '#FF980015',
      },
      confirmed: {
        icon: 'checkmark-circle-outline',
        label: 'Confirmed',
        color: '#4CAF50',
        bgColor: '#4CAF5015',
      },
      failed: {
        icon: 'close-circle-outline',
        label: 'Failed',
        color: '#F44336',
        bgColor: '#F4433615',
      },
      refunded: {
        icon: 'arrow-undo-outline',
        label: 'Refunded',
        color: '#2196F3',
        bgColor: '#2196F315',
      },
    };
    return configs[status] || configs.pending;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return String(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(dateString);
    }
  };

  const PaymentCard = ({ item }) => {
    const statusConfig = getStatusConfig(item.state || item.status);
    const isTierBased = !!item.tier;
    const modules = !isTierBased && typeof item.modules === 'string'
      ? JSON.parse(item.modules)
      : item.modules || [];

    const title = isTierBased
      ? `${item.tier.charAt(0).toUpperCase() + item.tier.slice(1)} Tier`
      : (modules.length > 0 ? modules.join(', ') : 'Payment');

    return (
      <TouchableOpacity
        style={[styles.paymentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          setSelectedPayment(item);
          setShowDetails(true);
        }}>
        {/* Left side - Icon and info */}
        <View style={styles.cardLeft}>
          <View style={[styles.statusIcon, { backgroundColor: statusConfig.bgColor }]}>
            <Icon name={statusConfig.icon} size={20} color={statusConfig.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {title}
            </Text>
            <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
              {formatDate(item.payment_date || item.created_at)}
            </Text>
          </View>
        </View>

        {/* Right side - Amount and status */}
        <View style={styles.cardRight}>
          <Text style={[styles.cardAmount, { color: colors.text }]}>
            ₹{(item.total_amount || item.amount || 0).toLocaleString('en-IN')}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const PaymentDetailsModal = () => {
    if (!selectedPayment) return null;

    const statusConfig = getStatusConfig(selectedPayment.state || selectedPayment.status);
    const isTierBased = !!selectedPayment.tier;
    const modules = !isTierBased && typeof selectedPayment.modules === 'string'
      ? JSON.parse(selectedPayment.modules)
      : selectedPayment.modules || [];

    return (
      <Modal visible={showDetails} transparent animationType="slide" onRequestClose={() => setShowDetails(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowDetails(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Payment Details</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Status Section */}
              <View style={[styles.section, { backgroundColor: statusConfig.bgColor }]}>
                <View style={styles.statusSection}>
                  <Icon name={statusConfig.icon} size={24} color={statusConfig.color} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {statusConfig.label}
                    </Text>
                    <Text style={[styles.sectionSubtext, { color: colors.textSecondary }]}>
                      {selectedPayment.status === 'pending' && 'Waiting for verification'}
                      {selectedPayment.status === 'confirmed' && 'Payment approved and processed'}
                      {selectedPayment.status === 'failed' && 'Payment could not be processed'}
                      {selectedPayment.status === 'refunded' && 'Payment has been refunded'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Subscription Details (Tier-based) */}
              {isTierBased && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Subscription Details</Text>
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Tier</Text>
                    <Text style={[styles.breakdownValue, { color: colors.text }]}>
                      {selectedPayment.tier.charAt(0).toUpperCase() + selectedPayment.tier.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Duration</Text>
                    <Text style={[styles.breakdownValue, { color: colors.text }]}>
                      {selectedPayment.duration_months} month{selectedPayment.duration_months > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              )}

              {/* Payment Information */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Amount</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  ₹{(selectedPayment.total_amount || selectedPayment.amount || 0).toLocaleString('en-IN')}
                </Text>
              </View>

              {/* Breakdown */}
              {(selectedPayment.base_amount || selectedPayment.discount_amount) && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Breakdown</Text>
                  {selectedPayment.base_amount && (
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Base Amount</Text>
                      <Text style={[styles.breakdownValue, { color: colors.text }]}>
                        ₹{(selectedPayment.base_amount || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  )}
                  {selectedPayment.discount_amount > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { color: colors.success }]}>
                        Discount {selectedPayment.discount_percent && `(${selectedPayment.discount_percent}%)`}
                      </Text>
                      <Text style={[styles.breakdownValue, { color: colors.success }]}>
                        -₹{(selectedPayment.discount_amount || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Modules (Legacy module-based payments) */}
              {!isTierBased && modules.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Modules</Text>
                  <View style={[styles.modulesList, { backgroundColor: colors.background }]}>
                    {modules.map((mod, idx) => (
                      <View key={idx}>
                        <Text style={[styles.moduleItem, { color: colors.text }]}>• {mod}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Duration (Legacy module-based payments) */}
              {!isTierBased && selectedPayment.months && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Duration</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {selectedPayment.months} month{selectedPayment.months > 1 ? 's' : ''}
                  </Text>
                </View>
              )}

              {/* Payment Method */}
              {selectedPayment.method && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Payment Method</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {{
                      upi:           'UPI Payment',
                      cash:          'Cash',
                      bank_transfer: 'Bank Transfer',
                      cheque:        'Cheque',
                      card:          'Card',
                      online:        'Online Gateway',
                    }[selectedPayment.method] || selectedPayment.method || '—'}
                  </Text>
                </View>
              )}

              {/* Transaction Reference */}
              {selectedPayment.transaction_ref && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Transaction Reference</Text>
                  <View style={[styles.refBox, { backgroundColor: colors.background }]}>
                    <Text style={[styles.refValue, { color: colors.text }]}>
                      {selectedPayment.transaction_ref}
                    </Text>
                  </View>
                </View>
              )}

              {/* Dates */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Payment Date</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatDate(selectedPayment.payment_date)}
                </Text>
              </View>

              {selectedPayment.confirmed_date && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Confirmed Date</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {formatDate(selectedPayment.confirmed_date)}
                  </Text>
                </View>
              )}

              {/* Notes */}
              {selectedPayment.notes && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Notes</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {selectedPayment.notes}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Payment History</Text>
          </View>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Payment History</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {payments.length} transaction{payments.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Payments List */}
      {payments.length > 0 ? (
        <FlatList
          data={payments}
          renderItem={({ item }) => <PaymentCard item={item} />}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      ) : (
        <View style={styles.emptyState}>
          <Icon name="receipt-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>No payments yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Your payment history will appear here
          </Text>
        </View>
      )}

      {/* Payment Details Modal */}
      <PaymentDetailsModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 11,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  cardAmount: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  sectionSubtext: {
    fontSize: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 12,
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  modulesList: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  moduleItem: {
    fontSize: 12,
    paddingVertical: 4,
  },
  refBox: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  refValue: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default PaymentHistoryScreen;
