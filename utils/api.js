// utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = 'http://192.168.254.118:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Use a request interceptor to attach the auth token to every request
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // This will handle errors that occur before the request is sent
    return Promise.reject(error);
  }
);

// Optional: Add a response interceptor for global error handling, like token refresh
apiClient.interceptors.response.use(
  // Any status code that lie within the range of 2xx cause this function to trigger
  (response) => response,
  // Any status codes that falls outside the range of 2xx cause this function to trigger
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Handle 401 Unauthorized errors (e.g., token expired)
      console.log('Authentication error, token might be expired.');
      // Here you might want to implement token refresh logic or navigate to the login screen.
      // For now, we'll just log out the user by clearing all auth artifacts.
      delete apiClient.defaults.headers.common['Authorization'];
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      // Ideally, we would trigger a state update in AuthContext to set user to null.
      // Due to circular dependencies, we handle this here directly.
      // The app's root layout will redirect to login when the user state is missing on next reload.
    }
    return Promise.reject(error);
  }
);

export default apiClient;