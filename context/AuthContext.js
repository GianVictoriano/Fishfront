import React, { createContext, useState, useEffect, useContext } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {

  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  const loginWithGoogleToken = async (idToken) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/google', { token: idToken });
      const { token, user } = response.data;

      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setAuth(user);
    } catch (error) {
      console.error('Failed to process Google Sign-In with backend:', error.response?.data || error.message);
      // Clear any partial state
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
        // If we have a token and user data from storage, the user is logged in.
        // Use this data directly instead of making another API call.
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const parsedUser = JSON.parse(storedUser);
        console.log('2. [AuthContext.js] User object loaded from AsyncStorage:', JSON.stringify(parsedUser, null, 2));
        setAuth(parsedUser);
      } else {
        // Otherwise, they are logged out.
        setAuth(null);
      }
    } catch (e) {
      console.error('Failed to reload user session from storage:', e);
      setAuth(null); // Ensure state is cleared on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only try to reload from storage if we don't already have a user in memory.
    // This prevents a race condition on login where the context reloads
    // before AsyncStorage has been updated.
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
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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
    delete apiClient.defaults.headers.common['Authorization'];
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
    } catch (e) {
      console.error('Logout failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user: auth, // Provide the auth state as user for consumers
    loading,
    login,
    logout,
    reloadUser,
    loginWithGoogleToken,
    setAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};