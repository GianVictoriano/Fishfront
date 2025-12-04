import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Modal, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import apiClient from '../../utils/api';
import { useBranding } from '~/context/BrandingContext';

export default function CreateCreativeScreen() {
  const router = useRouter();
  const { colors } = useBranding();
  const [genre, setGenre] = useState('artwork');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [publishedWork, setPublishedWork] = useState(null);

  const genres = [
    { value: 'artwork', label: 'Artwork', icon: 'palette' },
    { value: 'poem', label: 'Poem', icon: 'text' },
    { value: 'essay', label: 'Essay', icon: 'book-open-variant' },
  ];

  const pickDocument = async () => {
    if (Platform.OS === 'web') {
      // Web-specific file picker
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*';
      input.multiple = false;

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          console.log('Web file selected:', file);

          // Validate file size (10MB max)
          if (file.size > 10 * 1024 * 1024) {
            Alert.alert('File Too Large', 'Please select a file smaller than 10MB.');
            return;
          }

          // Create file object for state
          const selectedFile = {
            uri: URL.createObjectURL(file), // Create object URL for web
            name: file.name,
            size: file.size,
            mimeType: file.type,
            file: file, // Keep reference to actual file for upload
          };

          console.log('Setting selected file for web:', selectedFile);
          setSelectedFile(selectedFile);
        }
      };

      input.click();
    } else {
      // Native platform handling with DocumentPicker
      try {
        console.log('Starting native document picker...');
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: Platform.OS !== 'web' // Only copy to cache on native
        });

        console.log('Document picker result:', result);

        // Platform-specific success check for native
        const isSuccess = result.type === 'success';

        if (isSuccess) {
          console.log('File selected successfully on native');

          // Validate file size (10MB max)
          if (result.size > 10 * 1024 * 1024) {
            Alert.alert('File Too Large', 'Please select a file smaller than 10MB.');
            return;
          }

          // Create file object for state
          const selectedFile = {
            uri: result.uri,
            name: result.name,
            size: result.size,
            mimeType: result.mimeType || 'application/octet-stream',
          };

          console.log('Setting selected file for native:', selectedFile);
          setSelectedFile(selectedFile);
        } else if (result.type === 'cancel') {
          console.log('User cancelled file selection');
        } else {
          console.log('Unexpected result type:', result.type);
          Alert.alert('Error', 'Failed to select file. Please try again.');
        }
      } catch (error) {
        console.error('Error picking document on native:', error);
        Alert.alert('Error', `Failed to select file: ${error.message}`);
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const createCreativeWork = async () => {
    console.log('=== CREATIVE WORK SUBMISSION START ===');
    console.log('Form data:', { genre, title, caption, hasFile: !!selectedFile });
    
    if (!title.trim()) {
      console.log('VALIDATION ERROR: Missing title');
      return Alert.alert('Error', 'Please enter a title for your creative work');
    }

    if (!caption.trim()) {
      console.log('VALIDATION ERROR: Missing caption');
      return Alert.alert('Error', 'Please enter a caption for your creative work');
    }

    if (!selectedFile) {
      console.log('VALIDATION ERROR: No file selected');
      return Alert.alert('Error', 'Please select a file to upload');
    }

    setIsSubmitting(true);

    try {
      console.log('Getting auth token...');
      // Get auth token
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        console.log('AUTH ERROR: No token found');
        Alert.alert('Authentication Required', 'Please sign in to create a creative work');
        router.push('/signin');
        return;
      }
      console.log('Auth token found:', token.substring(0, 20) + '...');

      // Convert file to base64 for database storage
      let base64Image = null;
      if (selectedFile) {
        if (Platform.OS === 'web') {
          // For web, convert file to base64
          base64Image = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(selectedFile.file);
          });
        } else {
          // For native platforms, convert URI to base64
          base64Image = await new Promise((resolve, reject) => {
            const fileUri = Platform.OS === 'ios' ? selectedFile.uri.replace('file://', '') : selectedFile.uri;
            FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            })
              .then(base64 => {
                resolve(`data:${selectedFile.mimeType};base64,${base64}`);
              })
              .catch(reject);
          });
        }
      }

      console.log('Sending creative data with base64 image...');
      
      // Create creative work with JSON data (not FormData)
      const creativeData = {
        genre: genre,
        title: title.trim(),
        caption: caption.trim(),
        image_base64: base64Image, // Send base64 image instead of file
        file_name: selectedFile?.name || null,
        file_type: selectedFile?.mimeType || null,
      };

      const response = await apiClient.post('/creatives', creativeData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('API RESPONSE SUCCESS:', {
        status: response.status,
        data: response.data
      });

      if (response.data.success !== false) {
        console.log('CREATIVE WORK CREATED SUCCESSFULLY');
        // Store the published work data and show success modal
        setPublishedWork(response.data.creative || response.data);
        setSuccessModalVisible(true);

        console.log('Resetting form...');
        // Reset form
        setGenre('artwork');
        setTitle('');
        setCaption('');
        setSelectedFile(null);
      } else {
        console.log('API RETURNED SUCCESS=false:', response.data);
        throw new Error(response.data.message || 'Failed to create creative work');
      }
    } catch (error) {
      console.error('=== CREATIVE WORK CREATION ERROR ===');
      console.error('Full error:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);

      // Show detailed validation errors if available
      let errorMessage = 'Failed to create creative work. Please try again.';

      if (error.response?.status === 422 && error.response?.data?.errors) {
        const errors = error.response.data.errors;
        console.log('VALIDATION ERRORS:', errors);
        const errorMessages = Object.keys(errors).map(key => {
          const fieldErrors = Array.isArray(errors[key]) ? errors[key] : [errors[key]];
          return `${key}: ${fieldErrors.join(', ')}`;
        });
        errorMessage = `Validation errors:\n${errorMessages.join('\n')}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      console.log('Showing error alert:', errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      console.log('=== CREATIVE WORK SUBMISSION END ===');
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary || '#1a237e'} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.primary || '#1a237e' }]}>
            Create Creative Work
          </Text>
          <Text style={styles.subtitle}>Share your artwork, poems, essays, and creative expressions</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Genre Selection */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <MaterialCommunityIcons name="palette" size={20} color={colors.primary || '#1a237e'} />
            <Text style={[styles.label, { color: colors.primary || '#1a237e' }]}>Genre</Text>
            <Text style={styles.requiredBadge}>Required</Text>
          </View>
          <View style={styles.genreContainer}>
            {genres.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.genreChip, genre === g.value && styles.genreChipSelected]}
                onPress={() => setGenre(g.value)}
              >
                <MaterialCommunityIcons
                  name={g.icon}
                  size={18}
                  color={genre === g.value ? '#fff' : colors.primary || '#1a237e'}
                />
                <Text style={[styles.genreChipText, genre === g.value && styles.genreChipTextSelected]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <MaterialCommunityIcons name="format-title" size={20} color={colors.primary || '#1a237e'} />
            <Text style={[styles.label, { color: colors.primary || '#1a237e' }]}>Title</Text>
            <Text style={styles.requiredBadge}>Required</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter your creative work title"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Caption Input */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <MaterialCommunityIcons name="text" size={20} color={colors.primary || '#1a237e'} />
            <Text style={[styles.label, { color: colors.primary || '#1a237e' }]}>Caption</Text>
            <Text style={styles.requiredBadge}>Required</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your creative work"
            value={caption}
            onChangeText={setCaption}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* File Upload */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <MaterialCommunityIcons name="file-upload" size={20} color={colors.primary || '#1a237e'} />
            <Text style={[styles.label, { color: colors.primary || '#1a237e' }]}>File Upload</Text>
            <Text style={styles.requiredBadge}>Required</Text>
          </View>
          {!selectedFile ? (
            <TouchableOpacity style={styles.fileUploadButton} onPress={() => {
              console.log('File upload button pressed');
              pickDocument();
            }}>
              <MaterialCommunityIcons name="file-plus" size={32} color="#9CA3AF" />
              <Text style={styles.fileUploadText}>Select File</Text>
              <Text style={styles.fileUploadSubtext}>Max size: 10MB</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.selectedFileContainer}>
              <View style={styles.fileInfo}>
                <MaterialCommunityIcons name="file" size={24} color={colors.primary || '#1a237e'} />
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Text style={styles.fileSize}>
                    {formatFileSize(selectedFile.size)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeFileButton}
                onPress={() => setSelectedFile(null)}
              >
                <Feather name="x" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <View style={styles.instructionHeader}>
            <MaterialCommunityIcons name="information-outline" size={20} color="#3B82F6" />
            <Text style={styles.instructionTitle}>Supported file types</Text>
          </View>
          <View style={styles.instructionList}>
            <Text style={styles.instructionItem}>• Images: JPG, PNG, GIF, WebP</Text>
            <Text style={styles.instructionItem}>• Documents: PDF, DOC, DOCX</Text>
            <Text style={styles.instructionItem}>• Audio: MP3, WAV, M4A</Text>
            <Text style={styles.instructionItem}>• Video: MP4, MOV, AVI</Text>
            <Text style={styles.instructionItem}>• Maximum file size: 10MB</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: colors.primary || '#1a237e' }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.cancelButtonText, { color: colors.primary || '#1a237e' }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary || '#1a237e' }]}
          onPress={createCreativeWork}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          )}
          <Text style={styles.createButtonText}>
            {isSubmitting ? 'Creating...' : 'Create Creative Work'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successHeader}>
              <View style={styles.successIcon}>
                <MaterialCommunityIcons name="check-circle" size={48} color="#10B981" />
              </View>
              <Text style={styles.successTitle}>Creative Work Published!</Text>
              <Text style={styles.successSubtitle}>
                Your work "{publishedWork?.title}" is now live and ready for viewers.
              </Text>
            </View>

            <View style={styles.successActions}>
              <TouchableOpacity
                style={[styles.successButton, styles.successSecondaryButton]}
                onPress={() => {
                  setSuccessModalVisible(false);
                  router.push('/collab/creative-works');
                }}
              >
                <MaterialCommunityIcons name="view-dashboard" size={20} color={colors.primary || '#1a237e'} />
                <Text style={[styles.successButtonText, { color: colors.primary || '#1a237e' }]}>
                  Go to Dashboard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.successButton, styles.successSecondaryButton]}
                onPress={() => {
                  setSuccessModalVisible(false);
                  // Form is already reset, user can create another work
                }}
              >
                <MaterialCommunityIcons name="plus" size={20} color={colors.primary || '#1a237e'} />
                <Text style={[styles.successButtonText, { color: colors.primary || '#1a237e' }]}>
                  Upload Another Work
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.successFooter}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSuccessModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  requiredBadge: {
    fontSize: 12,
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  genreContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  genreChipSelected: {
    backgroundColor: '#1a237e',
    borderColor: '#1a237e',
  },
  genreChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  genreChipTextSelected: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 100,
  },
  fileUploadButton: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  fileUploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  fileUploadSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
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
    fontWeight: '600',
    color: '#111827',
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  removeFileButton: {
    padding: 8,
  },
  instructionsContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8,
  },
  instructionList: {
    paddingLeft: 28,
  },
  instructionItem: {
    fontSize: 14,
    color: '#3730A3',
    marginBottom: 4,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  successHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  successActions: {
    padding: 20,
    gap: 12,
  },
  successButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  successSecondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  successFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  closeButton: {
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});
