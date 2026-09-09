import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
  TextInput, ActivityIndicator, Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../theme/ThemeContext';
import axios from 'axios';
import { PROVISION_BASE } from '../../config';

const CreateEmployeeScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const workspace = useSelector(s => s.workspace);
  const user = useSelector(s => s.auth?.user);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [creating, setCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const isValidEmail = (text) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);

  const handleCreateEmployee = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter employee name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter employee email');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setCreating(true);

      const res = await axios.post(
        `${PROVISION_BASE}/api/workspace/${workspace.slug}/employee`,
        {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          role: role
        },
        { headers: { 'X-User-Email': user?.email } }
      );

      setCreatedCredentials(res.data);
      setShowSuccess(true);
      setName('');
      setEmail('');
      setRole('member');

    } catch (e) {
      const errorMsg = e.response?.data?.detail || e.message || 'Failed to create employee';
      Alert.alert('Error', errorMsg);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyPassword = () => {
    if (createdCredentials?.temporary_password) {
      // In real app, use Clipboard API
      Alert.alert('Copied', `Password: ${createdCredentials.temporary_password}`);
    }
  };

  const handleShareCredentials = () => {
    if (!createdCredentials) return;

    const message = `
Welcome to SimpleSoft!

Your account has been created by your admin.

📧 Email: ${createdCredentials.email}
🔐 Temporary Password: ${createdCredentials.temporary_password}

⚠️ IMPORTANT:
1. Download SimpleSoft app
2. Login with your email and temporary password
3. You'll be asked to create a new password on first login
4. Then access your workspace and start working!

Questions? Contact your admin.
    `.trim();

    // In real app, show share dialog
    Alert.alert('Share Credentials', message, [
      { text: 'Copy', onPress: handleCopyPassword },
      { text: 'Done' }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Create Employee</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.successIcon}>
              <Icon name="checkmark-circle" size={60} color="#4CAF50" />
            </View>

            <Text style={[styles.successTitle, { color: colors.text }]}>
              Account Created! ✓
            </Text>

            <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
              {createdCredentials?.name}
            </Text>

            {/* Credentials Box */}
            <View style={[styles.credentialsBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.credentialLabel, { color: colors.textSecondary }]}>
                Email
              </Text>
              <Text style={[styles.credentialValue, { color: colors.text }]}>
                {createdCredentials?.email}
              </Text>

              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />

              <Text style={[styles.credentialLabel, { color: colors.textSecondary }]}>
                Temporary Password
              </Text>
              <Text style={[styles.credentialValue, { color: colors.text, fontFamily: 'monospace' }]}>
                {createdCredentials?.temporary_password}
              </Text>

              <Text style={[styles.warningText, { color: '#FF9800' }]}>
                ⚠️ Employee must change password on first login
              </Text>
            </View>

            {/* Instructions */}
            <View style={styles.instructions}>
              <Text style={[styles.instructionsTitle, { color: colors.text }]}>
                📋 Next Steps:
              </Text>
              {createdCredentials?.instructions?.map((step, i) => (
                <Text key={i} style={[styles.instructionStep, { color: colors.textSecondary }]}>
                  {step}
                </Text>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleShareCredentials}
              >
                <Icon name="share-social" size={18} color="white" />
                <Text style={styles.buttonText}>Share Credentials</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary }]}
                onPress={() => setShowSuccess(false)}
              >
                <Text style={[styles.buttonText, { color: colors.primary }]}>Create Another</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#4CAF50' }]}
                onPress={() => {
                  setShowSuccess(false);
                  navigation.goBack();
                }}
              >
                <Icon name="checkmark" size={18} color="white" />
                <Text style={styles.buttonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Form */}
      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
          <Icon name="information-circle" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Admin creates account with temporary password. Employee changes password on first login.
          </Text>
        </View>

        {/* Name Field */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Employee Name *</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder="John Doe"
            placeholderTextColor={colors.placeholder}
            value={name}
            onChangeText={setName}
            editable={!creating}
          />
        </View>

        {/* Email Field */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Email Address *</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder="john@company.com"
            placeholderTextColor={colors.placeholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!creating}
          />
          {email && !isValidEmail(email) && (
            <Text style={styles.errorText}>Invalid email address</Text>
          )}
        </View>

        {/* Role Field */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Role *</Text>
          <TouchableOpacity
            style={[styles.roleButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setShowRoleMenu(!showRoleMenu)}
            disabled={creating}
          >
            <Text style={[styles.roleButtonText, { color: colors.text }]}>
              {role === 'admin' ? '👨‍💼 Admin' : '👤 Member'}
            </Text>
            <Icon name={showRoleMenu ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
          </TouchableOpacity>

          {showRoleMenu && (
            <View style={[styles.roleMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.roleOption, { backgroundColor: role === 'member' ? colors.background : 'transparent' }]}
                onPress={() => {
                  setRole('member');
                  setShowRoleMenu(false);
                }}
              >
                <Icon name="person" size={18} color={colors.primary} />
                <Text style={[styles.roleOptionText, { color: colors.text }]}>Member</Text>
                {role === 'member' && <Icon name="checkmark" size={18} color="#4CAF50" />}
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <TouchableOpacity
                style={[styles.roleOption, { backgroundColor: role === 'admin' ? colors.background : 'transparent' }]}
                onPress={() => {
                  setRole('admin');
                  setShowRoleMenu(false);
                }}
              >
                <Icon name="shield" size={18} color={colors.primary} />
                <Text style={[styles.roleOptionText, { color: colors.text }]}>Admin</Text>
                {role === 'admin' && <Icon name="checkmark" size={18} color="#4CAF50" />}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Role Description */}
        <View style={[styles.roleDesc, { backgroundColor: colors.background }]}>
          {role === 'admin' ? (
            <>
              <Icon name="shield" size={16} color={colors.primary} />
              <Text style={[styles.roleDescText, { color: colors.textSecondary }]}>
                Admin: Can manage team, invite members, purchase seats
              </Text>
            </>
          ) : (
            <>
              <Icon name="person" size={16} color={colors.primary} />
              <Text style={[styles.roleDescText, { color: colors.textSecondary }]}>
                Member: Can access workspace and assigned modules
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* Create Button */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.createButton,
            { backgroundColor: colors.primary, opacity: name && email && isValidEmail(email) ? 1 : 0.5 }
          ]}
          onPress={handleCreateEmployee}
          disabled={creating || !name || !email || !isValidEmail(email)}
        >
          {creating ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Icon name="add-circle" size={20} color="white" />
              <Text style={styles.createButtonText}>Create Employee Account</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 13,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  roleMenu: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  roleOptionText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  divider: {
    height: 1,
  },
  roleDesc: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  roleDescText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Success Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  credentialsBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  credentialLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  credentialValue: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 12,
    marginTop: 8,
  },
  instructions: {
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionStep: {
    fontSize: 13,
    marginVertical: 4,
  },
  actions: {
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default CreateEmployeeScreen;
