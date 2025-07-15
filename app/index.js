import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Button, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useAuth } from '~/context/AuthContext';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

// This is necessary for the auth session to work correctly on the web.
if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

const WEB_CLIENT_ID = '2592879566-iv5obaksm3viv04pptpnlsn9mbmivg5s.apps.googleusercontent.com';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { user, loading, loginWithGoogleToken } = useAuth();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        loginWithGoogleToken(id_token);
      }
    } else if (response?.type === 'error') {
      console.error('[AUTH] Response type is error.', response.error);
      Alert.alert('Google Sign-In Error', response.error?.message || 'An unknown error occurred.');
    }
  }, [response]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Input required', 'Please enter both email and password.');
      return;
    }
    const { success, message } = await login(email, password);
    if (!success) {
      Alert.alert('Login Failed', message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={{ textAlign: 'center', marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={styles.input}
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <View style={styles.buttonContainer}>
        <Button title="Login" onPress={handleLogin} />
      </View>
      <Link href="/forgot-password" asChild>
        <TouchableOpacity>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      </Link>
      <View style={styles.buttonContainer}>
        <Button
          title="Sign in with Google"
          disabled={!request || loading}
          onPress={() => promptAsync()}
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
