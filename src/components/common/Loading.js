import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const Loading = ({ message = 'Loading...', fullScreen = true }) => {
  const { colors } = useTheme();

  if (fullScreen) {
    return (
      <View style={[styles.full, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        {!!message && <Text style={[styles.msg, { color: colors.textSecondary }]}>{message}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.inline}>
      <ActivityIndicator size="small" color={colors.primary} />
      {!!message && <Text style={[styles.smallMsg, { color: colors.textSecondary }]}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  full:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inline:   { padding: 16, justifyContent: 'center', alignItems: 'center' },
  msg:      { marginTop: 12, fontSize: 14 },
  smallMsg: { marginTop: 4, fontSize: 12 },
});

export default Loading;
