import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ChatService from '../chatService';
import { useTheme } from '../../../theme/ThemeContext';
import { useSelector } from 'react-redux';

const UserRow = ({ user, onSelect, colors }) => {
  return (
    <TouchableOpacity
      style={[styles.userRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => onSelect(user)}
      activeOpacity={0.7}
    >
      <View style={[styles.userAvatar, { backgroundColor: colors.primary + '25' }]}>
        <Text style={[styles.userInitial, { color: colors.primary }]}>
          {user.name[0]?.toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
        {user.email && <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>}
      </View>
      <Icon name="chevron-forward" size={18} color={colors.textLight} />
    </TouchableOpacity>
  );
};

const ChatNewScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const user = useSelector(s => s.auth.user);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const handleSearch = async (query) => {
    setSearch(query);
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      const userList = await ChatService.searchUsers(query, [user?.id]);
      setUsers(userList);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (selectedUser) => {
    if (!selectedUser.partner_id) {
      Alert.alert('Error', 'User does not have a partner record');
      return;
    }

    try {
      setStartingChat(true);
      const channelId = await ChatService.getOrCreateDM(selectedUser.partner_id);
      navigation.navigate('ChatThread', {
        channelId,
        channelName: selectedUser.name,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to start conversation');
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Chat</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="search-outline" size={20} color={colors.textLight} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search for a person..."
          placeholderTextColor={colors.textLight}
          value={search}
          onChangeText={handleSearch}
          editable={!startingChat}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={20} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* User List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <UserRow user={item} onSelect={handleSelectUser} colors={colors} />
          )}
          ListEmptyComponent={
            search.trim() ? (
              <View style={styles.emptyState}>
                <Icon name="person-outline" size={48} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.text }]}>No users found</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Try searching by name or email</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="search-outline" size={48} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.text }]}>Search to start a chat</Text>
              </View>
            )
          }
          scrollEnabled={true}
          style={{ flex: 1 }}
        />
      )}

      {startingChat && (
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 4, marginHorizontal: 4 },
  userRow: { flexDirection: 'row', alignItems: 'center', margin: 8, marginHorizontal: 12, padding: 12, borderRadius: 8, borderWidth: 1 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  userInitial: { fontSize: 16, fontWeight: '700' },
  userName: { fontSize: 14, fontWeight: '600' },
  userEmail: { fontSize: 12, marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 13, marginTop: 4 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
});

export default ChatNewScreen;
