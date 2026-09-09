import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useTheme } from '../../../theme/ThemeContext';
import serviceService, { LOG_STATUS_OPTIONS, fmtDateTime } from '../serviceService';

// ── GPS helper ────────────────────────────────────────────────────────────────
// Uses the built-in navigator.geolocation (available in RN 0.74 via polyfill).
// If the device denies permission the UI falls back gracefully.

function requestLocationPermission() {
  const perm = Platform.OS === 'ios'
    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
  return request(perm);
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not available')); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

// ── GPS Clock Widget ──────────────────────────────────────────────────────────

function GPSClock({ label, timestamp, coords, onCapture, loading, colors }) {
  return (
    <View style={[s.gpsClock, { borderColor: coords ? '#10B981' : colors.border,
      backgroundColor: coords ? '#10B98108' : colors.background }]}>
      <View style={s.gpsLeft}>
        <Icon
          name={coords ? 'location' : 'location-outline'}
          size={20}
          color={coords ? '#10B981' : colors.textLight}
        />
        <View>
          <Text style={[s.gpsLabel, { color: colors.textSecondary }]}>{label}</Text>
          {coords ? (
            <>
              <Text style={[s.gpsCoords, { color: '#10B981' }]}>
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </Text>
              <Text style={[s.gpsTime, { color: colors.textLight }]}>
                {fmtDateTime(timestamp)} · ±{Math.round(coords.accuracy)}m
              </Text>
            </>
          ) : (
            <Text style={[s.gpsNotCaptured, { color: colors.textLight }]}>Not captured yet</Text>
          )}
        </View>
      </View>
      {!coords && (
        <TouchableOpacity
          style={[s.gpsBtn, { backgroundColor: '#0EA5E9' }]}
          onPress={onCapture}
          disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.gpsBtnText}>Capture</Text>}
        </TouchableOpacity>
      )}
      {coords && (
        <Icon name="checkmark-circle" size={22} color="#10B981" />
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

const LOG_STATUS_LABELS = {
  completed:    { label: 'Completed',    color: '#10B981' },
  pending_parts:{ label: 'Pending Parts',color: '#F97316' },
  escalated:    { label: 'Escalated',    color: '#F59E0B' },
};

export default function WorkLogScreen({ route, navigation }) {
  const { ticketId, ticket } = route.params;
  const { colors } = useTheme();

  // GPS state
  const [clockInCoords,  setClockInCoords]  = useState(null);
  const [clockInTime,    setClockInTime]    = useState(null);
  const [clockOutCoords, setClockOutCoords] = useState(null);
  const [clockOutTime,   setClockOutTime]   = useState(null);
  const [gpsLoading,     setGpsLoading]     = useState(null); // 'in' | 'out' | null

  // Form state
  const [actionTaken, setActionTaken] = useState('');
  const [distanceKm,  setDistanceKm]  = useState('');
  const [logStatus,   setLogStatus]   = useState('completed');
  const [remarks,     setRemarks]     = useState('');
  const [isFinal,     setIsFinal]     = useState(false); // true = resolve ticket

  // Photos state
  const [photos,        setPhotos]        = useState([]); // { uri, url, uploading, error }
  const [uploadingAny,  setUploadingAny]  = useState(false);

  const [saving, setSaving] = useState(false);

  // ── GPS capture ─────────────────────────────────────────────────────────────

  const captureGPS = useCallback(async (type) => {
    setGpsLoading(type);
    try {
      const result = await requestLocationPermission();
      if (result !== RESULTS.GRANTED) {
        Alert.alert('Location denied', 'Enable location permission in Settings to capture GPS.');
        setGpsLoading(null);
        return;
      }
      const pos = await getCurrentPosition();
      const now = new Date().toISOString();
      if (type === 'in') {
        setClockInCoords(pos);
        setClockInTime(now);
      } else {
        setClockOutCoords(pos);
        setClockOutTime(now);
        // Auto-fill distance if both points captured
        if (clockInCoords) {
          const d = haversineKm(clockInCoords.lat, clockInCoords.lng, pos.lat, pos.lng);
          if (d > 0.1) setDistanceKm(d.toFixed(1));
        }
      }
    } catch (e) {
      Alert.alert('GPS error', e.message || 'Could not get location. You can still submit without GPS.');
    }
    setGpsLoading(null);
  }, [clockInCoords]);

  // ── Photos ──────────────────────────────────────────────────────────────────

  const pickPhoto = useCallback(() => {
    Alert.alert('Site Photo', 'Choose source', [
      {
        text: 'Camera',
        onPress: () => launchCamera(
          { mediaType: 'photo', quality: 0.75, saveToPhotos: false },
          res => { if (res.assets?.[0]) addPhoto(res.assets[0]); }
        ),
      },
      {
        text: 'Gallery',
        onPress: () => launchImageLibrary(
          { mediaType: 'photo', quality: 0.75, selectionLimit: 5 },
          res => { res.assets?.forEach(addPhoto); }
        ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  const addPhoto = useCallback(async (asset) => {
    const item = { id: Date.now() + Math.random(), uri: asset.uri, url: null, uploading: true, error: null };
    setPhotos(prev => [...prev, item]);
    setUploadingAny(true);
    try {
      const url = await serviceService.uploadPhoto(asset.uri, asset.type || 'image/jpeg');
      setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, url, uploading: false } : p));
    } catch (e) {
      setPhotos(prev => prev.map(p => p.id === item.id
        ? { ...p, uploading: false, error: e.message || 'Upload failed' } : p));
    }
    setUploadingAny(false);
  }, []);

  const removePhoto = useCallback((id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!actionTaken.trim()) { Alert.alert('Required', 'Describe the action taken'); return; }
    if (photos.some(p => p.uploading)) {
      Alert.alert('Please wait', 'Photos are still uploading…'); return;
    }

    const uploadedPhotos = photos.filter(p => p.url && !p.error).map(p => p.url);

    setSaving(true);
    try {
      if (isFinal) {
        // Final resolution — calls /resolve
        await serviceService.resolveTicket(ticketId, {
          action_taken: actionTaken.trim(),
          distance_km:  parseFloat(distanceKm) || 0,
          remarks:      remarks.trim() || undefined,
        });
        // Attach photos to ticket if any
        for (const url of uploadedPhotos) {
          await serviceService.addTicketPhoto(ticketId, url).catch(() => {});
        }
        Alert.alert('Resolved', 'Ticket has been resolved and closed.');
      } else {
        // Intermediate work log
        await serviceService.createWorkLog(ticketId, {
          action_taken: actionTaken.trim(),
          distance_km:  parseFloat(distanceKm) || 0,
          status:       logStatus,
          remarks:      remarks.trim() || undefined,
          call_start:   clockInTime || undefined,
          call_end:     clockOutTime || undefined,
          photos:       uploadedPhotos.length ? uploadedPhotos : undefined,
        });
        Alert.alert('Logged', 'Visit log saved.');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || e.message || 'Could not save log');
    }
    setSaving(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const inputStyle = [s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }];

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="close-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={[s.topTitle, { color: colors.text }]}>Log Visit</Text>
          <Text style={[s.topSub, { color: colors.textLight }]}>{ticket?.ticket_number}</Text>
        </View>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: isFinal ? '#10B981' : '#0EA5E9', opacity: saving ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={saving || uploadingAny}>
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveBtnText}>{isFinal ? 'Resolve' : 'Save'}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* GPS Clock-in / Clock-out */}
        <View style={s.fieldWrap}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>GPS CLOCK-IN / CLOCK-OUT</Text>
          <GPSClock
            label="Clock In (arrival)"
            timestamp={clockInTime}
            coords={clockInCoords}
            onCapture={() => captureGPS('in')}
            loading={gpsLoading === 'in'}
            colors={colors}
          />
          <View style={{ height: 8 }} />
          <GPSClock
            label="Clock Out (departure)"
            timestamp={clockOutTime}
            coords={clockOutCoords}
            onCapture={() => captureGPS('out')}
            loading={gpsLoading === 'out'}
            colors={colors}
          />
          {clockInCoords && clockOutCoords && (
            <Text style={[s.gpsHint, { color: colors.textLight }]}>
              Both GPS points captured. Distance auto-filled below.
            </Text>
          )}
        </View>

        {/* Action taken */}
        <View style={s.fieldWrap}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Action Taken *</Text>
          <TextInput
            style={[inputStyle, s.textArea]}
            value={actionTaken}
            onChangeText={setActionTaken}
            placeholder="Describe what was done during this visit…"
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Distance */}
        <View style={s.fieldWrap}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Distance Travelled (km)</Text>
          <TextInput
            style={inputStyle}
            value={distanceKm}
            onChangeText={setDistanceKm}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textLight}
          />
          <Text style={[s.hint, { color: colors.textLight }]}>
            Auto-filled from GPS if both points captured. Used for conveyance expense.
          </Text>
        </View>

        {/* Visit status */}
        {!isFinal && (
          <View style={s.fieldWrap}>
            <Text style={[s.label, { color: colors.textSecondary }]}>Visit Outcome</Text>
            <View style={s.chipsRow}>
              {LOG_STATUS_OPTIONS.map(opt => {
                const cfg    = LOG_STATUS_LABELS[opt];
                const active = logStatus === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[s.chip, { borderColor: active ? cfg.color : colors.border,
                      backgroundColor: active ? cfg.color + '18' : colors.background }]}
                    onPress={() => setLogStatus(opt)}>
                    <Text style={[s.chipText, { color: active ? cfg.color : colors.textSecondary }]}>
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Remarks */}
        <View style={s.fieldWrap}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Remarks (optional)</Text>
          <TextInput
            style={[inputStyle, s.remarksArea]}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Any additional notes…"
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>

        {/* Site photos */}
        <View style={s.fieldWrap}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Site Photos</Text>
          <View style={s.photoRow}>
            {photos.map(photo => (
              <View key={photo.id} style={s.photoWrap}>
                <Image source={{ uri: photo.uri }} style={s.photoThumb} />
                {photo.uploading && (
                  <View style={s.photoOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
                {photo.error && (
                  <View style={[s.photoOverlay, { backgroundColor: 'rgba(239,68,68,0.7)' }]}>
                    <Icon name="alert-circle" size={16} color="#fff" />
                  </View>
                )}
                {!photo.uploading && (
                  <TouchableOpacity style={s.photoRemove} onPress={() => removePhoto(photo.id)}>
                    <Icon name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={[s.photoAdd, { borderColor: colors.primary + '60', backgroundColor: colors.primary + '08' }]}
              onPress={pickPhoto}>
              <Icon name="camera-outline" size={24} color={colors.primary} />
              <Text style={[s.photoAddText, { color: colors.primary }]}>Add Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Resolve toggle */}
        <View style={[s.resolveBanner, { borderColor: isFinal ? '#10B981' : colors.border,
          backgroundColor: isFinal ? '#10B98110' : colors.background }]}>
          <View style={s.resolveLeft}>
            <Icon
              name={isFinal ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={22}
              color={isFinal ? '#10B981' : colors.textLight}
            />
            <View>
              <Text style={[s.resolveTitle, { color: isFinal ? '#10B981' : colors.text }]}>
                Resolve & Close Ticket
              </Text>
              <Text style={[s.resolveSub, { color: colors.textLight }]}>
                Mark this ticket as fully resolved
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[s.resolveToggle, { backgroundColor: isFinal ? '#10B981' : colors.border + '80' }]}
            onPress={() => setIsFinal(v => !v)}>
            <View style={[s.resolveKnob, { left: isFinal ? 22 : 2 }]} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Haversine formula — straight-line distance between two GPS points
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  topBar:     { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 12,
                paddingHorizontal: 12, borderBottomWidth: 0.5 },
  backBtn:    { padding: 6 },
  topCenter:  { flex: 1, alignItems: 'center' },
  topTitle:   { fontSize: 16, fontWeight: '700' },
  topSub:     { fontSize: 11, marginTop: 1 },
  saveBtn:    { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll:     { padding: 16, gap: 4 },
  fieldWrap:  { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 10 },
  label:      { fontSize: 12, fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 },
  input:      { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  textArea:   { minHeight: 110, paddingTop: 10 },
  remarksArea:{ minHeight: 60, paddingTop: 10 },
  hint:       { fontSize: 11, marginTop: 5 },
  chipsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText:   { fontSize: 13, fontWeight: '600' },
  // GPS Clock
  gpsClock:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  gpsLeft:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  gpsLabel:   { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  gpsCoords:  { fontSize: 12, fontWeight: '600' },
  gpsTime:    { fontSize: 11 },
  gpsNotCaptured: { fontSize: 12 },
  gpsBtn:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  gpsBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  gpsHint:    { fontSize: 11, marginTop: 6, textAlign: 'center' },
  // Photos
  photoRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrap:  { position: 'relative' },
  photoThumb: { width: 80, height: 80, borderRadius: 10 },
  photoOverlay:{ position: 'absolute', inset: 0, borderRadius: 10,
                 backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  photoRemove:{ position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  photoAdd:   { width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed',
                alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoAddText:{ fontSize: 10, fontWeight: '700' },
  // Resolve toggle
  resolveBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                   borderWidth: 1.5, borderRadius: 14, padding: 14 },
  resolveLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resolveTitle:  { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  resolveSub:    { fontSize: 12 },
  resolveToggle: { width: 46, height: 26, borderRadius: 13, justifyContent: 'center' },
  resolveKnob:   { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
                   top: 2, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
});
