import axios from 'axios';
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { API_URL } from '../utils/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendResetLink = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await axios.post(`${API_URL}/api/forgot-password`, { email });
      setMessage(response.data.message);
      Alert.alert('Success', 'If an account with that email exists, a password reset link has been sent.');
    } catch (error) {
      console.error('Forgot Password Error:', error.response?.data || error.message);
      Alert.alert('Error', 'Could not send reset link. Please try again.');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>Enter your email address and we will send you a link to reset your password.</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <Button title={loading ? 'Sending...' : 'Send Reset Link'} onPress={handleSendResetLink} disabled={loading} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
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
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
    fontSize: 16,
  },
  message: {
    marginTop: 20,
    textAlign: 'center',
    color: 'green',
  },
});
