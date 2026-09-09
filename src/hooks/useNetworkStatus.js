import { useState, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { flushPendingOperations } from '../backend/RestAdapter';

/**
 * Returns true when the device has an active internet connection.
 * Subscribes to NetInfo and updates reactively.
 * Automatically replays queued offline mutations when coming back online.
 */
export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const prevOnlineRef = useRef(true);

  useEffect(() => {
    NetInfo.fetch().then(state => {
      const online = !!(state.isConnected && state.isInternetReachable);
      prevOnlineRef.current = online;
      setIsOnline(online);
    });

    const unsubscribe = NetInfo.addEventListener(state => {
      const online = !!(state.isConnected && state.isInternetReachable);

      if (online && !prevOnlineRef.current) {
        // Came back online — replay any queued mutations
        flushPendingOperations().catch(() => {});
      }

      prevOnlineRef.current = online;
      setIsOnline(online);
    });

    return unsubscribe;
  }, []);

  return isOnline;
}
