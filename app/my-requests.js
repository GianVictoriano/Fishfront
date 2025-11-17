import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AppNavbar from '../components/AppNavbar';
import apiClient from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '~/context/BrandingContext';

export default function MyRequestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useBranding();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    try {
      const res = await apiClient.get('/api/contributions');
      const list = res.data.data ?? res.data;
      // Filter only current user's contributions
      const userRequests = list.filter(item => item.user_id === user.id);
      setRequests(userRequests);
    } catch (err) {
      console.error('Failed to load requests', err);
      setError('Failed to load your requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

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
        <Text style={[styles.title, { color: colors.primary || '#1a237e' }]}>My Requests</Text>
        <Text style={styles.subtitle}>Track the status of your submitted requests</Text>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No requests found</Text>
            <Text style={styles.emptySubtext}>
              You haven't submitted any requests yet. Start by submitting a coverage request or creative work!
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => router.push('/contribute')}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Request</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={renderRequestItem}
        showsVerticalScrollIndicator={false}
      />
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
});
