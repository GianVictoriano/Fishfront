import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Alert } from 'react-native';
import apiClient from '~/services/apiClient'; // Assuming you have an apiClient configured

const ManageCollaboratorsScreen = () => {
  const [collaborators, setCollaborators] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedCollaborator, setSelectedCollaborator] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    fetchCollaborators();
    fetchModules();
  }, []);

  const fetchCollaborators = async () => {
    try {
      const response = await apiClient.get('/collaborators');
      console.log('Collaborators API response:', response.data);
      setCollaborators(response.data);
    } catch (error) {
      console.error('Failed to fetch collaborators:', error);
      if (error.response) {
        console.log('Collaborators API error response:', error.response.data);
      }
      Alert.alert('Error', 'Failed to fetch collaborators.');
    }
  };

  const fetchModules = async () => {
    try {
      const response = await apiClient.get('/modules');
      console.log('Modules API response:', response.data);
      setModules(response.data);
    } catch (error) {
      console.error('Failed to fetch modules:', error);
      if (error.response) {
        console.log('Modules API error response:', error.response.data);
      }
      Alert.alert('Error', 'Failed to fetch modules.');
    }
  };

  const handleAssignModule = async (moduleId) => {
    if (!selectedCollaborator) return;

    try {
      await apiClient.post(`/users/${selectedCollaborator.id}/modules`, { module_id: moduleId });
      Alert.alert('Success', 'Module assigned successfully.');
      fetchCollaborators(); // Refresh collaborator list
    } catch (error) {
      console.error('Failed to assign module:', error);
      Alert.alert('Error', 'Failed to assign module.');
    }
  };

  const handleRevokeModule = async (moduleId) => {
    if (!selectedCollaborator) return;

    try {
      await apiClient.delete(`/users/${selectedCollaborator.id}/modules/${moduleId}`);
      Alert.alert('Success', 'Module revoked successfully.');
      fetchCollaborators(); // Refresh collaborator list
    } catch (error) {
      console.error('Failed to revoke module:', error);
      Alert.alert('Error', 'Failed to revoke module.');
    }
  };

  const openModuleModal = (collaborator) => {
    setSelectedCollaborator(collaborator);
    setIsModalVisible(true);
  };

  const renderCollaboratorItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemText}>{item.name} ({item.email})</Text>
      <TouchableOpacity style={styles.button} onPress={() => openModuleModal(item)}>
        <Text style={styles.buttonText}>Manage Modules</Text>
      </TouchableOpacity>
    </View>
  );

  const renderModuleItem = ({ item }) => {
    const isAssigned = selectedCollaborator?.modules.some(m => m.id === item.id);
    return (
      <View style={styles.moduleItemContainer}>
        <Text style={styles.moduleText}>{item.name}</Text>
        <TouchableOpacity
          style={[styles.moduleButton, isAssigned ? styles.revokeButton : styles.assignButton]}
          onPress={() => isAssigned ? handleRevokeModule(item.id) : handleAssignModule(item.id)}
        >
          <Text style={styles.buttonText}>{isAssigned ? 'Revoke' : 'Assign'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Collaborators</Text>
      <Text>Collaborators loaded: {collaborators.length}</Text>
      <Text>Modules loaded: {modules.length}</Text>
      <FlatList
        data={collaborators}
        renderItem={renderCollaboratorItem}
        keyExtractor={(item) => item.id.toString()}
      />
      {selectedCollaborator && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Manage Modules for {selectedCollaborator.name}</Text>
              <FlatList
                data={modules}
                renderItem={renderModuleItem}
                keyExtractor={(item) => item.id.toString()}
              />
              <TouchableOpacity style={styles.closeButton} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  itemContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderRadius: 8, marginBottom: 10 },
  itemText: { fontSize: 16 },
  button: { backgroundColor: '#007BFF', padding: 10, borderRadius: 5 },
  buttonText: { color: '#fff', fontSize: 14 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 10, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  moduleItemContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  moduleText: { fontSize: 16 },
  moduleButton: { padding: 10, borderRadius: 5 },
  assignButton: { backgroundColor: '#28a745' },
  revokeButton: { backgroundColor: '#dc3545' },
  closeButton: { backgroundColor: '#6c757d', padding: 10, borderRadius: 5, marginTop: 20, alignItems: 'center' },
});

export default ManageCollaboratorsScreen;
