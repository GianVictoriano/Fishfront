// app/index.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { API_URL } from '../utils/api';

import * as Google from 'expo-auth-session/providers/google';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// This is necessary for the auth session to work correctly on the web.
if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthInProgress, setIsAuthInProgress] = useState(false);
  const router = useRouter();

  // Redirect URI setup for Google Auth
  const redirectUri = Platform.select({
    web: 'http://localhost:8081',
    default: 'https://auth.expo.io/@gianvictoriano/fishfront',
  });

  // Google OAuth request
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    expoClientId:
      '2592879566-iv5obaksm3viv04pptpnlsn9mbmivg5s.apps.googleusercontent.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    androidClientId:
      '2592879566-iv5obaksm3viv04pptpnlsn9mbmivg5s.apps.googleusercontent.com',
    webClientId:
      '2592879566-iv5obaksm3viv04pptpnlsn9mbmivg5s.apps.googleusercontent.com',
    redirectUri,
  });

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        router.replace('/home');
      }
    };
    checkAuth();
  }, []);

  // Handle response from Google Sign-In
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        handleGoogleSignIn(id_token);
      } else {
        Alert.alert(
          'Google Sign-In Error',
          'Could not retrieve ID token from Google. Please try again.'
        );
        setIsAuthInProgress(false);
      }
    } else if (response?.type === 'error') {
      Alert.alert(
        'Google Sign-In Error',
        response.error?.message || 'An unknown error occurred.'
      );
      setIsAuthInProgress(false);
    } else if (response?.type && response.type !== 'idle') {
      setIsAuthInProgress(false);
    }
  }, [response]);

  // Send the Google ID token to the backend
  const handleGoogleSignIn = async (idToken) => {
    try {
      const apiResponse = await apiClient.post('/auth/google', {
        token: idToken,
      });

      const { token, user } = apiResponse.data;

      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));

      Alert.alert('Login Successful', 'You are now signed in.');

      if (user?.profile?.role === 'collaborator') {
        router.replace('/collab/home');
      } else {
        router.replace('/home');
      }
    } catch (error) {
      console.error(
        'Google Sign-In error:',
        error.response?.data || error.message
      );
      Alert.alert(
        'Login Failed',
        'Could not verify your Google account with the server.'
      );
    } finally {
      setIsAuthInProgress(false);
    }
  };

  // Standard email/password login
  const handleLogin = async () => {
    try {
      const response = await apiClient.post('/login', {
        email,
        password,
      });

      const { token, user } = response.data;

      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      Alert.alert('Login successful');

      if (user?.profile?.role === 'collaborator') {
        router.replace('/collab/home');
      } else {
        router.replace('/home');
      }
    } catch (error) {
      console.error(error.response?.data || error.message);
      Alert.alert(
        'Login failed',
        'Invalid credentials, please check your input'
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <View style={styles.buttonContainer}>
        <Button
          title="Login"
          onPress={handleLogin}
          disabled={isAuthInProgress}
        />
      </View>

      <Link href="/forgot-password" asChild>
        <TouchableOpacity>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      </Link>

      <View style={styles.buttonContainer}>
        <Button
          title="Sign in with Google"
          disabled={!request || isAuthInProgress}
          onPress={() => {
            setIsAuthInProgress(true);
            promptAsync();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 15,
    padding: 10,
    fontSize: 16,
  },
  buttonContainer: {
    marginVertical: 10,
  },
  forgotPasswordText: {
    color: '#007BFF',
    textAlign: 'center',
    paddingVertical: 10,
  },
});



