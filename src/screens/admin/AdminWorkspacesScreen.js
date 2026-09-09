import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import adminService from '../../services/admin/adminService';
import { colors, spacing, typography } from '../../theme';

const AdminWorkspacesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [stats, setStats] = useState({
    foundation: 0,
    operations: 0,
    automated: 0,
    suspended: 0,
  });

  const filters = [
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'foundation', label: 'Foundation', icon: 'layers-outline' },
    { id: 'operations', label: 'Operations', icon: 'business' },
    { id: 'automated', label: 'Automated', icon: 'auto-awesome' },
    { id: 'suspended', label: 'Suspended', icon: 'block' },
  ];

  const loadWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllWorkspaces();
      setWorkspaces(data);
      setStats(adminService.getWorkspaceCountByTier(data));
    } catch (error) {
      Alert.alert('Error', 'Could not load workspaces: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await adminService.getAllWorkspaces();
      setWorkspaces(data);
      setStats(adminService.getWorkspaceCountByTier(data));
    } catch (error) {
      Alert.alert('Error', 'Could not refresh: ' + error.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const getFilteredWorkspaces = () => {
    let filtered = workspaces;

    // Apply status filter
    if (selectedFilter === 'suspended') {
      filtered = filtered.filter(ws => ws.status === 'suspended');
    } else if (selectedFilter !== 'all') {
      filtered = filtered.filter(ws =>
        ws.status !== 'suspended' && ws.subscription?.tier === selectedFilter
      );
    }

    // Apply search filter
    if (searchText) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter(ws =>
        ws.company_name?.toLowerCase().includes(query) ||
        ws.slug?.toLowerCase().includes(query) ||
        ws.admin_email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const handleChangeTier = (workspace) => {
    navigation.navigate('AdminChangeTier', { workspace, onComplete: onRefresh });
  };

  const handleActivate = async (workspace) => {
    Alert.alert(
      'Activate Workspace',
      `Activate ${workspace.company_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          style: 'default',
          onPress: async () => {
            try {
              await adminService.activate(workspace.slug);
              Alert.alert('Success', 'Workspace activated');
              onRefresh();
            } catch (error) {
              Alert.alert('Error', 'Could not activate: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const handleDeactivate = async (workspace) => {
    Alert.alert(
      'Deactivate Workspace',
      `Suspend ${workspace.company_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deactivate(workspace.slug);
              Alert.alert('Success', 'Workspace suspended');
              onRefresh();
            } catch (error) {
              Alert.alert('Error', 'Could not suspend: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const filteredWorkspaces = getFilteredWorkspaces();

  const StatTile = ({ label, value, color }) => (
    <View style={[styles.statTile, { borderLeftColor: color }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  const WorkspaceCard = ({ item }) => {
    const tierColor = adminService.getTierColor(item.subscription?.tier);
    const statusColor = item.status === 'active' ? '#4CAF50' : '#FF9800';
    const daysLeft = item.subscription?.end_date
      ? Math.ceil((new Date(item.subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AdminWorkspaceDetail', { workspace: item })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleSection}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.company_name}
            </Text>
            <Text style={styles.cardSlug}>{item.slug}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>
              {item.status === 'active' ? '●' : '●'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.tierBadge}>
            <Text
              style={[styles.tierBadgeText, { backgroundColor: tierColor }]}
            >
              {adminService.getTierLabel(item.subscription?.tier || 'N/A')}
            </Text>
          </View>

          <View style={styles.cardInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Admin:</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {item.admin_email}
              </Text>
            </View>

            {daysLeft !== null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Expires:</Text>
                <Text style={[styles.infoValue, { color: daysLeft <= 7 ? '#FF5722' : '#666' }]}>
                  {daysLeft > 0 ? `${daysLeft} days` : 'Expired'}
                </Text>
              </View>
            )}

            {item.pending_payment > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pending:</Text>
                <Text style={[styles.infoValue, { color: '#FF9800' }]}>
                  ₹{item.pending_payment.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          {item.status === 'active' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#2196F3' }]}
                onPress={() => handleChangeTier(item)}
              >
                <MaterialIcons name="edit" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Change Tier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#FF9800' }]}
                onPress={() => handleDeactivate(item)}
              >
                <MaterialIcons name="block" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Suspend</Text>
              </TouchableOpacity>
            </>
          )}
          {item.status === 'suspended' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]}
              onPress={() => handleActivate(item)}
            >
              <MaterialIcons name="check-circle" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Activate</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatTile label="Foundation" value={stats.foundation} color="#9E9E9E" />
          <StatTile label="Operations" value={stats.operations} color="#2196F3" />
          <StatTile label="Automated" value={stats.automated} color="#9C27B0" />
          <StatTile label="Suspended" value={stats.suspended} color="#FF9800" />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, slug, or email..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#999"
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <MaterialIcons name="close" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tier Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterPill,
                selectedFilter === filter.id && styles.filterPillActive,
              ]}
              onPress={() => setSelectedFilter(filter.id)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedFilter === filter.id && styles.filterPillTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Workspaces List */}
        {filteredWorkspaces.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No workspaces found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredWorkspaces}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => <WorkspaceCard item={item} />}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    gap: spacing.s,
  },
  statTile: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.m,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.m,
    marginBottom: spacing.m,
    paddingHorizontal: spacing.m,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: spacing.s,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.m,
    fontSize: 14,
    color: '#333',
  },
  filterContainer: {
    marginBottom: spacing.m,
    paddingHorizontal: spacing.m,
  },
  filterContent: {
    gap: spacing.s,
  },
  filterPill: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: spacing.m,
    marginBottom: spacing.m,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    paddingBottom: spacing.s,
  },
  cardTitleSection: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  cardSlug: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
  },
  cardBody: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  tierBadge: {
    marginBottom: spacing.s,
  },
  tierBadgeText: {
    paddingHorizontal: spacing.m,
    paddingVertical: 4,
    borderRadius: 6,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  cardInfo: {
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    maxWidth: '60%',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    backgroundColor: '#fafafa',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: spacing.m,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: spacing.m,
    fontSize: 14,
    color: '#999',
  },
});

export default AdminWorkspacesScreen;
