import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import apiClient from '../../utils/api';

const ApprovalWorkflow = ({ documentType, groupId, visible, onClose }) => {
  const [workflow, setWorkflow] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible && documentType && groupId) {
      fetchWorkflow();
    }
  }, [visible, documentType, groupId]);

  const fetchWorkflow = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get('/document-approval/workflow', {
        params: {
          document_type: documentType,
          group_id: groupId,
        },
      });

      setGroupInfo(response.data.group);
      setWorkflow(response.data.workflow);
    } catch (err) {
      console.error('Failed to fetch workflow:', err);
      setError('Failed to load approval workflow');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'submitted': return 'upload';
      case 'approved': return 'check-circle';
      case 'rejected': return 'x-circle';
      case 'revision_requested': return 'edit-3';
      case 'final_approved': return 'award';
      default: return 'clock';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'submitted': return '#6366F1';
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'revision_requested': return '#F59E0B';
      case 'final_approved': return '#059669';
      default: return '#6B7280';
    }
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'initial_review': return '#DBEAFE';
      case 'senior_review': return '#FEF3C7';
      case 'final_review': return '#D1FAE5';
      default: return '#F3F4F6';
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.modal}>
      <View style={styles.header}>
        <Text style={styles.title}>Approval Workflow</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Feather name="x" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

        {groupInfo && (
          <View style={styles.groupInfo}>
            <Text style={styles.groupTitle}>{groupInfo.name}</Text>
            <View style={styles.groupMeta}>
              <View style={styles.metaItem}>
                <Feather name="folder" size={14} color="#6B7280" />
                <Text style={styles.metaText}>Group #{groupInfo.id}</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="file-text" size={14} color="#6B7280" />
                <Text style={styles.metaText}>{groupInfo.document_type.replace('Review', '')}</Text>
              </View>
            </View>
          </View>
        )}

        <ScrollView style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>Loading workflow...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={24} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : workflow.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="clock" size={24} color="#6B7280" />
              <Text style={styles.emptyText}>No workflow history available</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {workflow.map((step, index) => (
                <View key={step.id} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: getActionColor(step.action) }]}>
                      <Feather name={getActionIcon(step.action)} size={12} color="#fff" />
                    </View>
                    {index < workflow.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  
                  <View style={styles.timelineContent}>
                    <View style={[styles.stageBadge, { backgroundColor: getStageColor(step.stage) }]}>
                      <Text style={styles.stageText}>{step.stage_label}</Text>
                    </View>

                    <View style={styles.actionHeader}>
                      <Text style={styles.actionTitle}>{step.action_label}</Text>
                      <Text style={styles.actionDate}>
                        {new Date(step.action_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    {step.version && (
                      <Text style={styles.versionText}>Version {step.version}</Text>
                    )}

                    <View style={styles.userInfo}>
                      <Feather name="user" size={14} color="#6B7280" />
                      <Text style={styles.userName}>{step.user.name}</Text>
                      <Text style={styles.userEmail}>{step.user.email}</Text>
                    </View>

                    {step.comments && (
                      <View style={styles.commentsContainer}>
                        <Text style={styles.commentsLabel}>Comments:</Text>
                        <Text style={styles.commentsText}>{step.comments}</Text>
                      </View>
                    )}

                    {step.metadata && Object.keys(step.metadata).length > 0 && (
                      <View style={styles.metadataContainer}>
                        <Text style={styles.metadataLabel}>Additional Info:</Text>
                        {Object.entries(step.metadata).map(([key, value]) => (
                          <Text key={key} style={styles.metadataText}>
                            {key.replace('_', ' ').toUpperCase()}: {String(value)}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  groupInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  groupMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  timeline: {
    paddingBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stageBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  stageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  actionDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  versionText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
    marginBottom: 8,
  },
  commentsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
  },
  commentsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  commentsText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  metadataContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  metadataText: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
});

export default ApprovalWorkflow;
