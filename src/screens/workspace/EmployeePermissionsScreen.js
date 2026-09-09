import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Alert, RefreshControl, Modal, ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../theme/ThemeContext';
import PermissionsService from '../../services/permissions/permissionsService';
import EditPermissionsModal from '../../components/permissions/EditPermissionsModal';

const EmployeePermissionsScreen = () => {
  const { colors } = useTheme();
  const workspace = useSelector(s => s.workspace);
  const user = useSelector(s => s.auth?.user);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (workspace.slug) {
      fetchEmployees();
    }
  }, [workspace.slug]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await PermissionsService.getEmployeePermissions(workspace.slug);
      setEmployees(data.employees || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load employee permissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleEditPermissions = (emp) => {
    setSelectedEmployee(emp);
    setShowEditModal(true);
  };

  const handleSavePermissions = async (modules, features) => {
    if (!selectedEmployee) return;

    try {
      await PermissionsService.updateEmployeeModules(
        workspace.slug,
        selectedEmployee.id,
        modules
      );

      if (features) {
        await PermissionsService.updateEmployeeFeatures(
          workspace.slug,
          selectedEmployee.id,
          features
        );
      }

      Alert.alert('Success', `Permissions updated for ${selectedEmployee.name}`);
      setShowEditModal(false);
      await fetchEmployees();
    } catch (error) {
      Alert.alert('Error', 'Failed to save permissions: ' + error.message);
    }
  };

  const EmployeeCard = ({ item }) => {
    const moduleCount = item.enabled_modules?.length || 0;
    const featureCount = item.enabled_features?.length || 0;

    return (
      <TouchableOpacity
        style={[styles.card, { borderTopColor: colors.primary }]}
        onPress={() => handleEditPermissions(item)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {item.name?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.employeeName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.employeeEmail, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.email}
            </Text>
            {item.department && (
              <Text style={[styles.employeeDept, { color: colors.textLight }]}>
                {item.department}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.cardStats}>
          <View style={[styles.stat, { backgroundColor: colors.surface }]}>
            <Icon name="layers-outline" size={14} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.text }]}>
              {moduleCount} module{moduleCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.surface }]}>
            <Icon name="star-outline" size={14} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.text }]}>
              {featureCount} feature{featureCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {moduleCount === 0 && featureCount === 0 && (
          <View style={[styles.noRestrictions, { backgroundColor: colors.surface }]}>
            <Icon name="checkmark-circle-outline" size={14} color="#4CAF50" />
            <Text style={{ color: '#4CAF50', fontSize: 12, fontWeight: '500', marginLeft: 4 }}>
              All modules & features allowed
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleEditPermissions(item)}
          >
            <Icon name="create-outline" size={16} color="#fff" />
            <Text style={styles.editBtnText}>Edit Permissions</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Module Permissions
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Manage which modules each employee can access
        </Text>
      </View>

      {/* Employee List */}
      {employees.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
          <Icon name="people-outline" size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No employees found
          </Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => <EmployeeCard item={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchEmployees();
              }}
            />
          }
        />
      )}

      {/* Edit Modal */}
      {selectedEmployee && (
        <EditPermissionsModal
          visible={showEditModal}
          employee={selectedEmployee}
          onClose={() => setShowEditModal(false)}
          onSave={handleSavePermissions}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  employeeEmail: {
    fontSize: 12,
    marginBottom: 2,
  },
  employeeDept: {
    fontSize: 11,
    fontWeight: '400',
  },
  cardStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noRestrictions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
  },
});

export default EmployeePermissionsScreen;
