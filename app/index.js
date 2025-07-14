import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/api';

import * as Google from 'expo-auth-session/providers/google';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Button, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import apiClient, {API_URL} from '../utils/api';


// This is necessary for the auth session to work correctly on the web.
if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

<<<<<<< HEAD

=======
>>>>>>> bcc6beb42c6729d3e57e23d98085242f4cba1e52

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthInProgress, setIsAuthInProgress] = useState(false);
  const router = useRouter();

  // This is the stable configuration that worked for web login.

  const redirectUri = Platform.select({
    web: 'http://localhost:8081',
    // For native
    default: 'https://auth.expo.io/@gianvictoriano/fishfront',
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    expoClientId: '2592879566-iv5obaksm3viv04pptpnlsn9mbmivg5s.apps.googleusercontent.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', 
    androidClientId: '2592879566-iv5obaksm3viv04pptpnlsn9mbmivg5s.apps.googleusercontent.com',
    webClientId: '2592879566-iv5obaksm3viv04pptpnlsn9mbmivg5s.apps.googleusercontent.com',
    redirectUri,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        router.replace('/home');
      }
    };
    checkAuth();
  }, []);

  // Handle the response from Google Sign-In
  useEffect(() => {
    console.log('[AUTH] Full response object:', JSON.stringify(response, null, 2));

    if (response?.type === 'success') {
      console.log('[AUTH] Response type is success.');
      // With useIdTokenAuthRequest, the token is in the response params.
      const { id_token } = response.params;

      if (id_token) {
        console.log('[AUTH] id_token found in params. Proceeding to sign in.');
        handleGoogleSignIn(id_token);
      } else {
        console.error('[AUTH] id_token is missing from the response params.');
        Alert.alert('Google Sign-In Error', 'Could not retrieve ID token from Google response. Please try again.');
        setIsAuthInProgress(false);
      }
    } else if (response?.type === 'error') {
      console.error('[AUTH] Response type is error.', response.error);
      Alert.alert('Google Sign-In Error', response.error?.message || 'An unknown error occurred.');
      setIsAuthInProgress(false);
    } else if (response?.type && response.type !== 'idle') {
        console.log(`[AUTH] Response type is '${response.type}'. No action taken.`);
        setIsAuthInProgress(false);
    }

  }, [response]);

  // Send the Google ID token to the Laravel backend
  const handleGoogleSignIn = async (idToken) => {
    try {
<<<<<<< HEAD
                  const apiResponse = await apiClient.post('/auth/google/callback', {
=======
      console.log('[AUTH] Sending token to backend...');
      const apiResponse = await apiClient.post('/auth/google', {
>>>>>>> bcc6beb42c6729d3e57e23d98085242f4cba1e52
        token: idToken,
      }, {
        headers: {
          Accept: 'application/json',
        }
      });
      console.log('[AUTH] Backend response received:', apiResponse.data);

      // Destructure token and user from the response
      const { token, user } = apiResponse.data;
      console.log('[AUTH] Token:', token ? 'Exists' : 'Missing');
      console.log('[AUTH] User data:', user);

      // Store the token and user data
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      console.log('[AUTH] Token and user data stored.');

      Alert.alert('Login Successful', 'You are now signed in.');

      // Redirect based on user role
      if (user && user.profile && user.profile.role === 'collaborator') {
        console.log('[AUTH] Redirecting to collaborator home...');
        router.replace('/collab/home');
      } else {
        console.log('[AUTH] Redirecting to user home...');
        router.replace('/home');
      }

    } catch (error) {
      console.error('Failed to process Google Sign-In with backend:', error.response?.data || error.message);
      Alert.alert('Login Failed', 'Could not verify your Google account with the server.');
    } finally {
      setIsAuthInProgress(false);
    }
  };

  // Standard email/password login
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

      // Destructure token and user from the response
      const { token, user } = response.data;

      // Store the token and user data
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      // Set the token on the API client for future requests
      setAuthToken(token);

      Alert.alert('Login successful');

      // Redirect based on user role
      if (user.profile && user.profile.role === 'collaborator') {
        router.replace('/collab/home');
      } else {
        router.replace('/home');
      }
    } catch (error) {
      console.error(error.response?.data || error.message);
      Alert.alert('Login failed', 'Invalid credentials, please check your input');
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
        <Button title="Login" onPress={handleLogin} disabled={isAuthInProgress} />
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
