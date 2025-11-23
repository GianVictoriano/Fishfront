import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AppNavbar from '../../../components/AppNavbar';
import apiClient from '../../../utils/api';

export default function MySubmissionsScreen() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await apiClient.get('/my-submissions');
      setSubmissions(response.data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      Alert.alert('Error', 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#059669';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      case 'revision_requested': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'pending': return 'Pending';
      case 'revision_requested': return 'Revision Requested';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppNavbar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a237e" />
          <Text style={styles.loadingText}>Loading your submissions...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppNavbar />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#1a237e" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Submissions</Text>
          <Text style={styles.subtitle}>
            View and track your submitted creative works
          </Text>
        </View>

        <View style={styles.content}>
          {submissions.length > 0 ? (
            submissions.map((submission) => (
              <View key={submission.id} style={styles.submissionCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.submissionTitle}>{submission.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(submission.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(submission.status)}</Text>
                  </View>
                </View>

                <Text style={styles.genreBadge}>{submission.genre}</Text>

                <Text style={styles.caption} numberOfLines={2}>
                  {submission.caption}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>
                    Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                  </Text>
                  {submission.reviewed_at && (
                    <Text style={styles.dateText}>
                      Reviewed: {new Date(submission.reviewed_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                {submission.admin_feedback && (
                  <View style={styles.feedbackContainer}>
                    <Text style={styles.feedbackLabel}>Feedback:</Text>
                    <Text style={styles.feedbackText}>{submission.admin_feedback}</Text>
                  </View>
                )}

                {submission.media && submission.media.length > 0 && (
                  <View style={styles.mediaContainer}>
                    <MaterialIcons name="attach-file" size={16} color="#6b7280" />
                    <Text style={styles.mediaText}>
                      {submission.media.length} file{submission.media.length > 1 ? 's' : ''} attached
                    </Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={48} color="#ccc" />
              <Text style={styles.emptyTitle}>No submissions yet</Text>
              <Text style={styles.emptyText}>
                You haven't submitted any creative works yet. Start by submitting your artwork, literature, or photography.
              </Text>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => router.push('/screens/user/submit/submit')}
              >
                <Text style={styles.submitButtonText}>Submit Your Work</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    marginBottom: 30,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1a237e',
    marginLeft: 8,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  content: {
    gap: 16,
  },
  submissionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  submissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a237e',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  genreBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
  },
  caption: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
  },
  feedbackContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  mediaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  mediaText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
