import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Alert, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AppNavbar from '../../../../components/AppNavbar';
import apiClient from '../../../../utils/api';

const GENRES = [
  { label: 'Artwork', value: 'artwork' },
  { label: 'Literature', value: 'literature' },
  { label: 'Photography', value: 'photography' }
];

export default function SubmitScreen() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    genre: '',
    title: '',
    caption: '',
    file: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGenreModal, setShowGenreModal] = useState(false);

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.genre || !formData.title || !formData.caption || !formData.file) {
      Alert.alert('Missing Information', 'Please fill in all required fields and select a file.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('genre', formData.genre);
      submitData.append('title', formData.title);
      submitData.append('caption', formData.caption);
      submitData.append('file', formData.file);

      // Make API call to submit the work
      const response = await apiClient.post('/submissions', submitData);

      const result = await response.data;
      Alert.alert('Success', 'Your work has been submitted successfully!');
      router.push('/screens/user/my-submissions');
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert('Error', 'Failed to submit work. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Basic file validation
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!allowedTypes.includes(file.type)) {
        Alert.alert('Invalid File Type', 'Please select a valid image, PDF, or text file.');
        return;
      }

      if (file.size > maxSize) {
        Alert.alert('File Too Large', 'Please select a file smaller than 10MB.');
        return;
      }

      setFormData(prev => ({
        ...prev,
        file: file
      }));
    }
  };

  const removeFile = () => {
    setFormData(prev => ({
      ...prev,
      file: null
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const selectGenre = (genre) => {
    setFormData(prev => ({
      ...prev,
      genre: genre.value
    }));
    setShowGenreModal(false);
  };

  return (
    <View style={styles.container}>
      <AppNavbar />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#1a237e" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Submit Your Work</Text>
          <Text style={styles.subtitle}>
            Share your creative writing, poetry, essays, or visual art with our community
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* Genre Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Genre *</Text>
            <TouchableOpacity
              style={styles.genreButton}
              onPress={() => setShowGenreModal(true)}
            >
              <Text style={formData.genre ? styles.genreButtonText : styles.genreButtonPlaceholder}>
                {formData.genre ? GENRES.find(g => g.value === formData.genre)?.label : 'Select a genre'}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Title Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(value) => handleInputChange('title', value)}
              placeholder="Enter your work title"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Caption Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Caption *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.caption}
              onChangeText={(value) => handleInputChange('caption', value)}
              placeholder="Describe your work..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* File Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Upload File *</Text>
            {!formData.file ? (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => fileInputRef.current?.click()}
              >
                <MaterialIcons name="cloud-upload" size={24} color="#6b7280" />
                <Text style={styles.uploadText}>
                  {formData.genre === 'literature' ? 'Upload your literature' :
                   formData.genre === 'photography' ? 'Upload your photo' :
                   formData.genre === 'artwork' ? 'Upload your artwork' :
                   'Choose File'}
                </Text>
                <Text style={styles.uploadSubtext}>Supported: Images, PDF, Text files (max 10MB)</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.filePreview}>
                <View style={styles.fileInfo}>
                  <MaterialIcons name="insert-drive-file" size={24} color="#059669" />
                  <View style={styles.fileDetails}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {formData.file.name}
                    </Text>
                    <Text style={styles.fileSize}>
                      {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeFileButton}
                  onPress={removeFile}
                >
                  <MaterialIcons name="close" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              accept="image/*,.pdf,.txt"
              onChange={handleFileSelect}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Work'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Genre Selection Modal */}
      <Modal
        visible={showGenreModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGenreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Genre</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowGenreModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.genreList}>
              {GENRES.map((genre) => (
                <TouchableOpacity
                  key={genre.value}
                  style={[
                    styles.genreOption,
                    formData.genre === genre.value && styles.genreOptionSelected
                  ]}
                  onPress={() => selectGenre(genre)}
                >
                  <Text style={[
                    styles.genreOptionText,
                    formData.genre === genre.value && styles.genreOptionTextSelected
                  ]}>
                    {genre.label}
                  </Text>
                  {formData.genre === genre.value && (
                    <MaterialIcons name="check" size={20} color="#059669" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 60,
  },
  header: {
    marginBottom: 30,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1a237e',
    marginLeft: 8,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#fff',
  },
  textArea: {
    textAlignVertical: 'top',
  },
  largeTextArea: {
    minHeight: 200,
  },
  submitButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  genreButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genreButtonText: {
    fontSize: 16,
    color: '#374151',
  },
  genreButtonPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  closeButton: {
    padding: 4,
  },
  genreList: {
    padding: 20,
  },
  genreOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  genreOptionSelected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  genreOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  genreOptionTextSelected: {
    color: '#059669',
    fontWeight: '600',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  filePreview: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  fileSize: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  removeFileButton: {
    padding: 4,
  },
});
