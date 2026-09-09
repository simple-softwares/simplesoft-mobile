import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { light, dark } from './colors';
import typography from './typography';
import spacing, { layout } from './spacing';

export const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const dispatch        = useDispatch();
  const systemScheme    = useColorScheme();           // 'light' | 'dark' | null
  const themePref       = useSelector(s => s.theme?.mode || 'auto');

  const isDark = themePref === 'dark' ||
    (themePref === 'auto' && systemScheme === 'dark');

  const colors = isDark ? dark : light;

  const theme = {
    isDark,
    colors,
    typography,
    spacing,
    layout,
    // Convenience: nav header options matching current theme
    headerStyle: {
      backgroundColor:  colors.surface,
      elevation:        0,
      shadowOpacity:    0,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    headerTitleStyle: {
      fontSize:   17,
      fontWeight: '700',
      color:      colors.text,
    },
    headerTintColor: colors.primary,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};

// Drop-in replacement for old import: import colors from '../../theme/colors'
// New usage: const { colors } = useTheme();
