//dagdagan ng design, pero okay na ang logic

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, TextInput, View } from 'react-native';
import { API_URL } from '../utils/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter(); 

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/login`, {
        email,
        password,
      }, {
        headers: {
          Accept: 'application/json',
        }
      });

      const token = response.data.token;
      await AsyncStorage.setItem('auth_token', token);

      Alert.alert('Login Successful');
      router.replace('/home');
    } catch (error) {
      console.error(error.response?.data || error.message);
      Alert.alert('Login Failed', 'Check your credentials');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}
