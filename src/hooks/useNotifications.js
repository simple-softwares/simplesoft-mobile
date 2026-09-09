import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import NotificationService from '../services/notifications/notificationService';
import PlanService from '../services/provision/planService';
import { AppState } from 'react-native';
 
/**
 * Call this once in your root navigator component.
 * Handles: permission request, token registration,
 * foreground alerts, background/quit tap navigation.
 */
const useNotifications = (navigationRef) => {
  const user       = useSelector(s => s.auth.user);
  const uid        = user?.uid || user?.id;
  const cleanupRef = useRef(null);
 
  useEffect(() => {
    if (!uid) return;
 
    let active = true;
 
    const setup = async () => {
      // Init: request permission + register token
      await NotificationService.init(uid);
 
      if (!active) return;
 
      // Foreground handler — returns unsubscribe fn
      const unsubFg = NotificationService.setupForegroundHandler(
        navigationRef?.current
      );
 
      // Background / quit tap
      NotificationService.setupBackgroundHandler(navigationRef?.current);
 
      cleanupRef.current = unsubFg;
    };
 
    setup();
 
    // Clear badge when app comes to foreground
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') NotificationService.clearBadge();
    });
    NotificationService.clearBadge(); // clear on mount too

    return () => {
      sub.remove();
      active = false;
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [uid]);
};
 
export default useNotifications;
