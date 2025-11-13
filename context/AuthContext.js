import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/api'; // Assuming you have a pre-configured axios instance
import { router } from 'expo-router';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {

  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const storedToken = await AsyncStorage.getItem('auth_token');
      console.log('[AuthContext] Loading token from storage:', storedToken);
      if (storedToken) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        const userData = await AsyncStorage.getItem('user_data');
        if (userData) {
          setAuth(JSON.parse(userData));
        }
      }
    };
    loadUser();
  }, []);
  const loginWithGoogleAuthCode = async (authCode, codeVerifier) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/google/access-token', { auth_code: authCode, code_verifier: codeVerifier });
      const {
        api_token,
        user,
        google_access_token,
        google_refresh_token,
      } = response.data;

      // Store all relevant data
      await AsyncStorage.setItem('auth_token', api_token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      await AsyncStorage.setItem('google_access_token', google_access_token);
      if (google_refresh_token) {
        await AsyncStorage.setItem('google_refresh_token', google_refresh_token);
      }

      // Configure API client and update auth state
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${api_token}`;
      setAuth(user);

      console.log('[AuthContext] Google login successful. API and Google tokens stored.');

    } catch (error) {
      console.error('[AuthContext] Error during Google auth code exchange:', error.response?.data || error.message);
      // Clear all potentially stored tokens on failure
      await AsyncStorage.multiRemove(['auth_token', 'user_data', 'google_access_token', 'google_refresh_token']);
      delete apiClient.defaults.headers.common['Authorization'];
      setAuth(null);
    } finally {
      setLoading(false);
    }
  };


  const reloadUser = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user_data');

      if (token && storedUser) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const parsedUser = JSON.parse(storedUser);
        setAuth(parsedUser);
      } else {
        setAuth(null);
      }
    } catch (e) {
      console.error('Failed to reload user session from storage:', e);
      setAuth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth) {
      reloadUser();
    }
  }, [auth]);

  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token, user } = response.data;

      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
            setAuth(user);

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const logout = async () => {
    setLoading(true);
    setAuth(null);
        try {
      await AsyncStorage.removeItem('auth_token');
      console.log('[AuthContext] Removed auth_token');
      await AsyncStorage.removeItem('user_data');
      console.log('[AuthContext] Removed user_data');
    } catch (e) {
      console.error('Logout failed:', e);
    } finally {
      setLoading(false);
      router.replace('/signin');
    }
  };

  // Helper function to check if the collaborator has a specific module
  const signIn = async (data) => {
    try {
      const { token, user } = data;
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      setAuth(user);
      return { success: true };
    } catch (error) {
      console.error('SignIn failed:', error);
      return { success: false, message: error.message || 'SignIn failed' };
    }
  };

  const hasModule = (moduleName) => {
      console.log('[AuthContext] hasModule called for:', moduleName);
      console.log('[AuthContext] auth object:', auth);
      console.log('[AuthContext] auth.profile:', auth?.profile);
      console.log('[AuthContext] auth.modules:', auth?.modules);
      console.log('[AuthContext] auth.profile.modules:', auth?.profile?.modules);
      
      // Check multiple possible locations for modules
      let modules = null;
      if (auth?.modules) {
          modules = auth.modules;
      } else if (auth?.profile?.modules) {
          modules = auth.profile.modules;
      } else if (auth?.profile?.permissions) {
          modules = auth.profile.permissions;
      } else if (auth?.permissions) {
          modules = auth.permissions;
      }
      
      console.log('[AuthContext] Found modules:', modules);
      
      if (modules) {
          const result = modules.some(module => {
              const moduleNameToCheck = module.name || module;
              return moduleNameToCheck === moduleName;
          });
          console.log('[AuthContext] hasModule result for', moduleName, ':', result);
          return result;
      }
      
      console.log('[AuthContext] hasModule returning false for', moduleName, '- no modules found');
      return false;
  };

  const value = {
    user: auth,
    loading,
    login,
    logout,
    reloadUser,
    loginWithGoogleAuthCode,
    setAuth,
    signIn, // Expose the new signIn function
    hasModule, // Expose the new function
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
