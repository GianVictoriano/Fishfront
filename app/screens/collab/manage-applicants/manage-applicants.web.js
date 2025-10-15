import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View, SafeAreaView, TextInput, Modal, Alert } from 'react-native';
import apiClient from '../../../../utils/api';
import { Linking, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useBranding } from '~/context/BrandingContext';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';


export default function ManageApplicantsScreen() {
  const [applicants, setApplicants] = useState([]);
  const [filteredApplicants, setFilteredApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('most_recent');
  const [confirmModal, setConfirmModal] = useState({ visible: false, applicant: null });
  const [accepting, setAccepting] = useState(false);
  const { colors } = useBranding();
  const router = useRouter();

  const fetchApplicants = async () => {
    try {
      const res = await apiClient.get('/api/applications');
      // Laravel paginate returns { data: [...], ... } – fall back to res.data if not paginated
      const list = res.data.data ?? res.data;
      setApplicants(list);
      setFilteredApplicants(list);
    } catch (err) {
      console.error('Failed to load applicants', err);
      setError('Failed to load applicants');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (applicant) => {
    setAccepting(true);
    try {
      const res = await apiClient.post(`/api/applications/${applicant.id}/accept`);
      if (res.data.status === 'success') {
        setConfirmModal({ visible: false, applicant: null });
        // Get the user ID from the response and redirect to manage modules
        const userId = res.data.data.profile?.user_id;
        if (userId) {
          router.push(`/collab/manage-modules/${userId}`);
        } else {
          Alert.alert('Success', 'Applicant accepted successfully!');
          fetchApplicants(); // Refresh the list
        }
      }
    } catch (err) {
      console.error('Failed to accept applicant', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to accept applicant';
      Alert.alert('Error', errorMessage);
    } finally {
      setAccepting(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...applicants];

    // Filter out approved applicants
    filtered = filtered.filter((item) => item.status !== 'approved');

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.full_name.toLowerCase().includes(query) ||
          item.email.toLowerCase().includes(query) ||
          item.sr_code.toLowerCase().includes(query) ||
          item.desired_role.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((item) => item.desired_role === roleFilter);
    }

    // Apply sort order
    if (sortOrder === 'least_recent') {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    setFilteredApplicants(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [searchQuery, roleFilter, sortOrder, applicants]);

  useEffect(() => {
    fetchApplicants();
  }, []);

  // Get unique roles for filter dropdown
  const uniqueRoles = ['all', ...new Set(applicants.map((a) => a.desired_role))];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Manage Applicants</Text>
      
      {/* Filters and Search */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, SR code, or role..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.filterRow}>
          <View style={styles.pickerContainer}>
            <Text style={styles.filterLabel}>Role:</Text>
            <Picker
              selectedValue={roleFilter}
              onValueChange={setRoleFilter}
              style={styles.picker}
            >
              {uniqueRoles.map((role) => (
                <Picker.Item key={role} label={role === 'all' ? 'All Roles' : role} value={role} />
              ))}
            </Picker>
          </View>
          
          <View style={styles.pickerContainer}>
            <Text style={styles.filterLabel}>Sort:</Text>
            <Picker
              selectedValue={sortOrder}
              onValueChange={setSortOrder}
              style={styles.picker}
            >
              <Picker.Item label="Most Recent" value="most_recent" />
              <Picker.Item label="Least Recent" value="least_recent" />
            </Picker>
          </View>
        </View>
      </View>
      {loading && (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#1a237e" />
        </View>
      )}
      {error && (
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {!loading && !error && (
        <FlatList
          data={filteredApplicants}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
 <View style={styles.nameRow}>
  <Text style={[styles.name, {color: colors.text_secondary || '#1a237e'}]}>{item.full_name}</Text>
  <TouchableOpacity 
    style={styles.contactButton}
    onPress={() => Linking.openURL(`mailto:${item.email}`)}
  >
    <MaterialIcons name="email" size={16} color="#1565c0" />
    <Text style={styles.contactText}>Contact</Text>
  </TouchableOpacity>
</View>
              <Text style={styles.detail}>SR Code: {item.sr_code}</Text>
              <Text style={styles.detail}>Email: {item.email}</Text>
              <Text style={styles.detail}>Enrollment Year: {item.enrollment_year}</Text>
              <Text style={styles.detail}>Department: {item.department}</Text>
              <Text style={styles.detail}>Desired Role: {item.desired_role}</Text>
              <Text style={styles.detail}>Submitted: {formatDate(item.created_at)}</Text>
              <View style={styles.bottomRow}>
                <Text style={styles.status(item.status)}>{item.status.toUpperCase()}</Text>
                {item.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => setConfirmModal({ visible: true, applicant: item })}
                  >
                    <MaterialIcons name="check-circle" size={18} color="#fff" />
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
      
      {/* Confirmation Modal */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal({ visible: false, applicant: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Acceptance</Text>
            <Text style={styles.modalText}>
              Are you sure you want to accept {confirmModal.applicant?.full_name}?
            </Text>
            <Text style={styles.modalSubtext}>
              This will create a user account with collaborator level 1 and assign the role: {confirmModal.applicant?.desired_role}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setConfirmModal({ visible: false, applicant: null })}
                disabled={accepting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => handleAccept(confirmModal.applicant)}
                disabled={accepting}
              >
                {accepting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Accept</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContent: {
    padding: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1a237e',
  },
  detail: {
    fontSize: 14,
    color: '#333',
  },
  status: (s) => ({
    marginTop: 6,
    fontWeight: 'bold',
    color: s === 'approved' ? '#28a745' : s === 'rejected' ? '#dc3545' : '#ffc107',
  }),
  title: {
    marginTop: 16,
    marginLeft: 19,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
  },
  contactButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  // Update name style to remove bottom margin:
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    marginRight: 8,
  },
  contactText: {
    color: '#1565c0',
    marginLeft: 4,
    fontWeight: '500',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#333',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  pickerContainer: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  picker: {
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#28a745',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});