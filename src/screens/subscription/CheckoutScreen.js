import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Linking, ActivityIndicator, SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../theme/ThemeContext';
import PricingService from '../../services/billing/pricingService';
import PlanService from '../../services/provision/planService';
import { BILLING_UPI_ID, BILLING_UPI_NAME, BILLING_WHATSAPP, BILLING_EMAIL } from '../../config';

const CheckoutScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const route = useRoute();
  const workspace = useSelector(s => s.workspace);

  const mode = route.params?.mode; // 'plan' or 'addons'
  const data = route.params?.data; // plan data or addons array
  const totalAmount = route.params?.total || 0;

  const [paymentSent, setPaymentSent] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [upiOpened, setUpiOpened] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Payment handlers
  const handleUpiPay = async () => {
    let note = `SimpleSoft ${workspace.slug || 'Workspace'}`;
    if (mode === 'plan') {
      note = `${note} - ${data.name} Plan`;
    } else if (mode === 'addons') {
      note = `${note} - Add-ons Purchase`;
    } else if (mode === 'modules') {
      note = `${note} - ${data.name} Module`;
    }

    const upiLink = `upi://pay?pa=${encodeURIComponent(BILLING_UPI_ID)}&pn=${encodeURIComponent(BILLING_UPI_NAME)}&am=${totalAmount}&tn=${encodeURIComponent(note)}&cu=INR`;

    const canOpen = await Linking.canOpenURL(upiLink);
    if (!canOpen) {
      Alert.alert(
        'Pay via UPI',
        `Please send ₹${totalAmount.toLocaleString('en-IN')} to:\n\nUPI ID: ${BILLING_UPI_ID}\n\nNote: ${note}\n\nThen tap "I've paid" below.`,
        [{ text: 'OK' }]
      );
    } else {
      await Linking.openURL(upiLink);
    }
    setUpiOpened(true);
  };

  const handleNotifyPayment = async () => {
    if (!workspace.slug) {
      Alert.alert('Error', 'Workspace not found. Please log in again.');
      return;
    }
    setProcessing(true);
    try {
      // Extract modules based on mode
      let modulesToSubscribe = [];
      if (mode === 'addons') {
        modulesToSubscribe = data.map(a => a.code);
      } else if (mode === 'plan' && data.modules) {
        modulesToSubscribe = data.modules;
      } else if (mode === 'modules') {
        modulesToSubscribe = [data.key];
      }

      // Calculate months based on mode / billing cycle
      const months = mode === 'modules' ? data.months
                   : mode === 'plan' && data.cycle === 'annual' ? 12
                   : 1;

      const result = await PricingService.subscribeModules(
        workspace.slug,
        modulesToSubscribe,
        months
      );

      setPaymentSent(true);

      // Poll for admin confirmation (waits until payment is confirmed by admin and modules are activated)
      let pollAttempts = 0;
      const maxPollAttempts = 120; // 10 minutes at 5-second intervals
      const pollInterval = setInterval(async () => {
        pollAttempts++;
        try {
          const latestPlan = await PlanService.fetchPlan(workspace.slug);

           // When admin confirms payment, subscription activates and modules load
           if (latestPlan?.modules?.length > 4) {
             clearInterval(pollInterval);
             Alert.alert(
               '✅ Activation Complete!',
               'Our team confirmed your payment. Your purchase is now active. Enjoy!',
               [{ 
                 text: 'OK', 
                 onPress: () => {
                   // Check if we can go back, if not navigate to main screen
                   if (navigation.canGoBack()) {
                     navigation.goBack();
                   } else {
                     navigation.navigate('Main');
                   }
                 }
               }]
             );
            return;
          }
        } catch (pollErr) {
        }

        if (pollAttempts >= maxPollAttempts) {
          clearInterval(pollInterval);
          Alert.alert(
            'Activation Pending',
            'Our team is still verifying your payment. You\'ll be notified once confirmed.',
            [{ 
              text: 'OK', 
              onPress: () => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Main');
                }
              }
            }]
          );
        }
      }, 5000);

      Alert.alert(
        'Payment Sent ✓',
        'Our team is verifying your payment. You\'ll be notified shortly.',
        [{ 
          text: 'OK', 
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Main');
            }
          }
        }]
      );
    } catch (e) {
      const errorMsg = e.response?.data?.detail || e.message || 'Could not process payment';
      Alert.alert('Payment Error', `Server: ${errorMsg}. Please try again or contact support.`, [
        { 
          text: 'OK', 
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Main');
            }
          }
        }
      ]);
    } finally {
      setProcessing(false);
    }
  };

  const handleWhatsApp = () => {
    let msg = `Hi, I'd like to pay ₹${totalAmount.toLocaleString('en-IN')}`;
    if (mode === 'plan') {
      msg += ` for ${data.name} Plan`;
    } else if (mode === 'addons') {
      msg += ` for add-ons`;
    } else if (mode === 'modules') {
      msg += ` for ${data.name} module (${data.months === 1 ? 'monthly' : `${data.months} months`})`;
    }
    msg += `. Workspace: ${workspace.slug || 'my workspace'}. Please share payment details.`;
    const url = `https://wa.me/${BILLING_WHATSAPP.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp not found', `Please contact us at ${BILLING_EMAIL}`);
    });
  };

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      const updatedPlan = await PlanService.fetchPlan(workspace.slug);
      if (updatedPlan?.modules?.length > 4) {
        Alert.alert('✅ Active!', 'Your purchase is now active!', [
          { 
            text: 'OK', 
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Main');
              }
            }
          }
        ]);
      } else {
        Alert.alert(
          'Processing',
          'Still verifying. Check back in a few minutes.',
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Could not check status.');
    } finally {
      setCheckingStatus(false);
    }
  };


  if (!mode || !data || totalAmount === 0) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
        <View style={s.loadingContainer}>
          <Text style={{ color: colors.error }}>Invalid checkout data</Text>
          <TouchableOpacity onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Main');
            }
          }} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.primary }}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[s.header, { backgroundColor: colors.primary + '12' }]}>
          <View style={[s.headerIcon, { backgroundColor: colors.primary + '20' }]}>
            <Icon name="bag-check-outline" size={36} color={colors.primary} />
          </View>
          <Text style={[s.headerTitle, { color: colors.text }]}>Order Summary</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>
            Review and confirm your purchase
          </Text>
        </View>

        {/* Order Summary */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {mode === 'plan' && data && (
            <View style={s.summaryRow}>
              <View style={{ flex: 1 }}>
                <Text style={[s.summaryLabel, { color: colors.text }]}>{data.name}</Text>
                <Text style={[s.summarySubtext, { color: colors.textSecondary }]}>
                  Billed {data.cycle === 'annual' ? 'Annually' : 'Monthly'}
                </Text>
              </View>
              <Text style={[s.summaryPrice, { color: colors.primary }]}>
                ₹{totalAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          {mode === 'modules' && data && (
            <View>
              <View style={[s.summaryRow, data.discount > 0 && { borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.summaryLabel, { color: colors.text }]}>{data.name}</Text>
                  <Text style={[s.summarySubtext, { color: colors.textSecondary }]}>
                    {data.months === 1 ? 'Monthly' : `${data.months} months`}
                    {data.monthlyPrice > 0 ? ` · ₹${data.monthlyPrice}/mo` : ''}
                  </Text>
                </View>
                <Text style={[s.summaryPrice, { color: colors.primary }]}>
                  ₹{(data.monthlyPrice * data.months).toLocaleString('en-IN')}
                </Text>
              </View>
              {data.discount > 0 && (
                <View style={s.summaryRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.summaryLabel, { color: '#10B981' }]}>
                      Discount ({data.discount}%)
                    </Text>
                  </View>
                  <Text style={[s.summaryPrice, { color: '#10B981' }]}>
                    -₹{(data.discountAmount || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              )}
            </View>
          )}

          {mode === 'addons' && Array.isArray(data) && data.length > 0 && (
            <View>
              {data.map((item, idx) => (
                <View
                  key={item.code}
                  style={[s.summaryRow, idx < data.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.summaryLabel, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[s.summarySubtext, { color: colors.textSecondary }]}>
                      Qty: {item.qty} × ₹{item.price}/mo
                    </Text>
                  </View>
                  <Text style={[s.summaryPrice, { color: colors.primary }]}>
                    ₹{(item.qty * item.price).toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Price Summary */}
        <Text style={[s.sectionLabel, { color: colors.textLight }]}>TOTAL</Text>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { color: colors.text }]}>Amount Due</Text>
            <View style={s.totalPrice}>
              <Text style={[s.totalSymbol, { color: colors.primary }]}>₹</Text>
              <Text style={[s.totalAmount, { color: colors.primary }]}>
                {totalAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        {!paymentSent && (
          <>
            <Text style={[s.sectionLabel, { color: colors.textLight }]}>PAYMENT METHOD</Text>
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 0 }]}>
              <TouchableOpacity
                style={[s.methodButton, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
                onPress={handleUpiPay}
                activeOpacity={0.7}>
                <Icon name="qr-code-outline" size={24} color={colors.primary} />
                <View style={s.methodText}>
                  <Text style={[s.methodName, { color: colors.text }]}>Pay via UPI</Text>
                  <Text style={[s.methodDesc, { color: colors.textSecondary }]}>Google Pay, PhonePe, etc.</Text>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textLight} />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.methodButton}
                onPress={handleWhatsApp}
                activeOpacity={0.7}>
                <Icon name="logo-whatsapp" size={24} color="#25D366" />
                <View style={s.methodText}>
                  <Text style={[s.methodName, { color: colors.text }]}>Other methods</Text>
                  <Text style={[s.methodDesc, { color: colors.textSecondary }]}>Bank transfer, cash, etc.</Text>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {!upiOpened && (
              <TouchableOpacity
                style={[s.payButton, { backgroundColor: colors.primary }]}
                onPress={handleUpiPay}
                activeOpacity={0.85}>
                <Icon name="qr-code" size={20} color="#fff" />
                <Text style={s.payButtonText}>
                  Pay ₹{totalAmount.toLocaleString('en-IN')} with UPI
                </Text>
              </TouchableOpacity>
            )}

            {upiOpened && (
              <TouchableOpacity
                style={[s.confirmButton, { backgroundColor: colors.primary }]}
                onPress={handleNotifyPayment}
                disabled={processing}
                activeOpacity={0.85}>
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="checkmark-done-outline" size={18} color="#fff" />
                    <Text style={s.confirmButtonText}>I've paid — Confirm</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Payment Confirmation */}
        {paymentSent && (
          <View style={[s.confirmationBox, { backgroundColor: '#10B981' + '15' }]}>
            <View style={[s.confirmationIcon, { backgroundColor: '#10B981' + '30' }]}>
              <Icon name="checkmark-circle" size={40} color="#10B981" />
            </View>
            <Text style={[s.confirmationTitle, { color: '#10B981' }]}>Payment Sent</Text>
            <Text style={[s.confirmationText, { color: colors.textSecondary }]}>
              Our team is verifying your payment. This usually takes 5–10 minutes.
            </Text>

            <TouchableOpacity
              style={[s.checkStatusButton, { backgroundColor: colors.primary }]}
              onPress={handleCheckStatus}
              disabled={checkingStatus}
              activeOpacity={0.85}>
              {checkingStatus ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="refresh" size={16} color="#fff" />
                  <Text style={s.checkStatusButtonText}>Check Status</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Main');
                }
              }}>
              <Text style={[s.backButtonText, { color: colors.primary }]}>Back to Billing</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  headerIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  headerSub: { fontSize: 14, textAlign: 'center' },

  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20, overflow: 'hidden' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  summaryLabel: { fontSize: 16, fontWeight: '600' },
  summarySubtext: { fontSize: 13, marginTop: 4 },
  summaryPrice: { fontSize: 16, fontWeight: '700' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, fontWeight: '700' },
  totalPrice: { flexDirection: 'row', alignItems: 'baseline' },
  totalSymbol: { fontSize: 16, fontWeight: '700', marginRight: 2 },
  totalAmount: { fontSize: 28, fontWeight: '800' },

  methodButton: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  methodText: { flex: 1 },
  methodName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  methodDesc: { fontSize: 12 },

  payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14, marginTop: 16 },
  payButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  confirmButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14, marginTop: 16 },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  confirmationBox: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20 },
  confirmationIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  confirmationTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  confirmationText: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 16 },

  checkStatusButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  checkStatusButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  backButton: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', width: '100%' },
  backButtonText: { fontSize: 14, fontWeight: '600' },
});

export default CheckoutScreen;
