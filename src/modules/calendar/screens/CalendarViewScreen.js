import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import CalendarService from '../calendarService';
import { useTheme } from '../../../theme/ThemeContext';
import { SkeletonList } from '../../../components/common/SkeletonLoader';

const CalendarViewScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [markedDates, setMarkedDates] = useState({});
  const [dayEvents, setDayEvents] = useState([]);
  const [showDayModal, setShowDayModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCalendar();
    }, [])
  );

  const getCurrentMonthRange = () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const loadCalendar = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getCurrentMonthRange();
      const eventList = await CalendarService.getEvents({ startDate, endDate });
      setEvents(eventList);
      const marked = CalendarService.markedDates(eventList);
      setMarkedDates({ ...marked, [selectedDate]: { selected: true, selectedColor: '#0284C7' } });
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    const dayEventsList = events.filter(e => e.start.split('T')[0] === day.dateString);
    setDayEvents(dayEventsList);
    setShowDayModal(true);
  };

  const handleMonthChange = async (month) => {
    const { startDate, endDate } = {
      startDate: `${month.year}-${String(month.month).padStart(2, '0')}-01`,
      endDate: `${month.year}-${String(month.month + 1).padStart(2, '0')}-00`,
    };
    try {
      const eventList = await CalendarService.getEvents({
        startDate,
        endDate: new Date(month.year, month.month, 0).toISOString().split('T')[0],
      });
      setEvents(eventList);
      const marked = CalendarService.markedDates(eventList);
      setMarkedDates(marked);
    } catch (e) {
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Calendar
        current={selectedDate}
        minDate="2020-01-01"
        maxDate="2030-12-31"
        onDayPress={handleDayPress}
        onMonthChange={handleMonthChange}
        markedDates={markedDates}
        markingType="multi-dot"
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.surface,
          textSectionTitleColor: colors.text,
          textSectionTitleDisabledColor: colors.textLight,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: '#fff',
          todayTextColor: colors.primary,
          dayTextColor: colors.text,
          textDisabledColor: colors.textLight,
          dotColor: colors.primary,
          selectedDotColor: colors.primary,
          monthTextColor: colors.text,
          textMonthFontWeight: 'bold',
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 12,
          arrowColor: colors.primary,
        }}
        style={styles.calendar}
      />

      <FlatList
        data={events}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.eventRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
            activeOpacity={0.7}
          >
            <View style={[styles.eventDot, { backgroundColor: colors.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                {new Date(item.start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                {item.location && ` · ${item.location}`}
              </Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="calendar-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No events this month</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadCalendar} />}
        scrollEnabled={true}
        style={{ flex: 1 }}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('CreateEvent')}
      >
        <Icon name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showDayModal} transparent animationType="slide" onRequestClose={() => setShowDayModal(false)}>
        <View style={[styles.dayModalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.dayModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.dayModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.dayModalTitle, { color: colors.text }]}>
                {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => setShowDayModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={dayEvents}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dayEventRow, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => {
                    setShowDayModal(false);
                    navigation.navigate('EventDetail', { eventId: item.id });
                  }}
                >
                  <Text style={[styles.dayEventTime, { color: colors.primary }]}>
                    {new Date(item.start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.dayEventTitle, { color: colors.text }]}>{item.name}</Text>
                    {item.location && <Text style={[styles.dayEventLocation, { color: colors.textSecondary }]}>{item.location}</Text>}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No events on this day</Text>
                </View>
              }
              scrollEnabled={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  calendar: { marginVertical: 8 },
  eventRow: { flexDirection: 'row', alignItems: 'center', margin: 12, padding: 12, borderRadius: 8, borderWidth: 1 },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  eventTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  eventTime: { fontSize: 12 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, marginTop: 12 },
  dayModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  dayModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 20 },
  dayModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  dayModalTitle: { fontSize: 16, fontWeight: '700' },
  dayEventRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginVertical: 8, padding: 12, borderRadius: 8, borderWidth: 1 },
  dayEventTime: { fontSize: 13, fontWeight: '700', minWidth: 50 },
  dayEventTitle: { fontSize: 13, fontWeight: '600' },
  dayEventLocation: { fontSize: 11, marginTop: 2 },
});

export default CalendarViewScreen;
