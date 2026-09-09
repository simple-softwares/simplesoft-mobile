import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';

const TermsAndConditionsScreen = ({ navigation }) => {
  const { colors } = useTheme();

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="arrow-back-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}>

        <View style={[s.section, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>1. Acceptance of Terms</Text>
          <Text style={[s.sectionText, { color: colors.textSecondary }]}>
            By accessing and using SimpleSoft Workspace ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </Text>
        </View>

        <View style={[s.section, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>2. Use License</Text>
          <Text style={[s.sectionText, { color: colors.textSecondary }]}>
            Permission is granted to temporarily download one copy of the materials (information or software) on SimpleSoft Workspace for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:{'\n'}
            • Modify or copy the materials{'\n'}
            • Use the materials for any commercial purpose or for any public display{'\n'}
            • Attempt to decompile or reverse engineer any software contained on SimpleSoft Workspace{'\n'}
            • Remove any copyright or other proprietary notations from the materials{'\n'}
            • Transfer the materials to another person or "mirror" the materials on any other server
          </Text>
        </View>

        <View style={[s.section, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>3. Disclaimer</Text>
          <Text style={[s.sectionText, { color: colors.textSecondary }]}>
            The materials on SimpleSoft Workspace are provided on an 'as is' basis. SimpleSoft makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </Text>
        </View>

        <View style={[s.section, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>4. Limitations</Text>
          <Text style={[s.sectionText, { color: colors.textSecondary }]}>
            In no event shall SimpleSoft or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on SimpleSoft Workspace, even if SimpleSoft or a SimpleSoft authorized representative has been notified orally or in writing of the possibility of such damage.
          </Text>
        </View>

        <View style={[s.section, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>5. Accuracy of Materials</Text>
          <Text style={[s.sectionText, { color: colors.textSecondary }]}>
            The materials appearing on SimpleSoft Workspace could include technical, typographical, or photographic errors. SimpleSoft does not warrant that any of the materials on SimpleSoft Workspace are accurate, complete, or current. SimpleSoft may make changes to the materials contained on SimpleSoft Workspace at any time without notice.
          </Text>
        </View>

        <View style={[s.section, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>6. Links</Text>
          <Text style={[s.sectionText, { color: colors.textSecondary }]}>
            SimpleSoft has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by SimpleSoft of the site. Use of any such linked website is at the user's own risk.
          </Text>
        </View>

        <View style={[s.section, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>7. Modifications</Text>
          <Text style={[s.sectionText, { color: colors.textSecondary }]}>
            SimpleSoft may revise these terms of service for SimpleSoft Workspace at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
          </Text>
        </View>

        <View style={[s.section, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>8. Governing Law</Text>
          <Text style={[s.sectionText, { color: colors.textSecondary }]}>
            These terms and conditions are governed by and construed in accordance with the laws of India, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
          </Text>
        </View>

        <Text style={[s.lastUpdated, { color: colors.textLight }]}>
          Last updated: April 2026
        </Text>
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
  section:       { marginBottom: 12, borderRadius: 12, padding: 16, overflow: 'hidden' },
  sectionTitle:  { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  sectionText:   { fontSize: 13, lineHeight: 20 },
  lastUpdated:   { textAlign: 'center', fontSize: 12, marginTop: 16, marginBottom: 24 },
});

export default TermsAndConditionsScreen;
