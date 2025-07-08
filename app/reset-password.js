import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { API_URL } from '../utils/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token, email } = useLocalSearchParams();

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (password !== passwordConfirmation) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/reset-password`, {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      Alert.alert('Success', 'Your password has been reset successfully. Please log in.');
      router.replace('/');
    } catch (error) {
      console.error('Reset Password Error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to reset password. The link may be invalid or expired.');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Your Password</Text>
      <TextInput
        placeholder="New Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <TextInput
        placeholder="Confirm New Password"
        value={passwordConfirmation}
        onChangeText={setPasswordConfirmation}
        secureTextEntry
        style={styles.input}
      />
      <Button title={loading ? 'Resetting...' : 'Reset Password'} onPress={handleResetPassword} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
    fontSize: 16,
  },
});
