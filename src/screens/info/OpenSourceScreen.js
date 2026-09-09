import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';

const LIBRARIES = [
  {
    name: 'React Native',
    description: 'Framework for building native mobile apps',
    license: 'MIT',
    url: 'https://reactnative.dev',
    color: '#61DAFB',
  },
  {
    name: 'Redux Toolkit',
    description: 'State management library for React',
    license: 'MIT',
    url: 'https://redux-toolkit.js.org',
    color: '#764ABC',
  },
  {
    name: 'React Navigation',
    description: 'Routing and navigation library',
    license: 'MIT',
    url: 'https://reactnavigation.org',
    color: '#2196F3',
  },
  {
    name: 'Axios',
    description: 'Promise-based HTTP client',
    license: 'MIT',
    url: 'https://axios-http.com',
    color: '#5A29E4',
  },
  {
    name: 'React Native Vector Icons',
    description: 'Icon library for React Native',
    license: 'MIT',
    url: 'https://github.com/oblador/react-native-vector-icons',
    color: '#FF6B6B',
  },
  {
    name: 'MMKV',
    description: 'Extremely fast key-value storage for mobile',
    license: 'BSD',
    url: 'https://github.com/Tencent/MMKV',
    color: '#4CAF50',
  },
  {
    name: 'Firebase',
    description: 'Cloud platform for mobile and web apps',
    license: 'Apache 2.0',
    url: 'https://firebase.google.com',
    color: '#FFCA28',
  },
  {
    name: 'Notifee',
    description: 'Local and remote notification library',
    license: 'Apache 2.0',
    url: 'https://notifee.app',
    color: '#FF6B35',
  },
];

const LibraryCard = ({ lib, colors }) => {
  const handlePress = () => {
    Linking.openURL(lib.url).catch(() => {
    });
  };

  return (
    <TouchableOpacity
      style={[s.libCard, { backgroundColor: colors.surface }]}
      onPress={handlePress}
      activeOpacity={0.7}>
      <View style={[s.libIcon, { backgroundColor: lib.color + '20' }]}>
        <Icon name="open-outline" size={20} color={lib.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.libName, { color: colors.text }]}>{lib.name}</Text>
        <Text style={[s.libDesc, { color: colors.textSecondary }]} numberOfLines={1}>
          {lib.description}
        </Text>
        <View style={s.libFooter}>
          <View style={[s.licenseBadge, { backgroundColor: lib.color + '20' }]}>
            <Text style={[s.licenseBadgeText, { color: lib.color }]}>{lib.license}</Text>
          </View>
        </View>
      </View>
      <Icon name="chevron-forward-outline" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

const OpenSourceScreen = ({ navigation }) => {
  const { colors } = useTheme();

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="arrow-back-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>Open Source</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          SimpleSoft Workspace is built with awesome open source libraries
        </Text>

        {LIBRARIES.map((lib) => (
          <LibraryCard key={lib.name} lib={lib} colors={colors} />
        ))}

        <View style={[s.infoBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
          <Icon name="information-circle-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[s.infoTitle, { color: colors.primary }]}>Thank You</Text>
            <Text style={[s.infoText, { color: colors.primary }]}>
              We are grateful to all the open source developers who made SimpleSoft Workspace possible. Click any library to visit its project page.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container:     { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn:       { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:         { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  scroll:        { flex: 1 },
  content:       { padding: 12, paddingBottom: 32 },
  subtitle:      { fontSize: 13, marginBottom: 16, textAlign: 'center', color: '#999' },
  libCard:       { marginBottom: 10, borderRadius: 12, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  libIcon:       { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  libName:       { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  libDesc:       { fontSize: 12, marginBottom: 6 },
  libFooter:     { flexDirection: 'row', gap: 8 },
  licenseBadge:  { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  licenseBadgeText: { fontSize: 11, fontWeight: '600' },
  infoBox:       { marginTop: 16, flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoTitle:     { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  infoText:      { fontSize: 12, lineHeight: 18 },
});

export default OpenSourceScreen;
