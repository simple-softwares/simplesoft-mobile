import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Switch, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import CalendarService from '../calendarService';
import { useTheme } from '../../../theme/ThemeContext';

const CreateEventScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const user = useSelector(s => s.auth.user);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [allday, setAllday] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().getTime() + 60 * 60 * 1000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleStartChange = (event, date) => {
    if (date) {
      setStartDate(date);
      if (date > endDate) {
        setEndDate(new Date(date.getTime() + 60 * 60 * 1000));
      }
    }
    setShowStartPicker(false);
  };

  const handleEndChange = (event, date) => {
    if (date) {
      if (date < startDate) {
        Alert.alert('Error', 'End date must be after start date');
        return;
      }
      setEndDate(date);
    }
    setShowEndPicker(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Event name is required');
      return;
    }

    setSaving(true);
    try {
      const vals = {
        name: name.trim(),
        location: location.trim(),
        description: description.trim(),
        allday,
        start: CalendarService.formatOdooDatetime(startDate),
        stop: CalendarService.formatOdooDatetime(endDate),
      };

      await CalendarService.createEvent(vals);
      Alert.alert('Success', 'Event created', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>New Event</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {/* Event Name */}
          <Text style={[styles.label, { color: colors.text }]}>Event Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. Team Meeting, Project Deadline"
            placeholderTextColor={colors.textLight}
            value={name}
            onChangeText={setName}
          />

          {/* Location */}
          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Location</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. Conference Room A, Zoom"
            placeholderTextColor={colors.textLight}
            value={location}
            onChangeText={setLocation}
          />

          {/* All-day toggle */}
          <View style={[styles.rowBetween, { marginTop: 16 }]}>
            <Text style={[styles.label, { color: colors.text, marginTop: 0 }]}>All-day event</Text>
            <Switch
              value={allday}
              onValueChange={setAllday}
              trackColor={{ false: colors.border, true: colors.primary + '70' }}
              thumbColor={allday ? colors.primary : colors.textLight}
            />
          </View>

          {/* Start Date/Time */}
          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Start {allday ? 'Date' : 'Date & Time'} *</Text>
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowStartPicker(true)}
          >
            <Icon name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[styles.dateButtonText, { color: colors.text }]}>
              {startDate.toLocaleDateString('en-IN')}
              {!allday && ` ${startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
            </Text>
          </TouchableOpacity>

          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode={allday ? 'date' : 'datetime'}
              display="default"
              onChange={handleStartChange}
            />
          )}

          {/* End Date/Time */}
          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>End {allday ? 'Date' : 'Date & Time'} *</Text>
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowEndPicker(true)}
          >
            <Icon name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[styles.dateButtonText, { color: colors.text }]}>
              {endDate.toLocaleDateString('en-IN')}
              {!allday && ` ${endDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
            </Text>
          </TouchableOpacity>

          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode={allday ? 'date' : 'datetime'}
              display="default"
              onChange={handleEndChange}
            />
          )}

          {/* Description */}
          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Add details..."
            placeholderTextColor={colors.textLight}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="checkmark-done" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Event</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, marginBottom: 4 },
  textarea: { minHeight: 100 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  dateButtonText: { fontSize: 14, flex: 1 },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, marginTop: 24, gap: 8 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default CreateEventScreen;
