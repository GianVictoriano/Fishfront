import { Link } from 'expo-router';
import { useEffect } from 'react';
import { Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, Image, ImageBackground, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '~/utils/api';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { useRouter } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

import { makeRedirectUri } from 'expo-auth-session';

const WEB_CLIENT_ID = '2592879566-iv5obaksm3viv04pptpnlsn9mbmivg5s.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = '2592879566-4p0l72eecsqml325q95qo91llaoc9quo.apps.googleusercontent.com';

const clientId = WEB_CLIENT_ID; // Always use web client for Expo proxy

export default function SignInScreen() {
  const router = useRouter();
  const { loginWithGoogleAuthCode, user } = useAuth();
  const { logoUrl, backgroundUrl } = useBranding();



  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: clientId,
    androidClientId: WEB_CLIENT_ID,
    responseType: 'code',
    scopes: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive.file'],
    redirectUri: makeRedirectUri({ useProxy: true }),
    usePKCE: true,
    shouldAutoExchangeCode: false, // Prevent auto token exchange
    codeChallengeMethod: 'S256', // Explicitly set PKCE method
  });

  useEffect(() => {
    const handleAuthResponse = async () => {
      if (response?.type === 'success') {
        const { code } = response.params;
        console.log('Redirect URI used:', makeRedirectUri({ useProxy: true }));
        if (code && request?.codeVerifier) {
          console.log('Sending to backend:', { code, codeVerifier: request.codeVerifier });
          await loginWithGoogleAuthCode(code, request.codeVerifier);
        } else {
          console.error('Missing code or codeVerifier:', { code, codeVerifier: request?.codeVerifier });
        }
      } else if (response?.type === 'error') {
        console.error('[AUTH] Google Sign-In Error:', response.error);
        Alert.alert('Google Sign-In Error', response.error?.message || 'An unknown error occurred.');
      }
    };

    handleAuthResponse();
  }, [response]);

  useEffect(() => {
    if (user) {
      router.replace('/home');
    }
  }, [user]);

  return (
    <ImageBackground source={backgroundUrl} style={styles.background} resizeMode="cover">
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          {logoUrl && <Image source={logoUrl} style={styles.logo} resizeMode="contain" />}
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue to Fisherman</Text>
          
          <TouchableOpacity style={styles.googleButton} onPress={() => promptAsync()} disabled={!request}>
            <Image
              source={require('../assets/g-logo.png')}
              style={styles.googleIcon}
            />
            <Text style={styles.googleButtonText}>Sign in with Google</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Access is restricted to authorized personnel from @g.batstate-u.edu.ph
          </Text>

          <Link href="/" style={styles.link}>Go to Home</Link>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', // Dark overlay for readability
  },
  card: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  logo: {
    width: 120,
    height: 60,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    width: '100%',
    justifyContent: 'center',
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 16,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  footerText: {
    marginTop: 24,
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  link: {
    marginTop: 24,
    color: '#007BFF',
    fontWeight: '600',
  },
});
