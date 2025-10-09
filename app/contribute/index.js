import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import AppNavbar from '../../components/AppNavbar';

const SUBMISSION_TYPES = [
  {
    id: 'literature',
    title: 'Submit Literature/Artwork',
    description: 'Share your creative writing, poetry, or visual artwork',
    icon: 'auto-stories',
    color: '#4f46e5',
  },
  {
    id: 'story',
    title: 'Share Your Story',
    description: 'Tell us about your personal experiences or opinions',
    icon: 'edit-note',
    color: '#10b981',
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
  const [step, setStep] = useState('select'); // 'select', 'form'
  const [showForm, setShowForm] = useState(false);
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
  const router = useRouter();
  const { user } = useAuth();

  const validateForm = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!content.trim()) newErrors.content = 'Content is required';
    
    // Only require category for literature/artwork submissions
    if (submissionType === 'literature' && !category) {
      newErrors.category = 'Please select a category';
    }
    
    // Only require files for literature/artwork submissions
    if (submissionType === 'literature' && files.length === 0) {
      newErrors.files = 'Please upload at least one file';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSelectType = (type) => {
    setSubmissionType(type);
    setCategory('');
    setStep('form');
  };
  
  const handleBack = () => {
    if (step === 'form') {
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
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('category', category);
      formData.append('userId', user.id);
      
      files.forEach((file, index) => {
        formData.append('files', {
          uri: file.uri,
          type: file.type,
          name: file.name || `file-${index}`,
        });
      });

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/contributions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${user.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit contribution');
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
  
  const handleImageUpload = async () => {
    try {
      setIsUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCategorySelect = (selectedCategory) => {
    setCategory(selectedCategory);
    setShowForm(true);
    
    // Reset selected image when changing categories
    if (selectedCategory !== 'artwork') {
      setSelectedImage(null);
    }
    
    // Update form title and subtitle based on category
    if (submissionType === 'literature') {
      const categoryName = LITERATURE_CATEGORIES.find(cat => cat.id === selectedCategory)?.name || 'Content';
      setFormTitle(`Submit ${categoryName}`);
      setFormSubtitle(`Share your ${categoryName.toLowerCase()} with our community`);
    } else if (submissionType === 'story') {
      setFormTitle('Share Your Story');
      setFormSubtitle('Tell us about your personal experiences or opinions');
    } else if (submissionType === 'coverage') {
      setFormTitle('Request Coverage');
      setFormSubtitle('Suggest a topic or event you\'d like us to cover');
    }
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
  
  const renderForm = () => {
    if (!showForm) {
      return renderCategorySelection();
    }
    
    return (
      <View style={styles.formWrapper}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#4f46e5" />
            <Text style={styles.backButtonText}>Back to Selection</Text>
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
              <View style={styles.categoryContainer}>
                {LITERATURE_CATEGORIES.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.categoryButton,
                      category === item.id && styles.categoryButtonActive,
                    ]}
                    onPress={() => setCategory(item.id)}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={20}
                      color={category === item.id ? '#fff' : '#3b82f6'}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        category === item.id && styles.categoryTextActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
            </View>
          )}
          
          {submissionType === 'literature' && category === 'artwork' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Upload Artwork</Text>
              {selectedImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image 
                    source={{ uri: selectedImage }} 
                    style={styles.imagePreview} 
                    resizeMode="contain"
                  />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <MaterialIcons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={handleImageUpload}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator color="#4f46e5" />
                  ) : (
                    <>
                      <MaterialIcons name="cloud-upload" size={32} color="#4f46e5" />
                      <Text style={styles.uploadButtonText}>Tap to upload artwork</Text>
                      <Text style={styles.uploadSubtext}>JPG, PNG, or GIF (max 5MB)</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {errors.files && <Text style={styles.errorText}>{errors.files}</Text>}
            </View>
          )}
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {submissionType === 'literature' 
                ? category === 'artwork' ? 'Artwork Description' : 'Content'
                : submissionType === 'story' ? 'Your Story' : 'Details'}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.content && styles.inputError]}
              value={content}
              onChangeText={setContent}
              placeholder={
                submissionType === 'literature'
                  ? 'Enter your content here...'
                  : submissionType === 'story'
                  ? 'Tell us your story...'
                  : 'Provide details about your request...'
              }
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              scrollEnabled={false}
              onContentSizeChange={(e) => {
                if (e.nativeEvent.contentSize.height > 0 && 
                    e.nativeEvent.contentSize.height < 600) {
                  textInputRef.current?.setNativeProps({
                    style: { height: Math.max(120, e.nativeEvent.contentSize.height) }
                  });
                }
              }}
              ref={textInputRef}
            />
            {errors.content && <Text style={styles.errorText}>{errors.content}</Text>}
          </View>
          
          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
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
  };

  // Main component return statement
  return (
    <View style={{ flex: 1 }}>
      <AppNavbar />
      <ScrollView style={styles.container}>
        {step === 'select' ? (
          renderSelectionScreen()
        ) : (
          <>
            <View style={styles.formHeader}>
              {showForm ? (
                <TouchableOpacity 
                  onPress={() => setShowForm(false)}
                  style={styles.backButton}
                >
                  <MaterialIcons name="arrow-back" size={24} color="#4f46e5" />
                  <Text style={styles.backButtonText}>Back to Categories</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={() => setStep('select')}
                  style={styles.backButton}
                >
                  <MaterialIcons name="arrow-back" size={24} color="#4f46e5" />
                  <Text style={styles.backButtonText}>Back to Selection</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.title}>
                {showForm ? formTitle : 'Select a Category'}
              </Text>
              <Text style={styles.subtitle}>
                {showForm ? formSubtitle : 'Choose the type of content you\'re submitting'}
              </Text>
            </View>
            {renderForm()}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  formWrapper: {
    flex: 1,
    padding: 16,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#4f46e5',
    fontWeight: '500',
    marginTop: 8,
  },
  uploadSubtext: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  // ... existing styles ...
  submitButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  selectionContainer: {
    flex: 1,
    padding: 16,
  },
  cardsContainer: {
    marginTop: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4f46e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 80,
    justifyContent: 'center',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  cardArrow: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#4f46e5',
    fontSize: 16,
    marginLeft: 4,
    fontWeight: '500',
  },
  formWrapper: {
    flex: 1,
  },
  formHeader: {
    padding: 16,
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  formContainer: {
    padding: 16,
    paddingTop: 0,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    minHeight: 150,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
    marginBottom: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryText: {
    marginLeft: 6,
    color: '#3b82f6',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    marginBottom: 12,
  },
  uploadButtonText: {
    marginLeft: 8,
    color: '#3b82f6',
    fontWeight: '500',
  },
  fileList: {
    marginBottom: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  fileName: {
    flex: 1,
    marginLeft: 8,
    color: '#475569',
  },
  removeFileButton: {
    padding: 4,
  },
  fileHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
  // Form styles
  uploadButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  uploadButtonText: {
    marginTop: 8,
    color: '#4f46e5',
    fontWeight: '500',
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  imagePreviewContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formHeader: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categorySelection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
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
    justifyContent: 'space-between',
    marginHorizontal: -8,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
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
  formGroup: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    minHeight: 150,
    textAlignVertical: 'top',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryText: {
    marginLeft: 6,
    color: '#3b82f6',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
  },
});

export default Contribute;
