import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiClient = axios.create({
  baseURL: `${process.env.EXPO_PUBLIC_API_URL}/api`,
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

// Helper to check if the data is FormData
const isFormData = (data) => {
  return (typeof FormData !== 'undefined' && data instanceof FormData) ||
         (data && typeof data.getHeaders === 'function');
};

// Use a request interceptor to attach the auth token to every request
apiClient.interceptors.request.use(
  async (config) => {
    // Don't modify the config for FormData - let the browser set the correct Content-Type
    if (isFormData(config.data)) {
      delete config.headers['Content-Type'];
    }

    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[api.js] Attaching Authorization header');
      console.log(`[api.js] Sending ${config.method?.toUpperCase()} request to: ${config.url}`);
    } else {
      console.log('[api.js] No auth_token found in AsyncStorage');
    }
    
    return config;
  },
  (error) => {
    console.error('[api.js] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't already tried to refresh the token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.EXPO_PUBLIC_API_URL}/api/auth/refresh`,
            { refresh_token: refreshToken }
          );
          
          const { token } = response.data;
          await AsyncStorage.setItem('auth_token', token);
          
          // Update the Authorization header
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          
          // Retry the original request
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('[api.js] Failed to refresh token:', refreshError);
        // If refresh fails, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/signin';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Optional: Add a response interceptor for global error handling, like token refresh


export const getMessages = (groupChatId) => {
  return apiClient.get(`/group-chats/${groupChatId}/messages`);
};

export const sendMessage = (groupChatId, message) => {
  return apiClient.post(`/group-chats/${groupChatId}/messages`, { message });
};

export default apiClient;

