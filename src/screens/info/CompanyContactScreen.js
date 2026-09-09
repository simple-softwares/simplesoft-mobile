import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';

const CONTACT_INFO = {
  email: 'contact@simplesoft.co.in',
  phone: '+91 98765 43210',
  website: 'https://simplesoft.co.in',
  address: 'SimpleSoft Solutions\nTech Park, Bangalore\nIndia',
};

const SOCIAL_LINKS = [
  { name: 'Twitter', icon: 'logo-twitter', url: 'https://twitter.com/simplesoft', color: '#1DA1F2' },
  { name: 'LinkedIn', icon: 'logo-linkedin', url: 'https://linkedin.com/company/simplesoft', color: '#0A66C2' },
  { name: 'GitHub', icon: 'logo-github', url: 'https://github.com/simplesoft', color: '#333' },
  { name: 'Facebook', icon: 'logo-facebook', url: 'https://facebook.com/simplesoft', color: '#1877F2' },
];

const ContactButton = ({ icon, label, value, onPress, colors, iconColor }) => {
  return (
    <TouchableOpacity
      style={[s.contactBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[s.contactIcon, { backgroundColor: (iconColor || colors.primary) + '15' }]}>
        <Icon name={icon} size={20} color={iconColor || colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.contactLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[s.contactValue, { color: colors.text }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Icon name="chevron-forward-outline" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

const SocialButton = ({ icon, name, url, color }) => {
  const { colors } = useTheme();

  const handlePress = () => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', `Could not open ${name}`);
    });
  };

  return (
    <TouchableOpacity
      style={[s.socialBtn, { backgroundColor: color + '15' }]}
      onPress={handlePress}
      activeOpacity={0.7}>
      <Icon name={icon} size={28} color={color} />
      <Text style={[s.socialLabel, { color: colors.text }]}>{name}</Text>
    </TouchableOpacity>
  );
};

const CompanyContactScreen = ({ navigation }) => {
  const { colors } = useTheme();

  const handleEmail = () => {
    Linking.openURL(`mailto:${CONTACT_INFO.email}`).catch(() => {
      Alert.alert('Error', 'Could not open email client');
    });
  };

  const handlePhone = () => {
    Linking.openURL(`tel:${CONTACT_INFO.phone}`).catch(() => {
      Alert.alert('Error', 'Could not make phone call');
    });
  };

  const handleWebsite = () => {
    Linking.openURL(CONTACT_INFO.website).catch(() => {
      Alert.alert('Error', 'Could not open website');
    });
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="arrow-back-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>Contact Us</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Company Info */}
        <View style={[s.section, { backgroundColor: colors.surface }]}>
          <View style={[s.logoBox, { backgroundColor: colors.primary + '15' }]}>
            <Icon name="business-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[s.companyName, { color: colors.text }]}>SimpleSoft Solutions</Text>
          <Text style={[s.companyTagline, { color: colors.textSecondary }]}>
            Workspace Management Made Simple
          </Text>
        </View>

        {/* Quick Contact */}
        <View>
          <Text style={[s.sectionLabel, { color: colors.textLight }]}>Quick Contact</Text>
          <ContactButton
            icon="mail-outline"
            label="Email"
            value={CONTACT_INFO.email}
            onPress={handleEmail}
            colors={colors}
            iconColor="#EA4335"
          />
          <ContactButton
            icon="call-outline"
            label="Phone"
            value={CONTACT_INFO.phone}
            onPress={handlePhone}
            colors={colors}
            iconColor="#34A853"
          />
          <ContactButton
            icon="globe-outline"
            label="Website"
            value={CONTACT_INFO.website}
            onPress={handleWebsite}
            colors={colors}
            iconColor="#4285F4"
          />
        </View>

        {/* Address */}
        <View style={[s.addressSection, { backgroundColor: colors.surface }]}>
          <View style={[s.addressIcon, { backgroundColor: colors.primary + '15' }]}>
            <Icon name="location-outline" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[s.addressLabel, { color: colors.textSecondary }]}>Address</Text>
            <Text style={[s.addressText, { color: colors.text }]}>
              {CONTACT_INFO.address}
            </Text>
          </View>
        </View>

        {/* Social Links */}
        <View>
          <Text style={[s.sectionLabel, { color: colors.textLight }]}>Follow Us</Text>
          <View style={s.socialGrid}>
            {SOCIAL_LINKS.map((link) => (
              <SocialButton key={link.name} {...link} />
            ))}
          </View>
        </View>

        {/* Business Hours */}
        <View style={[s.hoursSection, { backgroundColor: colors.amber + '10', borderColor: colors.amber }]}>
          <Icon name="time-outline" size={20} color={colors.amber} />
          <View style={{ flex: 1 }}>
            <Text style={[s.hoursTitle, { color: colors.amber }]}>Business Hours</Text>
            <Text style={[s.hoursText, { color: colors.amber }]}>
              Monday - Friday: 9:00 AM - 6:00 PM IST{'\n'}
              Saturday - Sunday: Closed{'\n'}
              Holidays: As per Indian calendar
            </Text>
          </View>
        </View>

        {/* Support */}
        <View style={[s.supportSection, { backgroundColor: colors.surface }]}>
          <Icon name="help-circle-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[s.supportTitle, { color: colors.text }]}>Need Help?</Text>
            <Text style={[s.supportText, { color: colors.textSecondary }]}>
              Check out our how-to guide or send us a message. We typically respond within 24 hours.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container:       { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn:         { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:           { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  scroll:          { flex: 1 },
  content:         { padding: 12, paddingBottom: 32 },
  section:         { marginBottom: 16, borderRadius: 12, padding: 20, alignItems: 'center' },
  logoBox:         { width: 80, height: 80, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  companyName:     { fontSize: 20, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  companyTagline:  { fontSize: 13, textAlign: 'center' },
  sectionLabel:    { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4, paddingVertical: 8, marginBottom: 8 },
  contactBtn:      { marginBottom: 10, borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  contactIcon:     { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  contactLabel:    { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  contactValue:    { fontSize: 14, fontWeight: '600' },
  addressSection:  { marginBottom: 16, borderRadius: 12, padding: 14, flexDirection: 'row', gap: 12 },
  addressIcon:     { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  addressLabel:    { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  addressText:     { fontSize: 13, lineHeight: 18 },
  socialGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  socialBtn:       { flex: 0.45, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  socialLabel:     { fontSize: 12, fontWeight: '600', marginTop: 6 },
  hoursSection:    { marginBottom: 16, borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: 'row', gap: 12 },
  hoursTitle:      { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  hoursText:       { fontSize: 12, lineHeight: 18 },
  supportSection:  { marginBottom: 16, borderRadius: 12, padding: 14, flexDirection: 'row', gap: 12 },
  supportTitle:    { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  supportText:     { fontSize: 12, lineHeight: 18 },
});

export default CompanyContactScreen;
