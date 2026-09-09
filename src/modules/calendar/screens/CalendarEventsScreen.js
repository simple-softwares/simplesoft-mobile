import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import CalendarService from '../calendarService';
import { useTheme } from '../../../theme/ThemeContext';
import { SkeletonList } from '../../../components/common/SkeletonLoader';

const CalendarEventsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  const loadEvents = async () => {
    try {
      setLoading(true);
      const eventList = await CalendarService.getUpcomingEvents({ limit: 60 });
      setEvents(eventList);
      filterEvents(eventList, search);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterEvents = (eventList, q) => {
    if (!q.trim()) {
      setFilteredEvents(eventList);
      return;
    }
    const filtered = eventList.filter(e =>
      e.name.toLowerCase().includes(q.toLowerCase()) ||
      (e.location && e.location.toLowerCase().includes(q.toLowerCase()))
    );
    setFilteredEvents(filtered);
  };

  const handleSearch = (text) => {
    setSearch(text);
    filterEvents(events, text);
  };

  const groupByDate = (eventList) => {
    const grouped = {};
    eventList.forEach(event => {
      const dateStr = event.start.split('T')[0];
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(event);
    });
    return Object.entries(grouped).map(([date, eventGroup]) => ({
      date,
      events: eventGroup,
    }));
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  const groupedEvents = groupByDate(filteredEvents);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="search-outline" size={20} color={colors.textLight} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search events..."
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

      <FlatList
        data={groupedEvents}
        keyExtractor={item => item.date}
        renderItem={({ item }) => (
          <View>
            <Text style={[styles.dateHeader, { color: colors.primary, backgroundColor: colors.surface }]}>
              {new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            {item.events.map(event => (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                activeOpacity={0.7}
              >
                <View style={[styles.timeBox, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.timeText, { color: colors.primary }]}>
                    {new Date(event.start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                    {event.name}
                  </Text>
                  {event.location && (
                    <Text style={[styles.eventLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                      📍 {event.location}
                    </Text>
                  )}
                  {event.description && (
                    <Text style={[styles.eventDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                      {event.description.replace(/<[^>]+>/g, '')}
                    </Text>
                  )}
                </View>
                <Icon name="chevron-forward" size={18} color={colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="calendar-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No upcoming events</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Create one to get started!</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadEvents} />}
        scrollEnabled={true}
        style={{ flex: 1 }}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('CreateEvent')}
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
  dateHeader: { fontSize: 12, fontWeight: '700', paddingHorizontal: 16, paddingVertical: 8, letterSpacing: 1 },
  eventCard: { flexDirection: 'row', alignItems: 'center', margin: 8, marginHorizontal: 12, padding: 12, borderRadius: 8, borderWidth: 1 },
  timeBox: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  timeText: { fontSize: 12, fontWeight: '700' },
  eventTitle: { fontSize: 14, fontWeight: '600' },
  eventLocation: { fontSize: 12, marginTop: 4 },
  eventDesc: { fontSize: 11, marginTop: 2 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 13, marginTop: 4 },
});

export default CalendarEventsScreen;
