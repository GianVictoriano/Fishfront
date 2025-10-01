import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import apiClient from '~/utils/api';

export default function SignInCP() {
  useEffect(() => {
    Alert.alert('DEBUG', 'SignInCP mounted');
  }, []);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    apiClient.get('/users')

      .then(response => {
        const data = response.data;
        if (Array.isArray(data)) {
          setUsers(data);
          if (data.length > 0) setSelectedUserId(data[0].id);
        } else if (Array.isArray(data.users)) {
          setUsers(data.users);
          if (data.users.length > 0) setSelectedUserId(data.users[0].id);
        } else {
          Alert.alert('Error', 'Could not load users.');
        }
      })
      .catch(e => {
        console.error('Could not fetch users:', e);
        Alert.alert('Error', 'Could not fetch users. Check console for details.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSignIn = async () => {
    Alert.alert('DEBUG', 'handleSignIn called');
    if (!selectedUserId) {
      Alert.alert('Error', 'Please select a user.');
      return;
    }
    setSigningIn(true);
    try {
      const response = await apiClient.post('/login-as', { user_id: selectedUserId });
      const data = response.data;

      console.log('Login-as response:', response.status, data);
      if (response.status === 200 && data.token) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        Alert.alert('Success', `Signed in as ${data.user?.name || data.user?.email || 'user'}`);
        router.replace('/home2');
      } else {
        Alert.alert('Login failed', data.error || 'Unknown error.');
        console.error('Login-as error:', data);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not sign in.');
      console.error('SignInCP handleSignIn error:', e);
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select an account:</Text>
      <Picker
        selectedValue={selectedUserId}
        style={styles.picker}
        onValueChange={(itemValue) => setSelectedUserId(itemValue)}
      >
        {users.map(user => (
          <Picker.Item key={user.id} label={user.name || user.email} value={user.id} />
        ))}
      </Picker>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          Alert.alert('DEBUG', 'TouchableOpacity pressed');
          handleSignIn();
        }}
        disabled={signingIn}
      >
        <Text style={styles.buttonText}>{signingIn ? 'Signing In...' : 'Sign In'}</Text>
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 18,
    marginBottom: 12,
  },
  picker: {
    height: 50,
    width: 250,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
