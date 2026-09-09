import { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
 
/**
 * Call this at the top of any screen to sync the status bar
 * color with that screen's background color.
 *
 * Usage:
 *   useScreenColor(colors.background)          // default bg
 *   useScreenColor('#FFFDE7')                  // yellow note
 *   useScreenColor(colors.primary)             // primary colored header
 *   useScreenColor(colors.surface, 'light')   // force light icons
 */
const useScreenColor = (bgColor, barStyle = 'dark-content') => {
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(bgColor || 'transparent', true);
      StatusBar.setBarStyle(barStyle, true);
    } else {
      StatusBar.setBarStyle(barStyle, true);
    }
  }, [bgColor, barStyle]);
};
 
export default useScreenColor;
