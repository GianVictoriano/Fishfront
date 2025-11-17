import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View, SafeAreaView, TextInput, Modal, Alert, ScrollView } from 'react-native';
import apiClient from '../../../../utils/api';
import { TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useBranding } from '~/context/BrandingContext';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';

export default function ManageRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('most_recent');
  const [detailsModal, setDetailsModal] = useState({ visible: false, request: null });
  const [actionModal, setActionModal] = useState({ visible: false, request: null, action: null });
  const [processing, setProcessing] = useState(false);
  const { colors } = useBranding();

  const fetchRequests = async () => {
    try {
      const res = await apiClient.get('/api/contributions');
      const list = res.data.data ?? res.data;
      // Filter only coverage type contributions
      const coverageRequests = list.filter(item => item.category === 'coverage');
      setRequests(coverageRequests);
      setFilteredRequests(coverageRequests);
    } catch (err) {
      console.error('Failed to load coverage requests', err);
      setError('Failed to load coverage requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (request, action) => {
    setProcessing(true);
    try {
      const status = action === 'approve' ? 'approved' : 'rejected';
      const res = await apiClient.post(`/api/contributions/${request.id}/status`, { status });
      
      if (res.data.status === 'success') {
        Alert.alert('Success', `Request ${action}d successfully!`);
        setActionModal({ visible: false, request: null, action: null });
        
        // If approved, redirect to create-content with pre-filled data
        if (action === 'approve') {
          // Format the date to match the expected format
          const eventDate = new Date(request.event_date);
          const formattedDate = eventDate.toISOString().slice(0, 16).replace('T', ' ');
          
          // Navigate to create-content with query params
          router.push({
            pathname: '/collab/create-content',
            params: {
              openActivity: 'true',
              activityTitle: request.title,
              activityDate: formattedDate,
              activityLocation: request.event_location || '',
              activityRequiredWriters: (request.num_writers || 1).toString(),
              activityRequiredPhotographers: (request.num_photographers || 0).toString(),
            }
          });
        } else {
          fetchRequests(); // Refresh the list only if rejected
        }
      }
    } catch (err) {
      console.error(`Failed to ${action} request`, err);
      const errorMessage = err.response?.data?.message || err.message || `Failed to ${action} request`;
      Alert.alert('Error', errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...requests];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(query) ||
          item.event_location?.toLowerCase().includes(query) ||
          item.user?.name?.toLowerCase().includes(query) ||
          item.user?.email?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    // Apply sort order
    if (sortOrder === 'least_recent') {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    setFilteredRequests(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [searchQuery, statusFilter, sortOrder, requests]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return '#28a745';
      case 'rejected':
        return '#dc3545';
      case 'pending':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Manage Coverage Requests</Text>
      </View>
      
      {/* Filters and Search */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by event name, location, or requester..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.filterRow}>
          <View style={styles.pickerContainer}>
            <Text style={styles.filterLabel}>Status:</Text>
            <Picker
              selectedValue={statusFilter}
              onValueChange={setStatusFilter}
              style={styles.picker}
            >
              <Picker.Item label="All Statuses" value="all" />
              <Picker.Item label="Pending" value="pending" />
              <Picker.Item label="Approved" value="approved" />
              <Picker.Item label="Rejected" value="rejected" />
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
          data={filteredRequests}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No coverage requests found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventName, {color: colors.text_secondary || '#1a237e'}]}>
                    {item.title}
                  </Text>
                  <Text style={styles.eventDate}>
                    <MaterialIcons name="event" size={14} color="#666" /> {formatDateTime(item.event_date)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="place" size={16} color="#666" />
                  <Text style={styles.detail}>{item.event_location}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialIcons name="person" size={16} color="#666" />
                  <Text style={styles.detail}>{item.user?.name || 'N/A'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialIcons name="email" size={16} color="#666" />
                  <Text style={styles.detail}>{item.user?.email || 'N/A'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialIcons name="people" size={16} color="#666" />
                  <Text style={styles.detail}>Writers: {item.num_writers || 1}, Photographers: {item.num_photographers || 0}</Text>
                </View>

                <View style={styles.detailRow}>
                  <MaterialIcons name="business" size={16} color="#666" />
                  <Text style={styles.detail}>Department: {item.department || 'N/A'}</Text>
                </View>

                {item.content && (
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionLabel}>Description:</Text>
                    <Text style={styles.description} numberOfLines={2}>
                      {item.content}
                    </Text>
                  </View>
                )}

                <Text style={styles.submittedDate}>
                  Submitted: {formatDate(item.created_at)}
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={() => setDetailsModal({ visible: true, request: item })}
                >
                  <MaterialIcons name="visibility" size={16} color="#1565c0" />
                  <Text style={styles.viewDetailsText}>View Details</Text>
                </TouchableOpacity>

                {item.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => setActionModal({ visible: true, request: item, action: 'reject' })}
                    >
                      <MaterialIcons name="close" size={18} color="#fff" />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => setActionModal({ visible: true, request: item, action: 'approve' })}
                    >
                      <MaterialIcons name="check" size={18} color="#fff" />
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Details Modal */}
      <Modal
        visible={detailsModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsModal({ visible: false, request: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Details</Text>
              <TouchableOpacity onPress={() => setDetailsModal({ visible: false, request: null })}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {detailsModal.request && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Event Name</Text>
                  <Text style={styles.modalValue}>{detailsModal.request.title}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Event Date & Time</Text>
                  <Text style={styles.modalValue}>{formatDateTime(detailsModal.request.event_date)}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Location</Text>
                  <Text style={styles.modalValue}>{detailsModal.request.event_location}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Requester Name</Text>
                  <Text style={styles.modalValue}>{detailsModal.request.user?.name || 'N/A'}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Requester Email</Text>
                  <Text style={styles.modalValue}>{detailsModal.request.user?.email || 'N/A'}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Number of Writers</Text>
                  <Text style={styles.modalValue}>{detailsModal.request.num_writers || 1}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Number of Photographers</Text>
                  <Text style={styles.modalValue}>{detailsModal.request.num_photographers || 0}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Department</Text>
                  <Text style={styles.modalValue}>{detailsModal.request.department || 'N/A'}</Text>
                </View>

                {detailsModal.request.content && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Description</Text>
                    <Text style={styles.modalValue}>{detailsModal.request.content}</Text>
                  </View>
                )}

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(detailsModal.request.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(detailsModal.request.status) }]}>
                      {detailsModal.request.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Submitted On</Text>
                  <Text style={styles.modalValue}>{formatDateTime(detailsModal.request.created_at)}</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Action Confirmation Modal */}
      <Modal
        visible={actionModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModal({ visible: false, request: null, action: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Confirm {actionModal.action === 'approve' ? 'Approval' : 'Rejection'}
            </Text>
            <Text style={styles.modalText}>
              Are you sure you want to {actionModal.action} the coverage request for "{actionModal.request?.title}"?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setActionModal({ visible: false, request: null, action: null })}
                disabled={processing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  actionModal.action === 'approve' ? styles.confirmButton : styles.rejectConfirmButton
                ]}
                onPress={() => handleAction(actionModal.request, actionModal.action)}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {actionModal.action === 'approve' ? 'Approve' : 'Reject'}
                  </Text>
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
  headerContainer: {
    paddingHorizontal: 19,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
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
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detail: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  descriptionContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  submittedDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
  },
  viewDetailsText: {
    color: '#1565c0',
    marginLeft: 4,
    fontWeight: '500',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  rejectButtonText: {
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
    maxWidth: 600,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    maxHeight: 400,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  modalValue: {
    fontSize: 16,
    color: '#333',
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
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
  rejectConfirmButton: {
    backgroundColor: '#dc3545',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
