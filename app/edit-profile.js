import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, TextInput, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import apiClient from '../utils/api';

const InputField = ({ icon, placeholder, value, onChangeText, multiline = false }) => (
  <View style={styles.inputContainer}>
    <Feather name={icon} size={20} color="#888" style={styles.inputIcon} />
    <TextInput
      style={[styles.input, multiline && styles.textArea]}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      placeholderTextColor="#aaa"
    />
  </View>
);

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
      const payload = { name, program, section, description };
      console.log('Sending profile update:', payload);
      
      const response = await apiClient.put('/profile', payload);
      console.log('Profile update response:', response.data);
      
      const updatedUser = response.data.user;
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      Alert.alert('Success', 'Your profile has been updated.');
      router.replace('/profile');
    } catch (error) {
      console.error('Failed to update profile:', error.response?.data || error.message);
      console.error('Full error:', error);
      Alert.alert('Error', `Could not update your profile: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1F2937', '#111827']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <InputField icon="user" placeholder="Your nickname" value={name} onChangeText={setName} />
        <InputField icon="book-open" placeholder="e.g., BSIT" value={program} onChangeText={setProgram} />
        <InputField icon="grid" placeholder="e.g., 3201" value={section} onChangeText={setSection} />
        <InputField icon="align-left" placeholder="Tell us a little about yourself" value={description} onChangeText={setDescription} multiline />

        <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleUpdateProfile} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="check-circle" size={18} color="#fff" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: Platform.OS === 'android' ? 40 : 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  formContainer: {
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981', // A modern, friendly green
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: '#6B7280', // Gray when disabled
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
