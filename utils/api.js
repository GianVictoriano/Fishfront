// utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Choose the correct API URL (replace with your working server IP)
export const API_URL = 'http://192.168.50.110:8000';

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
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
  (error) => Promise.reject(error)
);

// Optional: Add a response interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.log('Authentication error, token might be expired.');
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
      // You can handle navigation to login screen in your component
    }
    return Promise.reject(error);
  }
);

export default apiClient;
