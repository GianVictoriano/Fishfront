import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Image, Platform, Alert, ActivityIndicator, ScrollView, TextInput, Modal } from 'react-native';
import Tesseract from 'tesseract.js';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import apiClient from '../../../../utils/api';
import { useAuth } from '~/context/AuthContext';

export default function RegistrationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [corImage, setCorImage] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    srCode: '',
    email: '',
    enrollmentYear: '',
    department: '',
  });
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('');
  const [applicationPeriod, setApplicationPeriod] = useState(null);
  const [isCheckingPeriod, setIsCheckingPeriod] = useState(true);

  const updateEmailFromSrCode = (srCode) => {
    if (srCode) {
      // Remove any characters that aren't letters, numbers, or hyphens, then convert to lowercase
      const cleanSrCode = srCode.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
      return `${cleanSrCode}@g.batstate-u.edu.ph`;
    }
    return '';
  };

  const parseOcrText = (text) => {
    const data = { fullName: '', srCode: '', email: '', enrollmentYear: '', department: '' };

    // First, find the section that contains the name information
    const lines = text.split('\n');
    let nameLineIndex = lines.findIndex(line => line.trim().startsWith('Name:'));
    
    if (nameLineIndex !== -1) {
      // Get the name line and the next few lines that might contain the actual name
      const nameSection = lines.slice(nameLineIndex, nameLineIndex + 3).join(' ');
      
      // Look for the name after the "Name:" label and any underlines
      const nameMatch = nameSection.match(/Name:[\s_‐—]*(?!FISHERFOLK REGISTRATION PROGRAM)([A-Z][A-Z\s,]+(?:JR\.?|SR\.?|I{2,3})?\b)/);
      
      if (nameMatch && nameMatch[1]) {
        // Clean up the name (remove extra spaces, special characters, etc.)
        const cleanName = nameMatch[1]
          .replace(/[^\w\s,.]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/\b(?:FISHERFOLK|REGISTRATION|PROGRAM)\b/gi, '')
          .trim();
          
        if (cleanName) {
          data.fullName = cleanName.toUpperCase();
        }
      }
    }
    
    // If we still don't have a name, try a more general approach
    if (!data.fullName) {
      // Look for any all-caps name that might be on its own line
      const allCapsName = text.match(/\n([A-Z][A-Z\s,]+(?:JR\.?|SR\.?|I{2,3})?\b)/);
      if (allCapsName && allCapsName[1]) {
        const potentialName = allCapsName[1]
          .replace(/[^\w\s,.]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
          
        if (potentialName.split(' ').length >= 2) {  // At least first and last name
          data.fullName = potentialName.toUpperCase();
        }
      }
    }

    // Look for any string with the format **-***** for the SR Code
    const srCodeMatch = text.match(/\b([A-Z0-9]{2}-[A-Z0-9]{5})\b/i);
    if (srCodeMatch && srCodeMatch[1]) {
      const srCode = srCodeMatch[1].toUpperCase();
      data.srCode = srCode;
      data.email = updateEmailFromSrCode(srCode);
    }

    // Look for any string with the format ****-**** for the Enrollment Year
    const yearMatch = text.match(/\b(\d{4}-\d{4})\b/);
    if (yearMatch && yearMatch[1]) {
      data.enrollmentYear = yearMatch[1];
    }

    // Look for the Department, which is on a line starting with "College of"
    const departmentLine = text.split('\n').find(line => line.trim().startsWith('College of'));
    if (departmentLine) {
      data.department = departmentLine.trim();
    }

    return data;
  };

  const performOCR = async (uri) => {
    if (!uri) return;
    setIsLoading(true);
    setOcrText('');
    try {
      const { data: { text } } = await Tesseract.recognize(uri, 'eng', {
        logger: (m) => console.log(m),
      });
      setOcrText(text);
      const parsedData = parseOcrText(text);
      setFormData(parsedData);
    } catch (err) {
      console.error('OCR Error:', err);
      Alert.alert('OCR Error', 'Failed to read text from the image.');
    } finally {
      setIsLoading(false);
    }
  };

  const pickCorImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant access to your photo library to upload your COR.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setCorImage(imageUri);
        performOCR(imageUri);
      }
    } catch (e) {
      console.error('Image pick error', e);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user) {
        // Show modal if user is not logged in
        setModalMessage('Only members of the Batangas State University-ARASOF are allowed to be a part of the Fisherman Publications. Please sign in with your university account.');
        setModalType('error');
        setIsModalVisible(true);
        setIsCheckingProfile(false);
        setIsCheckingPeriod(false);
        return;
      }

      try {
        const response = await apiClient.get('/api/profile');
        const profile = response.data;
        
        // Check if user is already a collaborator, editor, adviser, or admin
        if (profile && ['collaborator', 'editor', 'adviser', 'admin'].includes(profile.role)) {
          setIsCollaborator(true);
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      } finally {
        setIsCheckingProfile(false);
      }
    };

    const checkApplicationPeriod = async () => {
      try {
        const response = await apiClient.get('/api/application-period');
        if (response.data) {
          setApplicationPeriod(response.data);
          
          // Check if current date is within the application period
          // Compare only dates, not times
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          
          const startDate = new Date(response.data.start_date);
          startDate.setHours(0, 0, 0, 0);
          
          const endDate = new Date(response.data.end_date);
          endDate.setHours(23, 59, 59, 999);
          
          if (now < startDate) {
            setModalMessage(`Application period has not yet started. Applications will open on ${startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`);
            setModalType('error');
            setIsModalVisible(true);
          } else if (now > endDate) {
            setModalMessage(`Application period has ended. The deadline was ${endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. Please check back for the next application period.`);
            setModalType('error');
            setIsModalVisible(true);
          }
        }
      } catch (error) {
        console.error('Error checking application period:', error);
        // If there's no period set, allow applications (backward compatibility)
      } finally {
        setIsCheckingPeriod(false);
      }
    };

    checkUserProfile();
    checkApplicationPeriod();
  }, [user]);

  console.log('Current step:', step);
  
  if (isCheckingProfile || isCheckingPeriod) {
    return (
      <View style={{ flex: 1 }}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?q=80&w=2070' }}
          style={styles.bg}
          resizeMode="cover"
        >
          <View style={styles.overlay}>
            <View style={styles.contentWrapper}>
              <ActivityIndicator size="large" color="#1a237e" />
              <Text style={[styles.subtitle, { marginTop: 16 }]}>Checking your profile...</Text>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  if (isCollaborator) {
    return (
      <View style={{ flex: 1 }}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?q=80&w=2070' }}
          style={styles.bg}
          resizeMode="cover"
        >
          <View style={styles.overlay}>
            <View style={styles.contentWrapper}>
              <Feather name="check-circle" size={64} color="#10B981" style={{ marginBottom: 20 }} />
              <Text style={styles.title}>You're Already a Collaborator!</Text>
              <Text style={styles.subtitle}>
                You are already part of the Fisherman Publications team. You don't need to apply again.
              </Text>
              <TouchableOpacity style={styles.nextButton} onPress={() => router.back()}>
                <Text style={styles.nextButtonText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?q=80&w=2070' }}
        style={styles.bg}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={styles.contentWrapper}>
            {step === 1 ? (
              <>
                <Text style={styles.title}>Welcome to Fisherman Publications!</Text>
          <Text style={styles.subtitle}>
            Become part of our vibrant community of writers, editors & researchers.
            Share impactful stories and help foster sustainable fishing practices.
          </Text>

          <View style={styles.corSection}>
            <Text style={styles.corLabel}>Upload your Certificate of Registration (COR)</Text>
            {corImage ? (
              <TouchableOpacity onPress={pickCorImage}>
                <Image source={{ uri: corImage }} style={styles.corPreview} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.corButton} onPress={pickCorImage}>
                <Text style={styles.corButtonText}>Select Image</Text>
              </TouchableOpacity>
            )}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1a237e" />
                <Text style={styles.loadingText}>Reading Image...</Text>
              </View>
            )}
          </View>

          {formData.fullName || formData.registrationNumber ? (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Extracted Information</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.fullName}
                  onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                  placeholder="Enter full name"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>SR Code</Text>
                <TextInput
                  style={styles.input}
                  value={formData.srCode}
                  onChangeText={(text) => {
                    const email = updateEmailFromSrCode(text);
                    setFormData({ ...formData, srCode: text, email });
                  }}
                  placeholder="Enter SR Code"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, styles.emailInput]}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="Email will be auto-generated"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Enrollment Year</Text>
                <TextInput
                  style={styles.input}
                  value={formData.enrollmentYear}
                  onChangeText={(text) => setFormData({ ...formData, enrollmentYear: text })}
                  placeholder="Enter Enrollment Year"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Department</Text>
                <TextInput
                  style={styles.input}
                  value={formData.department}
                  onChangeText={(text) => setFormData({ ...formData, department: text })}
                  placeholder="Enter Department"
                />
              </View>
            </View>
          ) : null}

                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.nextButton} onPress={() => setStep(2)}>
                    <Text style={styles.nextButtonText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>Join the Team!</Text>
                <Text style={styles.subtitle}>Read the requirements below and select a role that best fits your skills.</Text>
                
                <View style={styles.requirementsContainer}>
                  <Text style={styles.requirementsTitle}>Requirements:</Text>
                  <Text style={styles.requirementsText}>• Must be a bona fide student of the university.</Text>
                  <Text style={styles.requirementsText}>• Strong passion for storytelling and journalism.</Text>
                  <Text style={styles.requirementsText}>• Good communication and teamwork skills.</Text>
                  <Text style={styles.requirementsText}>• Willing to commit time for training and events.</Text>
                </View>

                <Text style={styles.rolesTitle}>Select a Role:</Text>
                <View style={styles.rolesContainer}>
                  {['Writer', 'Editor', 'Photographer', 'Graphic Designer'].map(role => (
                    <TouchableOpacity 
                      key={role} 
                      style={[styles.roleButton, selectedRole === role && styles.roleButtonSelected]}
                      onPress={() => setSelectedRole(role)}
                    >
                      <Text style={[styles.roleButtonText, selectedRole === role && styles.roleButtonTextSelected]}>{role}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
                    onPress={async () => {
                      if (!selectedRole) {
                        Alert.alert('Error', 'Please select a role');
                        return;
                      }
                      
                      try {
                        setIsSubmitting(true);
                        
                        // Prepare the applicant data
                        const applicantData = {
                          full_name: formData.fullName,
                          sr_code: formData.srCode,
                          email: formData.email || updateEmailFromSrCode(formData.srCode),
                          enrollment_year: formData.enrollmentYear,
                          department: formData.department,
                          desired_role: selectedRole.toLowerCase(),
                        };
                        
                        console.log('Submitting application:', applicantData);
                        
                        // Send the data to the backend
                        const response = await apiClient.post('/api/applications', applicantData);
                        
                        console.log('Application submitted successfully:', response.data);
                        
                        setModalMessage('Application Submitted! Your application has been received. We will review it and get back to you soon.');
                        setModalType('success');
                        setIsModalVisible(true);
                        
                      } catch (error) {
                        console.error('Error submitting application:', error);
                        const errorMessage = error.response?.data?.message || 'Failed to submit application. Please try again.';
                        setModalMessage(errorMessage);
                        setModalType('error');
                        setIsModalVisible(true);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.submitButtonText}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

        </View>
      </View>
      </ImageBackground>
    </ScrollView>
    <Modal
      visible={isModalVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setIsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={{alignItems: 'center', marginBottom: 20}}>
            <Feather 
              name={modalType === 'success' ? 'check-circle' : 'x-circle'} 
              size={64} 
              color={modalType === 'success' ? '#10B981' : '#EF4444'} 
            />
          </View>
          <Text style={styles.modalTitle}>
            {modalType === 'success' ? 'Success!' : 'Error'}
          </Text>
          <Text style={styles.modalText}>{modalMessage}</Text>
          <TouchableOpacity
            style={[styles.modalButton, {
              backgroundColor: modalType === 'success' ? '#10B981' : '#EF4444'
            }]}
            onPress={() => {
              setIsModalVisible(false);
              if (modalType === 'success') {
                setFormData({
                  fullName: '',
                  srCode: '',
                  email: '',
                  enrollmentYear: '',
                  department: ''
                });
                setSelectedRole(null);
                setStep(1);
              } else if (!user) {
                // If user is not logged in, redirect back
                router.back();
              }
            }}
          >
            <Text style={styles.modalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  bg: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a237e',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#3b4465',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  corSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  corLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a237e',
    marginBottom: 12,
    textAlign: 'center',
  },
  corButton: {
    backgroundColor: '#bfc8d9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  corButtonText: {
    color: '#3b4465',
    fontWeight: 'bold',
  },
  corPreview: {
    width: 200,
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 12,
  },
  backButton: {
    backgroundColor: '#1a237e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  nextButton: {
    backgroundColor: '#1a237e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  requirementsContainer: {
    alignSelf: 'stretch',
    marginVertical: 15,
    backgroundColor: '#f0f4f8',
    padding: 15,
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 8,
  },
  requirementsText: {
    fontSize: 14,
    color: '#3b4465',
    marginBottom: 4,
    lineHeight: 20,
  },
  rolesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    marginTop: 10,
    marginBottom: 10,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  roleButton: {
    backgroundColor: '#bfc8d9',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    margin: 5,
  },
  roleButtonSelected: {
    backgroundColor: '#1a237e',
  },
  roleButtonText: {
    color: '#3b4465',
    fontWeight: '600',
  },
  roleButtonTextSelected: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 10,
  },
  backButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#1a237e',
  },
  ocrContainer: {
    marginTop: 20,
    width: '100%',
    padding: 15,
    backgroundColor: '#f0f4f8',
    borderRadius: 8,
  },
  ocrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 10,
  },
  ocrScrollView: {
    maxHeight: 150,
  },
  ocrText: {
    fontSize: 14,
    color: '#333',
  },
  formContainer: {
    width: '100%',
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    borderRadius: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#3b4465',
    marginBottom: 5,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bfc8d9',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  emailInput: {
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
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
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});