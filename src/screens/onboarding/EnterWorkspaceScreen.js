import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Animated, Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import ProvisionService from '../../services/provision/provisionService';
import { workspaceWebUrl } from '../../config';
 
const EnterWorkspaceScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const [slug,    setSlug]    = useState(route?.params?.slug || '');
  const [loading, setLoading] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Animation loop
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [loading]);

  // If slug is provided (from signup), auto-continue
  useEffect(() => {
    if (route?.params?.slug) {
      handleContinue();
    }
  }, []);

  const handleContinue = async () => {
    const s = slug.trim().toLowerCase();
    if (!s) return;
    setLoading(true);
    try {
      // Check workspace exists
      const workspaceUrl = workspaceWebUrl(s);
      const res = await fetch(`${workspaceUrl}/health`);
      if (res.ok) {
        ProvisionService.saveWorkspace({
          slug:          s,
          workspace_url: workspaceUrl,
          modules:       [],
        });
        navigation.navigate('Login');
      } else {
        Alert.alert('Not found', `No workspace found for ${s}`);
      }
    } catch {
      Alert.alert('Not found', `Could not connect to ${s}`);
    } finally { setLoading(false); }
  };
 
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back} disabled={loading}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {loading ? (
          <>
            <Animated.View style={[s.iconWrap, { backgroundColor: colors.primary + '18', transform: [{ rotate: spin }] }]}>
              <Icon name="layers" size={48} color={colors.primary} />
            </Animated.View>
            <Text style={[s.title, { color: colors.text }]}>Connecting to workspace</Text>
            <Text style={[s.sub, { color: colors.textSecondary }]}>
              Verifying {workspaceWebUrl(slug)}
            </Text>
          </>
        ) : (
          <>
            <Icon name="layers" size={48} color={colors.primary} style={s.icon} />
            <Text style={[s.title, { color: colors.text }]}>Enter your workspace</Text>
            <Text style={[s.sub, { color: colors.textSecondary }]}>
              Type your company's workspace URL
            </Text>

            <View style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[s.prefix, { color: colors.textLight }]}>ss.co.in/</Text>
              <TextInput
                style={[s.input, { color: colors.text }]}
                value={slug}
                onChangeText={setSlug}
                placeholder="yourcompany"
                placeholderTextColor={colors.textLight}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="go"
                onSubmitEditing={handleContinue}
              />
            </View>

            <TouchableOpacity
              style={[s.btn, { backgroundColor: colors.primary }]}
              onPress={handleContinue}
              disabled={!slug.trim()}>
              <Text style={s.btnText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};
 
const S = StyleSheet;
const s = S.create({
  container: { flex: 1, padding: 32, justifyContent: 'center' },
  back:      { position: 'absolute', top: 56, left: 20 },
  icon:      { alignSelf: 'center', marginBottom: 16 },
  iconWrap:  { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24, alignSelf: 'center' },
  title:     { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  sub:       { fontSize: 15, textAlign: 'center', marginBottom: 40 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, marginBottom: 16 },
  prefix:    { paddingLeft: 16, fontSize: 15, fontWeight: '500' },
  input:     { flex: 1, paddingVertical: 14, paddingHorizontal: 4, fontSize: 15 },
  btn:       { borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: '#2196F3' },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
});
 
export default EnterWorkspaceScreen;
