import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';

const REASON_CONTENT = {
  task_limit: {
    icon: 'checkbox-outline',
    title: 'Need more capacity?',
    desc: 'Add CRM, HR, Accounting and more modules to grow.',
  },
  project_limit: {
    icon: 'folder-outline',
    title: 'Want more modules?',
    desc: 'Choose from CRM, Sales, Inventory, and more.',
  },
  user_limit: {
    icon: 'people-outline',
    title: 'Growing your team?',
    desc: 'Add more modules to support your team.',
  },
  module_limit: {
    icon: 'apps-outline',
    title: 'Modules not available',
    desc: 'Add modules that match your needs.',
  },
  readonly: {
    icon: 'lock-closed-outline',
    title: 'Trial expired',
    desc: 'Choose modules to continue using SimpleSoft.',
  },
};

const UpgradePrompt = ({ visible, reason, onClose, onUpgrade, navigation }) => {
  const { colors } = useTheme();

  if (!visible) return null;

  const content = REASON_CONTENT[reason] || REASON_CONTENT.task_limit;

  const handleManageModules = () => {
    onClose();
    if (navigation) {
      navigation.navigate('ModulePicker');
    } else if (onUpgrade) {
      onUpgrade();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.bg} onPress={onClose} activeOpacity={1} />
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[s.iconWrap, { backgroundColor: colors.primary + '18' }]}>
            <Icon name={content.icon} size={32} color={colors.primary} />
          </View>
          <Text style={[s.title, { color: colors.text }]}>{content.title}</Text>
          <Text style={[s.desc, { color: colors.textSecondary }]}>{content.desc}</Text>

          {/* Action button */}
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.primary }]}
            onPress={handleManageModules}>
            <Icon name="grid-outline" size={20} color="#fff" />
            <Text style={s.actionBtnText}>Manage Modules</Text>
            <Icon name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={s.laterBtn} onPress={onClose}>
            <Text style={[s.laterText, { color: colors.textSecondary }]}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const S = StyleSheet;
const s = S.create({
  overlay:       { flex: 1, justifyContent: 'flex-end' },
  bg:            { ...S.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:         { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:        { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  iconWrap:      { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14 },
  title:         { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  desc:          { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  actionBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14, marginBottom: 12 },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  laterBtn:      { alignItems: 'center', paddingVertical: 12 },
  laterText:     { fontSize: 14 },
});

export default UpgradePrompt;
