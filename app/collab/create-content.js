import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, FlatList, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import apiClient from '../../utils/api';

const CreateOptionCard = ({ icon, title, description, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={40} color="#1a237e" />
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

  // Scrum form state
  const [scrumTitle, setScrumTitle] = useState('');
  const [scrumCategory, setScrumCategory] = useState(CATEGORIES[0]);
  const [scrumDeadline, setScrumDeadline] = useState('');
  const [selectedCollaborators, setSelectedCollaborators] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allCollaborators, setAllCollaborators] = useState([]);

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
      const results = allCollaborators.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !selectedCollaborators.some(c => c.id === user.id)
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, selectedCollaborators, allCollaborators]);

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
    setSearchTerm('');
  };

  const handlePress = (type) => {
    if (type === 'Scrum') {
      handleOpenScrumPanel();
    } else if (type === 'Folio') {
      // Folio logic here
    }
  };

  const handleCreateScrumBoard = async () => {
    if (!scrumTitle) {
      Alert.alert('Title is required', 'Please enter a title for the scrum board.');
      return;
    }

    const payload = {
      title: scrumTitle,
      category: scrumCategory,
      deadline: scrumDeadline || null,
      collaborators: selectedCollaborators.map(c => c.id),
    };

    try {
      const response = await apiClient.post('/scrum-boards', payload);
      
      Alert.alert(
        'Success',
        response.data.message || 'Scrum board created successfully!',
        [{ text: 'OK', onPress: handleCloseScrumPanel }]
      );
      // TODO: Refresh the chat list in collaborate.js

    } catch (error) {
      console.error('Failed to create scrum board:', error.response?.data || error.message);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'An error occurred. Please try again.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create New Content</Text>
      <Text style={styles.subtitle}>Select a content type to begin.</Text>
      <View style={styles.optionsGrid}>
        <CreateOptionCard 
          icon="view-dashboard-variant-outline"
          title="Scrum"
          description="Organize tasks in a new scrum board."
          onPress={() => handlePress('Scrum')}
        />
        <CreateOptionCard 
          icon="folder-multiple-outline"
          title="Folio"
          description="Group related documents in a folio."
          onPress={() => handlePress('Folio')}
        />
        <CreateOptionCard 
          icon="forum-outline"
          title="Topic"
          description="Start a new discussion in the forum."
          onPress={() => router.push('/forum')}
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
            <Text style={styles.scrumPanelTitle}>New Scrum Board</Text>
            <View style={styles.modalBody}>
              {/* Left Column */}
              <View style={styles.leftColumn}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter the board title"
                    value={scrumTitle}
                    onChangeText={setScrumTitle}
                    placeholderTextColor="#aaa"
                  />

                  <Text style={styles.label}>Category</Text>
                  <View style={styles.dropdownContainer}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity 
                        key={cat}
                        style={[styles.categoryChip, scrumCategory === cat && styles.categoryChipSelected]}
                        onPress={() => setScrumCategory(cat)}
                      >
                        <Text style={[styles.categoryChipText, scrumCategory === cat && {color: '#fff'}]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Deadline (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD HH:MM"
                    value={scrumDeadline}
                    onChangeText={setScrumDeadline}
                    placeholderTextColor="#aaa"
                  />
                </ScrollView>
              </View>

              {/* Right Column */}
              <View style={styles.rightColumn}>
                <Text style={styles.label}>Collaborators</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Search for users to add..."
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholderTextColor="#aaa"
                />
                {searchResults.length > 0 && (
                  <FlatList
                    style={styles.searchResultsContainer}
                    data={searchResults}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.searchResultItem} onPress={() => handleAddCollaborator(item)}>
                        <Text style={styles.searchResultName}>{item.name}</Text>
                        {item.profile?.position && <Text style={styles.searchResultPosition}>{item.profile.position}</Text>}
                      </TouchableOpacity>
                    )}
                  />
                )}
                <ScrollView style={styles.collaboratorsContainer} showsVerticalScrollIndicator={false}>
                  {selectedCollaborators.map(user => (
                    <View key={user.id} style={styles.collaboratorTag}>
                      <Text style={styles.collaboratorTagText}>{user.name}</Text>
                      <TouchableOpacity onPress={() => handleRemoveCollaborator(user.id)}>
                        <Feather name="x" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#eee' }}>
                <Pressable
                  style={[styles.scrumPanelButton, { backgroundColor: '#e0e0e0', marginRight: 8 }]}
                  onPress={handleCloseScrumPanel}
                >
                  <Text style={{ color: '#333', fontWeight: '600' }}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.scrumPanelButton, { backgroundColor: '#1a237e' }]}
                  onPress={handleCreateScrumBoard}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Create</Text>
                </Pressable>
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
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrumPanel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    width: '80%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalBody: {
    flexDirection: 'row',
    flex: 1,
  },
  leftColumn: {
    flex: 2,
    paddingRight: 15,
    borderRightWidth: 1,
    borderRightColor: '#eee',
  },
  rightColumn: {
    flex: 1,
    paddingLeft: 15,
  },
  scrumPanelTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 18,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 8,
    marginTop: 12,
  },
  dropdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  categoryChip: {
    backgroundColor: '#e9e9f0',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#1a237e',
  },
  categoryChipText: {
    color: '#1a237e',
    fontWeight: '500',
  },
  searchResultsContainer: {
    maxHeight: 150,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResultName: {
    fontSize: 16,
    color: '#333',
  },
  searchResultPosition: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  collaboratorsContainer: {
    flex: 1,
    marginTop: 10,
  },
  collaboratorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a237e',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  collaboratorTagText: {
    color: '#fff',
    marginRight: 6,
  },
  input: {
    height: 44,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f9fa',
  },
  scrumPanelButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
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
});
