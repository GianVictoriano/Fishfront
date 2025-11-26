import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AppNavbar from '../components/AppNavbar';
import apiClient from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '~/context/BrandingContext';
import { useLocalSearchParams } from 'expo-router';

export default function MyRequestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useBranding();
  const { tab } = useLocalSearchParams();
  const [requests, setRequests] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'submissions'

  const fetchRequests = async () => {
    try {
      const res = await apiClient.get('/api/contributions');
      const list = res.data.data ?? res.data;
      // Ensure list is an array and filter out null items
      const validList = Array.isArray(list) ? list.filter(item => item != null) : [];
      // Filter only current user's contributions
      const userRequests = validList.filter(item => item.user_id === user.id);
      setRequests(userRequests);
    } catch (err) {
      console.error('Failed to load requests', err);
      setError('Failed to load your requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await apiClient.get('/api/my-submissions');
      const list = res.data ?? [];
      setSubmissions(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load submissions', err);
      setError('Failed to load your submissions');
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
      fetchSubmissions();
    }
  }, [user]);

  useEffect(() => {
    if (tab === 'submissions') {
      setActiveTab('submissions');
    }
  }, [tab]);

  const getSubmissionStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return '#28a745';
      case 'rejected':
        return '#dc3545';
      case 'pending':
        return '#ffc107';
      case 'revision_requested':
        return '#ff6b35';
      default:
        return '#6c757d';
    }
  };

  const getSubmissionStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return 'check-circle';
      case 'rejected':
        return 'cancel';
      case 'pending':
        return 'hourglass-empty';
      case 'revision_requested':
        return 'edit';
      default:
        return 'help';
    }
  };

  const getGenreIcon = (genre) => {
    switch (genre) {
      case 'artwork':
        return 'palette';
      case 'literature':
        return 'menu-book';
      case 'photography':
        return 'camera-alt';
      default:
        return 'description';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return 'check-circle';
      case 'rejected':
        return 'cancel';
      case 'pending':
        return 'hourglass-empty';
      default:
        return 'help';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'coverage':
        return 'record-voice-over';
      case 'artwork':
        return 'palette';
      case 'fiction':
        return 'auto-stories';
      case 'poetry':
        return 'format-quote';
      case 'essay':
        return 'article';
      case 'story':
        return 'book';
      case 'documentation':
        return 'description';
      default:
        return 'description';
    }
  };

  const getCategoryName = (category) => {
    switch (category) {
      case 'coverage':
        return 'Coverage Request';
      case 'artwork':
        return 'Artwork';
      case 'fiction':
        return 'Fiction';
      case 'poetry':
        return 'Poetry';
      case 'essay':
        return 'Essay';
      case 'story':
        return 'Story';
      case 'documentation':
        return 'Documentation Request';
      default:
        return category;
    }
  };

  const renderRequestItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.requestInfo}>
          <View style={styles.categoryContainer}>
            <MaterialIcons 
              name={getCategoryIcon(item.category)} 
              size={20} 
              color={colors.primary || '#1a237e'} 
            />
            <Text style={styles.categoryText}>{getCategoryName(item.category)}</Text>
          </View>
          <Text style={styles.requestTitle}>{item.title}</Text>
          <Text style={styles.requestDate}>
            <MaterialIcons name="schedule" size={14} color="#666" /> {formatDate(item.created_at)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <MaterialIcons 
            name={getStatusIcon(item.status)} 
            size={16} 
            color={getStatusColor(item.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {item.category === 'coverage' && (
          <>
            {item.event_date && (
              <View style={styles.detailRow}>
                <MaterialIcons name="event" size={16} color="#666" />
                <Text style={styles.detail}>Event: {formatDate(item.event_date)}</Text>
              </View>
            )}
            {item.event_location && (
              <View style={styles.detailRow}>
                <MaterialIcons name="place" size={16} color="#666" />
                <Text style={styles.detail}>Location: {item.event_location}</Text>
              </View>
            )}
            {(item.num_writers || item.num_photographers) && (
              <View style={styles.detailRow}>
                <MaterialIcons name="people" size={16} color="#666" />
                <Text style={styles.detail}>
                  Staff: {item.num_writers || 1} writer(s), {item.num_photographers || 0} photographer(s)
                </Text>
              </View>
            )}
            {item.department && (
              <View style={styles.detailRow}>
                <MaterialIcons name="business" size={16} color="#666" />
                <Text style={styles.detail}>Department: {item.department}</Text>
              </View>
            )}
          </>
        )}

        {item.content && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionLabel}>Description:</Text>
            <Text style={styles.description} numberOfLines={3}>
              {item.content}
            </Text>
          </View>
        )}

        {item.admin_notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Admin Notes:</Text>
            <Text style={styles.notes}>{item.admin_notes}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderSubmissionItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.requestInfo}>
          <View style={styles.categoryContainer}>
            <MaterialIcons 
              name={getGenreIcon(item.genre)} 
              size={20} 
              color={colors.primary || '#1a237e'} 
            />
            <Text style={styles.categoryText}>{item.genre.toUpperCase()}</Text>
          </View>
          <Text style={styles.requestTitle}>{item.title}</Text>
          <Text style={styles.requestDate}>
            <MaterialIcons name="schedule" size={14} color="#666" /> {formatDate(item.submitted_at)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getSubmissionStatusColor(item.status) + '20' }]}>
          <MaterialIcons 
            name={getSubmissionStatusIcon(item.status)} 
            size={16} 
            color={getSubmissionStatusColor(item.status)} 
          />
          <Text style={[styles.statusText, { color: getSubmissionStatusColor(item.status) }]}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionLabel}>Caption:</Text>
          <Text style={styles.description} numberOfLines={3}>
            {item.caption}
          </Text>
        </View>

        {item.media && item.media.length > 0 && (
          <TouchableOpacity 
            style={styles.fileContainer}
            onPress={() => {
              console.log('About to set selectedFile:', item.media[0]);
              setSelectedFile(item.media[0]);
              setImageLoadError(false);
              console.log('selectedFile should now be set');
            }}
          >
            <MaterialIcons name="attach-file" size={16} color="#0369a1" />
            <Text style={styles.fileText}>
              {item.media[0].file_name} ({(item.media[0].size / 1024 / 1024).toFixed(2)} MB)
            </Text>
            <MaterialIcons name="visibility" size={16} color="#0369a1" />
          </TouchableOpacity>
        )}

        {item.admin_feedback && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Admin Feedback:</Text>
            <Text style={styles.notes}>{item.admin_feedback}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppNavbar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary || '#1a237e'} />
          <Text style={styles.loadingText}>Loading your requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <AppNavbar />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#dc3545" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRequests}>
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppNavbar />
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: colors.primary || '#1a237e' }]}>My Dashboard</Text>
        <Text style={styles.subtitle}>Track your requests and creative submissions</Text>
        
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Requests ({requests.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'submissions' && styles.activeTab]}
            onPress={() => setActiveTab('submissions')}
          >
            <Text style={[styles.tabText, activeTab === 'submissions' && styles.activeTabText]}>
              Submissions ({submissions.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={activeTab === 'requests' ? requests : submissions}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {activeTab === 'requests' ? 'No requests found' : 'No submissions found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'requests' 
                ? 'You haven\'t submitted any requests yet. Start by submitting a coverage request or creative work!'
                : 'You haven\'t submitted any creative works yet. Share your artwork, literature, or photography with our community!'
              }
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => router.push(activeTab === 'requests' ? '/contribute' : '/submit')}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>
                {activeTab === 'requests' ? 'Create Request' : 'Submit Work'}
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={activeTab === 'requests' ? renderRequestItem : renderSubmissionItem}
        showsVerticalScrollIndicator={false}
      />
      
      {/* File Viewing Modal */}
      <Modal
        visible={selectedFile !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedFile(null)}
      >
        {(() => {
          console.log('Modal rendering with selectedFile:', selectedFile);
          return null;
        })()}
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
                  console.log('Image URL:', imageUrl, 'File path:', selectedFile.file_path);
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
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
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
  requestInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 14,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
    flex: 1,
  },
  descriptionContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
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
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  notes: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a237e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  createButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#1a237e',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
    justifyContent: 'space-between',
  },
  fileText: {
    fontSize: 14,
    color: '#0369a1',
    marginLeft: 8,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fileModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    padding: 8,
  },
  fileDisplayArea: {
    maxHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fileImage: {
    maxWidth: '100%',
    maxHeight: 350,
    objectFit: 'contain',
    borderRadius: 8,
  },
  fileDownloadArea: {
    alignItems: 'center',
    padding: 40,
  },
  fileTypeText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  fileSizeText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  downloadButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 16,
  },
});
