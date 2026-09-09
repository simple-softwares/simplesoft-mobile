import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import CalendarService from '../calendarService';
import { useTheme } from '../../../theme/ThemeContext';
import api from '../../../services/api/httpClient';

const EventDetailScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { eventId } = route.params;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const event = await CalendarService.getEvent(eventId);
      if (event) setEvent(event);
    } catch (e) {
      Alert.alert('Error', 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await CalendarService.deleteEvent(eventId);
            Alert.alert('Success', 'Event deleted', [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]);
          } catch (e) {
            Alert.alert('Error', 'Failed to delete event');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Event not found</Text>
      </View>
    );
  }

  const startDate = new Date(event.start);
  const endDate = new Date(event.stop);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Event Details</Text>
        <TouchableOpacity onPress={handleDelete} disabled={deleting}>
          {deleting ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Icon name="trash-outline" size={24} color={colors.error} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Title */}
        <Text style={[styles.eventName, { color: colors.text }]}>{event.name}</Text>

        {/* Date/Time */}
        <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="calendar-outline" size={20} color={colors.primary} style={styles.infoIcon} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date & Time</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {startDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
            {!event.allday && (
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} →{' '}
                {endDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        </View>

        {/* Location */}
        {event.location && (
          <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="location-outline" size={20} color={colors.primary} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Location</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{event.location}</Text>
            </View>
          </View>
        )}

        {/* Description */}
        {event.description && (
          <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="document-text-outline" size={20} color={colors.primary} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Description</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {event.description.replace(/<[^>]+>/g, '')}
              </Text>
            </View>
          </View>
        )}

        {/* Attendees */}
        {event.partner_ids && event.partner_ids.length > 0 && (
          <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="people-outline" size={20} color={colors.primary} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Attendees</Text>
              {event.partner_ids.map((partner, idx) => (
                <Text key={idx} style={[styles.infoValue, { color: colors.text }]}>
                  {partner[1]}
                </Text>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  eventName: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  infoIcon: { marginRight: 12, marginTop: 2 },
  infoLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  infoValue: { fontSize: 14, lineHeight: 20 },
  errorText: { fontSize: 16 },
});

export default EventDetailScreen;
