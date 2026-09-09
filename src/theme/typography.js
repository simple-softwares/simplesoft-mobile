import { Platform } from 'react-native';

const typography = {
  // Font families
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
  }),
  
  // Font sizes
  h1: 32,
  h2: 28,
  h3: 24,
  h4: 20,
  h5: 18,
  h6: 16,
  body1: 16,
  body2: 14,
  caption: 12,
  small: 10,
  
  // Line heights
  lineHeightH1: 40,
  lineHeightH2: 36,
  lineHeightH3: 32,
  lineHeightH4: 28,
  lineHeightH5: 26,
  lineHeightH6: 24,
  lineHeightBody1: 24,
  lineHeightBody2: 20,
  lineHeightCaption: 16,
};

export default typography;
