import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Modal, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../utils/api';
import { useBranding } from '~/context/BrandingContext';

export default function CreateLiteraryWorkScreen() {
  const router = useRouter();
  const { colors } = useBranding();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [heyzineUrl, setHeyzineUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [publishedWork, setPublishedWork] = useState(null);

  const validateHeyzineUrl = (url) => {
    // Basic URL validation for Heyzine
    const heyzinePattern = /^https?:\/\/(www\.)?(heyzine\.com|.*\.heyzine\.com)\/.+/;
    return heyzinePattern.test(url);
  };

  const createLiteraryWork = async () => {
    if (!title.trim()) {
      return Alert.alert('Error', 'Please enter a title for your literary work');
    }

    if (!heyzineUrl.trim()) {
      return Alert.alert('Error', 'Please enter a Heyzine flipbook URL');
    }

    if (!validateHeyzineUrl(heyzineUrl.trim())) {
      return Alert.alert('Error', 'Please enter a valid Heyzine flipbook URL (e.g., https://heyzine.com/...)');
    }

    setIsSubmitting(true);

    try {
      // Get auth token
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        Alert.alert('Authentication Required', 'Please sign in to create a literary work');
        router.push('/signin');
        return;
      }

      // Create literary work with Heyzine URL
      const response = await apiClient.post('/literary-works', {
        title: title.trim(),
        description: description.trim(),
        heyzine_url: heyzineUrl.trim(),
      });

      if (response.data.success) {
        // Store the published work data and show success modal
        setPublishedWork(response.data.data);
        setSuccessModalVisible(true);
        
        // Reset form
        setTitle('');
        setDescription('');
        setHeyzineUrl('');
      } else {
        throw new Error(response.data.message || 'Failed to create literary work');
      }
    } catch (error) {
      console.error('Error creating literary work:', error);
      
      // Show detailed validation errors if available
      let errorMessage = 'Failed to create literary work. Please try again.';
      
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const errors = error.response.data.errors;
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
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary || '#1a237e'} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.primary || '#1a237e' }]}>
            Create Literary Work
          </Text>
          <Text style={styles.subtitle}>Convert your PDF to an interactive flipbook</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <MaterialCommunityIcons name="book-open-variant" size={20} color={colors.primary || '#1a237e'} />
            <Text style={[styles.label, { color: colors.primary || '#1a237e' }]}>Title</Text>
            <Text style={styles.requiredBadge}>Required</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter your literary work title"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <MaterialCommunityIcons name="text" size={20} color={colors.primary || '#1a237e'} />
            <Text style={[styles.label, { color: colors.primary || '#1a237e' }]}>Description</Text>
            <Text style={styles.optionalBadge}>Optional</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your literary work"
            value={description}
            onChangeText={setDescription}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Heyzine URL Input */}
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <MaterialCommunityIcons name="link-variant" size={20} color={colors.primary || '#1a237e'} />
            <Text style={[styles.label, { color: colors.primary || '#1a237e' }]}>Heyzine URL</Text>
            <Text style={styles.requiredBadge}>Required</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter your Heyzine flipbook URL"
            value={heyzineUrl}
            onChangeText={setHeyzineUrl}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <View style={styles.instructionHeader}>
            <MaterialCommunityIcons name="information-outline" size={20} color="#3B82F6" />
            <Text style={styles.instructionTitle}>How it works</Text>
          </View>
          <View style={styles.instructionList}>
            <Text style={styles.instructionItem}>1. Create your flipbook on Heyzine.com</Text>
            <Text style={styles.instructionItem}>2. Copy the flipbook URL from Heyzine</Text>
            <Text style={styles.instructionItem}>3. Paste the URL in the field above</Text>
            <Text style={styles.instructionItem}>4. Add title and description (optional)</Text>
            <Text style={styles.instructionItem}>5. Publish to share with readers</Text>
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
          onPress={createLiteraryWork}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          )}
          <Text style={styles.createButtonText}>
            {isSubmitting ? 'Creating...' : 'Create Literary Work'}
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
              <Text style={styles.successTitle}>Literary Work Published!</Text>
              <Text style={styles.successSubtitle}>
                Your work "{publishedWork?.title}" is now live and ready for readers.
              </Text>
            </View>
            
            <View style={styles.successActions}>
              <TouchableOpacity
                style={[styles.successButton, styles.successSecondaryButton]}
                onPress={() => {
                  setSuccessModalVisible(false);
                  router.push('/collab/literary-works');
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
  optionalBadge: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
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
  successPrimaryButton: {
    backgroundColor: '#1a237e',
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
