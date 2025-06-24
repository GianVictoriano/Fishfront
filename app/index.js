//first page mga pre baguhin nalang pag mag front end na

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Button, TextInput, View } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        router.replace('/home');
      }
    };
    checkAuth();
  }, []);

  const handleLogin = async () => {
    try {
      const response = await axios.post('http://192.168.254.105:8000/api/login', {
        email,
        password,
      }, {
        headers: {
          Accept: 'application/json',
        }
      });

      const token = response.data.token;
      await AsyncStorage.setItem('auth_token', token);

      Alert.alert('Login successful');
      router.replace('/home');
    } catch (error) {
      console.error(error.response?.data || error.message);
      Alert.alert('Login failed', 'Invalid credentials, please check your input');
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
