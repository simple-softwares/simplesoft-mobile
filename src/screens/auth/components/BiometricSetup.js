import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import BiometricService from '@services/biometric/biometricService';

const BiometricSetup = ({ username, password, onSetupComplete, onSkip }) => {
  const [loading, setLoading] = useState(false);
  const [biometricInfo, setBiometricInfo] = useState(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    const info = BiometricService.getSettings();
    setBiometricInfo(info);
    setEnabled(info.enabled && info.user === username);
  };

  const getBiometricIcon = () => {
    switch(biometricInfo?.type) {
      case 'FaceID':
        return 'face';
      case 'TouchID':
        return 'fingerprint';
      default:
        return 'fingerprint';
    }
  };

  const handleEnableBiometric = async () => {
    if (!biometricInfo?.available) {
      Alert.alert(
        'Not Available',
        `${biometricInfo?.typeName} is not available on this device.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    
    const result = await BiometricService.enableBiometric(username, password);
    
    if (result.success) {
      setEnabled(true);
      Alert.alert(
        'Success',
        `${biometricInfo.typeName} login enabled successfully!`,
        [
          { 
            text: 'OK', 
            onPress: () => onSetupComplete && onSetupComplete() 
          }
        ]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to enable biometric login');
    }
    
    setLoading(false);
  };

  const handleDisableBiometric = () => {
    Alert.alert(
      'Disable Biometric Login',
      `Are you sure you want to disable ${biometricInfo?.typeName} login?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: () => {
            BiometricService.disableBiometric();
            setEnabled(false);
          }
        }
      ]
    );
  };

  const handleTestBiometric = async () => {
    setLoading(true);
    
    const result = await BiometricService.authenticateWithBiometric();
    
    if (result.success) {
      Alert.alert('Success', 'Biometric authentication successful!');
    } else {
      Alert.alert('Authentication Failed', result.error || 'Could not authenticate');
    }
    
    setLoading(false);
  };

  if (!biometricInfo) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon 
          name={getBiometricIcon()} 
          size={80} 
          color={biometricInfo.available ? '#2196F3' : '#999'} 
        />
      </View>

      <Text style={styles.title}>
        {biometricInfo.available 
          ? `Enable ${biometricInfo.typeName} Login` 
          : 'Biometric Not Available'}
      </Text>

      <Text style={styles.description}>
        {biometricInfo.available
          ? `Use your ${biometricInfo.typeName} to quickly and securely log in to your account.`
          : `Your device doesn't support biometric authentication. You can still log in with your password.`}
      </Text>

      {biometricInfo.available && (
        <>
          <View style={styles.optionRow}>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Enable Biometric Login</Text>
              <Text style={styles.optionDescription}>
                Quickly access your account with {biometricInfo.typeName}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={enabled ? handleDisableBiometric : handleEnableBiometric}
              disabled={loading}
              trackColor={{ false: '#767577', true: '#2196F3' }}
            />
          </View>

          {enabled && (
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestBiometric}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#2196F3" />
              ) : (
                <>
                  <Icon name="check-circle" size={20} color="#4CAF50" />
                  <Text style={styles.testButtonText}>Test Biometric Login</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </>
      )}

      <TouchableOpacity
        style={styles.skipButton}
        onPress={onSkip}>
        <Text style={styles.skipButtonText}>
          {biometricInfo.available ? 'Skip for now' : 'Continue'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  optionTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: '#666',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 12,
    width: '100%',
    marginBottom: 20,
  },
  testButtonText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  skipButton: {
    padding: 15,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#999',
  },
});

export default BiometricSetup;
