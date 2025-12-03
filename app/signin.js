import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, Image, ImageBackground, Alert, TextInput } from 'react-native';
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
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleLogoPress = () => {
    // Secret admin login - requires 3 taps within 2 seconds
    setShowAdminModal(true);
  };

  const handleSecretAdminLogin = async () => {
    // Single admin credential
    if (adminUsername !== 'pubadmin' || adminPassword !== 'fisherman') {
      Alert.alert('Access Denied', 'Invalid admin credentials');
      setAdminUsername('');
      setAdminPassword('');
      setShowAdminModal(false);
      return;
    }

    try {
      // Create admin user and profile via API
      const response = await apiClient.post('/admin/create-secret-admin', {
        username: 'pubadmin',
        password: 'fisherman'
      });

      if (response.data.success) {
        // Store admin session
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
        await AsyncStorage.setItem('auth_token', response.data.token);
        
        // Redirect to admin dashboard
        router.replace('/admin/admin');
        
        Alert.alert('Success', 'Admin access granted! User and profile created.');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to create admin session');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      
      // Fallback: Create local admin session if API fails
      const adminUser = {
        id: 1,
        name: 'Publication Admin',
        email: 'pubadmin@g.batstate-u.edu.ph',
        role: 'collaborator',
        profile: {
          id: 1,
          user_id: 1,
          role: 'collaborator',
          level: 3,
          position: 'Publication Administrator',
          avatar: null,
          name: 'Publication Admin',
          program: 'Computer Science',
          section: 'A',
          description: 'System administrator for Fisherman Publication',
          is_anonymous: 0,
          anonymous_name: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          modules: [
            { name: 'articles' },
            { name: 'sports' },
            { name: 'opinion' },
            { name: 'editorial' },
            { name: 'creative' },
            { name: 'literary' },
            { name: 'forum' },
            { name: 'recruitment' },
            { name: 'events' },
            { name: 'admin' },
            { name: 'manage_users' },
          ]
        }
      };

      // Store admin session locally
      await AsyncStorage.setItem('user_data', JSON.stringify(adminUser));
      await AsyncStorage.setItem('auth_token', 'admin-secret-token');
      
      router.replace('/admin/admin');
      Alert.alert('Success', 'Admin access granted (local mode)');
    }
    
    // Reset form
    setAdminUsername('');
    setAdminPassword('');
    setShowAdminModal(false);
  };



  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: clientId,
    redirectUri: 'https://draftdrop.site/auth-callback', // Direct redirect, no proxy
    responseType: 'code',
    scopes: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive.file'],
    usePKCE: true,
    shouldAutoExchangeCode: false, // Prevent auto token exchange
    codeChallengeMethod: 'S256', // Explicitly set PKCE method
  });

  // Test API connectivity
  const testApiConnection = async () => {
    try {
      console.log('Testing API connection to:', apiClient.defaults.baseURL);
      const response = await apiClient.get('/ping?t=' + Date.now()); // Add cache-buster
      console.log('API connection successful:', response.data);
      alert('API connection successful! Check console for details.');
    } catch (error) {
      console.error('API connection failed:', error);
      alert(`API connection failed: ${error.message}`);
    }
  };

  // Log Google OAuth configuration to backend
  const logToBackend = async (message, data) => {
    try {
      // Simple fetch call that doesn't depend on window detection
      const response = await fetch(`${apiClient.defaults.baseURL}/debug-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          data: data,
          source: 'signin_frontend',
          timestamp: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        console.log('Debug log failed:', response.status);
      }
    } catch (error) {
      // Don't log errors from logging to avoid infinite loops
      console.log('Failed to log to backend:', error.message);
    }
  };

  // Log Google OAuth configuration
  const redirectUri = 'https://draftdrop.site/auth-callback'; // Use direct redirect
  console.log('CURRENT REDIRECT URI:', redirectUri); 
  console.log('FULL REDIRECT URI OBJECT:', { 
    redirectUri, 
    useProxy: false, 
    expected: 'https://draftdrop.site/auth-callback'
  });
  logToBackend('=== GOOGLE OAUTH CONFIGURATION DEBUG ===', {
    clientId: clientId,
    androidClientId: WEB_CLIENT_ID,
    responseType: 'code',
    scopes: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive.file'],
    redirectUri: redirectUri, // This will show the actual URI being used
    usePKCE: true,
    shouldAutoExchangeCode: false,
    codeChallengeMethod: 'S256',
    requestConfig: request ? {
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      scopes: request.scopes,
      usePKCE: request.usePKCE,
    } : 'request_not_ready',
  });

  // Log expected OAuth URLs
  logToBackend('Expected OAuth URLs:', {
    googleAuthUrl: `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20profile%20email`,
    redirectUri: redirectUri,
    backendCallbackUrl: `${apiClient.defaults.baseURL}/google/access-token`,
  });

  useEffect(() => {
    const handleAuthResponse = async () => {
      await logToBackend('=== FRONTEND GOOGLE AUTH DEBUG START ===', {
        type: response?.type,
        hasParams: !!response?.params,
        paramsKeys: response?.params ? Object.keys(response.params) : [],
        fullResponse: response,
      });

      if (response?.type === 'success') {
        const { code } = response.params;
        await logToBackend('Google Auth Success - Code extracted', {
          hasCode: !!code,
          codeLength: code ? code.length : 0,
          codePreview: code ? code.substring(0, 20) + '...' : 'null',
        });

        const redirectUri = makeRedirectUri({ useProxy: true });
        await logToBackend('Redirect URI configuration', {
          redirectUri,
          hasCodeVerifier: !!request?.codeVerifier,
          codeVerifierLength: request?.codeVerifier ? request.codeVerifier.length : 0,
          codeVerifierPreview: request?.codeVerifier ? request.codeVerifier.substring(0, 20) + '...' : 'null',
        });

        if (code && request?.codeVerifier) {
          await logToBackend('Sending to backend', { 
            code: code.substring(0, 20) + '...', 
            codeVerifier: request.codeVerifier.substring(0, 20) + '...' 
          });
          
          try {
            await loginWithGoogleAuthCode(code, request.codeVerifier);
            await logToBackend('Backend authentication successful', {});
          } catch (error) {
            await logToBackend('Backend authentication failed', {
              error: error.message,
              stack: error.stack,
              response: error.response?.data,
            });
          }
        } else {
          await logToBackend('Missing code or codeVerifier', { 
            hasCode: !!code, 
            hasCodeVerifier: !!request?.codeVerifier,
            codeLength: code ? code.length : 0,
            verifierLength: request?.codeVerifier ? request.codeVerifier.length : 0,
          });
        }
      } else if (response?.type === 'error') {
        await logToBackend('=== GOOGLE AUTH ERROR ===', {
          error: response.error,
          errorType: typeof response.error,
          errorDescription: response.error?.description,
          fullParams: response.params,
        });
        Alert.alert('Google Sign-In Error', response.error?.message || 'An unknown error occurred.');
      } else if (response?.type === 'cancel') {
        await logToBackend('Google Auth was cancelled by user', {});
      } else {
        await logToBackend('Google Auth - Unknown response type', { type: response?.type });
      }
      
      await logToBackend('=== FRONTEND GOOGLE AUTH DEBUG END ===');
    };

    handleAuthResponse();
  }, [response]);

  useEffect(() => {
    const handleMessage = (event) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;
      
      const { type, code, state, error } = event.data;
      
      if (type === 'GOOGLE_AUTH_SUCCESS') {
        console.log('Received auth success from popup');
        handleOAuthCallback(code, state);
      } else if (type === 'GOOGLE_AUTH_ERROR') {
        console.error('Received auth error from popup:', error);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    // Check if we have auth data from localStorage (OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === '1') {
      const code = localStorage.getItem('google_auth_code');
      const state = localStorage.getItem('google_auth_state');
      
      if (code && state) {
        console.log('Found auth data in localStorage:', { code: code.substring(0, 20) + '...', state });
        localStorage.removeItem('google_auth_code');
        localStorage.removeItem('google_auth_state');
        
        // Process the auth code
        handleOAuthCallback(code, state);
      }
      
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleOAuthCallback = async (code, state) => {
    try {
      console.log('Processing OAuth callback with code:', code.substring(0, 20) + '...');
      
      // Retrieve codeVerifier from sessionStorage
      const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
      
      if (!codeVerifier) {
        console.error('No code verifier found in sessionStorage');
        throw new Error('PKCE code verifier not found');
      }
      
      console.log('Found code verifier in sessionStorage');
      
      // Call your backend to exchange the code
      await loginWithGoogleAuthCode(code, codeVerifier);
      
      // Clean up sessionStorage
      sessionStorage.removeItem('pkce_code_verifier');
      
      console.log('OAuth authentication successful, redirecting to home...');
      
      // Redirect to home page after successful authentication
      router.replace('/home');
    } catch (error) {
      console.error('OAuth callback failed:', error);
    }
  };

  return (
    <ImageBackground 
      source={typeof backgroundUrl === 'number' ? backgroundUrl : (backgroundUrl?.uri ? backgroundUrl : { uri: String(backgroundUrl || '') })} 
      style={styles.background} 
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <TouchableOpacity onPress={handleLogoPress}>
            {logoUrl && <Image source={typeof logoUrl === 'number' ? logoUrl : (logoUrl?.uri ? logoUrl : { uri: String(logoUrl || '') })} style={styles.logo} resizeMode="contain" />}
          </TouchableOpacity>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue to Fisherman</Text>
          
          <TouchableOpacity style={styles.googleButton} onPress={() => {
            // Store codeVerifier in sessionStorage before OAuth redirect
            if (request?.codeVerifier) {
              sessionStorage.setItem('pkce_code_verifier', request.codeVerifier);
              console.log('Stored code verifier in sessionStorage');
            }
            promptAsync();
          }} disabled={!request}>
            <Image
              source={require('../assets/g-logo.png')}
              style={styles.googleIcon}
            />
            <Text style={styles.googleButtonText}>Sign in with Google</Text>
          </TouchableOpacity>

          {/* Test API Connection Button */}
          <TouchableOpacity style={styles.testButton} onPress={testApiConnection}>
            <Text style={styles.testButtonText}>Test API Connection</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Access is restricted to authorized personnel from @g.batstate-u.edu.ph
          </Text>

          <Link href="/" style={styles.link}>Go to Home</Link>
        </View>
      </SafeAreaView>

      {/* Secret Admin Login Modal */}
      {showAdminModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.adminModal}>
            <Text style={styles.modalTitle}>Admin Access</Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={adminUsername}
              onChangeText={setAdminUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={adminPassword}
              onChangeText={setAdminPassword}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setShowAdminModal(false);
                  setAdminUsername('');
                  setAdminPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.loginButton]} 
                onPress={handleSecretAdminLogin}
              >
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  testButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  // Admin Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminModal: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 16,
    width: '90%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#007BFF',
  },
  loginButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
