import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import apiClient from '../../../../utils/api';
import { useAuth } from '../../../../context/AuthContext';

export default function ManageFolioScreen() {
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [folios, setFolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [folioToDelete, setFolioToDelete] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  const fetchFolios = async () => {
    try {
      const res = await apiClient.get('/folios');
      const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
      
      // Filter to show only folios where current user is lead organizer
      const myFolios = list.filter(folio => folio.lead_organizer_id === user?.id);
      
      setFolios(myFolios);
      setError(null);
    } catch (err) {
      console.error('Failed to load folios:', err);
      setError(err.response?.data?.message || 'Failed to load folios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFolios();
    }
  }, [user]);

  const fetchSubmissions = async (folioId) => {
    setLoadingSubmissions(true);
    try {
      const res = await apiClient.get(`/submissions?folio_id=${folioId}`);
      setSubmissions(Array.isArray(res.data) ? res.data : (res.data.data || []));
    } catch (err) {
      console.error('Failed to load submissions:', err);
      alert('Failed to load submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const updateFolioStatus = async (id, status) => {
    try {
      await apiClient.put(`/folios/${id}`, { status });
      setFolios((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status } : f))
      );
      alert(`Folio status updated to ${status}`);
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Failed to update status: ' + (err.response?.data?.message || err.message));
    }
  };

  const reviewSubmission = async (folioId, submissionId, status, feedback = '') => {
    try {
      await apiClient.post(`/folios/${folioId}/submissions/${submissionId}/review`, {
        status,
        feedback,
      });
      
      // Refresh submissions
      fetchSubmissions(folioId);
      alert('Submission reviewed successfully');
    } catch (err) {
      console.error('Failed to review submission', err);
      alert('Failed to review submission: ' + (err.response?.data?.message || err.message));
    }
  };

  const openDeleteModal = (folio) => {
    setFolioToDelete(folio);
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setFolioToDelete(null);
  };

  const confirmDelete = async () => {
    if (!folioToDelete) return;
    
    try {
      await apiClient.delete(`/folios/${folioToDelete.id}`);
      setFolios((prev) => prev.filter((f) => f.id !== folioToDelete.id));
      alert('Folio deleted successfully');
      closeDeleteModal();
    } catch (err) {
      console.error('Failed to delete folio', err);
      alert('Failed to delete folio: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleViewDetails = async (folio) => {
    setSelected(folio);
    setDetailsVisible(true);
    await fetchSubmissions(folio.id);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#28a745';
      case 'closed': return '#dc3545';
      case 'published': return '#007bff';
      case 'draft': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const renderFolioItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleViewDetails(item)}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.theme}>Theme: {item.theme}</Text>
        </View>
        <View style={[styles.statusBadge2, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText2}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.detailRow}>
        <Feather name="users" size={14} color="#666" />
        <Text style={styles.detail}>
          {item.members?.length || 0} members
        </Text>
      </View>

      {item.start_date && item.end_date && (
        <View style={styles.detailRow}>
          <Feather name="calendar" size={14} color="#666" />
          <Text style={styles.detail}>
            {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
          </Text>
        </View>
      )}

      <View style={styles.detailRow}>
        <Feather name={item.is_journalists_only ? "edit" : "globe"} size={14} color="#666" />
        <Text style={styles.detail}>
          {item.is_journalists_only ? 'Journalists Only' : 'Whole School'}
        </Text>
      </View>

      <View style={styles.actionRow}>
        {item.status === 'draft' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#28a745' }]}
            onPress={(e) => {
              e.stopPropagation();
              updateFolioStatus(item.id, 'open');
            }}
          >
            <Feather name="unlock" size={14} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff' }]}>Open</Text>
          </TouchableOpacity>
        )}
        {item.status === 'open' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#dc3545' }]}
            onPress={(e) => {
              e.stopPropagation();
              updateFolioStatus(item.id, 'closed');
            }}
          >
            <Feather name="lock" size={14} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff' }]}>Close</Text>
          </TouchableOpacity>
        )}
        {item.status === 'closed' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#007bff' }]}
            onPress={(e) => {
              e.stopPropagation();
              updateFolioStatus(item.id, 'published');
            }}
          >
            <Feather name="send" size={14} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff' }]}>Publish</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#6c757d' }]}
          onPress={(e) => {
            e.stopPropagation();
            openDeleteModal(item);
          }}
        >
          <Feather name="trash-2" size={14} color="#fff" />
          <Text style={[styles.actionText, { color: '#fff' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderSubmissionItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.submissionCard}
      onPress={() => {
        if (item.media && item.media.length > 0) {
          setSelectedFile(item.media[0]);
          setImageLoadError(false);
        }
      }}
    >
      <View style={styles.submissionHeader}>
        <Text style={styles.submissionTitle}>{item.title}</Text>
        <View style={[styles.submissionStatusBadge, { 
          borderColor: item.status === 'approved' ? '#28a745' : 
                   item.status === 'pending' ? '#dc3545' : 
                   item.status === 'revision_requested' ? '#ffc107' : '#6c757d'
        }]}>
          <Text style={[styles.statusText, {
            color: item.status === 'approved' ? '#28a745' : 
                  item.status === 'pending' ? '#dc3545' : 
                  item.status === 'revision_requested' ? '#ffc107' : '#6c757d'
          }]}>{item.status.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.submissionMeta}>By: {item.user?.name || 'Unknown'}</Text>
      <Text style={styles.submissionMeta}>Genre: {item.genre}</Text>
      <Text style={styles.submissionMeta}>
        Submitted: {new Date(item.submitted_at).toLocaleDateString()}
      </Text>

      {item.status === 'pending' && (
        <View style={styles.reviewActions}>
          <TouchableOpacity
            style={[styles.reviewButton, { backgroundColor: '#28a745' }]}
            onPress={() => reviewSubmission(selected.id, item.id, 'approved')}
          >
            <Feather name="check" size={16} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff' }]}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reviewButton, { backgroundColor: '#ffc107' }]}
            onPress={() => reviewSubmission(selected.id, item.id, 'revision_requested', 'Please revise your submission')}
          >
            <Feather name="edit" size={16} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff' }]}>Request Revision</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reviewButton, { backgroundColor: '#dc3545' }]}
            onPress={() => reviewSubmission(selected.id, item.id, 'rejected', 'Submission does not meet requirements')}
          >
            <Feather name="x" size={16} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff' }]}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.feedback && (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackLabel}>Feedback:</Text>
          <Text style={styles.feedbackText}>{item.feedback}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Manage My Folios</Text>
        <Text style={styles.subtitle}>Folios where you are the lead organizer</Text>
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
          data={folios}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderFolioItem}
          ListEmptyComponent={() => (
            <View style={styles.centeredContainer}>
              <Feather name="folder" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No folios found</Text>
              <Text style={styles.emptySubtext}>You are not a lead organizer of any folios yet</Text>
            </View>
          )}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteIconContainer}>
                <Feather name="alert-triangle" size={48} color="#dc3545" />
              </View>
              <Text style={styles.deleteModalTitle}>Delete Folio?</Text>
              <Text style={styles.deleteModalMessage}>
                Are you sure you want to delete "{folioToDelete?.title}"? This action cannot be undone and will also delete:
              </Text>
              <View style={styles.deleteWarningList}>
                <View style={styles.deleteWarningItem}>
                  <Feather name="x-circle" size={16} color="#dc3545" />
                  <Text style={styles.deleteWarningText}>All submissions to this folio</Text>
                </View>
                <View style={styles.deleteWarningItem}>
                  <Feather name="x-circle" size={16} color="#dc3545" />
                  <Text style={styles.deleteWarningText}>The associated group chat</Text>
                </View>
                <View style={styles.deleteWarningItem}>
                  <Feather name="x-circle" size={16} color="#dc3545" />
                  <Text style={styles.deleteWarningText}>All member associations</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={closeDeleteModal}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={confirmDelete}
              >
                <Feather name="trash-2" size={18} color="#fff" />
                <Text style={styles.deleteConfirmButtonText}>Delete Folio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal
        visible={detailsVisible}
        animationType="slide"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selected?.title}
            </Text>
            <TouchableOpacity onPress={() => setDetailsVisible(false)}>
              <Feather name="x" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {selected && (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Theme:</Text>
                <Text style={styles.infoValue}>{selected.theme}</Text>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selected.status) }]}>
                  <Text style={styles.statusText2}>{selected.status.toUpperCase()}</Text>
                </View>
              </View>

              {selected.start_date && selected.end_date && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Period:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(selected.start_date).toLocaleDateString()} - {new Date(selected.end_date).toLocaleDateString()}
                  </Text>
                </View>
              )}

              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Audience:</Text>
                <Text style={styles.infoValue}>
                  {selected.is_journalists_only ? 'Journalists Only' : 'Whole School'}
                </Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Submissions ({submissions.length})</Text>

              {loadingSubmissions ? (
                <ActivityIndicator size="large" color="#1a237e" style={{ marginTop: 20 }} />
              ) : submissions.length === 0 ? (
                <View style={styles.emptySubmissions}>
                  <Feather name="file-text" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No submissions yet</Text>
                </View>
              ) : (
                <FlatList
                  data={submissions}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderSubmissionItem}
                  scrollEnabled={false}
                />
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* File Viewing Modal */}
      <Modal
        visible={selectedFile !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedFile(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.fileModalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedFile(null)}
              >
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.fileDisplayArea}>
              {selectedFile?.file_type?.startsWith('image/') && !imageLoadError ? (
                (() => {
                  const imageUrl = `${process.env.EXPO_PUBLIC_API_URL}/storage/submissions/${selectedFile.file_path.replace('submissions/', '')}`;
                  return (
                    <img
                      src={imageUrl}
                      style={styles.fileImage}
                      alt={selectedFile.file_name}
                      onError={() => setImageLoadError(true)}
                    />
                  );
                })()
              ) : selectedFile ? (
                <View style={styles.fileDownloadArea}>
                  <MaterialIcons name="broken-image" size={64} color="#dc3545" />
                  <Text style={styles.fileTypeText}>
                    {imageLoadError ? 'Image failed to load' : selectedFile.file_type || 'Unknown file type'}
                  </Text>
                  <Text style={styles.fileSizeText}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                </View>
              ) : null}
            </View>
            
            <View style={styles.modalActions}>
              {selectedFile && (
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => {
                    const fileUrl = `${process.env.EXPO_PUBLIC_API_URL}/storage/submissions/${selectedFile.file_path.replace('submissions/', '')}`;
                    const link = document.createElement('a');
                    link.href = fileUrl;
                    link.download = selectedFile.file_name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <MaterialIcons name="download" size={20} color="#fff" />
                  <Text style={styles.downloadButtonText}>Download</Text>
                </TouchableOpacity>
              )}
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 4,
  },
  theme: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  statusBadge: {

    paddingVertical: 6,
    borderRadius: 12,
    width: '3.5%',
  },
    statusBadge2: {

    paddingVertical: 6,
    borderRadius: 12,
    width: '4.3%',
  },
  statusText: {
    color: '#6c757d',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusText2: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    paddingLeft: '15%',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  detail: {
    fontSize: 13,
    color: '#666',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a237e',
    flex: 1,
  },
  modalContent: {
    padding: 20,
  },
  infoSection: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 16,
  },
  submissionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginBottom: 8,
    position: 'relative',
  },
  submissionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 80,
    flex: 1,
  },
  submissionStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
    minWidth: 60,
  },
  submissionMeta: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  reviewActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  feedbackBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#007bff',
  },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 13,
    color: '#333',
  },
  emptySubmissions: {
    alignItems: 'center',
    padding: 40,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  deleteModalHeader: {
    padding: 24,
    alignItems: 'center',
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  deleteModalMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  deleteWarningList: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  deleteWarningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteWarningText: {
    fontSize: 14,
    color: '#991B1B',
    flex: 1,
  },
  deleteModalActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
    padding: 16,
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  deleteCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  deleteConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#dc3545',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  mediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    marginTop: 8,
    gap: 8,
  },
  mediaName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  // File Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
  },
  fileDisplayArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300,
  },
  fileImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: 8,
  },
  fileDownloadArea: {
    alignItems: 'center',
    gap: 12,
  },
  fileTypeText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  fileSizeText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  modalActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
