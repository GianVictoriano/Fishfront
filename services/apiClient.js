import axios from 'axios';
import { getItem } from '~/utils/authStorage';

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api', // Your Laravel backend URL
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default apiClient;
