import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Vibration, Alert,
} from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../theme/ThemeContext';
import inventoryService from '../inventoryService';
import { friendlyError } from '../../../utils/errorUtils';

const BarcodeScannerScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const device = useCameraDevice('back');

  const [hasPermission, setHasPermission] = useState(null); // null=checking, true, false
  const [scanning,     setScanning]       = useState(true);
  const [searching,    setSearching]      = useState(false);
  const [lastCode,     setLastCode]       = useState('');
  const [result,       setResult]         = useState(null); // null | 'found' | 'notfound'

  // Request camera permission
  useEffect(() => {
    Camera.requestCameraPermission().then(status => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const handleBarcode = useCallback(async (value) => {
    if (!scanning || searching || value === lastCode) return;

    setLastCode(value);
    setScanning(false);
    setSearching(true);
    Vibration.vibrate(80);

    try {
      const product = await inventoryService.getProductByBarcode(value);
      if (product) {
        setResult('found');
        // Brief pause to show success, then navigate
        setTimeout(() => {
          navigation.replace('ProductDetail', {
            productId: product.product_tmpl_id?.[0] || product.id,
            name: product.name,
          });
        }, 600);
      } else {
        setResult('notfound');
        setTimeout(() => {
          setResult(null);
          setLastCode('');
          setScanning(true);
        }, 2000);
      }
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
      setResult(null);
      setLastCode('');
      setScanning(true);
    } finally {
      setSearching(false);
    }
  }, [scanning, searching, lastCode, navigation]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'code-93', 'upc-a', 'upc-e', 'data-matrix'],
    onCodeScanned: (codes) => {
      const first = codes[0];
      if (first?.value) handleBarcode(first.value);
    },
  });

  // ── Permission states ────────────────────────────────────────

  if (hasPermission === null) {
    return (
      <View style={[s.center, { backgroundColor: '#000' }]}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Icon name="camera-outline" size={64} color={colors.textLight} />
        <Text style={[s.permTitle, { color: colors.text }]}>Camera Permission Required</Text>
        <Text style={[s.permSub, { color: colors.textSecondary }]}>
          Allow camera access to scan barcodes and QR codes
        </Text>
        <TouchableOpacity
          style={[s.permBtn, { backgroundColor: colors.primary }]}
          onPress={() => Camera.requestCameraPermission().then(s => setHasPermission(s === 'granted'))}>
          <Text style={s.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => navigation.goBack()}>
          <Text style={[s.goBack, { color: colors.textSecondary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Icon name="camera-off-outline" size={48} color={colors.textLight} />
        <Text style={[s.permTitle, { color: colors.text }]}>No camera available</Text>
      </View>
    );
  }

  // ── Overlay colors ───────────────────────────────────────────
  const overlayColor =
    result === 'found'    ? '#4CAF50' :
    result === 'notfound' ? '#F44336' :
    '#fff';

  return (
    <View style={s.root}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
      />

      {/* Dark vignette overlay with cutout */}
      <View style={s.overlay}>
        {/* Top bar */}
        <View style={[s.topBar]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.closeBtn}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.topTitle}>Scan Product</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Shade rows */}
        <View style={s.shadeTop} />

        {/* Middle row: shade | finder | shade */}
        <View style={s.middleRow}>
          <View style={s.shadeSide} />

          {/* Finder box */}
          <View style={[s.finder, { borderColor: overlayColor }]}>
            {/* Corner marks */}
            {[['TL', s.cTL], ['TR', s.cTR], ['BL', s.cBL], ['BR', s.cBR]].map(([label, cs]) => (
              <View key={label} style={[s.corner, cs, { borderColor: overlayColor }]} />
            ))}
            {searching && (
              <View style={s.scanningOverlay}>
                <ActivityIndicator color="#fff" size="large" />
              </View>
            )}
            {result === 'found' && (
              <View style={s.resultOverlay}>
                <Icon name="checkmark-circle" size={56} color="#4CAF50" />
                <Text style={s.resultText}>Found!</Text>
              </View>
            )}
            {result === 'notfound' && (
              <View style={s.resultOverlay}>
                <Icon name="close-circle" size={56} color="#F44336" />
                <Text style={[s.resultText, { color: '#F44336' }]}>Not found</Text>
              </View>
            )}
          </View>

          <View style={s.shadeSide} />
        </View>

        <View style={s.shadeBottom} />

        {/* Bottom hint */}
        <View style={s.bottomBar}>
          <Icon name="barcode-outline" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={s.hintText}>
            {searching ? 'Looking up product…' :
             result === 'notfound' ? 'No product matched — try again' :
             'Point camera at a barcode or QR code'}
          </Text>
        </View>

        {/* Last scanned value */}
        {!!lastCode && !result && (
          <View style={s.codeChip}>
            <Text style={s.codeChipText} numberOfLines={1}>{lastCode}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const FINDER = 240;

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#000' },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },

  // Permission screen
  permTitle:   { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  permSub:     { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  permBtn:     { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  goBack:      { fontSize: 14 },

  // Scanner overlay
  overlay:     { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
  closeBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  topTitle:    { fontSize: 17, fontWeight: '700', color: '#fff' },

  shadeTop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  shadeBottom: { flex: 1.2, backgroundColor: 'rgba(0,0,0,0.55)' },
  middleRow:   { flexDirection: 'row', height: FINDER },
  shadeSide:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },

  // Finder box
  finder:      { width: FINDER, height: FINDER, borderWidth: 2, borderRadius: 14 },

  // Corners
  corner:      { position: 'absolute', width: 22, height: 22, borderWidth: 3 },
  cTL:         { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 14 },
  cTR:         { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 14 },
  cBL:         { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 14 },
  cBR:         { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 14 },

  // Feedback overlays inside finder
  scanningOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 14 },
  resultOverlay:   { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 14, gap: 8 },
  resultText:      { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Bottom
  bottomBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 48, paddingTop: 16 },
  hintText:    { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

  codeChip:    { alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 12 },
  codeChipText:{ fontSize: 12, color: '#fff', fontFamily: 'monospace', maxWidth: 280 },
});

export default BarcodeScannerScreen;
