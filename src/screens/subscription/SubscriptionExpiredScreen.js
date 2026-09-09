import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../theme/ThemeContext';
import PlanService from '../../services/provision/planService';

// ── Main screen ───────────────────────────────────────────────
const SubscriptionExpiredScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const workspace = useSelector(s => s.workspace);
  const plan      = useSelector(s => s.plan);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!workspace.slug) return;
    setRefreshing(true);
    try {
      const data = await PlanService.fetchPlan(workspace.slug);
      if (data?.state === 'active') {
        // Subscription is active — AppNavigator will re-route to Main automatically via Redux
      } else {
        Alert.alert('Still Processing', 'Your payment is being processed. Please allow 5–10 minutes, then check again.');
      }
    } catch {
      Alert.alert('Error', 'Could not check subscription status. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.heroBox, { backgroundColor: '#FF6B6B' + '12' }]}>
          <View style={[styles.heroIcon, { backgroundColor: '#FF6B6B' + '20' }]}>
            <Icon name="alert-circle-outline" size={36} color="#FF6B6B" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Premium Expired</Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>Your premium modules have expired. Your free modules (Tasks, Projects, Notes, Contacts, Teams) are still active.</Text>
        </View>

        {/* Modular pricing: select modules to activate subscription */}
        <Text style={[styles.sectionLabel, { color: colors.textLight }]}>BUILD YOUR WORKSPACE</Text>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.primary, borderColor: colors.primary, padding: 24, alignItems: 'center' }]}
          onPress={() => navigation.navigate('ModulePicker')}
          activeOpacity={0.85}>
          <Icon name="grid-outline" size={40} color="#fff" style={{ marginBottom: 12 }} />
          <Text style={[styles.planName, { color: '#fff', textAlign: 'center', fontSize: 18 }]}>
            Select Modules
          </Text>
          <Text style={[styles.featureText, { color: '#fff' + '95', textAlign: 'center', marginTop: 8 }]}>
            Choose only the modules you need and pay per feature
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 }}>
            <Text style={[styles.featureText, { color: '#fff', fontWeight: '700' }]}>Continue</Text>
            <Icon name="arrow-forward" size={18} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Refresh */}
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={refreshing}>
          {refreshing
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={[styles.refreshText, { color: colors.textSecondary }]}>Refresh after payment</Text>}
        </TouchableOpacity>

        {/* Fine print */}
        <Text style={[styles.finePrint, { color: colors.textLight }]}>
          Free modules (Tasks, Projects, Notes, Contacts, Teams) are always available.{'\n'}
          Premium modules are billed monthly. Cancel anytime.{'\n'}
          Prices in INR (₹). GST may apply.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1 },
  scroll:       { padding: 20, paddingBottom: 48 },
  heroBox:      { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  heroIcon:     { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle:    { fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  heroSub:      { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 },
  card:         { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12, position: 'relative', overflow: 'hidden' },
  planName:     { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  featureText:  { fontSize: 13 },
  refreshBtn:   { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
  refreshText:  { fontSize: 13, textDecorationLine: 'underline' },
  finePrint:    { fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});

export default SubscriptionExpiredScreen;
