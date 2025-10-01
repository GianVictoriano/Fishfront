import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import apiClient from '../../utils/api';

export default function CreateArticleScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [genre, setGenre] = useState('');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef();

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImages(prev => [...prev, { uri: result.assets[0].uri, type: 'image', local: true }]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        setImages(prev => [...prev, { uri: result.uri, name: result.name, type: 'file', local: true }]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const removeMedia = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // In your handleSubmit function
  const handleSubmit = async () => {
    if (!title || !content) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    // Get the token and verify it exists
    const token = await AsyncStorage.getItem('auth_token');
    console.log('Retrieved token:', token ? 'Token exists' : 'No token found');
    
    if (!token) {
      Alert.alert('Authentication Required', 'Please sign in to create an article');
      router.push('/signin');
      setIsSubmitting(false);
      return;
    }
  
    const formData = new FormData();
  
    // Add text fields
    formData.append('title', title);
    formData.append('content', content);
    // Use the genre as is since we're now using the correct values
    formData.append('genre', genre);
    formData.append('status', 'draft'); // Make sure to set a status
  
    // Handle images (platform-aware, like branding.js)
    if (images && images.length > 0) {
      for (let index = 0; index < images.length; index++) {
        const image = images[index];
        if (image.uri && image.type === 'image') {
          const uriParts = image.uri.split('.');
          const fileExt = uriParts[uriParts.length - 1].toLowerCase();
          const mimeType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

          if (Platform.OS === 'web') {
            // Fetch and convert to Blob
            try {
              const response = await fetch(image.uri);
              const blob = await response.blob();
              formData.append('media[]', blob, `image_${Date.now()}_${index}.${fileExt}`);
            } catch (e) {
              console.error('Failed to fetch image for web upload:', e);
            }
          } else {
            // Native: append file object directly
            formData.append('media[]', {
              uri: image.uri,
              name: `image_${Date.now()}_${index}.${fileExt}`,
              type: mimeType,
            });
          }
        }
      }
    }
    
    console.log('Submitting form data...');
    console.log('FormData content:');
    // Log form data keys (works in most browsers)
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }
    
    try {
      // Log the request details
      console.log('Sending request to /api/articles');
      console.log('Token being sent:', token ? 'Token present' : 'No token');
      
      console.log('Sending request to:', `${process.env.EXPO_PUBLIC_API_URL}/api/articles`);
      console.log('Request headers:', {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token ? '[TOKEN_PRESENT]' : 'NO_TOKEN'}`,
      });

      // For file uploads, we'll use a direct fetch request to have more control
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/articles`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type, let the browser set it with the correct boundary
        },
        body: formData,
      });

      console.log('Response status:', response.status, response.statusText);
      
      let responseData;
      try {
        responseData = await response.json();
        console.log('Response data:', responseData);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        console.error('Server responded with error:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });
        
        const errorMessage = responseData?.message || 
                           responseData?.error || 
                           `Server error: ${response.status} ${response.statusText}`;
        
        throw new Error(errorMessage);
      }

      // Show success confirmation with options
      Alert.alert(
        'Article Published Successfully!',
        'Your article has been published successfully. What would you like to do next?',
        [
          {
            text: 'View Article',
            onPress: () => router.push(`/news/article/${responseData.data.id}`)
          },
          {
            text: 'Create New Article',
            onPress: () => {
              // Reset form
              setTitle('');
              setContent('');
              setGenre('');
              setImages([]);
              // Scroll to top
              if (scrollViewRef.current) {
                scrollViewRef.current.scrollTo({ y: 0, animated: true });
              }
            },
            style: 'default'
          },
          {
            text: 'Back to Dashboard',
            onPress: () => router.push('/collab'),
            style: 'cancel'
          }
        ],
        { cancelable: false }
      );
      
      return responseData;
      
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      
      let errorMessage = error.message || 'Failed to publish article. Please try again.';
      
      // More specific error messages based on common issues
      if (error.message.includes('Network Error')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else if (error.message.includes('401')) {
        errorMessage = 'Your session has expired. Please sign in again.';
        await AsyncStorage.removeItem('auth_token');
        router.push('/signin');
      }
      
      Alert.alert('Error', errorMessage);
      
      // Re-throw the error for any error boundaries
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a237e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Article</Text>
        <TouchableOpacity 
          style={[styles.publishButton, isSubmitting && styles.publishButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.publishButtonText}>
            {isSubmitting ? 'Publishing...' : 'Publish'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.contentContainer}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        <TextInput
          style={styles.titleInput}
          placeholder="Article Title"
          placeholderTextColor="#666"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
          multiline
        />

        <View style={styles.genreContainer}>
          <Text style={styles.genreLabel}>Genre</Text>
          <View style={styles.genreOptions}>
            {['articles', 'opinions', 'sports', 'editorial', 'artworks'].map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genreButton, genre === g && styles.genreButtonSelected]}
                onPress={() => setGenre(g)}
              >
                <Text style={[styles.genreButtonText, genre === g && styles.genreButtonTextSelected]}>
                  {g === 'opinions' ? 'Opinions' : g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TextInput
          style={styles.contentInput}
          placeholder="Write your article here..."
          placeholderTextColor="#666"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />

        <View style={styles.mediaContainer}>
          {images.map((media, index) => (
            <View key={index} style={styles.mediaItem}>
              {media.type === 'image' ? (
                <Image source={{ uri: media.uri }} style={styles.mediaImage} />
              ) : (
                <View style={styles.documentItem}>
                  <MaterialIcons name="insert-drive-file" size={40} color="#1a237e" />
                  <Text style={styles.documentName} numberOfLines={1}>
                    {media.name || 'Document'}
                  </Text>
                </View>
              )}
              <TouchableOpacity 
                style={styles.removeMediaButton}
                onPress={() => removeMedia(index)}
              >
                <Ionicons name="close-circle" size={20} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={pickImage}>
          <Ionicons name="image" size={24} color="#1a237e" />
          <Text style={styles.footerButtonText}>Add Image</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerButton} onPress={pickDocument}>
          <Ionicons name="document-attach" size={24} color="#1a237e" />
          <Text style={styles.footerButtonText}>Add File</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a237e',
  },
  publishButton: {
    backgroundColor: '#1a237e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  publishButtonDisabled: {
    backgroundColor: '#9fa8da',
  },
  publishButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    minHeight: 200,
  },
  genreContainer: {
    marginBottom: 20,
  },
  genreLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  genreOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genreButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    marginBottom: 10,
  },
  genreButtonSelected: {
    backgroundColor: '#1a237e',
  },
  genreButtonText: {
    color: '#333',
  },
  genreButtonTextSelected: {
    color: '#fff',
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
  },
  mediaItem: {
    width: '48%',
    marginRight: '4%',
    marginBottom: 16,
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    aspectRatio: 4/3,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  documentItem: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  documentName: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 2,
  },
  footer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerButtonText: {
    marginLeft: 8,
    color: '#1a237e',
    fontWeight: '500',
  },
});
