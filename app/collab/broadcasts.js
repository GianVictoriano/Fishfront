import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiClient from '../../utils/api';
import { useBranding } from '../../context/BrandingContext';
import { useAuth } from '../../context/AuthContext';

const BroadcastsPage = () => {
  const { colors } = useBranding();
  const { user } = useAuth();
  const router = useRouter();
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBroadcasts = async () => {
    try {
      const response = await apiClient.get('/broadcasts?per_page=50');
      setBroadcasts(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch broadcasts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBroadcasts();
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const handleCreateActivity = (broadcast) => {
    // Navigate to create-content with broadcast data pre-filled
    router.push({
      pathname: '/collab/create-content',
      params: {
        broadcastData: JSON.stringify({
          title: broadcast.title,
          description: broadcast.description,
          date: broadcast.activity_date,
          location: broadcast.activity_location,
          required_writers: broadcast.required_writers,
          required_photographers: broadcast.required_photographers,
          accepted_users: broadcast.recipients
            .filter(r => r.response_status === 'accepted')
            .map(r => r.user)
        })
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading broadcasts...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Broadcasts</Text>
        <Text style={styles.subtitle}>
          {broadcasts.length} broadcast{broadcasts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {broadcasts.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="bell-off" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No broadcasts yet</Text>
          <Text style={styles.emptySubtitle}>
            Send activity invitations to collaborators from the Create Content page
          </Text>
        </View>
      ) : (
        <View style={styles.broadcastsList}>
          {broadcasts.map((broadcast) => (
            <View key={broadcast.id} style={styles.broadcastCard}>
              <View style={styles.broadcastHeader}>
                <View style={styles.broadcastInfo}>
                  <Text style={styles.broadcastTitle}>{broadcast.title}</Text>
                  <Text style={styles.broadcastDate}>{formatDate(broadcast.activity_date)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(broadcast.status) }]}>
                  <Text style={styles.statusText}>{broadcast.status}</Text>
                </View>
              </View>

              <View style={styles.responseStats}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
                  <Text style={styles.statText}>{broadcast.accepted_count} Accepted</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="x-circle" size={16} color="#EF4444" />
                  <Text style={styles.statText}>{broadcast.declined_count} Declined</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="clock" size={16} color="#F59E0B" />
                  <Text style={styles.statText}>{broadcast.pending_count} Pending</Text>
                </View>
              </View>

              {broadcast.accepted_count > 0 && (
                <View style={styles.acceptedUsers}>
                  <Text style={styles.acceptedTitle}>Accepted Users:</Text>
                  <View style={styles.usersList}>
                    {broadcast.recipients
                      .filter(r => r.response_status === 'accepted')
                      .slice(0, 3)
                      .map((recipient) => (
                        <View key={recipient.user.id} style={styles.userChip}>
                          <Text style={styles.userChipText}>
                            {recipient.user.name}
                          </Text>
                        </View>
                      ))}
                    {broadcast.recipients.filter(r => r.response_status === 'accepted').length > 3 && (
                      <Text style={styles.moreUsersText}>
                        +{broadcast.recipients.filter(r => r.response_status === 'accepted').length - 3} more
                      </Text>
                    )}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.createActivityButton, broadcast.accepted_count === 0 && styles.disabledButton]}
                onPress={() => handleCreateActivity(broadcast)}
                disabled={broadcast.accepted_count === 0}
              >
                <MaterialCommunityIcons name="plus-circle" size={20} color="#fff" />
                <Text style={styles.createActivityText}>
                  Create Activity {broadcast.accepted_count > 0 && `(${broadcast.accepted_count} accepted)`}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  broadcastsList: {
    padding: 20,
  },
  broadcastCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  broadcastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  broadcastInfo: {
    flex: 1,
  },
  broadcastTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  broadcastDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  responseStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  acceptedUsers: {
    marginBottom: 16,
  },
  acceptedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  usersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  userChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  userChipText: {
    fontSize: 11,
    color: '#1a237e',
    fontWeight: '500',
  },
  moreUsersText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  createActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a237e',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  createActivityText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BroadcastsPage;
