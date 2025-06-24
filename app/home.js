import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';
import { API_URL } from '../utils/api';

export default function HomeScreen() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  //checkings
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        router.replace('/');
      }
    };
    checkAuth();
  }, []);

  //Haup na authentication
  useEffect(() => {
    const fetchUser = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      try {
        const response = await axios.get(`${API_URL}/api/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        setUser(response.data.user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  // pang lag out
  const handleLogout = async () => {
    await AsyncStorage.removeItem('auth_token');
    router.replace('/');
  };

  return (
    <View style={{ padding: 20 }}>
      {user ? (
        <Text>Welcome, {user.name}</Text>
      ) : (
        <Text>Loading...</Text>
      )}
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}
