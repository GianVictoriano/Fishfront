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
// Use a request interceptor to attach the auth token to every request
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[api.js] Attaching Authorization header:', config.headers.Authorization);
      console.log(`[api.js] Sending request to: ${config.url}`);
      console.log('[api.js] Request Headers:', JSON.stringify(config.headers, null, 2));
    } else {
      console.log('[api.js] No auth_token found in AsyncStorage');
    }
    return config;
  },
  (error) => {
    // This will handle errors that occur before the request is sent
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

