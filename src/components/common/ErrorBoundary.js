import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Analytics from '../../services/analytics/analyticsService';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    Analytics.recordError(error, 'ErrorBoundary');
    Analytics.log(`componentStack: ${info.componentStack}`);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg = this.state.error?.message || 'Unknown error';
    const isDev = __DEV__;

    return (
      <View style={s.container}>
        <Icon name="warning-outline" size={64} color="#FF9800" />
        <Text style={s.title}>Something went wrong</Text>
        <Text style={s.subtitle}>
          The app encountered an unexpected error. Please try restarting.
        </Text>

        {isDev && (
          <ScrollView style={s.detailBox}>
            <Text style={s.detailText}>{msg}</Text>
          </ScrollView>
        )}

        <TouchableOpacity style={s.btn} onPress={this.handleReset}>
          <Icon name="refresh-outline" size={18} color="#fff" />
          <Text style={s.btnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const s = StyleSheet.create({
  container:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#F5F5F5' },
  title:      { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginTop: 20, marginBottom: 8, textAlign: 'center' },
  subtitle:   { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  detailBox:  { backgroundColor: '#1A1A1A', borderRadius: 8, padding: 14, maxHeight: 160, width: '100%', marginBottom: 24 },
  detailText: { fontSize: 12, color: '#FF6B6B', fontFamily: 'monospace' },
  btn:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7C3AED', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  btnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default ErrorBoundary;
