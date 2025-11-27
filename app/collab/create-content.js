import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, FlatList, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../../utils/api';
import { useBranding } from '~/context/BrandingContext';

const CreateOptionCard = ({ icon, title, description, onPress, iconColor }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={40} color={iconColor || "#1a237e"} />
    <View style={styles.cardTextContainer}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  </TouchableOpacity>
);



const CATEGORIES = ['Sports', 'Literature', 'Technology', 'Art', 'Science', 'Other'];

export default function CreateContentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [showScrumPanel, setShowScrumPanel] = useState(false);
  const { colors } = useBranding();

  // Scrum form state
  const [scrumTitle, setScrumTitle] = useState('');
  const [scrumCategory, setScrumCategory] = useState(CATEGORIES[0]);
  const [scrumDeadline, setScrumDeadline] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCollaborators, setSelectedCollaborators] = useState([]);
  const [leadReviewer, setLeadReviewer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allCollaborators, setAllCollaborators] = useState([]);
  const [searchByPosition, setSearchByPosition] = useState(false);
  
  // Activity form state
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [activityLocation, setActivityLocation] = useState('');
  const [activityRequiredWriters, setActivityRequiredWriters] = useState('1');
  const [activityRequiredPhotographers, setActivityRequiredPhotographers] = useState('0');
  const [showActivityDatePicker, setShowActivityDatePicker] = useState(false);
  const [selectedActivityDate, setSelectedActivityDate] = useState(new Date());
  const [selectedActivityMembers, setSelectedActivityMembers] = useState([]);
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [activitySearchResults, setActivitySearchResults] = useState([]);
  const [activitySearchByPosition, setActivitySearchByPosition] = useState(false);
  
  // Folio form state
  const [showFolioPanel, setShowFolioPanel] = useState(false);
  const [folioTitle, setFolioTitle] = useState('');
  const [folioTheme, setFolioTheme] = useState('');
  const [folioStartDate, setFolioStartDate] = useState('');
  const [folioEndDate, setFolioEndDate] = useState('');
  const [selectedFolioMembers, setSelectedFolioMembers] = useState([]);
  const [folioLeadOrganizer, setFolioLeadOrganizer] = useState(null);
  const [folioSearchTerm, setFolioSearchTerm] = useState('');
  const [folioSearchResults, setFolioSearchResults] = useState([]);
  const [folioSearchByPosition, setFolioSearchByPosition] = useState(false);
  const [isJournalistsOnly, setIsJournalistsOnly] = useState(true);
  
  // Availability check state
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [availabilityDay, setAvailabilityDay] = useState('');
  const [availabilityStartTime, setAvailabilityStartTime] = useState('');
  const [availabilityEndTime, setAvailabilityEndTime] = useState('');
  const [availablePeople, setAvailablePeople] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  
  // Time picker state
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [currentTimeField, setCurrentTimeField] = useState(null); // { fieldType: 'start' | 'end' }
  const [selectedHour, setSelectedHour] = useState('09');
  const [selectedMinute, setSelectedMinute] = useState('00');
  
  // Feedback modal state
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackModalConfig, setFeedbackModalConfig] = useState({ message: '', type: 'success' });
  
  // Activity confirmation modal state
  const [activityConfirmModalVisible, setActivityConfirmModalVisible] = useState(false);

  // Publish type modal state
  const [publishTypeModalVisible, setPublishTypeModalVisible] = useState(false);

  // Handle incoming parameters from coverage request approval
  useEffect(() => {
    if (params.openActivity === 'true') {
      // Pre-fill activity form with data from coverage request
      if (params.activityTitle) setActivityTitle(params.activityTitle);
      if (params.activityDate) setActivityDate(params.activityDate);
      if (params.activityLocation) setActivityLocation(params.activityLocation);
      if (params.activityRequiredWriters) setActivityRequiredWriters(params.activityRequiredWriters);
      if (params.activityRequiredPhotographers) setActivityRequiredPhotographers(params.activityRequiredPhotographers);
      
      // Open the activity panel
      setShowActivityPanel(true);
    }
  }, [params]);

  // Fetch collaborators when the panel opens
  useEffect(() => {
    const fetchCollaborators = async () => {
      if (showScrumPanel || showActivityPanel || showFolioPanel) {
        try {
          const response = await apiClient.get('/users');
          const users = response.data.users || [];
          const collaborators = users.filter(u => u.profile && u.profile.role === 'collaborator');
          setAllCollaborators(collaborators);
        } catch (error) {
          console.error('Failed to fetch collaborators:', error);
          // Optionally, show an error message to the user
        }
      }
    };
    fetchCollaborators();
  }, [showScrumPanel, showActivityPanel, showFolioPanel]);

  // Handle search filtering
  useEffect(() => {
    if (searchTerm) {
      const results = allCollaborators.filter(user => {
        const matchesSearch = searchByPosition
          ? user.profile?.position?.toLowerCase().includes(searchTerm.toLowerCase())
          : user.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch && !selectedCollaborators.some(c => c.id === user.id);
      });
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, selectedCollaborators, allCollaborators, searchByPosition]);

  // Handle activity search filtering
  useEffect(() => {
    if (activitySearchTerm) {
      const results = allCollaborators.filter(user => {
        const matchesSearch = activitySearchByPosition
          ? user.profile?.position?.toLowerCase().includes(activitySearchTerm.toLowerCase())
          : user.name.toLowerCase().includes(activitySearchTerm.toLowerCase());
        return matchesSearch && !selectedActivityMembers.some(c => c.id === user.id);
      });
      setActivitySearchResults(results);
    } else {
      setActivitySearchResults([]);
    }
  }, [activitySearchTerm, selectedActivityMembers, allCollaborators, activitySearchByPosition]);

  // Handle folio search filtering
  useEffect(() => {
    if (folioSearchTerm) {
      const results = allCollaborators.filter(user => {
        const matchesSearch = folioSearchByPosition
          ? user.profile?.position?.toLowerCase().includes(folioSearchTerm.toLowerCase())
          : user.name.toLowerCase().includes(folioSearchTerm.toLowerCase());
        return matchesSearch && !selectedFolioMembers.some(c => c.id === user.id);
      });
      setFolioSearchResults(results);
    } else {
      setFolioSearchResults([]);
    }
  }, [folioSearchTerm, selectedFolioMembers, allCollaborators, folioSearchByPosition]);

  const handleAddCollaborator = (user) => {
    setSelectedCollaborators(prev => [...prev, user]);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleRemoveCollaborator = (userId) => {
    setSelectedCollaborators(prev => prev.filter(u => u.id !== userId));
  };

  const handleAddActivityMember = (user) => {
    setSelectedActivityMembers(prev => [...prev, user]);
    setActivitySearchTerm('');
    setActivitySearchResults([]);
  };

  const handleRemoveActivityMember = (userId) => {
    setSelectedActivityMembers(prev => prev.filter(u => u.id !== userId));
  };

  const handleAddFolioMember = (user) => {
    setSelectedFolioMembers(prev => [...prev, user]);
    setFolioSearchTerm('');
    setFolioSearchResults([]);
  };

  const handleRemoveFolioMember = (userId) => {
    setSelectedFolioMembers(prev => prev.filter(u => u.id !== userId));
  };

  const handleOpenScrumPanel = () => {
    setShowScrumPanel(true);
  };

  const handleOpenActivityPanel = () => {
    setShowActivityPanel(true);
  };

  const handleOpenFolioPanel = () => {
    setShowFolioPanel(true);
  };

  const handleCloseScrumPanel = () => {
    setShowScrumPanel(false);
    // Reset form
    setScrumTitle('');
    setScrumCategory(CATEGORIES[0]);
    setScrumDeadline('');
    setSelectedCollaborators([]);
    setLeadReviewer(null);
    setSearchTerm('');
    setSearchByPosition(false);
  };

  const handleCloseActivityPanel = () => {
    setShowActivityPanel(false);
    // Reset form
    setActivityTitle('');
    setActivityDate('');
    setActivityLocation('');
    setActivityRequiredWriters('1');
    setActivityRequiredPhotographers('0');
    setSelectedActivityMembers([]);
    setActivitySearchTerm('');
    setActivitySearchByPosition(false);
    
    // If coming from coverage request approval, navigate back to manage-requests
    if (params.openActivity === 'true') {
      router.push('/collab/manage-requests');
    }
  };

  const handleCloseFolioPanel = () => {
    setShowFolioPanel(false);
    // Reset form
    setFolioTitle('');
    setFolioTheme('');
    setFolioStartDate('');
    setFolioEndDate('');
    setSelectedFolioMembers([]);
    setFolioLeadOrganizer(null);
    setFolioSearchTerm('');
    setFolioSearchByPosition(false);
    setIsJournalistsOnly(true);
  };

  const handlePress = (type) => {
    if (type === 'Scrum') {
      handleOpenScrumPanel();
    } else if (type === 'Activity') {
      handleOpenActivityPanel();
    } else if (type === 'Folio') {
      handleOpenFolioPanel();
    } else if (type === 'PublishOnTop') {
      Alert.alert('Coming Soon', 'Publish on Top of Scrum feature is under development.');
    }
  };

  const handlePublishNews = () => {
    setPublishTypeModalVisible(false);
    router.push('/collab/create-article');
  };

  const handlePublishLiteraryWork = () => {
    setPublishTypeModalVisible(false);
    router.push('/collab/create-literary-work');
  };

  const handleCreateScrumBoard = async () => {
    if (!scrumTitle) {
      setFeedbackModalConfig({
        message: 'Please enter a title for the topic board.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
      return;
    }

    if (!leadReviewer) {
      setFeedbackModalConfig({
        message: 'Please select a lead reviewer for this topic board.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
      return;
    }

    const payload = {
      title: scrumTitle,
      category: scrumCategory,
      deadline: scrumDeadline || null,
      collaborators: selectedCollaborators.map(c => c.id),
      lead_reviewer_id: leadReviewer.id,
    };

    try {
      const response = await apiClient.post('/scrum-boards', payload);
      
      setFeedbackModalConfig({
        message: response.data.message || 'Topic board created successfully!',
        type: 'success'
      });
      setFeedbackModalVisible(true);
      handleCloseScrumPanel();
      // TODO: Refresh the chat list in collaborate.js

    } catch (error) {
      console.error('Failed to create scrum board:', error.response?.data || error.message);
      setFeedbackModalConfig({
        message: error.response?.data?.message || 'An error occurred. Please try again.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
    }
  };

  const handleCreateActivity = async (skipConfirmation = false) => {
    if (!activityTitle) {
      setFeedbackModalConfig({
        message: 'Please enter a title for the activity.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
      return;
    }

    if (!activityDate) {
      setFeedbackModalConfig({
        message: 'Please select a date and time for the activity.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
      return;
    }

    // Check if selected members are fewer than required members
    const requiredWriters = parseInt(activityRequiredWriters) || 0;
    const requiredPhotographers = parseInt(activityRequiredPhotographers) || 0;
    const totalRequired = requiredWriters + requiredPhotographers;
    if (!skipConfirmation && totalRequired > 0 && selectedActivityMembers.length < totalRequired) {
      setActivityConfirmModalVisible(true);
      return;
    }

    const payload = {
      title: activityTitle,
      date: activityDate,
      location: activityLocation,
      required_writers: parseInt(activityRequiredWriters) || null,
      required_photographers: parseInt(activityRequiredPhotographers) || null,
      required_members: (parseInt(activityRequiredWriters) || 0) + (parseInt(activityRequiredPhotographers) || 0),
      members: selectedActivityMembers.map(m => m.id),
    };

    try {
      const response = await apiClient.post('/activities', payload);
      
      setFeedbackModalConfig({
        message: response.data.message || 'Activity created successfully!',
        type: 'success'
      });
      setFeedbackModalVisible(true);
      handleCloseActivityPanel();

      // If coming from coverage request approval, navigate back to manage-requests
      if (params.openActivity === 'true') {
        setTimeout(() => {
          router.push('/collab/manage-requests');
        }, 1500);
      } else {
        // Otherwise, redirect to create topic with pre-filled data
        setTimeout(() => {
          // Pre-fill the scrum board with activity data
          setScrumTitle(activityTitle);
          setSelectedCollaborators(selectedActivityMembers);
          setShowScrumPanel(true);
        }, 500);
      }

    } catch (error) {
      console.error('Failed to create activity:', error.response?.data || error.message);
      setFeedbackModalConfig({
        message: error.response?.data?.message || 'An error occurred. Please try again.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
    }
  };

  const handleCreateFolio = async () => {
    if (!folioTitle) {
      setFeedbackModalConfig({
        message: 'Please enter a title for the literary folio.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
      return;
    }

    if (!folioTheme) {
      setFeedbackModalConfig({
        message: 'Please enter a theme for the literary folio.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
      return;
    }

    if (!folioLeadOrganizer) {
      setFeedbackModalConfig({
        message: 'Please select a lead organizer for this literary folio.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
      return;
    }

    const payload = {
      title: folioTitle,
      theme: folioTheme,
      start_date: folioStartDate || null,
      end_date: folioEndDate || null,
      members: selectedFolioMembers.map(m => m.id),
      lead_organizer_id: folioLeadOrganizer.id,
      is_journalists_only: isJournalistsOnly,
    };

    try {
      const response = await apiClient.post('/folios', payload);
      
      setFeedbackModalConfig({
        message: response.data.message || 'Literary folio created successfully!',
        type: 'success'
      });
      setFeedbackModalVisible(true);
      handleCloseFolioPanel();

    } catch (error) {
      console.error('Failed to create folio:', error.response?.data || error.message);
      setFeedbackModalConfig({
        message: error.response?.data?.message || 'An error occurred. Please try again.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
    }
  };

  const checkAvailability = async () => {
    if (!availabilityDay || !availabilityStartTime || !availabilityEndTime) {
      setFeedbackModalConfig({
        message: 'Please select a day and time range.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
      return;
    }

    setLoadingAvailability(true);
    try {
      // Fetch all collaborators' working hours
      const response = await apiClient.get('/working-hours');
      const collaborators = response.data.collaborators || [];

      // Filter people who are available during the specified time
      const availablePeopleFiltered = [];
      
      collaborators.forEach(collaborator => {
        // Get all working hours entries for the specified day
        const dayHoursEntries = collaborator.working_hours.filter(h => h.day_of_week === availabilityDay);
        
        // Check if any of the entries match the availability criteria
        let isAvailable = false;
        let availabilityType = null;
        let availabilityTimes = null;
        let isInvalid = false;
        
        for (const dayHours of dayHoursEntries) {
          // Check if time ranges are valid (start before end)
          const preferredValid = dayHours.preferred_start_time && dayHours.preferred_end_time && 
            dayHours.preferred_start_time < dayHours.preferred_end_time;
          const possibleValid = dayHours.possible_start_time && dayHours.possible_end_time && 
            dayHours.possible_start_time < dayHours.possible_end_time;
              
          // TEMPORARY: For debugging, show invalid ranges too (with warning)
          const preferredMatches = (preferredValid || (!preferredValid && dayHours.preferred_start_time && dayHours.preferred_end_time)) && 
            dayHours.preferred_start_time <= availabilityEndTime && 
            dayHours.preferred_end_time >= availabilityStartTime;
              
          const possibleMatches = (possibleValid || (!possibleValid && dayHours.possible_start_time && dayHours.possible_end_time)) && 
            dayHours.possible_start_time <= availabilityEndTime && 
            dayHours.possible_end_time >= availabilityStartTime;

          if (preferredMatches || possibleMatches) {
            isAvailable = true;
            availabilityType = preferredMatches ? 'preferred' : 'possible';
            availabilityTimes = preferredMatches ? 
              `${dayHours.preferred_start_time}-${dayHours.preferred_end_time}${preferredMatches && !preferredValid ? ' (INVALID)' : ''}` : 
              `${dayHours.possible_start_time}-${dayHours.possible_end_time}`;
            isInvalid = preferredMatches && !preferredValid;
            break; // Found a match, no need to check other entries
          }
        }
        
        if (isAvailable) {
          availablePeopleFiltered.push({
            ...collaborator,
            availability_type: availabilityType,
            availability_times: availabilityTimes,
            is_invalid: isInvalid
          });
        }
      });

      // Sort: preferred first, then possible
      availablePeopleFiltered.sort((a, b) => {
        if (a.availability_type === 'preferred' && b.availability_type === 'possible') return -1;
        if (a.availability_type === 'possible' && b.availability_type === 'preferred') return 1;
        return 0;
      });

      setAvailablePeople(availablePeopleFiltered);
    } catch (error) {
      console.error('Failed to check availability:', error);
      setFeedbackModalConfig({
        message: 'Failed to check availability. Please try again.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleCloseAvailabilityModal = () => {
    setShowAvailabilityModal(false);
    setAvailabilityDay('');
    setAvailabilityStartTime('');
    setAvailabilityEndTime('');
    setAvailablePeople([]);
  };

  const openTimePicker = (fieldType) => {
    // Parse the current time for the field
    const currentTime = fieldType === 'start' ? availabilityStartTime : availabilityEndTime;
    if (currentTime && currentTime.includes(':')) {
      const [hours, minutes] = currentTime.split(':');
      setSelectedHour(hours);
      setSelectedMinute(minutes);
    } else {
      setSelectedHour('09');
      setSelectedMinute('00');
    }

    setCurrentTimeField({ fieldType });
    setShowTimePickerModal(true);
  };

  const handleTimeConfirm = () => {
    if (currentTimeField) {
      const { fieldType } = currentTimeField;
      const timeString = `${selectedHour}:${selectedMinute}`;
      
      if (fieldType === 'start') {
        setAvailabilityStartTime(timeString);
      } else {
        setAvailabilityEndTime(timeString);
      }
    }
    
    setShowTimePickerModal(false);
    setCurrentTimeField(null);
  };

  const handleTimeCancel = () => {
    setShowTimePickerModal(false);
    setCurrentTimeField(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.header, { color: colors.primary || '#1a237e' }]}>Create New Content</Text>
          <Text style={styles.subtitle}>Select a content type to begin.</Text>
        </View>
        <TouchableOpacity 
          style={styles.checkAvailabilityButton}
          onPress={() => setShowAvailabilityModal(true)}
        >
          <Feather name="calendar" size={16} color="#303F9F" />
          <Text style={styles.checkAvailabilityText}>Check Availability</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.optionsGrid}>
        <CreateOptionCard 
          icon="view-dashboard-variant-outline"
          title="Topic"
          description="Create a new topic for the fishermen publications."
          onPress={() => handlePress('Scrum')}
          iconColor={colors.primary}
        />
        <CreateOptionCard 
          icon="calendar-check"
          title="Activity"
          description="Schedule an event or activity with team members."
          onPress={() => handlePress('Activity')}
          iconColor={colors.primary}
        />
        <CreateOptionCard 
          icon="folder-multiple-outline"
          title="Event"
          description="Create an event for the publication."
          onPress={() => handlePress('Folio')}
          iconColor={colors.primary}
        />
        <CreateOptionCard 
          icon="arrow-up-bold-box-outline"
          title="Publish"
          description="Create and publish a new article."
          onPress={() => setPublishTypeModalVisible(true)}
          iconColor={colors.primary}
        />
      </View>
      {/* Scrum Panel Modal */}
      <Modal
        visible={showScrumPanel}
        transparent
        animationType="fade"
        onRequestClose={handleCloseScrumPanel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.scrumPanel}>
            <View style={styles.modalHeader}>
              <View style={styles.headerIconContainer}>
                <MaterialCommunityIcons name="view-dashboard-variant" size={28} color={colors.primary} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.scrumPanelTitle}>New Topic Board</Text>
                <Text style={styles.scrumPanelSubtitle}>Create a collaborative workspace for your team</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={handleCloseScrumPanel}>
                <Feather name="x" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {/* Left Column */}
              <View style={styles.leftColumn}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Feather name="edit-3" size={16} color="#1a237e" />
                      <Text style={[styles.label, {color: colors.primary}]}>Board Title</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Q1 Marketing Campaign"
                      value={scrumTitle}
                      onChangeText={setScrumTitle}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Feather name="tag" size={16} color="#1a237e" />
                      <Text style={styles.label}>Category</Text>
                    </View>
                    <View style={styles.dropdownContainer}>
                      {CATEGORIES.map(cat => (
                        <TouchableOpacity 
                          key={cat}
                          style={[styles.categoryChip, scrumCategory === cat && styles.categoryChipSelected]}
                          onPress={() => setScrumCategory(cat)}
                        >
                          <Text style={[styles.categoryChipText, scrumCategory === cat && styles.categoryChipTextSelected]}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Feather name="calendar" size={16} color="#1a237e" />
                      <Text style={styles.label}>Deadline</Text>
                      <Text style={styles.optionalBadge}>Optional</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.input, styles.datePickerButton]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={scrumDeadline ? styles.dateText : styles.datePlaceholder}>
                        {scrumDeadline || 'Select date and time'}
                      </Text>
                      <Feather name="calendar" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Feather name="shield" size={16} color="#1a237e" />
                      <Text style={styles.label}>Lead Reviewer</Text>
                      <Text style={styles.requiredBadge}>Required</Text>
                    </View>
                    <Text style={styles.helperText}>
                      The lead reviewer has final approval authority for all submissions
                    </Text>
                    {leadReviewer ? (
                      <View style={styles.leadReviewerCard}>
                        <View style={styles.leadReviewerAvatar}>
                          <Text style={styles.leadReviewerAvatarText}>{leadReviewer.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{flex: 1}}>
                          <Text style={styles.leadReviewerName}>{leadReviewer.name}</Text>
                          {leadReviewer.profile?.position && (
                            <Text style={styles.leadReviewerPosition}>{leadReviewer.profile.position}</Text>
                          )}
                        </View>
                        <TouchableOpacity onPress={() => setLeadReviewer(null)}>
                          <Feather name="x-circle" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.leadReviewerPlaceholder}>
                        <Feather name="user-check" size={24} color="#D1D5DB" />
                        <Text style={styles.leadReviewerPlaceholderText}>
                          Select from team members →
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>

              {/* Right Column */}
              <View style={styles.rightColumn}>
                <View style={styles.labelContainer}>
                  <Feather name="users" size={16} color="#1a237e" />
                  <Text style={styles.label}>Team Members</Text>
                  <View style={[styles.countBadge, {backgroundColor: colors.primary || '#1a237e'}]}>
                    <Text style={styles.countBadgeText}>{selectedCollaborators.length}</Text>
                  </View>
                </View>
                <View style={styles.searchInputContainer}>
                  <Feather name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={searchByPosition ? "Search by position..." : "Search by name..."}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.searchToggleContainer}>
                  <TouchableOpacity
                    style={[styles.searchToggleButton, !searchByPosition && styles.searchToggleButtonActive]}
                    onPress={() => setSearchByPosition(false)}
                  >
                    <Feather name="user" size={14} color={!searchByPosition ? "#fff" : "#6B7280"} />
                    <Text style={[styles.searchToggleText, !searchByPosition && styles.searchToggleTextActive]}>Name</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.searchToggleButton, searchByPosition && styles.searchToggleButtonActive]}
                    onPress={() => setSearchByPosition(true)}
                  >
                    <Feather name="briefcase" size={14} color={searchByPosition ? "#fff" : "#6B7280"} />
                    <Text style={[styles.searchToggleText, searchByPosition && styles.searchToggleTextActive]}>Position</Text>
                  </TouchableOpacity>
                </View>
                {searchResults.length > 0 && (
                  <FlatList
                    style={styles.searchResultsContainer}
                    data={searchResults}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.searchResultItem} onPress={() => handleAddCollaborator(item)}>
                        <View style={styles.searchResultContent}>
                          <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                          </View>
                          <View style={styles.searchResultInfo}>
                            <Text style={styles.searchResultName}>{item.name}</Text>
                            {item.profile?.position && <Text style={styles.searchResultPosition}>{item.profile.position}</Text>}
                          </View>
                        </View>
                        <Feather name="plus-circle" size={20} color="#1a237e" />
                      </TouchableOpacity>
                    )}
                  />
                )}
                <View style={styles.selectedCollaboratorsHeader}>
                  <Text style={styles.selectedLabel}>Selected</Text>
                </View>
                <ScrollView style={styles.collaboratorsContainer} showsVerticalScrollIndicator={false}>
                  {selectedCollaborators.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Feather name="user-plus" size={32} color="#D1D5DB" />
                      <Text style={styles.emptyStateText}>No members added yet</Text>
                    </View>
                  ) : (
                    selectedCollaborators.map(user => (
                      <View key={user.id} style={styles.collaboratorTag}>
                        <View style={styles.collaboratorTagAvatar}>
                          <Text style={styles.collaboratorTagAvatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{flex: 1}}>
                          <Text style={styles.collaboratorTagText}>{user.name}</Text>
                          {leadReviewer?.id === user.id && (
                            <View style={styles.leadBadge}>
                              <Feather name="shield" size={10} color="#10B981" />
                              <Text style={styles.leadBadgeText}>Lead Reviewer</Text>
                            </View>
                          )}
                        </View>
                        {leadReviewer?.id !== user.id && (
                          <TouchableOpacity 
                            style={styles.setLeadButton} 
                            onPress={() => setLeadReviewer(user)}
                          >
                            <Feather name="shield" size={14} color="#1a237e" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.removeButton} onPress={() => {
                          if (leadReviewer?.id === user.id) {
                            setLeadReviewer(null);
                          }
                          handleRemoveCollaborator(user.id);
                        }}>
                          <Feather name="x" size={16} color="#6B7280" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalFooter}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={handleCloseScrumPanel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.createButton, {backgroundColor: colors.primary || '#1a237e'}]}
                  onPress={handleCreateScrumBoard}
                >
                  <Feather name="check" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.createButtonText}>Create Board</Text>
                </Pressable>
              </View>
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
              <Text style={styles.datePickerTitle}>Select Deadline</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Feather name="x" size={24} color="#6c757d"/>
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerBody}>
              <input
                type="datetime-local"
                style={{
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  fontFamily: 'system-ui',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }}
                value={selectedDate.toISOString().slice(0, 16)}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  setSelectedDate(newDate);
                }}
              />
            </View>

            <View style={styles.datePickerFooter}>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={() => {
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerConfirmButton}
                onPress={() => {
                  const formatted = selectedDate.toISOString().slice(0, 16).replace('T', ' ');
                  setScrumDeadline(formatted);
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Activity Panel Modal */}
      <Modal
        visible={showActivityPanel}
        transparent
        animationType="fade"
        onRequestClose={handleCloseActivityPanel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.scrumPanel}>
            <View style={styles.modalHeader}>
              <View style={styles.headerIconContainer}>
                <MaterialCommunityIcons name="calendar-check" size={28} color={colors.primary} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.scrumPanelTitle}>New Activity</Text>
                <Text style={styles.scrumPanelSubtitle}>Schedule an event or activity</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={handleCloseActivityPanel}>
                <Feather name="x" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {/* Left Column */}
              <View style={styles.leftColumn}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Feather name="edit-3" size={16} color="#1a237e" />
                      <Text style={[styles.label, {color: colors.primary}]}>Event Name/Title</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Team Meeting, Workshop"
                      value={activityTitle}
                      onChangeText={setActivityTitle}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Feather name="calendar" size={16} color="#1a237e" />
                      <Text style={styles.label}>Date & Time</Text>
                      <Text style={styles.requiredBadge}>Required</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.input, styles.datePickerButton]}
                      onPress={() => setShowActivityDatePicker(true)}
                    >
                      <Text style={activityDate ? styles.dateText : styles.datePlaceholder}>
                        {activityDate || 'Select date and time'}
                      </Text>
                      <Feather name="calendar" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Feather name="map-pin" size={16} color="#1a237e" />
                      <Text style={styles.label}>Location</Text>
                      <Text style={styles.optionalBadge}>Optional</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Conference Room A, Main Campus"
                      value={activityLocation}
                      onChangeText={setActivityLocation}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Feather name="edit" size={16} color="#1a237e" />
                      <Text style={styles.label}>Required Writers</Text>
                      <Text style={styles.optionalBadge}>Optional</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Number of writers needed"
                      value={activityRequiredWriters}
                      onChangeText={setActivityRequiredWriters}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Feather name="camera" size={16} color="#1a237e" />
                      <Text style={styles.label}>Required Photographers</Text>
                      <Text style={styles.optionalBadge}>Optional</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Number of photographers needed"
                      value={activityRequiredPhotographers}
                      onChangeText={setActivityRequiredPhotographers}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                  </View>
                </ScrollView>
              </View>

              {/* Right Column */}
              <View style={styles.rightColumn}>
                <View style={styles.labelContainer}>
                  <Feather name="users" size={16} color="#1a237e" />
                  <Text style={styles.label}>Members</Text>
                  <View style={[styles.countBadge, {backgroundColor: colors.primary || '#1a237e'}]}>
                    <Text style={styles.countBadgeText}>{selectedActivityMembers.length}</Text>
                  </View>
                  <TouchableOpacity style={styles.broadcastButton}>
                    <Text style={styles.broadcastButtonText}>Broadcast</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.searchInputContainer}>
                  <Feather name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={activitySearchByPosition ? "Search by position..." : "Search by name..."}
                    value={activitySearchTerm}
                    onChangeText={setActivitySearchTerm}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.searchToggleContainer}>
                  <TouchableOpacity
                    style={[styles.searchToggleButton, !activitySearchByPosition && styles.searchToggleButtonActive]}
                    onPress={() => setActivitySearchByPosition(false)}
                  >
                    <Feather name="user" size={14} color={!activitySearchByPosition ? "#fff" : "#6B7280"} />
                    <Text style={[styles.searchToggleText, !activitySearchByPosition && styles.searchToggleTextActive]}>Name</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.searchToggleButton, activitySearchByPosition && styles.searchToggleButtonActive]}
                    onPress={() => setActivitySearchByPosition(true)}
                  >
                    <Feather name="briefcase" size={14} color={activitySearchByPosition ? "#fff" : "#6B7280"} />
                    <Text style={[styles.searchToggleText, activitySearchByPosition && styles.searchToggleTextActive]}>Position</Text>
                  </TouchableOpacity>
                </View>
                {activitySearchResults.length > 0 && (
                  <FlatList
                    style={styles.searchResultsContainer}
                    data={activitySearchResults}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.searchResultItem} onPress={() => handleAddActivityMember(item)}>
                        <View style={styles.searchResultContent}>
                          <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                          </View>
                          <View style={styles.searchResultInfo}>
                            <Text style={styles.searchResultName}>{item.name}</Text>
                            {item.profile?.position && <Text style={styles.searchResultPosition}>{item.profile.position}</Text>}
                          </View>
                        </View>
                        <Feather name="plus-circle" size={20} color="#1a237e" />
                      </TouchableOpacity>
                    )}
                  />
                )}
                <View style={styles.selectedCollaboratorsHeader}>
                  <Text style={styles.selectedLabel}>Selected</Text>
                </View>
                <ScrollView style={styles.collaboratorsContainer} showsVerticalScrollIndicator={false}>
                  {selectedActivityMembers.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Feather name="user-plus" size={32} color="#D1D5DB" />
                      <Text style={styles.emptyStateText}>No members added yet</Text>
                    </View>
                  ) : (
                    selectedActivityMembers.map(user => (
                      <View key={user.id} style={styles.collaboratorTag}>
                        <View style={styles.collaboratorTagAvatar}>
                          <Text style={styles.collaboratorTagAvatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{flex: 1}}>
                          <Text style={styles.collaboratorTagText}>{user.name}</Text>
                        </View>
                        <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveActivityMember(user.id)}>
                          <Feather name="x" size={16} color="#6B7280" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelButton}
                onPress={handleCloseActivityPanel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.createButton, {backgroundColor: colors.primary || '#1a237e'}]}
                onPress={handleCreateActivity}
              >
                <Feather name="check" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.createButtonText}>Create Activity</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Folio Panel Modal */}
      <Modal
        visible={showFolioPanel}
        transparent
        animationType="fade"
        onRequestClose={handleCloseFolioPanel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.scrumPanel}>
            <View style={styles.modalHeader}>
              <View style={styles.headerIconContainer}>
                <MaterialCommunityIcons name="folder-multiple" size={28} color={colors.primary} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.scrumPanelTitle}>New Literary Folio</Text>
                <Text style={styles.scrumPanelSubtitle}>Create a collection for literary works</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={handleCloseFolioPanel}>
                <Feather name="x" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {/* Left Column */}
              <View style={styles.leftColumn}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Feather name="edit-3" size={16} color="#1a237e" />
                      <Text style={[styles.label, {color: colors.primary}]}>Event Title</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Spring 2025 Literary Collection"
                      value={folioTitle}
                      onChangeText={setFolioTitle}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Feather name="feather" size={16} color="#1a237e" />
                      <Text style={styles.label}>Theme</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Nature, Hope, Community"
                      value={folioTheme}
                      onChangeText={setFolioTheme}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Feather name="calendar" size={16} color="#1a237e" />
                      <Text style={styles.label}>Start Date</Text>
                      <Text style={styles.optionalBadge}>Optional</Text>
                    </View>
                    <input
                      type="date"
                      value={folioStartDate}
                      onChange={(e) => setFolioStartDate(e.target.value)}
                      style={{
                        padding: 12,
                        fontSize: 16,
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        fontFamily: 'system-ui',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Feather name="calendar" size={16} color="#1a237e" />
                      <Text style={styles.label}>End Date</Text>
                      <Text style={styles.optionalBadge}>Optional</Text>
                    </View>
                    <input
                      type="date"
                      value={folioEndDate}
                      onChange={(e) => setFolioEndDate(e.target.value)}
                      style={{
                        padding: 12,
                        fontSize: 16,
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        fontFamily: 'system-ui',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Feather name="users" size={16} color="#1a237e" />
                      <Text style={styles.label}>Audience</Text>
                    </View>
                    <View style={styles.toggleContainer}>
                      <TouchableOpacity
                        style={[styles.toggleButton, isJournalistsOnly && styles.toggleButtonActive]}
                        onPress={() => setIsJournalistsOnly(true)}
                      >
                        <Feather name="edit" size={16} color={isJournalistsOnly ? "#fff" : "#6B7280"} />
                        <Text style={[styles.toggleText, isJournalistsOnly && styles.toggleTextActive]}>
                          Journalists Only
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.toggleButton, !isJournalistsOnly && styles.toggleButtonActive]}
                        onPress={() => setIsJournalistsOnly(false)}
                      >
                        <Feather name="globe" size={16} color={!isJournalistsOnly ? "#fff" : "#6B7280"} />
                        <Text style={[styles.toggleText, !isJournalistsOnly && styles.toggleTextActive]}>
                          Whole School
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Feather name="star" size={16} color="#1a237e" />
                      <Text style={styles.label}>Lead Organizer</Text>
                      <Text style={styles.requiredBadge}>Required</Text>
                    </View>
                    <Text style={styles.helperText}>
                      The lead organizer manages submissions and coordinates the folio
                    </Text>
                    {folioLeadOrganizer ? (
                      <View style={styles.leadReviewerCard}>
                        <View style={styles.leadReviewerAvatar}>
                          <Text style={styles.leadReviewerAvatarText}>{folioLeadOrganizer.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{flex: 1}}>
                          <Text style={styles.leadReviewerName}>{folioLeadOrganizer.name}</Text>
                          {folioLeadOrganizer.profile?.position && (
                            <Text style={styles.leadReviewerPosition}>{folioLeadOrganizer.profile.position}</Text>
                          )}
                        </View>
                        <TouchableOpacity onPress={() => setFolioLeadOrganizer(null)}>
                          <Feather name="x-circle" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.leadReviewerPlaceholder}>
                        <Feather name="user-check" size={24} color="#D1D5DB" />
                        <Text style={styles.leadReviewerPlaceholderText}>
                          Select from team members →
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>

              {/* Right Column */}
              <View style={styles.rightColumn}>
                <View style={styles.labelContainer}>
                  <Feather name="users" size={16} color="#1a237e" />
                  <Text style={styles.label}>Team Members</Text>
                  <View style={[styles.countBadge, {backgroundColor: colors.primary || '#1a237e'}]}>
                    <Text style={styles.countBadgeText}>{selectedFolioMembers.length}</Text>
                  </View>
                </View>
                <View style={styles.searchInputContainer}>
                  <Feather name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={folioSearchByPosition ? "Search by position..." : "Search by name..."}
                    value={folioSearchTerm}
                    onChangeText={setFolioSearchTerm}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.searchToggleContainer}>
                  <TouchableOpacity
                    style={[styles.searchToggleButton, !folioSearchByPosition && styles.searchToggleButtonActive]}
                    onPress={() => setFolioSearchByPosition(false)}
                  >
                    <Feather name="user" size={14} color={!folioSearchByPosition ? "#fff" : "#6B7280"} />
                    <Text style={[styles.searchToggleText, !folioSearchByPosition && styles.searchToggleTextActive]}>Name</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.searchToggleButton, folioSearchByPosition && styles.searchToggleButtonActive]}
                    onPress={() => setFolioSearchByPosition(true)}
                  >
                    <Feather name="briefcase" size={14} color={folioSearchByPosition ? "#fff" : "#6B7280"} />
                    <Text style={[styles.searchToggleText, folioSearchByPosition && styles.searchToggleTextActive]}>Position</Text>
                  </TouchableOpacity>
                </View>
                {folioSearchResults.length > 0 && (
                  <FlatList
                    style={styles.searchResultsContainer}
                    data={folioSearchResults}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.searchResultItem} onPress={() => handleAddFolioMember(item)}>
                        <View style={styles.searchResultContent}>
                          <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                          </View>
                          <View style={styles.searchResultInfo}>
                            <Text style={styles.searchResultName}>{item.name}</Text>
                            {item.profile?.position && <Text style={styles.searchResultPosition}>{item.profile.position}</Text>}
                          </View>
                        </View>
                        <Feather name="plus-circle" size={20} color="#1a237e" />
                      </TouchableOpacity>
                    )}
                  />
                )}
                <View style={styles.selectedCollaboratorsHeader}>
                  <Text style={styles.selectedLabel}>Selected</Text>
                </View>
                <ScrollView style={styles.collaboratorsContainer} showsVerticalScrollIndicator={false}>
                  {selectedFolioMembers.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Feather name="user-plus" size={32} color="#D1D5DB" />
                      <Text style={styles.emptyStateText}>No members added yet</Text>
                    </View>
                  ) : (
                    selectedFolioMembers.map(user => (
                      <View key={user.id} style={styles.collaboratorTag}>
                        <View style={styles.collaboratorTagAvatar}>
                          <Text style={styles.collaboratorTagAvatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{flex: 1}}>
                          <Text style={styles.collaboratorTagText}>{user.name}</Text>
                          {folioLeadOrganizer?.id === user.id && (
                            <View style={styles.leadBadge}>
                              <Feather name="star" size={10} color="#10B981" />
                              <Text style={styles.leadBadgeText}>Lead Organizer</Text>
                            </View>
                          )}
                        </View>
                        {folioLeadOrganizer?.id !== user.id && (
                          <TouchableOpacity 
                            style={styles.setLeadButton} 
                            onPress={() => setFolioLeadOrganizer(user)}
                          >
                            <Feather name="star" size={14} color="#1a237e" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.removeButton} onPress={() => {
                          if (folioLeadOrganizer?.id === user.id) {
                            setFolioLeadOrganizer(null);
                          }
                          handleRemoveFolioMember(user.id);
                        }}>
                          <Feather name="x" size={16} color="#6B7280" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelButton}
                onPress={handleCloseFolioPanel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.createButton, {backgroundColor: colors.primary || '#1a237e'}]}
                onPress={handleCreateFolio}
              >
                <Feather name="check" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.createButtonText}>Create Folio</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Activity Date Picker Modal */}
      <Modal
        visible={showActivityDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActivityDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Activity Date & Time</Text>
              <TouchableOpacity onPress={() => setShowActivityDatePicker(false)}>
                <Feather name="x" size={24} color="#6c757d"/>
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerBody}>
              <input
                type="datetime-local"
                style={{
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  fontFamily: 'system-ui',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }}
                value={selectedActivityDate.toISOString().slice(0, 16)}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  setSelectedActivityDate(newDate);
                }}
              />
            </View>

            <View style={styles.datePickerFooter}>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={() => {
                  setShowActivityDatePicker(false);
                }}
              >
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerConfirmButton}
                onPress={() => {
                  const formatted = selectedActivityDate.toISOString().slice(0, 16).replace('T', ' ');
                  setActivityDate(formatted);
                  setShowActivityDatePicker(false);
                }}
              >
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Activity Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={activityConfirmModalVisible}
        onRequestClose={() => setActivityConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackModal}>
            <View style={{alignItems: 'center', marginBottom: 20}}>
              <Feather name="alert-circle" size={64} color="#F59E0B" />
            </View>
            <Text style={styles.feedbackTitle}>Insufficient Members</Text>
            <Text style={styles.feedbackMessage}>
              You have selected {selectedActivityMembers.length} member(s), but need {activityRequiredWriters} writer(s) and {activityRequiredPhotographers} photographer(s) ({(parseInt(activityRequiredWriters) || 0) + (parseInt(activityRequiredPhotographers) || 0)} total).
              {'\n\n'}Do you want to proceed anyway?
            </Text>
            
            <View style={styles.confirmButtonContainer}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelConfirmButton]}
                onPress={() => setActivityConfirmModalVisible(false)}
              >
                <Text style={styles.cancelConfirmButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmButton, styles.proceedConfirmButton]}
                onPress={() => {
                  setActivityConfirmModalVisible(false);
                  handleCreateActivity(true);
                }}
              >
                <Text style={styles.proceedConfirmButtonText}>Proceed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <Modal 
        animationType="fade" 
        transparent={true} 
        visible={feedbackModalVisible} 
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.feedbackModal]}>
            <View style={{alignItems: 'center', marginBottom: 20}}>
              <Feather 
                name={feedbackModalConfig.type === 'success' ? 'check-circle' : 'x-circle'} 
                size={64} 
                color={feedbackModalConfig.type === 'success' ? '#10B981' : '#EF4444'} 
              />
            </View>
            <Text style={styles.feedbackTitle}>
              {feedbackModalConfig.type === 'success' ? 'Success!' : 'Error'}
            </Text>
            <Text style={styles.feedbackMessage}>
              {feedbackModalConfig.message}
            </Text>
            
            <TouchableOpacity 
              style={[styles.feedbackButton, {
                backgroundColor: feedbackModalConfig.type === 'success' ? '#10B981' : '#EF4444'
              }]}
              onPress={() => setFeedbackModalVisible(false)}
            >
              <Text style={styles.feedbackButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Publish Type Selection Modal */}
      <Modal
        visible={publishTypeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPublishTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.publishTypeModal}>
            <View style={styles.publishTypeHeader}>
              <View style={styles.publishTypeHeaderIcon}>
                <MaterialCommunityIcons name="arrow-up-bold-box-outline" size={28} color={colors.primary} />
              </View>
              <View style={styles.publishTypeHeaderText}>
                <Text style={styles.publishTypeTitle}>Select Publish Type</Text>
                <Text style={styles.publishTypeSubtitle}>Choose the type of content you want to publish</Text>
              </View>
              <TouchableOpacity 
                style={styles.publishTypeCloseButton} 
                onPress={() => setPublishTypeModalVisible(false)}
              >
                <Feather name="x" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.publishTypeBody}>
              <TouchableOpacity 
                style={styles.publishTypeOption}
                onPress={handlePublishNews}
              >
                <View style={styles.publishTypeOptionIcon}>
                  <MaterialCommunityIcons name="newspaper" size={32} color="#1a237e" />
                </View>
                <View style={styles.publishTypeOptionContent}>
                  <Text style={styles.publishTypeOptionTitle}>News</Text>
                  <Text style={styles.publishTypeOptionDescription}>Create and publish news articles, announcements, and updates</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.publishTypeOption}
                onPress={handlePublishLiteraryWork}
              >
                <View style={styles.publishTypeOptionIcon}>
                  <MaterialCommunityIcons name="book-open-variant" size={32} color="#1a237e" />
                </View>
                <View style={styles.publishTypeOptionContent}>
                  <Text style={styles.publishTypeOptionTitle}>Literary Work</Text>
                  <Text style={styles.publishTypeOptionDescription}>Publish poems, stories, essays, and other literary pieces</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.publishTypeOption}
                onPress={() => {
                  setPublishTypeModalVisible(false);
                  router.push('/collab/create-creative');
                }}
              >
                <View style={styles.publishTypeOptionIcon}>
                  <MaterialCommunityIcons name="palette" size={32} color="#1a237e" />
                </View>
                <View style={styles.publishTypeOptionContent}>
                  <Text style={styles.publishTypeOptionTitle}>Creative Work</Text>
                  <Text style={styles.publishTypeOptionDescription}>Share artwork, poems, essays, and other creative expressions</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.publishTypeFooter}>
              <TouchableOpacity
                style={styles.publishTypeCancelButton}
                onPress={() => setPublishTypeModalVisible(false)}
              >
                <Text style={styles.publishTypeCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Availability Check Modal */}
      <Modal
        visible={showAvailabilityModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseAvailabilityModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.scrumPanel}>
            <View style={styles.modalHeader}>
              <View style={styles.headerIconContainer}>
                <MaterialCommunityIcons name="calendar-check" size={28} color={colors.primary} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.scrumPanelTitle}>Check Availability</Text>
                <Text style={styles.scrumPanelSubtitle}>Find team members available for your content</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={handleCloseAvailabilityModal}>
                <Feather name="x" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <View style={styles.labelContainer}>
                    <Feather name="calendar" size={16} color="#1a237e" />
                    <Text style={[styles.label, {color: colors.primary}]}>Day</Text>
                    <Text style={styles.requiredBadge}>Required</Text>
                  </View>
                  <View style={styles.dropdownContainer}>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <TouchableOpacity 
                        key={day}
                        style={[
                          styles.categoryChip, 
                          availabilityDay === day && styles.categoryChipSelected
                        ]}
                        onPress={() => setAvailabilityDay(day)}
                      >
                        <Text style={[
                          styles.categoryChipText, 
                          availabilityDay === day && styles.categoryChipTextSelected
                        ]}>
                          {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelContainer}>
                    <Feather name="clock" size={16} color="#1a237e" />
                    <Text style={[styles.label, {color: colors.primary}]}>Time Range</Text>
                    <Text style={styles.requiredBadge}>Required</Text>
                  </View>
                  <View style={styles.timeFields}>
                    <TouchableOpacity
                      style={[styles.input, { flex: 1, height: 64, justifyContent: 'center' }]}
                      onPress={() => openTimePicker('start')}
                    >
                      <Text style={[styles.timeInputText, !availabilityStartTime && styles.timeInputPlaceholder]}>
                        {availabilityStartTime || 'Start time'}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.timeSeparator}>to</Text>
                    <TouchableOpacity
                      style={[styles.input, { flex: 1, height: 64, justifyContent: 'center' }]}
                      onPress={() => openTimePicker('end')}
                    >
                      <Text style={[styles.timeInputText, !availabilityEndTime && styles.timeInputPlaceholder]}>
                        {availabilityEndTime || 'End time'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.createButton, {backgroundColor: colors.primary || '#1a237e'}]}
                  onPress={checkAvailability}
                  disabled={loadingAvailability}
                >
                  <Feather name="search" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.createButtonText}>
                    {loadingAvailability ? 'Checking...' : 'Check Availability'}
                  </Text>
                </TouchableOpacity>

                {/* Results */}
                {availablePeople.length > 0 && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, {color: colors.primary, marginBottom: 12}]}>Available Team Members</Text>
                    {availablePeople.map((person, index) => (
                      <View key={index} style={styles.collaboratorTag}>
                        <View style={styles.collaboratorTagAvatar}>
                          <Text style={styles.collaboratorTagAvatarText}>{person.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{flex: 1}}>
                          <Text style={styles.collaboratorTagText}>{person.name}</Text>
                          <View style={[
                            styles.leadBadge, 
                            {backgroundColor: person.availability_type === 'preferred' ? '#D4EDDA' : '#FFF3CD'}
                          ]}>
                            <Text style={[
                              styles.leadBadgeText, 
                              {color: person.availability_type === 'preferred' ? '#155724' : '#856404'}
                            ]}>
                              {person.availability_type === 'preferred' ? 'Preferred' : 'Possible'} • {person.availability_times}
                              {person.is_invalid && ' ⚠️ INVALID RANGE'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {availablePeople.length === 0 && !loadingAvailability && (
                  <View style={styles.inputGroup}>
                    <View style={styles.emptyState}>
                      <Feather name="users" size={32} color="#D1D5DB" />
                      <Text style={styles.emptyStateText}>No results yet. Fill in the details above and check availability.</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCloseAvailabilityModal}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTimePickerModal}
        onRequestClose={handleTimeCancel}
      >
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerModal}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Select Time</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleTimeCancel}
              >
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerContent}>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Hour</Text>
                <Picker
                  selectedValue={selectedHour}
                  onValueChange={(itemValue) => setSelectedHour(itemValue)}
                  style={styles.picker}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <Picker.Item
                      key={i}
                      label={i.toString().padStart(2, '0')}
                      value={i.toString().padStart(2, '0')}
                    />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Minute</Text>
                <Picker
                  selectedValue={selectedMinute}
                  onValueChange={(itemValue) => setSelectedMinute(itemValue)}
                  style={styles.picker}
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <Picker.Item
                      key={i}
                      label={i.toString().padStart(2, '0')}
                      value={i.toString().padStart(2, '0')}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.timePickerFooter}>
              <TouchableOpacity style={styles.timePickerButtonCancel} onPress={handleTimeCancel}>
                <Text style={styles.timePickerButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timePickerButtonConfirm} onPress={handleTimeConfirm}>
                <Text style={styles.timePickerButtonTextConfirm}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrumPanel: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 0,
    width: '85%',
    maxWidth: 900,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  modalBody: {
    flexDirection: 'row',
    flex: 1,
    padding: 24,
  },
  leftColumn: {
    flex: 2,
    paddingRight: 20,
    borderRightWidth: 2,
    borderRightColor: '#F3F4F6',
  },
  rightColumn: {
    flex: 1,
    paddingLeft: 20,
  },
  scrumPanelTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  scrumPanelSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  optionalBadge: {
    fontSize: 12,
    color: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  requiredBadge: {
    fontSize: 12,
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 16,
  },
  leadReviewerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#1a237e',
  },
  leadReviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a237e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  leadReviewerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  leadReviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  leadReviewerPosition: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  leadReviewerPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  leadReviewerPlaceholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  leadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  leadBadgeText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  setLeadButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  dropdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryChipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#1a237e',
  },
  categoryChipText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  categoryChipTextSelected: {
    color: '#1a237e',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 10,
    paddingLeft: 40,
    paddingRight: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  searchToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  searchToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  searchToggleButtonActive: {
    backgroundColor: '#1a237e',
  },
  searchToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  searchToggleTextActive: {
    color: '#fff',
  },
  countBadge: {
    backgroundColor: '#1a237e',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  searchResultsContainer: {
    maxHeight: 180,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchResultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchResultInfo: {
    flex: 1,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a237e',
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  searchResultPosition: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  selectedCollaboratorsHeader: {
    marginBottom: 12,
  },
  selectedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  collaboratorsContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  collaboratorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  collaboratorTagAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  collaboratorTagAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a237e',
  },
  collaboratorTagText: {
    flex: 1,
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    height: 48,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1a237e',
    shadowColor: '#1a237e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  headerTextContainer: {
    flex: 1,
  },
  checkAvailabilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginLeft: 16,
  },
  checkAvailabilityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#303F9F',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  optionsGrid: {
    // Using a simple column layout for now
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343a40',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  feedbackModal: {
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
  feedbackTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  feedbackMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  feedbackButton: {
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
  feedbackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelConfirmButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelConfirmButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  proceedConfirmButton: {
    backgroundColor: '#F59E0B',
  },
  proceedConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#1a237e',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#fff',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    color: '#111827',
  },
  datePlaceholder: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  datePickerModal: {
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
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  datePickerBody: {
    padding: 20,
  },
  datePickerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  datePickerCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  datePickerCancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  datePickerConfirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1a237e',
  },
  datePickerConfirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  // Publish Type Modal Styles
  publishTypeModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  publishTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  publishTypeHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  publishTypeHeaderText: {
    flex: 1,
  },
  publishTypeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  publishTypeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  publishTypeCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  publishTypeBody: {
    padding: 20,
  },
  publishTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  publishTypeOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  publishTypeOptionContent: {
    flex: 1,
  },
  publishTypeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  publishTypeOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  publishTypeFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  publishTypeCancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  publishTypeCancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  // Time Picker Modal Styles
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxWidth: 280,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0,
    position: 'relative',
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerContent: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  pickerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 8,
  },
  picker: {
    width: '100%',
    height: 40,
  },
  timePickerFooter: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
  },
  timePickerButtonCancel: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  timePickerButtonConfirm: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#303F9F',
    alignItems: 'center',
  },
  timePickerButtonTextCancel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  timePickerButtonTextConfirm: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Additional time input styles
  timeFields: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeSeparator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginHorizontal: 8,
  },
  timeInputText: {
    fontSize: 15,
    color: '#111827',
  },
  broadcastButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1a237e',
    marginLeft: 'auto',
  },
  broadcastButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a237e',
  },
});
