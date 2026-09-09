import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPlan } from '../store/slices/planSlice';
import ProvisionService from '../services/provision/provisionService';

// Suppress Firebase deprecation warnings
  if (args[0]?.includes?.('This method is deprecated') || args[0]?.includes?.('react-native-firebase')) {
    return;
  }
  originalWarn(...args);
};

/**
 * Listen for push notifications about module/subscription updates.
 * When payment is approved or subscription changes, auto-refresh the plan.
 *
 * Integrates with:
 * - Firebase Cloud Messaging (FCM) for Android
 * - APNs for iOS
 * - Local notification handlers
 */
export const usePushNotifications = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Listen for foreground notifications
    const unsubscribe = listenForNotifications(async (notification) => {

      const data = notification?.data || notification;
      const action = data.action || data.type;

      // Handle different notification types
      switch (action) {
        case 'payment_approved':
        case 'refresh_modules':
          handlePaymentApproved(data);
          break;

        case 'subscription_updated':
        case 'refresh_subscription':
          handleSubscriptionUpdated(data);
          break;

        case 'trial_expiring':
        case 'show_subscription':
          handleTrialExpiring(data);
          break;

        default:
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [dispatch]);
};

async function handlePaymentApproved(data) {

  try {
    const { slug } = data;
    if (!slug) return;

    // Fetch updated subscription
    const subscription = await ProvisionService.getSubscription(slug);

    // Update Redux with new modules
    dispatch(
      setPlan({
        modules: subscription.modules || [],
        enabled_modules: subscription.modules || [],
      })
    );

  } catch (error) {
  }
}

async function handleSubscriptionUpdated(data) {

  try {
    const { slug } = data;
    if (!slug) return;

    // Fetch updated subscription
    const subscription = await ProvisionService.getSubscription(slug);

    // Update Redux
    dispatch(setPlan(subscription));
  } catch (error) {
  }
}

async function handleTrialExpiring(data) {
  // Could show a modal or banner, navigate to subscription screen, etc.
}

/**
 * Platform-specific notification listener.
 * Returns unsubscribe function.
 */
function listenForNotifications(callback) {
  // TODO: Integrate with actual push notification service
  // Options:
  // 1. Firebase Cloud Messaging (FCM) - Android native + React Native Firebase
  // 2. Apple Push Notifications (APNs) - iOS native + React Native Firebase
  // 3. Expo Notifications - if using Expo CLI
  // 4. OneSignal or similar push service

  // Placeholder for Firebase integration:
  /*
  import messaging from '@react-native-firebase/messaging';

  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    callback(remoteMessage.data);
  });

  return unsubscribe;
  */

  // For now, return a no-op
  return null;
}

export default usePushNotifications;
