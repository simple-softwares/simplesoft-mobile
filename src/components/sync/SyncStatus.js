import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, FlatList, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SyncService from '../../services/sync/syncService';
import { useTheme } from '../../theme/ThemeContext';

const STATUS_GREEN  = '#4CAF50';
const STATUS_RED    = '#f44336';
const STATUS_ORANGE = '#FF9800';

const SyncStatus = ({ onPress }) => {
  const { colors } = useTheme();
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline,     setIsOnline]     = useState(true);
  const [isSyncing,    setIsSyncing]    = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [queueStatus,  setQueueStatus]  = useState(null);

  useEffect(() => {
    setPendingCount(SyncService.getPendingCount());
    setQueueStatus(SyncService.getQueueStatus());

    return SyncService.registerCallback({
      onConnectionChange: online => setIsOnline(online),
      onSyncComplete: stats => {
        setIsSyncing(false);
        setPendingCount(SyncService.getPendingCount());
        setQueueStatus(SyncService.getQueueStatus());
      },
    });
  }, []);

  const handleSync = () => { setIsSyncing(true); SyncService.sync(); };

  const statusColor = isSyncing ? STATUS_ORANGE : (!isOnline ? STATUS_RED : (pendingCount > 0 ? STATUS_ORANGE : STATUS_GREEN));
  const statusText  = isSyncing ? 'Syncing...' : (!isOnline ? 'Offline' : (pendingCount > 0 ? `${pendingCount} pending` : 'Synced'));

  const renderOperationItem = ({ item }) => (
    <View style={[styles.opItem, { backgroundColor: colors.background }]}>
      <View style={styles.opHeader}>
        <Text style={styles.opType}>{item.type}</Text>
        <Text style={[styles.opModel, { color: colors.textSecondary }]}>{item.model || item.endpoint}</Text>
      </View>
      <Text style={[styles.opId, { color: colors.textLight }]}>ID: {item.id || 'new'}</Text>
      {item.retryCount > 0 && <Text style={styles.opRetry}>Retry {item.retryCount}/5</Text>}
      {item.lastError   && <Text style={styles.opError}>{item.lastError}</Text>}
    </View>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.pill, { backgroundColor: statusColor + '20' }]}
        onPress={onPress || (() => setShowModal(true))}>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
        <Text style={[styles.pillText, { color: statusColor }]}>{statusText}</Text>
        {isSyncing && <ActivityIndicator size="small" color={statusColor} style={{ marginLeft: 6 }} />}
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Sync Status</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.statusSection, { backgroundColor: colors.background }]}>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Connection</Text>
                <Text style={[styles.statusValue, { color: isOnline ? STATUS_GREEN : STATUS_RED }]}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Pending</Text>
                <Text style={[styles.statusValue, { color: colors.text }]}>{pendingCount}</Text>
              </View>
            </View>

            {queueStatus?.operations?.length > 0 && (
              <>
                <Text style={[styles.queueTitle, { color: colors.text }]}>Pending Operations</Text>
                <FlatList
                  data={queueStatus.operations}
                  keyExtractor={item => item.id}
                  renderItem={renderOperationItem}
                  style={styles.queueList}
                />
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.background }]}
                onPress={() => setShowModal(false)}>
                <Text style={[styles.btnText, { color: colors.textSecondary }]}>Close</Text>
              </TouchableOpacity>
              {pendingCount > 0 && isOnline && !isSyncing && (
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                  onPress={handleSync}>
                  <Text style={[styles.btnText, { color: '#fff' }]}>Sync Now</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  pill:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginHorizontal: 8 },
  dot:         { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  pillText:    { fontSize: 12, fontWeight: '500' },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal:       { borderRadius: 16, padding: 20, width: '90%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 18, fontWeight: 'bold' },
  statusSection: { padding: 15, borderRadius: 8, marginBottom: 20 },
  statusRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statusLabel: { fontSize: 14 },
  statusValue: { fontSize: 14, fontWeight: '600' },
  queueTitle:  { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  queueList:   { maxHeight: 300 },
  opItem:      { padding: 12, borderRadius: 8, marginBottom: 8 },
  opHeader:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  opType:      { fontSize: 12, fontWeight: '600', color: '#2196F3', textTransform: 'uppercase' },
  opModel:     { fontSize: 12 },
  opId:        { fontSize: 11, marginBottom: 2 },
  opRetry:     { fontSize: 10, color: STATUS_ORANGE },
  opError:     { fontSize: 10, color: STATUS_RED, marginTop: 4 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  btn:         { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  btnText:     { fontSize: 14, fontWeight: '600' },
});

export default SyncStatus;
