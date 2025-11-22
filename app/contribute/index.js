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
import { Picker } from '@react-native-picker/picker';

const SUBMISSION_TYPES = [
  // {
  //   id: 'literature',
  //   title: 'Submit Literature/Artwork',
  //   description: 'Share your creative writing, poetry, or visual artwork',
  //   icon: 'auto-stories',
  //   color: '#4f46e5',
  // },
  {
    id: 'coverage',
    title: 'Request Cover',
    description: 'Suggest a topic or event you\'d like us to cover',
    icon: 'record-voice-over',
    color: '#f59e0b',
  },
  {
    id: 'documentation',
    title: 'Request Documentation',
    description: 'Request official documents, certificates, or records',
    icon: 'description',
    color: '#10b981',
  },
];

const LITERATURE_CATEGORIES = [
  { id: 'fiction', name: 'Fiction', icon: 'auto-stories' },
  { id: 'poetry', name: 'Poetry', icon: 'format-quote' },
  { id: 'essay', name: 'Essay', icon: 'article' },
  { id: 'artwork', name: 'Visual Art', icon: 'palette' },
];

const REQUEST_TYPES = [
  { id: 'photo', name: 'Photo' },
  { id: 'video', name: 'Video' },
  { id: 'interview', name: 'Interview' },
  { id: 'news report', name: 'News Report' },
  { id: 'Video Image', name: 'Video Image' },
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
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [numWriters, setNumWriters] = useState('1');
  const [numPhotographers, setNumPhotographers] = useState('1');
  const [department, setDepartment] = useState('');
  const [requestType, setRequestType] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDateErrorModal, setShowDateErrorModal] = useState(false);
  const [showTimeErrorModal, setShowTimeErrorModal] = useState(false);
  const [dateErrorMessage, setDateErrorMessage] = useState('');

  const router = useRouter();

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

    // Validate coverage-specific fields
    if (submissionType === 'coverage') {
      if (!eventDate) newErrors.eventDate = 'Event date is required';
      if (!eventLocation.trim()) newErrors.eventLocation = 'Event location is required';
      if (!numWriters || parseInt(numWriters) < 1) {
        newErrors.numWriters = 'Please specify number of writers (minimum 1)';
      }
      if (!numPhotographers || parseInt(numPhotographers) < 0) {
        newErrors.numPhotographers = 'Please specify number of photographers (minimum 0)';
      }
      if (!department.trim()) newErrors.department = 'Department is required';
    }

    // Validate documentation-specific fields (if any needed in future)
    // For now, documentation requests only require title and content
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSelectType = (type) => {
    // Check eligibility for coverage requests
    if (type === 'coverage') {
      const email = user?.email || '';
      // Check if email matches pattern **-*****@g.batstate-u.edu.ph
      const studentEmailPattern = /^\d{2}-\d{5}@g\.batstate-u\.edu\.ph$/;
      if (studentEmailPattern.test(email)) {
        setShowEligibilityModal(true);
        return;
      }
    }

    // Reset coverage fields when switching to different type
    if (type !== 'coverage') {
      setEventDate('');
      setEventLocation('');
      setNumWriters('1');
      setNumPhotographers('1');
      setDepartment('');
    }

    // Reset documentation fields when switching to different type
    if (type !== 'documentation') {
      // Add any documentation-specific field resets here if needed
    }
    
    setSubmissionType(type);
    if (type === 'literature') {
      setStep('category');
    } else {
      setStep('form');
      setFormTitle(
        type === 'story' ? 'Share Your Story' : 
        type === 'coverage' ? 'Request Coverage' :
        type === 'documentation' ? 'Request Documentation' : 'Submit Request'
      );
      setFormSubtitle(
        type === 'story' 
          ? 'Tell us about your personal experiences or opinions' 
          : type === 'coverage'
          ? 'Suggest a topic or event you\'d like us to cover'
          : type === 'documentation'
          ? 'Request official documents, certificates, or records'
          : 'Contribute your content to our community'
      );
    }
  };
  
  const handleBack = () => {
    if (step === 'form' || step === 'category') {
      // Reset coverage fields when going back
      setEventDate('');
      setEventLocation('');
      setNumWriters('1');
      setNumPhotographers('1');
      setDepartment('');
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

      // Add coverage-specific fields
      if (submissionType === 'coverage') {
        formData.append('event_date', eventDate);
        formData.append('event_location', eventLocation);
        formData.append('num_writers', numWriters);
        formData.append('num_photographers', numPhotographers);
        formData.append('department', department);
      }

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
        <Text style={styles.title}>Submit</Text>
        <Text style={styles.subtitle}>Choose what you'd like to share with the Fisherman Publications</Text>
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

        {submissionType === 'coverage' && (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Event Details</Text>
              <View style={styles.eventDetailsRow}>
                <View style={styles.detailField}>
                  <Text style={styles.fieldLabel}>Date & Time</Text>
                  <TouchableOpacity
                    style={[styles.input, styles.datePickerButton, errors.eventDate && styles.inputError]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={eventDate ? styles.dateText : styles.datePlaceholder}>
                      {eventDate || 'Select date and time'}
                    </Text>
                    <MaterialIcons name="calendar-today" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailField}>
                  <Text style={styles.fieldLabel}>Location</Text>
                  <TextInput
                    style={[styles.input, errors.eventLocation && styles.inputError]}
                    value={eventLocation}
                    onChangeText={setEventLocation}
                    placeholder="Enter location"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.detailField}>
                  <Text style={styles.fieldLabel}>Request Type</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={requestType}
                      onValueChange={(itemValue) => setRequestType(itemValue)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select request type..." value="" />
                      {REQUEST_TYPES.map(type => (
                        <Picker.Item key={type.id} label={type.name} value={type.id} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.detailField}>
                  <Text style={styles.fieldLabel}>No. of Writers</Text>
                  <View style={styles.journalistsContainer}>
                    <TouchableOpacity
                      style={styles.arrowButton}
                      onPress={() => {
                        const current = parseInt(numWriters) || 1;
                        if (current > 1) {
                          setNumWriters((current - 1).toString());
                        }
                      }}
                    >
                      <MaterialIcons name="keyboard-arrow-down" size={20} color="#4f46e5" />
                    </TouchableOpacity>

                    <TextInput
                      style={[styles.journalistInput, errors.numWriters && styles.inputError]}
                      value={numWriters}
                      onChangeText={setNumWriters}
                      placeholder="1"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      textAlign="center"
                    />

                    <TouchableOpacity
                      style={styles.arrowButton}
                      onPress={() => {
                        const current = parseInt(numWriters) || 1;
                        setNumWriters((current + 1).toString());
                      }}
                    >
                      <MaterialIcons name="keyboard-arrow-up" size={20} color="#4f46e5" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.detailField}>
                  <Text style={styles.fieldLabel}>No. of Photographers</Text>
                  <View style={styles.journalistsContainer}>
                    <TouchableOpacity
                      style={styles.arrowButton}
                      onPress={() => {
                        const current = parseInt(numPhotographers) || 0;
                        if (current > 0) {
                          setNumPhotographers((current - 1).toString());
                        }
                      }}
                    >
                      <MaterialIcons name="keyboard-arrow-down" size={20} color="#4f46e5" />
                    </TouchableOpacity>

                    <TextInput
                      style={[styles.journalistInput, errors.numPhotographers && styles.inputError]}
                      value={numPhotographers}
                      onChangeText={setNumPhotographers}
                      placeholder="0"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      textAlign="center"
                    />

                    <TouchableOpacity
                      style={styles.arrowButton}
                      onPress={() => {
                        const current = parseInt(numPhotographers) || 0;
                        setNumPhotographers((current + 1).toString());
                      }}
                    >
                      <MaterialIcons name="keyboard-arrow-up" size={20} color="#4f46e5" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.detailField}>
                  <Text style={styles.fieldLabel}>Department</Text>
                  <TextInput
                    style={[styles.input, errors.department && styles.inputError]}
                    value={department}
                    onChangeText={setDepartment}
                    placeholder="Enter department name"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              {errors.eventDate && <Text style={[styles.errorText, {marginTop: 4}]}>{errors.eventDate}</Text>}
              {errors.numWriters && <Text style={[styles.errorText, {marginTop: 4}]}>{errors.numWriters}</Text>}
              {errors.numPhotographers && <Text style={[styles.errorText, {marginTop: 4}]}>{errors.numPhotographers}</Text>}
              {errors.department && <Text style={[styles.errorText, {marginTop: 4}]}>{errors.department}</Text>}
              {errors.eventLocation && <Text style={[styles.errorText, {marginTop: 4}]}>{errors.eventLocation}</Text>}
            </View>
          </>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {submissionType === 'literature' ? 'Content' : 
             submissionType === 'story' ? 'Your Story' : 
             submissionType === 'documentation' ? 'Your Request' : 'Your Request'}
          </Text>
          <TextInput
            ref={textInputRef}
            style={[styles.textArea, errors.content && styles.inputError]}
            value={content}
            onChangeText={setContent}
            placeholder={
              submissionType === 'literature' ? 'Enter your content here...' :
              submissionType === 'story' ? 'Tell us your story...' :
              submissionType === 'documentation' ? 'Describe the documents you need...' :
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
            <Text style={styles.submitButtonText}>Submit Request</Text>
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

      {/* Eligibility Modal */}
      <Modal
        visible={showEligibilityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEligibilityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.eligibilityModal}>
            <View style={styles.modalIconContainer}>
              <MaterialIcons name="block" size={48} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Not Eligible</Text>
            <Text style={styles.modalMessage}>
              Student accounts are not eligible to request coverage. This feature is only available for faculty, staff, and departments.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowEligibilityModal(false)}
            >
              <Text style={styles.modalButtonText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Event Date & Time</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerBody}>
              <input
                type="datetime-local"
                style={{
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontFamily: 'system-ui',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }}
                value={(() => {
                  const year = selectedDate.getFullYear();
                  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                  const day = String(selectedDate.getDate()).padStart(2, '0');
                  const hours = String(selectedDate.getHours()).padStart(2, '0');
                  const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
                  return `${year}-${month}-${day}T${hours}:${minutes}`;
                })()}
                onChange={(e) => {
                  const newDate = new Date(e.target.value + ':00'); // Add seconds
                  setSelectedDate(newDate);
                }}
              />
            </View>

            <View style={styles.datePickerFooter}>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerConfirmButton}
                onPress={() => {
                  const now = new Date();
                  const selectedDateTime = new Date(selectedDate);
                  
                  // Check if selected date is before current date
                  const selectedDateOnly = new Date(selectedDateTime.getFullYear(), selectedDateTime.getMonth(), selectedDateTime.getDate());
                  const currentDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  
                  if (selectedDateOnly < currentDateOnly) {
                    setDateErrorMessage('You cannot select a date in the past.');
                    setShowDateErrorModal(true);
                    return;
                  }
                  
                  // Check if selected time is less than 1 hour from now (for today's date)
                  if (selectedDateOnly.getTime() === currentDateOnly.getTime()) {
                    const oneHourFromNow = new Date(now.getTime() + (60 * 60 * 1000)); // 1 hour in milliseconds
                    
                    if (selectedDateTime < oneHourFromNow) {
                      setDateErrorMessage('You must select a time at least 1 hour from now.');
                      setShowTimeErrorModal(true);
                      return;
                    }
                  }
                  
                  const formatted = (() => {
                    const year = selectedDate.getFullYear();
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(selectedDate.getDate()).padStart(2, '0');
                    const hours = String(selectedDate.getHours()).padStart(2, '0');
                    const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
                    return `${year}-${month}-${day} ${hours}:${minutes}`;
                  })();
                  setEventDate(formatted);
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Error Modal */}
      <Modal
        visible={showDateErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.eligibilityModal}>
            <View style={styles.modalIconContainer}>
              <MaterialIcons name="error-outline" size={48} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Invalid Date</Text>
            <Text style={styles.modalMessage}>
              {dateErrorMessage}
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowDateErrorModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Error Modal */}
      <Modal
        visible={showTimeErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimeErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.eligibilityModal}>
            <View style={styles.modalIconContainer}>
              <MaterialIcons name="schedule" size={48} color="#f59e0b" />
            </View>
            <Text style={styles.modalTitle}>Invalid Time</Text>
            <Text style={styles.modalMessage}>
              {dateErrorMessage}
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, {backgroundColor: '#f59e0b'}]}
              onPress={() => setShowTimeErrorModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eligibilityModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#1e293b',
  },
  datePlaceholder: {
    fontSize: 16,
    color: '#94a3b8',
  },
  datePickerModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  datePickerBody: {
    padding: 20,
  },
  datePickerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  datePickerCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  datePickerCancelText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 15,
  },
  datePickerConfirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
  },
  datePickerConfirmText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  eventDetailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 6,
  },
  journalistsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 48,
  },
  arrowButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalistInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    textAlign: 'center',
    paddingVertical: 8,
    minWidth: 40,
  },
  pickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  picker: {
    height: 48,
    color: '#1e293b',
  },
});

export default Contribute;
