import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Alert, Platform, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import AppNavbar from '../../components/AppNavbar';
import apiClient from '../../utils/api';

const SUBMISSION_TYPES = [
  {
    id: 'literature',
    title: 'Submit Literature/Artwork',
    description: 'Share your creative writing, poetry, or visual artwork',
    icon: 'auto-stories',
    color: '#4f46e5',
  },
  {
    id: 'coverage',
    title: 'Request Coverage',
    description: 'Suggest a topic or event you\'d like us to cover',
    icon: 'record-voice-over',
    color: '#f59e0b',
  },
];

const LITERATURE_CATEGORIES = [
  { id: 'fiction', name: 'Fiction', icon: 'auto-stories' },
  { id: 'poetry', name: 'Poetry', icon: 'format-quote' },
  { id: 'essay', name: 'Essay', icon: 'article' },
  { id: 'artwork', name: 'Visual Art', icon: 'palette' },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const Contribute = () => {
  const textInputRef = useRef(null);
  const [step, setStep] = useState('select'); // 'select', 'category', 'form'
  const [formTitle, setFormTitle] = useState('Share Your Work');
  const [formSubtitle, setFormSubtitle] = useState('Contribute your content to our community');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submissionType, setSubmissionType] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const { user } = useAuth();

  const validateForm = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    const isArtwork = submissionType === 'literature' && category === 'artwork';

    // Content is required unless it's a pure artwork submission
    if (!isArtwork && !content.trim()) {
      newErrors.content = 'Content is required';
    }

    // Category required only when selecting literature
    if (submissionType === 'literature' && !category) {
      newErrors.category = 'Please select a category';
    }

    if (isArtwork && files.length === 0) {
      newErrors.files = 'Please upload at least one file';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSelectType = (type) => {
    setSubmissionType(type);
    if (type === 'literature') {
      setStep('category');
    } else {
      setStep('form');
      setFormTitle(type === 'story' ? 'Share Your Story' : 'Request Coverage');
      setFormSubtitle(
        type === 'story' 
          ? 'Tell us about your personal experiences or opinions' 
          : 'Suggest a topic or event you\'d like us to cover'
      );
    }
  };
  
  const handleBack = () => {
    if (step === 'form' || step === 'category') {
      setStep('select');
    } else {
      router.back();
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const newFiles = result.assets
          .filter(asset => asset.fileSize <= MAX_FILE_SIZE)
          .map(asset => ({
            uri: asset.uri,
            type: asset.mimeType,
            name: asset.uri.split('/').pop(),
          }));

        setFiles([...files, ...newFiles]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Get auth token first
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        Alert.alert('Authentication Required', 'Please sign in first');
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      
      // Map submission types to valid category values from the backend validation
      const categoryMap = {
        'literature': 'fiction',  // Map 'literature' to 'fiction' as per backend
        'artwork': 'artwork',
        'story': 'story',
        'coverage': 'coverage',
        'poetry': 'poetry',      // Added poetry
        'essay': 'essay'         // Added essay
      };
      
      // Default to 'fiction' if the submission type doesn't match any valid category
      const selectedCategory = categoryMap[submissionType] || 'fiction';
      
      formData.append('category', selectedCategory);
      formData.append('type', submissionType);
      formData.append('user_id', user.id);  // Changed userId to user_id to match backend

      // Only append files if they exist
      if (files.length > 0) {
        files.forEach((file, index) => {
          formData.append('files[]', {
            uri: file.uri,
            type: file.type,
            name: file.name || `file-${index}`,
          });
        });
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/contributions`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          // Let browser set Content-Type with boundary
        },
        body: formData,
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Submission failed');
      }
      
      Alert.alert('Success', 'Your contribution has been submitted for review!');
      router.push('/home');
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert('Error', 'Failed to submit contribution. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSelectionScreen = () => (
    <View style={styles.selectionContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Make a Contribution</Text>
        <Text style={styles.subtitle}>Choose what you'd like to share with University</Text>
      </View>
      
      <View style={styles.cardsContainer}>
        {SUBMISSION_TYPES.map((type) => (
          <TouchableOpacity 
            key={type.id}
            style={[styles.card, { borderLeftColor: type.color }]}
            onPress={() => handleSelectType(type.id)}
          >
            <View style={[styles.cardIcon, { backgroundColor: `${type.color}15` }]}>
              <MaterialIcons name={type.icon} size={32} color={type.color} />
            </View>
            <Text style={styles.cardTitle}>{type.title}</Text>
            <Text style={styles.cardDescription}>{type.description}</Text>
            <View style={styles.cardArrow}>
              <MaterialIcons name="arrow-forward-ios" size={16} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const handleCategorySelect = (selectedCategory) => {
    setCategory(selectedCategory);
    setStep('form');
    
    const categoryName = LITERATURE_CATEGORIES.find(cat => cat.id === selectedCategory)?.name || 'Content';
    setFormTitle(`Submit ${categoryName}`);
    setFormSubtitle(`Share your ${categoryName.toLowerCase()} with our community`);
  };
  
  const renderCategorySelection = () => (
    <View style={styles.categorySelection}>
      <Text style={styles.sectionTitle}>Select a Category</Text>
      <Text style={styles.sectionSubtitle}>Choose the type of content you're submitting</Text>
      
      <View style={styles.categoriesGrid}>
        {LITERATURE_CATEGORIES.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.categoryCard}
            onPress={() => handleCategorySelect(item.id)}
          >
            <View style={[styles.categoryIcon, { backgroundColor: `${item.color}15` }]}>
              <MaterialIcons name={item.icon} size={32} color={item.color} />
            </View>
            <Text style={styles.categoryName}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderForm = () => (
    <View style={styles.formWrapper}>
      <View style={styles.formHeader}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#4f46e5" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{formTitle}</Text>
        <Text style={styles.subtitle}>{formSubtitle}</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter a title for your submission"
            placeholderTextColor="#94a3b8"
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>

        {submissionType === 'literature' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.selectedCategory}>
              <MaterialIcons 
                name={LITERATURE_CATEGORIES.find(cat => cat.id === category)?.icon || 'category'} 
                size={20} 
                color="#3b82f6" 
              />
              <Text style={styles.selectedCategoryText}>
                {LITERATURE_CATEGORIES.find(cat => cat.id === category)?.name || 'Select a category'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {submissionType === 'literature' ? 'Content' : 
             submissionType === 'story' ? 'Your Story' : 'Your Request'}
          </Text>
          <TextInput
            ref={textInputRef}
            style={[styles.textArea, errors.content && styles.inputError]}
            value={content}
            onChangeText={setContent}
            placeholder={
              submissionType === 'literature' ? 'Enter your content here...' :
              submissionType === 'story' ? 'Tell us your story...' :
              'Tell us what you\'d like us to cover...'
            }
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={8}
          />
          {errors.content && <Text style={styles.errorText}>{errors.content}</Text>}
        </View>

        {submissionType === 'literature' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Attachments</Text>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={pickImage}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <MaterialIcons name="cloud-upload" size={24} color="#ffffff" />
                  <Text style={styles.uploadButtonText}>Upload Files</Text>
                </>
              )}
            </TouchableOpacity>
            {files.length > 0 && (
              <View style={styles.fileList}>
                {files.map((file, index) => (
                  <View key={index} style={styles.fileItem}>
                    <MaterialIcons name="insert-drive-file" size={20} color="#64748b" />
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <TouchableOpacity 
                      style={styles.removeFileButton}
                      onPress={() => removeFile(index)}
                    >
                      <MaterialIcons name="close" size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {errors.files && <Text style={styles.errorText}>{errors.files}</Text>}
          </View>
        )}

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit for Review</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppNavbar />
      <ScrollView style={styles.scrollView}>
        {step === 'select' && renderSelectionScreen()}
        {step === 'category' && renderCategorySelection()}
        {step === 'form' && renderForm()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  selectionContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  cardArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -8,
  },
  categorySelection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    textAlign: 'center',
  },
  formWrapper: {
    flex: 1,
    padding: 16,
  },
  formHeader: {
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    color: '#4f46e5',
    marginLeft: 8,
    fontWeight: '500',
  },
  formContainer: {
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 160,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedCategoryText: {
    marginLeft: 8,
    color: '#1e293b',
    fontSize: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 16,
  },
  fileList: {
    marginTop: 12,
    gap: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fileName: {
    flex: 1,
    marginLeft: 12,
    color: '#475569',
  },
  removeFileButton: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default Contribute;
