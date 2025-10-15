import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, FlatList, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
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
  
  // Feedback modal state
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackModalConfig, setFeedbackModalConfig] = useState({ message: '', type: 'success' });

  // Fetch collaborators when the panel opens
  useEffect(() => {
    const fetchCollaborators = async () => {
      if (showScrumPanel) {
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
  }, [showScrumPanel]);

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

  const handleAddCollaborator = (user) => {
    setSelectedCollaborators(prev => [...prev, user]);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleRemoveCollaborator = (userId) => {
    setSelectedCollaborators(prev => prev.filter(u => u.id !== userId));
  };

  const handleOpenScrumPanel = () => {
    setShowScrumPanel(true);
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

  const handlePress = (type) => {
    if (type === 'Scrum') {
      handleOpenScrumPanel();
    } else if (type === 'Folio') {
      // Folio logic here
    } else if (type === 'PublishOnTop') {
      Alert.alert('Coming Soon', 'Publish on Top of Scrum feature is under development.');
    }
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

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: colors.primary || '#1a237e' }]}>Create New Content</Text>
      <Text style={styles.subtitle}>Select a content type to begin.</Text>
      <View style={styles.optionsGrid}>
        <CreateOptionCard 
          icon="view-dashboard-variant-outline"
          title="Topic"
          description="Create a new topic for the fishermen publications."
          onPress={() => handlePress('Scrum')}
          iconColor={colors.primary}
        />
        <CreateOptionCard 
          icon="folder-multiple-outline"
          title="Folio"
          description="Group related documents in a folio."
          onPress={() => handlePress('Folio')}
          iconColor={colors.primary}
        />
        <CreateOptionCard 
          icon="arrow-up-bold-box-outline"
          title="Publish"
          description="Create and publish a new article."
          onPress={() => router.push('/collab/create-article')}
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
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 30,
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
});
