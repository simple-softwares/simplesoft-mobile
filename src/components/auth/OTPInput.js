import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const OTPInput = ({ length = 6, value = '', onChange, disabled = false }) => {
  const inputs = useRef([]);
  const [focused, setFocused] = useState(null);

  const handleChange = (text, index) => {
    // Only allow digits
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const otpArray = value.split('');
    otpArray[index] = digit;
    const newOtp = otpArray.join('').slice(0, length);
    onChange(newOtp);
    // Auto-advance
    if (digit && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      const otpArray = value.split('');
      if (!otpArray[index] && index > 0) {
        // Move back and clear previous
        otpArray[index - 1] = '';
        onChange(otpArray.join(''));
        inputs.current[index - 1]?.focus();
      } else {
        otpArray[index] = '';
        onChange(otpArray.join(''));
      }
    }
  };

  return (
    <View style={styles.container}>
      {Array(length)
        .fill(0)
        .map((_, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputs.current[index] = ref)}
            style={[
              styles.cell,
              focused === index && styles.cellFocused,
              value[index] && styles.cellFilled,
            ]}
            value={value[index] || ''}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => setFocused(index)}
            onBlur={() => setFocused(null)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            editable={!disabled}
            textContentType="oneTimeCode"
            autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
          />
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  cell: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#E8E8E0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#0D0D14',
    backgroundColor: '#FFFFFF',
  },
  cellFocused: {
    borderColor: '#2563EB',
    borderWidth: 2,
    backgroundColor: '#EEF3FF',
  },
  cellFilled: {
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
});

export default OTPInput;
