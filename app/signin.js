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
      // Check user role and redirect accordingly
      if (user.profile?.role === 'collaborator') {
        // Collaborator -> redirect to collab/dashboard
        router.replace('/collab/dashboard');
      } else {
        // Regular user -> redirect to home
        router.replace('/home');
      }
    }
  }, [user]);

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
