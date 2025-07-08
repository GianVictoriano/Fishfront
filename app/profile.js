import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { API_URL } from '../utils/api';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUserFromStorage = async () => {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const userDataString = await AsyncStorage.getItem('user_data');

      if (!token || !userDataString) {
        // If there's no token or user data, the user is not properly logged in.
        router.replace('/');
        return;
      }

      try {
        const userData = JSON.parse(userDataString);
        setUser(userData);
      } catch (e) {
        console.error('Failed to parse user data from storage:', e);
        // If data is corrupted, clear it and send user to login.
        await AsyncStorage.clear();
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    const token = await AsyncStorage.getItem('auth_token');
    try {
      if (token) {
        await axios.post(`${API_URL}/api/logout`, {}, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Failed to logout from server:', error.response?.data || error.message);
      // We proceed to log out on the client-side regardless of server response
    } finally {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      router.replace('/');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text>Could not load profile. Please try logging in again.</Text>
        <Button title="Go to Login" onPress={() => router.replace('/')} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileContainer}>
        {user.profile?.avatar && (
          <Image source={{ uri: user.profile.avatar }} style={styles.avatar} />
        )}
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Program:</Text>
          <Text style={styles.infoValue}>{user.profile?.program || 'Not set'}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Section:</Text>
          <Text style={styles.infoValue}>{user.profile?.section || 'Not set'}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Description:</Text>
          <Text style={styles.infoValue}>{user.profile?.description || 'Not set'}</Text>
        </View>

        <Link href="/edit-profile" asChild>
          <Button title="Edit Profile" />
        </Link>

        <View style={styles.logoutButtonContainer}>
          <Button title="Logout" onPress={handleLogout} color="#dc3545" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileContainer: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#007BFF',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 30,
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 14,
    color: 'gray',
  },
  infoValue: {
    fontSize: 16,
    marginTop: 5,
  },
  logoutButtonContainer: {
    marginTop: 20,
    width: '100%',
  },
});
