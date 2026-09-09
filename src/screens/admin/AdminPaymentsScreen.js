import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PROVISION_BASE } from '../../config';

const AdminPaymentsScreen = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchPayments();
    const interval = setInterval(fetchPayments, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await fetch(`${PROVISION_BASE}/api/admin/payments`, {
        headers: { 'X-Provision-Secret': process.env.PROVISION_SECRET || '' },
      });
      const data = await res.json();
      setPayments(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const confirmPayment = async (slug, paymentId) => {
    setConfirming(true);
    try {
      const res = await fetch(
        `${PROVISION_BASE}/api/workspace/${slug}/payment/${paymentId}/confirm`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', `Payment ${paymentId} confirmed`);
        setShowDetails(false);
        fetchPayments();
      } else {
        Alert.alert('Error', data.message || 'Failed to confirm payment');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setConfirming(false);
    }
  };

  const rejectPayment = async (paymentId) => {
    if (!rejectionReason.trim()) {
      Alert.alert('Required', 'Please enter rejection reason');
      return;
    }
    setConfirming(true);
    try {
      const res = await fetch(
        `${PROVISION_BASE}/api/admin/payment/${paymentId}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Provision-Secret': process.env.PROVISION_SECRET || '',
          },
          body: JSON.stringify({ reason: rejectionReason }),
        }
      );
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', `Payment ${paymentId} rejected`);
        setShowDetails(false);
        setRejectionReason('');
        fetchPayments();
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setConfirming(false);
    }
  };

  const renderPaymentCard = (item) => {
    const statusColor =
      item.status === 'confirmed'
        ? '#4CAF50'
        : item.status === 'pending'
        ? '#FF9800'
        : '#F44336';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedPayment(item);
          setShowDetails(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.workspaceSlug}>{item.workspace_slug}</Text>
            <Text style={styles.company}>{item.company_name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Icon name="cash" size={16} color="#666" />
            <Text style={styles.label}>Amount:</Text>
            <Text style={styles.value}>₹{item.amount.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.row}>
            <Icon name="calendar" size={16} color="#666" />
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>

          <View style={styles.row}>
            <Icon name="phone" size={16} color="#666" />
            <Text style={styles.label}>Method:</Text>
            <Text style={styles.value}>{item.method.toUpperCase()}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const confirmedCount = payments.filter((p) => p.status === 'confirmed').length;
  const rejectedCount = payments.filter((p) => p.status === 'failed').length;

  return (
    <View style={styles.container}>
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statTile, { backgroundColor: '#4CAF5020' }]}>
          <Text style={styles.statValue}>{confirmedCount}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        <View style={[styles.statTile, { backgroundColor: '#F4433620' }]}>
          <Text style={styles.statValue}>{rejectedCount}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>

      {/* Payments List */}
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => renderPaymentCard(item)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchPayments();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Icon name="check-circle" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No payments yet</Text>
          </View>
        }
      />

      {/* Details Modal */}
      <Modal visible={showDetails} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPayment && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Payment Details</Text>
                  <TouchableOpacity onPress={() => setShowDetails(false)}>
                    <Icon name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <DetailRow label="Payment ID" value={selectedPayment.id} />
                  <DetailRow
                    label="Workspace"
                    value={`${selectedPayment.workspace_slug} (${selectedPayment.company_name})`}
                  />
                  <DetailRow label="Amount" value={`₹${selectedPayment.amount}`} />
                  <DetailRow label="Status" value={selectedPayment.status.toUpperCase()} />
                  <DetailRow label="Method" value={selectedPayment.method} />
                  <DetailRow
                    label="Date"
                    value={new Date(selectedPayment.created_at).toLocaleString()}
                  />
                  {selectedPayment.modules && (
                    <DetailRow
                      label="Modules"
                      value={JSON.parse(selectedPayment.modules).join(', ')}
                    />
                  )}

                  {selectedPayment.status === 'pending' && (
                    <>
                      <Text style={styles.rejectionLabel}>Rejection Reason (optional):</Text>
                      <TextInput
                        style={styles.rejectionInput}
                        placeholder="Enter reason to reject"
                        value={rejectionReason}
                        onChangeText={setRejectionReason}
                        editable={!confirming}
                      />

                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.btn, styles.btnConfirm]}
                          onPress={() =>
                            confirmPayment(selectedPayment.workspace_slug, selectedPayment.id)
                          }
                          disabled={confirming}
                        >
                          {confirming ? (
                            <ActivityIndicator color="white" />
                          ) : (
                            <>
                              <Icon name="check-circle" size={18} color="white" />
                              <Text style={styles.btnText}>Confirm</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.btn, styles.btnReject]}
                          onPress={() => rejectPayment(selectedPayment.id)}
                          disabled={confirming}
                        >
                          {confirming ? (
                            <ActivityIndicator color="white" />
                          ) : (
                            <>
                              <Icon name="close-circle" size={18} color="white" />
                              <Text style={styles.btnText}>Reject</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', padding: 12, gap: 10 },
  statTile: {
    flex: 1,
    backgroundColor: '#FF980020',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  card: {
    margin: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  workspaceSlug: { fontSize: 16, fontWeight: '600', color: '#333' },
  company: { fontSize: 12, color: '#999', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '600', color: 'white' },
  cardBody: { padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  label: { fontSize: 13, color: '#666', fontWeight: '500', flex: 1 },
  value: { fontSize: 13, color: '#333', fontWeight: '600' },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  modalBody: { padding: 16 },
  detailRow: { marginBottom: 14 },
  detailLabel: { fontSize: 12, color: '#999', fontWeight: '500' },
  detailValue: { fontSize: 14, color: '#333', marginTop: 2 },
  rejectionLabel: { fontSize: 12, color: '#999', fontWeight: '500', marginTop: 16 },
  rejectionInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  actionButtons: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  btnConfirm: { backgroundColor: '#4CAF50' },
  btnReject: { backgroundColor: '#F44336' },
  btnText: { color: 'white', fontWeight: '600', fontSize: 14 },
});

export default AdminPaymentsScreen;
