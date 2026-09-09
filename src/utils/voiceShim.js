/**
 * Suppress NativeEventEmitter warning from @react-native-voice/voice
 * Import this ONCE at the top of App.js before anything else
 */
import { NativeModules, NativeEventEmitter } from 'react-native';

const RCTVoice = NativeModules.RCTVoice;
if (RCTVoice) {
  if (!RCTVoice.addListener)    RCTVoice.addListener    = () => {};
  if (!RCTVoice.removeListeners) RCTVoice.removeListeners = () => {};
}
