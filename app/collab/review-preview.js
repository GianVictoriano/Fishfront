import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, SafeAreaView, Modal } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import apiClient from '../../utils/api';
import { useAuth } from '~/context/AuthContext';

export default function ReviewPreviewScreen() {
  const { file, id } = useLocalSearchParams();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPreviewText = async () => {
      setLoading(true);
      try {
        let reviewId = id;
        // If id is not provided, try to extract it from the file path (if possible)
        if (!reviewId && file) {
          // fallback logic if needed, otherwise show error
          setError('No review content ID provided.');
          setLoading(false);
          return;
        }
        const response = await apiClient.get(`/review-content/preview/${reviewId}`);
        setContent(response.data.text || 'No text extracted.');
      } catch (err) {
        setError(err.message || 'Unable to load file preview.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPreviewText();
  }, [id]);

  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#1a237e" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerIconContainer}>
              <Feather name="file-text" size={24} color="#1a237e" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Document Preview</Text>
              {file && <Text style={styles.filePath}>{file}</Text>}
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a237e" />
            <Text style={styles.loadingText}>Loading preview...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <Feather name="alert-circle" size={48} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>Error Loading Preview</Text>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Feather name="eye" size={18} color="#374151" />
                <Text style={styles.previewHeaderText}>Content Preview</Text>
              </View>
              <ScrollView style={styles.previewBox} showsVerticalScrollIndicator={true}>
                <Text style={styles.content}>{content}</Text>
              </ScrollView>
            </View>
            <View style={styles.actionsContainer}>
              <ApproveRejectButtons />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function ApproveRejectButtons() {
  const router = useRouter();
  const routerInstance = useRouter();
  const { id } = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [finalizeModalVisible, setFinalizeModalVisible] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [leadReviewer, setLeadReviewer] = useState(null);
  const [selectedForwardTo, setSelectedForwardTo] = useState(null);
  const [reviewItem, setReviewItem] = useState(null);

  useEffect(() => {
    const fetchReviewItemAndMembers = async () => {
      try {
        // Fetch the review item to get group_id
        const itemResponse = await apiClient.get(`/review-content?id=${id}`);
        const item = itemResponse.data[0];
        setReviewItem(item);

        if (item && item.group_id && currentUser) {
          // Fetch members and group data in parallel for faster loading
          const [membersResponse, groupResponse] = await Promise.all([
            apiClient.get(`/group-chats/${item.group_id}/members`),
            apiClient.get(`/group-chats/${item.group_id}`)
          ]);
          
          const group = groupResponse.data;
          
          console.log('Group data:', group);
          console.log('Scrum board:', group?.scrum_board);
          console.log('Lead reviewer ID:', group?.scrum_board?.lead_reviewer_id);
          
          // Find lead reviewer from ALL members (before filtering)
          let leadReviewerData = null;
          if (group && group.scrum_board && group.scrum_board.lead_reviewer_id) {
            leadReviewerData = membersResponse.data.find(m => m.id === group.scrum_board.lead_reviewer_id);
            console.log('Lead reviewer data:', leadReviewerData);
            setLeadReviewer(leadReviewerData);
          }
          
          // Filter out current user for the forward list
          const members = membersResponse.data.filter(m => m.id !== currentUser.id);
          setGroupMembers(members);
        }
      } catch (error) {
        console.error('Failed to fetch review item and members:', error);
      }
    };

    if (id && currentUser) {
      fetchReviewItemAndMembers();
    }
  }, [id, currentUser]);

  const handleApproveClick = async () => {
    // Wait for currentUser and leadReviewer to be loaded
    if (!currentUser || !leadReviewer) {
      console.log('Waiting for user data to load...');
      return;
    }
    
    // Check if current user is the lead reviewer
    console.log('Current User:', currentUser);
    console.log('Lead Reviewer:', leadReviewer);
    const isCurrentUserLead = currentUser.id === leadReviewer.id;
    console.log('Is Current User Lead?', isCurrentUserLead);
    
    if (isCurrentUserLead) {
      // Lead reviewer - show finalize confirmation modal
      console.log('Showing finalize modal for lead reviewer');
      setFinalizeModalVisible(true);
    } else {
      // Regular reviewer - show forward modal
      console.log('Showing forward modal for regular reviewer');
      setForwardModalVisible(true);
    }
  };

  const handleFinalizeApproval = async () => {
    setLoading(true);
    setFinalizeModalVisible(false);
    
    try {
      // Lead reviewer final approval
      await apiClient.patch(`/review-content/${id}/approve`);
      await apiClient.patch(`/review-content/${id}`, {
        review_stage: 'approved'
      });
      
      setConfirmation('Content finalized and approved! Now available in Browse Works.');
      setTimeout(() => {
        setConfirmation(null);
        router.replace('/collab/review-content');
      }, 1500);
    } catch (error) {
      console.error('Failed to finalize:', error);
      setConfirmation('Failed to finalize approval. Please try again.');
      setTimeout(() => setConfirmation(null), 2500);
    } finally {
      setLoading(false);
    }
  };

  const handleForwardAndApprove = async () => {
    if (!selectedForwardTo) {
      setConfirmation('Please select who to forward to');
      setTimeout(() => setConfirmation(null), 2000);
      return;
    }

    setLoading(true);
    setForwardModalVisible(false);
    
    try {
      const isLeadReviewer = selectedForwardTo.id === leadReviewer?.id;
      const newStage = isLeadReviewer ? 'lead_review' : 'peer_review';
      
      // If forwarding to lead reviewer, just forward it
      if (isLeadReviewer) {
        // Forward to lead reviewer for final approval
        await apiClient.patch(`/review-content/${id}`, {
          current_reviewer_id: selectedForwardTo.id,
          review_stage: 'lead_review',
          status: 'pending'
        });
        setConfirmation(`Forwarded to Lead Reviewer (${selectedForwardTo.name}) for final approval!`);
      } else {
        // Forward to another peer reviewer
        await apiClient.patch(`/review-content/${id}`, {
          current_reviewer_id: selectedForwardTo.id,
          review_stage: 'peer_review',
          status: 'pending'
        });
        setConfirmation(`Forwarded to ${selectedForwardTo.name} for review!`);
      }
      
      setTimeout(() => {
        setConfirmation(null);
        router.replace('/collab/review-content');
      }, 1500);
    } catch (error) {
      console.error('Failed to forward:', error);
      setConfirmation('Failed to forward. Please try again.');
      setTimeout(() => setConfirmation(null), 2500);
    } finally {
      setLoading(false);
      setSelectedForwardTo(null);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await apiClient.patch(`/review-content/${id}/reject`);
      setConfirmation('The draft was rejected!');
      setTimeout(() => {
        setConfirmation(null);
        router.replace('/collab/review-content');
      }, 1500);
    } catch (error) {
      setConfirmation('Failed to reject.');
      setTimeout(() => setConfirmation(null), 2500);
    } finally {
      setLoading(false);
    }
  };

  // ... inside return:
  // {confirmation && <View style={{position:'absolute',top:10,left:0,right:0,alignItems:'center',zIndex:10}}><View style={{backgroundColor:'#222',padding:12,borderRadius:8}}><Text style={{color:'#fff'}}>{confirmation}</Text></View></View>}

  return (
    <>
      {confirmation && (
        <View style={styles.confirmationOverlay}>
          <View style={styles.confirmationBox}>
            <Feather 
              name={confirmation.includes('approved') || confirmation.includes('forwarded') ? 'check-circle' : confirmation.includes('rejected') ? 'x-circle' : 'alert-circle'} 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.confirmationText}>{confirmation}</Text>
          </View>
        </View>
      )}

      {/* Finalize Confirmation Modal for Lead Reviewer */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={finalizeModalVisible}
        onRequestClose={() => setFinalizeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.forwardModal}>
            <View style={styles.modalHeader}>
              <Feather name="check-circle" size={24} color="#10B981" />
              <Text style={styles.modalTitle}>Finalize Approval</Text>
              <TouchableOpacity onPress={() => setFinalizeModalVisible(false)}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={{padding: 20}}>
              <View style={styles.finalizeWarning}>
                <Feather name="shield" size={32} color="#10B981" />
                <Text style={styles.finalizeTitle}>Lead Reviewer Final Approval</Text>
              </View>
              
              <Text style={styles.finalizeMessage}>
                As the Lead Reviewer, approving this content will finalize it and make it available in Browse Works for publishing.
              </Text>
              
              <Text style={styles.finalizeQuestion}>
                Are you sure you want to approve and finalize this content?
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setFinalizeModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalForwardButton, {backgroundColor: '#10B981'}]}
                onPress={handleFinalizeApproval}
                disabled={loading}
              >
                <Feather name="check-circle" size={16} color="#fff" style={{marginRight: 6}} />
                <Text style={styles.modalForwardText}>Approve & Finalize</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Forward Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={forwardModalVisible}
        onRequestClose={() => setForwardModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.forwardModal}>
            <View style={styles.modalHeader}>
              <Feather name="send" size={24} color="#1a237e" />
              <Text style={styles.modalTitle}>Forward to Reviewer</Text>
              <TouchableOpacity onPress={() => setForwardModalVisible(false)}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Choose who should review this next
            </Text>

            <ScrollView style={styles.membersList}>
              {leadReviewer && (
                <TouchableOpacity
                  style={[
                    styles.memberItem,
                    selectedForwardTo?.id === leadReviewer.id && styles.memberItemSelected
                  ]}
                  onPress={() => setSelectedForwardTo(leadReviewer)}
                >
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {leadReviewer.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.memberName}>{leadReviewer.name}</Text>
                    <View style={styles.leadBadge}>
                      <Feather name="shield" size={12} color="#10B981" />
                      <Text style={styles.leadBadgeText}>Lead Reviewer (Final Approval)</Text>
                    </View>
                  </View>
                  {selectedForwardTo?.id === leadReviewer.id && (
                    <Feather name="check-circle" size={24} color="#10B981" />
                  )}
                </TouchableOpacity>
              )}

              {groupMembers.filter(m => m.id !== leadReviewer?.id).map(member => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberItem,
                    selectedForwardTo?.id === member.id && styles.memberItemSelected
                  ]}
                  onPress={() => setSelectedForwardTo(member)}
                >
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    {member.profile?.position && (
                      <Text style={styles.memberPosition}>{member.profile.position}</Text>
                    )}
                  </View>
                  {selectedForwardTo?.id === member.id && (
                    <Feather name="check-circle" size={24} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setForwardModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalForwardButton, !selectedForwardTo && styles.buttonDisabled]}
                onPress={handleForwardAndApprove}
                disabled={!selectedForwardTo}
              >
                <Feather name="send" size={16} color="#fff" style={{marginRight: 6}} />
                <Text style={styles.modalForwardText}>Forward</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity 
        style={[styles.actionButton, styles.approveButton, (loading || !currentUser || !leadReviewer) && styles.buttonDisabled]} 
        disabled={loading || !currentUser || !leadReviewer} 
        onPress={handleApproveClick}
      >
        {!currentUser || !leadReviewer ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.actionButtonText}>Loading...</Text>
          </>
        ) : (
          <>
            <Feather name="check" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </>
        )}
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.actionButton, styles.rejectButton, loading && styles.buttonDisabled]} 
        disabled={loading} 
        onPress={handleReject}
      >
        <Feather name="x" size={18} color="#fff" />
        <Text style={styles.actionButtonText}>Reject</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a237e',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  filePath: {
    fontSize: 13,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  error: {
    fontSize: 15,
    color: '#EF4444',
    textAlign: 'center',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  previewHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  previewBox: {
    flex: 1,
    padding: 20,
  },
  content: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 22,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmationOverlay: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  confirmationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 12,
    minWidth: 250,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmationText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  forwardModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginLeft: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    padding: 20,
    paddingTop: 12,
  },
  membersList: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  memberItemSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#1a237e',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a237e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  memberPosition: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  leadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  leadBadgeText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  modalForwardButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1a237e',
  },
  modalForwardText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  finalizeWarning: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  finalizeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 12,
    textAlign: 'center',
  },
  finalizeMessage: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  finalizeQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
});
