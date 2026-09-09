import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import ChatService from '../chatService';
import { useTheme } from '../../../theme/ThemeContext';
import { SkeletonList } from '../../../components/common/SkeletonLoader';

const ChatChannelsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [search, setSearch] = useState('');
  const pollIntervalRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      loadChannels();
      // Start polling every 30 seconds
      pollIntervalRef.current = setInterval(() => {
        loadChannels(false);
      }, 30000);

      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }, [])
  );

  const loadChannels = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const channelList = await ChatService.getMyChannels({ limit: 100 });
      setChannels(channelList);
      filterChannels(channelList, search);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterChannels = (channelList, q) => {
    if (!q.trim()) {
      setFilteredChannels(channelList);
      return;
    }
    const filtered = channelList.filter(c =>
      c.name.toLowerCase().includes(q.toLowerCase())
    );
    setFilteredChannels(filtered);
  };

  const handleSearch = (text) => {
    setSearch(text);
    filterChannels(channels, text);
  };

  const handleChannelPress = (channel) => {
    navigation.navigate('ChatThread', { channelId: channel.id, channelName: channel.name });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  const getChannelIcon = (channel) => {
    return ChatService.isDM(channel) ? 'chatbubble-outline' : 'people-outline';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="search-outline" size={20} color={colors.textLight} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search conversations..."
          placeholderTextColor={colors.textLight}
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={20} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Channel List */}
      <FlatList
        data={filteredChannels}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.channelRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleChannelPress(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.channelIcon, { backgroundColor: colors.primary + '15' }]}>
              <Icon name={getChannelIcon(item)} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.channelName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.channelPreview, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.last_message_id ? 'Recent message...' : 'No messages yet'}
              </Text>
            </View>
            {item.message_unread_counter > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.error }]}>
                <Text style={styles.unreadText}>
                  {item.message_unread_counter > 99 ? '99+' : item.message_unread_counter}
                </Text>
              </View>
            )}
            <Icon name="chevron-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="chatbubbles-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No conversations yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Start a new chat to begin</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadChannels()} />}
        scrollEnabled={true}
        style={{ flex: 1 }}
      />

      {/* FAB for new chat */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('ChatNew')}
      >
        <Icon name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 4, marginHorizontal: 4 },
  channelRow: { flexDirection: 'row', alignItems: 'center', margin: 8, marginHorizontal: 12, padding: 12, borderRadius: 8, borderWidth: 1 },
  channelIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  channelName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  channelPreview: { fontSize: 12 },
  unreadBadge: { minWidth: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 13, marginTop: 4 },
});

export default ChatChannelsScreen;
