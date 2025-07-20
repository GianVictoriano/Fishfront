import React, { createContext, useState, useEffect, useContext } from 'react';
import { getItem, saveItem, removeItem } from '~/utils/authStorage';
import apiClient from '~/services/apiClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loginWithGoogleToken = async (idToken) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/google', { token: idToken });
      const { token, user } = response.data;

      await saveItem('auth_token', token);
      await saveItem('user_data', JSON.stringify(user));
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
    } catch (error) {
      console.error('Failed to process Google Sign-In with backend:', error.response?.data || error.message);
      // Clear any partial state
      await removeItem('auth_token');
      delete apiClient.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const reloadUser = async () => {
    setLoading(true);
    try {
      const token = await getItem('auth_token');
      if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await apiClient.get('/users/me');
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('Failed to reload user session:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadUser();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token, user } = response.data;

      await saveItem('auth_token', token);
      await saveItem('user_data', JSON.stringify(user));
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const logout = async () => {
    setLoading(true);
    setUser(null);
    delete apiClient.defaults.headers.common['Authorization'];
    try {
      await removeItem('auth_token');
      await removeItem('user_data');
    } catch (e) {
      console.error('Logout failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    reloadUser,
    loginWithGoogleToken,
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogleToken, reloadUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
