import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiClient } from '../utils/api';

export default function EditProfileScreen() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [program, setProgram] = useState('');
  const [section, setSection] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadUserFromStorage = async () => {
      setLoading(true);
      const userDataString = await AsyncStorage.getItem('user_data');
      if (userDataString) {
        const fetchedUser = JSON.parse(userDataString);
        setUser(fetchedUser);
        setName(fetchedUser.name);
        setProgram(fetchedUser.profile?.program || '');
        setSection(fetchedUser.profile?.section || '');
        setDescription(fetchedUser.profile?.description || '');
      } else {
        Alert.alert('Error', 'Could not load user data. Please log in again.');
        router.replace('/');
      }
      setLoading(false);
    };
    loadUserFromStorage();
  }, []);

  const handleUpdateProfile = async () => {
    setSaving(true);

    try {
      // Use the apiClient which has the base URL and auth headers configured
      const response = await apiClient.put('/profile', {
        name,
        program,
        section,
        description,
      });

      // Update the user data in AsyncStorage with the fresh data from the server
      const updatedUser = response.data.user;
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));

      Alert.alert('Success', 'Your profile has been updated.');
      router.back(); // Go back to the profile screen
    } catch (error) {
      console.error('Failed to update profile:', error.response?.data || error.message);
      Alert.alert('Error', 'Could not update your profile. Please check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your nickname"
        />

        <Text style={styles.label}>Program</Text>
        <TextInput
          style={styles.input}
          value={program}
          onChangeText={setProgram}
          placeholder="e.g., BSIT"
        />

        <Text style={styles.label}>Section</Text>
        <TextInput
          style={styles.input}
          value={section}
          onChangeText={setSection}
          placeholder="e.g., 3201"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Tell us a little about yourself"
          multiline
        />

        <Button title={saving ? 'Saving...' : 'Save Changes'} onPress={handleUpdateProfile} disabled={saving} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});
