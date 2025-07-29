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
      const storedToken = await AsyncStorage.getItem('token');
      // LOG THE TOKEN FROM STORAGE
      console.log('[AuthContext] Loading token from storage:', storedToken);
      // ... rest of the function
    };
    loadUser();
  }, []);
  const loginWithGoogleToken = async (idToken) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/google', { token: idToken });
      const { token, user } = response.data;

      console.log('[AuthContext] Received token from backend:', token);
      console.log('[AuthContext] Received user from backend:', user);
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setAuth(user);
      console.log('[AuthContext] Received token from backend:', token);
      console.log('[AuthContext] Received user from backend:', user);
    } catch (error) {
      console.error('[AuthContext] Error during Google login:', error.response?.data || error.message);
      await AsyncStorage.removeItem('auth_token');
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
      router.replace('/(auth)/login');
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
      if (auth && auth.profile && auth.profile.modules) {
          return auth.profile.modules.some(module => module.name === moduleName);
      }
      return false;
  };

  const value = {
    user: auth,
    loading,
    login,
    logout,
    reloadUser,
    loginWithGoogleToken,
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
