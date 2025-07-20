import React, { useState, useEffect } from 'react';
import { View, Text, Button, Image, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useBranding } from '~/context/BrandingContext';
import { useAuth } from '~/context/AuthContext';
import apiClient from '../../utils/api';

export default function BrandingManagementScreen() {
  const { logoUrl, backgroundUrl, refreshBranding } = useBranding();
  const { token } = useAuth(); // Get auth token
  const [newLogo, setNewLogo] = useState(null);
  const [newBackground, setNewBackground] = useState(null);
  const [loading, setLoading] = useState(false);

  // Request permissions on component mount for non-web platforms
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        }
      }
    })();
  }, []);

  const pickImage = async (type) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'Images',
      allowsEditing: true,
      aspect: type === 'logo' ? [1, 1] : [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      if (type === 'logo') {
        setNewLogo(result.assets[0]);
      } else {
        setNewBackground(result.assets[0]);
      }
    }
  };

  const handleUpload = async () => {
    if (!newLogo && !newBackground) {
      Alert.alert('No Image Selected', 'Please select a logo or background to upload.');
      return;
    }

    setLoading(true);

    const formData = new FormData();

    // Handle file uploads differently for web vs. native
    if (newLogo) {
      if (Platform.OS === 'web') {
        const response = await fetch(newLogo.uri);
        const blob = await response.blob();
        formData.append('logo', blob, `logo.${blob.type.split('/')[1]}`);
      } else {
        const uriParts = newLogo.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('logo', {
          uri: newLogo.uri,
          name: `logo.${fileType}`,
          type: `image/${fileType}`,
        });
      }
    }

    if (newBackground) {
      if (Platform.OS === 'web') {
        const response = await fetch(newBackground.uri);
        const blob = await response.blob();
        formData.append('background', blob, `background.${blob.type.split('/')[1]}`);
      } else {
        const uriParts = newBackground.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('background', {
          uri: newBackground.uri,
          name: `background.${fileType}`,
          type: `image/${fileType}`,
        });
      }
    }

    try {
      // By using apiClient, the base URL and Authorization header are already configured.
      await apiClient.post('/branding', formData, {
        headers: {
          // The Content-Type header is crucial for file uploads.
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'Branding has been updated successfully!');
      setNewLogo(null);
      setNewBackground(null);
      refreshBranding(); // Refresh context to show new images
    } catch (error) {
      console.error('Upload Error:', error.response ? error.response.data : error.message);
      Alert.alert('Upload Failed', 'There was an error uploading the images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Website Management</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Logo</Text>
        <Image source={newLogo ? { uri: newLogo.uri } : logoUrl} style={styles.previewImage} />
        <Button title="Select New Logo" onPress={() => pickImage('logo')} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Background</Text>
        <Image source={newBackground ? { uri: newBackground.uri } : backgroundUrl} style={styles.previewImage} />
        <Button title="Select New Background" onPress={() => pickImage('background')} />
      </View>

      <View style={styles.uploadButtonContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#007BFF" />
        ) : (
          <Button title="Upload Changes" onPress={handleUpload} disabled={!newLogo && !newBackground} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  previewImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
    backgroundColor: '#e9e9e9',
  },
  uploadButtonContainer: {
    marginTop: 20,
  },
});
