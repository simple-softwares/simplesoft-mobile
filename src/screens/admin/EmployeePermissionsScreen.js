import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import api from '../../services/api/httpClient';
import PermissionEditorModal from '../../components/admin/PermissionEditorModal';
import { useTheme } from '../../theme/ThemeContext';

const EmployeePermissionsScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const user = useSelector((state) => state.auth.user);
  const workspace = useSelector((state) => state.workspace?.current);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [employeePermissions, setEmployeePermissions] = useState(null);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [workspaceAddons, setWorkspaceAddons] = useState([]);

  // Admins can always manage team permissions
  const isAdmin = user?.role === 'admin';

  // Check if user has permission to manage team (admins bypass this)
  useEffect(() => {
    if (!isAdmin) {
      Alert.alert(
        'Access Denied',
        'Only workspace admins can manage team permissions.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [isAdmin, navigation]);

  /**
   * Load all employees in the workspace
   */
  const loadEmployees = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/users');
      const emps = (data || []).map(u => ({
        id:            u.id,
        name:          u.name,
        email:         u.email,
        department_id: u.department ? [null, u.department] : null,
        user_id:       [u.id, u.name],
      }));
      setEmployees(emps);
    } catch (error) {
      Alert.alert('Error', `Failed to load users: ${error.message}`);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load custom addons assigned to this workspace
   */
  const loadWorkspaceAddons = async () => {
    // Not yet implemented in backend — addons section stays empty
    setWorkspaceAddons([]);
  };

  /**
   * Load permissions for a specific employee
   */
  const loadEmployeePermissions = async (employeeId, userId) => {
    try {
      const { data } = await api.get(`/permissions/admin/users/${userId}`);
      setEmployeePermissions(data);
    } catch (error) {
      Alert.alert('Error', `Failed to load employee permissions: ${error.message}`);
    }
  };

  /**
   * Handle opening permission editor
   */
  const handleEditPermissions = async (employee) => {
    if (!employee.user_id) {
      Alert.alert('Notice', 'This employee does not have a user account yet.');
      return;
    }

    setSelectedEmployee(employee);
    await loadEmployeePermissions(employee.id, employee.user_id[0]);
    setShowEditorModal(true);
  };

  /**
   * Save permission changes
   */
  const handleSavePermissions = async (updatedPermissions) => {
    if (!selectedEmployee) return;
    try {
      setSavingPermissions(true);
      await api.patch(`/permissions/admin/users/${selectedEmployee.id}`, updatedPermissions);
      Alert.alert('Success', `Permissions saved for ${selectedEmployee.name}`);
      setShowEditorModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  /**
   * Pull to refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEmployees();
    setRefreshing(false);
  };

  /**
   * Filter employees by search query
   */
  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    loadEmployees();
    loadWorkspaceAddons();
  }, []);

  /**
   * Render employee row
   */
  const renderEmployeeRow = ({ item: employee }) => {
    const hasUserAccount = !!employee.user_id;
    const s = makeStyles(colors);

    return (
      <TouchableOpacity
        style={s.employeeRow}
        onPress={() => handleEditPermissions(employee)}
        disabled={!hasUserAccount}
        activeOpacity={hasUserAccount ? 0.7 : 1}
      >
        <View style={s.employeeInfo}>
          <View style={s.avatarPlaceholder}>
            <Text style={s.avatarText}>
              {employee.name.split(' ').map((n) => n[0]).join('')}
            </Text>
          </View>
          <View style={s.employeeDetails}>
            <Text style={s.employeeName}>{employee.name}</Text>
            {employee.email && <Text style={s.employeeEmail}>{employee.email}</Text>}
            {employee.department_id && (
              <Text style={s.employeeDepartment}>
                {employee.department_id[1] || 'No Department'}
              </Text>
            )}
          </View>
        </View>

        {hasUserAccount ? (
          <MaterialIcons name="edit" size={24} color={colors.primary} />
        ) : (
          <View style={s.noUserBadge}>
            <Text style={s.noUserText}>No User</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => {
    const s = makeStyles(colors);
    return (
      <View style={s.emptyContainer}>
        <MaterialIcons name="people-outline" size={64} color={colors.textSecondary} />
        <Text style={s.emptyText}>
          {searchQuery ? 'No employees found' : 'No employees in workspace'}
        </Text>
      </View>
    );
  };

  const s = makeStyles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Permissions</Text>
        <Text style={s.headerSubtitle}>Manage employee access</Text>
      </View>

      {/* Search Bar */}
      <View style={s.searchContainer}>
        <MaterialIcons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={s.searchInput}
          placeholder="Search employees…"
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Employee List */}
      {loading ? (
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          renderItem={renderEmployeeRow}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={renderEmptyState}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          contentContainerStyle={
            filteredEmployees.length === 0 ? { flex: 1, justifyContent: 'center' } : {}
          }
        />
      )}

      {/* Permission Editor Modal */}
      {showEditorModal && selectedEmployee && employeePermissions && (
        <PermissionEditorModal
          visible={showEditorModal}
          employee={selectedEmployee}
          permissions={employeePermissions}
          workspaceAddons={workspaceAddons}
          onSave={handleSavePermissions}
          onClose={() => setShowEditorModal(false)}
          saving={savingPermissions}
        />
      )}
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 16,
    color: colors.text,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  employeeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  employeeEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  employeeDepartment: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  noUserBadge: {
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  noUserText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
});

export default EmployeePermissionsScreen;
