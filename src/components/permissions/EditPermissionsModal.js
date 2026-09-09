import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Switch, SectionList
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import PermissionsService from '../../services/permissions/permissionsService';

const EditPermissionsModal = ({ visible, employee, onClose, onSave }) => {
  const { colors } = useTheme();
  const [selectedModules, setSelectedModules] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [saving, setSaving] = useState(false);

  const availableModules = PermissionsService.getAvailableModules();
  const availableFeatures = PermissionsService.getAvailableFeatures();

  useEffect(() => {
    if (employee && visible) {
      setSelectedModules(employee.enabled_modules || []);
      setSelectedFeatures(employee.enabled_features || []);
    }
  }, [employee, visible]);

  const handleToggleModule = (moduleKey) => {
    setSelectedModules(prev =>
      prev.includes(moduleKey)
        ? prev.filter(m => m !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  const handleToggleFeature = (featureKey) => {
    setSelectedFeatures(prev =>
      prev.includes(featureKey)
        ? prev.filter(f => f !== featureKey)
        : [...prev, featureKey]
    );
  };

  const handleSave = async () => {
    if (!employee) return;

    try {
      setSaving(true);
      await onSave(selectedModules, selectedFeatures);
    } catch (error) {
    } finally {
      setSaving(false);
    }
  };

  const ModuleItem = ({ module }) => {
    const isEnabled = selectedModules.includes(module.key);
    return (
      <TouchableOpacity
        style={[
          styles.permissionItem,
          {
            backgroundColor: isEnabled ? colors.primary + '15' : colors.surface,
            borderColor: isEnabled ? colors.primary : colors.border,
          },
        ]}
        onPress={() => handleToggleModule(module.key)}
        activeOpacity={0.7}
      >
        <View style={styles.permissionContent}>
          <Icon name={module.icon} size={20} color={module.color} />
          <View style={styles.permissionText}>
            <Text style={[styles.permissionLabel, { color: colors.text }]}>
              {module.label}
            </Text>
            <Text style={[styles.permissionKey, { color: colors.textSecondary }]}>
              {module.key}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: isEnabled ? colors.primary : colors.border,
              borderColor: isEnabled ? colors.primary : colors.border,
            },
          ]}
        >
          {isEnabled && <Icon name="checkmark" size={14} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  const FeatureItem = ({ feature }) => {
    const isEnabled = selectedFeatures.includes(feature.key);
    return (
      <TouchableOpacity
        style={[
          styles.permissionItem,
          {
            backgroundColor: isEnabled ? colors.primary + '15' : colors.surface,
            borderColor: isEnabled ? colors.primary : colors.border,
          },
        ]}
        onPress={() => handleToggleFeature(feature.key)}
        activeOpacity={0.7}
      >
        <View style={styles.permissionContent}>
          <Icon name={feature.icon} size={20} color={colors.primary} />
          <View style={styles.permissionText}>
            <Text style={[styles.permissionLabel, { color: colors.text }]}>
              {feature.label}
            </Text>
            <Text style={[styles.permissionKey, { color: colors.textSecondary }]}>
              {feature.key}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: isEnabled ? colors.primary : colors.border,
              borderColor: isEnabled ? colors.primary : colors.border,
            },
          ]}
        >
          {isEnabled && <Icon name="checkmark" size={14} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Icon name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {employee?.name}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {employee?.email}
            </Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Modules Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="layers-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Modules ({selectedModules.length})
              </Text>
            </View>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Select which app modules this employee can access. Leave empty to allow all.
            </Text>

            <View style={styles.itemsGrid}>
              {availableModules.map(module => (
                <ModuleItem key={module.key} module={module} />
              ))}
            </View>
          </View>

          {/* Features Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="star-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Integrations ({selectedFeatures.length})
              </Text>
            </View>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Select which integrations this employee can use.
            </Text>

            <View style={styles.itemsGrid}>
              {availableFeatures.map(feature => (
                <FeatureItem key={feature.key} feature={feature} />
              ))}
            </View>
          </View>

          {/* Info Box */}
          <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
            <Icon name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              Empty selection = All modules/integrations allowed
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={onClose}
            disabled={saving}
          >
            <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="checkmark" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionDescription: {
    fontSize: 12,
    marginBottom: 12,
    fontWeight: '400',
  },
  itemsGrid: {
    gap: 8,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  permissionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permissionText: {
    flex: 1,
  },
  permissionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  permissionKey: {
    fontSize: 11,
    fontWeight: '400',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EditPermissionsModal;
