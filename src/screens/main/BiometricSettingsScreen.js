import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import BiometricService from '@services/biometric/biometricService';
import { useSelector } from 'react-redux';

const BiometricSettingsScreen = ({ navigation }) => {
  const user = useSelector(s => s.auth.user);
  const [loading, setLoading] = useState(false);
  const [biometricInfo, setBiometricInfo] = useState(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    loadBiometricInfo();
  }, []);

  const loadBiometricInfo = () => {
    const info = BiometricService.getSettings();
    setBiometricInfo(info);
    setEnabled(info.enabled && info.user === user?.username);
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

  const handleToggleBiometric = async () => {
    if (!enabled) {
      // Enable biometric
      setLoading(true);
      const result = await BiometricService.enableBiometric(
        user?.username,
        '' // You'd need to get password securely
      );
      
      if (result.success) {
        setEnabled(true);
        Alert.alert('Success', `Biometric login enabled!`);
      } else {
        Alert.alert('Error', result.error || 'Failed to enable biometric');
      }
      setLoading(false);
    } else {
      // Disable biometric
      Alert.alert(
        'Disable Biometric',
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
    }
  };

  const handleTestBiometric = async () => {
    setLoading(true);
    const success = await BiometricService.simplePrompt(
      `Authenticate with ${biometricInfo?.typeName}`
    );
    
    if (success) {
      Alert.alert('Success', 'Biometric authentication successful!');
    } else {
      Alert.alert('Failed', 'Biometric authentication failed');
    }
    setLoading(false);
  };

  if (!biometricInfo) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Biometric Login</Text>
      </View>

      <View style={styles.iconContainer}>
        <Icon 
          name={getBiometricIcon()} 
          size={100} 
          color={biometricInfo.available ? '#2196F3' : '#999'} 
        />
        <Text style={styles.biometricType}>
          {biometricInfo.available 
            ? biometricInfo.typeName 
            : 'Not Available'}
        </Text>
      </View>

      {biometricInfo.available ? (
        <>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Use your {biometricInfo.typeName} to quickly and securely log in to your account.
            </Text>
          </View>

          <View style={styles.optionRow}>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Enable Biometric Login</Text>
              <Text style={styles.optionDescription}>
                {enabled 
                  ? `You can log in using your ${biometricInfo.typeName}`
                  : `Quickly access your account with ${biometricInfo.typeName}`}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggleBiometric}
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
                  <Text style={styles.testButtonText}>Test Biometric</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Biometric authentication is not available on this device. 
            You can still log in using your password.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  biometricType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testButtonText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default BiometricSettingsScreen;
