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
  const [periodModal, setPeriodModal] = useState(false);
  const [periodData, setPeriodData] = useState({ start_date: '', end_date: '' });
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [contactModal, setContactModal] = useState({ visible: false, applicant: null });
  const [emailContent, setEmailContent] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentModal, setEmailSentModal] = useState({ visible: false, applicant: null });
  const [hoveredButton, setHoveredButton] = useState(null);

  const fetchApplicants = async () => {
    try {
      const res = await apiClient.get('/applications');
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

  const handleSendEmail = async () => {
    if (!emailContent.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setSendingEmail(true);
    try {
      await apiClient.post('/api/send-email', {
        to: contactModal.applicant.email,
        subject: `Message from Fisherman Publication`,
        message: emailContent,
        applicant_name: contactModal.applicant.full_name
      });
      Alert.alert('Success', 'Email sent successfully!');
      setContactModal({ visible: false, applicant: null });
      setEmailContent('');
      setEmailSentModal({ visible: true, applicant: contactModal.applicant });
    } catch (err) {
      console.error('Failed to send email', err);
      console.error('Full error response:', err.response);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to send email';
      Alert.alert('Error', `Failed to send email: ${errorMessage}`);
    } finally {
      setSendingEmail(false);
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

  const fetchApplicationPeriod = async () => {
    try {
      const res = await apiClient.get('/application-period');
      if (res.data) {
        setCurrentPeriod(res.data);
        setPeriodData({
          start_date: res.data.start_date || '',
          end_date: res.data.end_date || ''
        });
      }
    } catch (err) {
      console.error('Failed to load application period', err);
    }
  };

  const handleSavePeriod = async () => {
    if (!periodData.start_date || !periodData.end_date) {
      Alert.alert('Error', 'Please fill in both start and end dates');
      return;
    }

    if (new Date(periodData.start_date) > new Date(periodData.end_date)) {
      Alert.alert('Error', 'Start date must be before end date');
      return;
    }

    setSavingPeriod(true);
    try {
      const res = await apiClient.post('/application-period', periodData);
      if (res.data) {
        setCurrentPeriod(res.data);
        Alert.alert('Success', 'Application period has been set successfully');
        setPeriodModal(false);
      }
    } catch (err) {
      console.error('Failed to save application period', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to save application period');
    } finally {
      setSavingPeriod(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
    fetchApplicationPeriod();
  }, []);

  // Get unique roles for filter dropdown
  const uniqueRoles = ['all', ...new Set(applicants.map((a) => a.desired_role))];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Manage Applicants</Text>
        <TouchableOpacity
          style={styles.setPeriodButton}
          onPress={() => setPeriodModal(true)}
        >
          <MaterialIcons name="event" size={20} color="#fff" />
          <Text style={styles.setPeriodButtonText}>Set Period</Text>
        </TouchableOpacity>
      </View>
      {currentPeriod && (
        <View style={styles.periodInfoContainer}>
          <MaterialIcons name="info-outline" size={16} color="#1565c0" />
          <Text style={styles.periodInfoText}>
            Application Period: {new Date(currentPeriod.start_date).toLocaleDateString()} - {new Date(currentPeriod.end_date).toLocaleDateString()}
          </Text>
        </View>
      )}
      
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
                  onPress={() => setContactModal({ visible: true, applicant: item })}
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

      {/* Set Period Modal */}
      <Modal
        visible={periodModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPeriodModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Application Period</Text>
            <Text style={styles.modalSubtext}>
              Set the start and end dates for accepting new applications
            </Text>
            
            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <input
                type="date"
                value={periodData.start_date}
                onChange={(e) => setPeriodData({ ...periodData, start_date: e.target.value })}
                style={{
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontFamily: 'system-ui',
                  width: '100%',
                  maxWidth: '400px',
                  boxSizing: 'border-box',
                }}
              />
            </View>

            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>End Date</Text>
              <input
                type="date"
                value={periodData.end_date}
                onChange={(e) => setPeriodData({ ...periodData, end_date: e.target.value })}
                style={{
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontFamily: 'system-ui',
                  width: '100%',
                  maxWidth: '400px',
                  boxSizing: 'border-box',
                }}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setPeriodModal(false)}
                disabled={savingPeriod}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSavePeriod}
                disabled={savingPeriod}
              >
                {savingPeriod ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contact Modal */}
      <Modal
        visible={contactModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setContactModal({ visible: false, applicant: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Contact Applicant</Text>
            <Text style={styles.modalSubtitle}>
              Sending email to: {contactModal.applicant?.email}
            </Text>
            <Text style={styles.modalSubtitle}>
              Applicant: {contactModal.applicant?.full_name}
            </Text>
            
            <TextInput
              style={styles.emailInput}
              placeholder="Type your message here..."
              value={emailContent}
              onChangeText={setEmailContent}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, hoveredButton === 'cancel' ? styles.cancelButtonHover : styles.cancelButton]}
                onPress={() => {
                  setContactModal({ visible: false, applicant: null });
                  setEmailContent('');
                }}
                onMouseEnter={() => setHoveredButton('cancel')}
                onMouseLeave={() => setHoveredButton(null)}
                disabled={sendingEmail}
              >
                <MaterialIcons name="close" size={18} color={hoveredButton === 'cancel' ? "#fff" : "#666"} />
                <Text style={hoveredButton === 'cancel' ? styles.cancelButtonTextHover : styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, hoveredButton === 'send' ? styles.confirmButtonHover : styles.confirmButton]}
                onPress={handleSendEmail}
                onMouseEnter={() => setHoveredButton('send')}
                onMouseLeave={() => setHoveredButton(null)}
                disabled={sendingEmail}
              >
                {sendingEmail ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={18} color="#fff" />
                    <Text style={styles.confirmButtonText}>Send Email</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Email Sent Confirmation Modal */}
      <Modal
        visible={emailSentModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setEmailSentModal({ visible: false, applicant: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={64} color="#10b981" />
            </View>
            <Text style={styles.successTitle}>Email Sent Successfully!</Text>
            <Text style={styles.successMessage}>
              Your message has been sent to {emailSentModal.applicant?.full_name}
            </Text>
            <Text style={styles.successEmail}>
              {emailSentModal.applicant?.email}
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setEmailSentModal({ visible: false, applicant: null })}
            >
              <Text style={styles.successButtonText}>Continue</Text>
            </TouchableOpacity>
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
    maxWidth: 500,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 150,
    marginVertical: 16,
    backgroundColor: '#f9f9f9',
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
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonHover: {
    backgroundColor: '#dc3545',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  cancelButtonTextHover: {
    color: '#fff',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#28a745',
  },
  confirmButtonHover: {
    backgroundColor: '#218838',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  successModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  successEmail: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  successButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 19,
    paddingTop: 16,
    paddingBottom: 8,
  },
  setPeriodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565c0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  setPeriodButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  periodInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingVertical: 8,
    paddingHorizontal: 19,
    gap: 8,
  },
  periodInfoText: {
    color: '#1565c0',
    fontSize: 13,
    fontWeight: '500',
  },
  dateInputContainer: {
    width: '100%',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
});