import React, { useState, useEffect } from 'react';
import { View, Text, Image, ActivityIndicator, TouchableOpacity, StyleSheet, SafeAreaView, Modal, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import apiClient from '../../utils/api';
import { useAuth } from '~/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ReviewImagePreviewScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [imageData, setImageData] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [finalizeModalVisible, setFinalizeModalVisible] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [leadReviewer, setLeadReviewer] = useState(null);
  const [selectedForwardTo, setSelectedForwardTo] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchImage = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get(`/review-images/${id}`);
        setImageData(response.data);
        
        // Fetch group info and members
        if (response.data.group) {
          setGroupInfo(response.data.group);
        } else if (response.data.group_id) {
          try {
            const groupResponse = await apiClient.get(`/group-chats/${response.data.group_id}`);
            setGroupInfo(groupResponse.data);
          } catch (err) {
            console.log('Could not fetch group info:', err);
          }
        }
        
        // Fetch group members and lead reviewer
        if (response.data.group_id) {
          try {
            const membersResponse = await apiClient.get(`/group-chats/${response.data.group_id}/members`);
            const groupsResponse = await apiClient.get(`/group-chats`);
            const group = groupsResponse.data.find(g => g.id === response.data.group_id);
            
            if (group && group.scrum_board && group.scrum_board.lead_reviewer_id) {
              const leadReviewerData = membersResponse.data.find(m => m.id === group.scrum_board.lead_reviewer_id);
              setLeadReviewer(leadReviewerData);
            }
            
            const members = membersResponse.data.filter(m => m.id !== user?.id);
            setGroupMembers(members);
          } catch (err) {
            console.log('Could not fetch members:', err);
          }
        }
      } catch (e) {
        setError('Failed to load image.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchImage();
  }, [id, user]);

  const handleApproveClick = () => {
    const isLeadReviewer = user && leadReviewer && user.id === leadReviewer.id;
    
    if (isLeadReviewer) {
      setFinalizeModalVisible(true);
    } else {
      setForwardModalVisible(true);
    }
  };

  const handleForward = async () => {
    if (!selectedForwardTo) {
      Alert.alert('Error', 'Please select a reviewer to forward to.');
      return;
    }
    
    setLoading(true);
    try {
      await apiClient.patch(`/review-images/${id}/approve`);
      await apiClient.patch(`/review-images/${id}`, {
        current_reviewer_id: selectedForwardTo,
        review_stage: 'peer_review'
      });
      
      setConfirmation('Image forwarded successfully!');
      setTimeout(() => {
        setConfirmation(null);
        router.replace('/collab/review-content');
      }, 1500);
    } catch (e) {
      Alert.alert('Error', 'Failed to forward image.');
    } finally {
      setLoading(false);
      setForwardModalVisible(false);
    }
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      await apiClient.patch(`/review-images/${id}/approve`);
      await apiClient.patch(`/review-images/${id}`, {
        review_stage: 'approved'
      });
      
      setConfirmation('Content finalized and approved! Now available in Browse Works.');
      setTimeout(() => {
        setConfirmation(null);
        router.replace('/collab/review-content');
      }, 1500);
    } catch (e) {
      Alert.alert('Error', 'Failed to finalize image.');
    } finally {
      setLoading(false);
      setFinalizeModalVisible(false);
    }
  };

  const handleReject = async () => {
    Alert.alert(
      'Reject Image',
      'Are you sure you want to reject this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await apiClient.patch(`/review-images/${id}/reject`);
              setConfirmation('The image draft was rejected!');
              setTimeout(() => {
                setConfirmation(null);
                router.replace('/collab/review-content');
              }, 1500);
            } catch (e) {
              Alert.alert('Error', 'Failed to reject image.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a237e" />
          <Text style={styles.loadingText}>Loading image...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Feather name="alert-circle" size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Error Loading Image</Text>
          <Text style={styles.error}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!imageData) return null;

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
              <Feather name="image" size={24} color="#1a237e" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Image Preview</Text>
              {groupInfo ? (
                <Text style={styles.groupTitle}>{groupInfo.name}</Text>
              ) : (
                <Text style={styles.groupTitle}>Loading group...</Text>
              )}
            </View>
          </View>
        </View>

        {confirmation && (
          <View style={styles.confirmationOverlay}>
            <View style={styles.confirmationBox}>
              <Feather 
                name={confirmation.includes('approved') ? 'check-circle' : confirmation.includes('rejected') ? 'x-circle' : 'alert-circle'} 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.confirmationText}>{confirmation}</Text>
            </View>
          </View>
        )}

        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: `${API_URL}/storage/${imageData.file}` }} 
            style={styles.image} 
            resizeMode="contain" 
          />
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.approveButton]} 
            onPress={handleApproveClick}
          >
            <Feather name="check" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton]} 
            onPress={handleReject}
          >
            <Feather name="x" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
        
        {/* Forward Modal */}
        <Modal visible={forwardModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Forward to Reviewer</Text>
              <Text style={styles.modalMessage}>Select a team member to review this image next.</Text>
              
              <ScrollView style={styles.membersList}>
                {groupMembers.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.memberItem,
                      selectedForwardTo === member.id && styles.memberItemSelected
                    ]}
                    onPress={() => setSelectedForwardTo(member.id)}
                  >
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberRole}>{member.pivot?.position || 'Member'}</Text>
                    </View>
                    {selectedForwardTo === member.id && (
                      <Feather name="check-circle" size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setForwardModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={handleForward}
                >
                  <Text style={styles.modalConfirmText}>Forward</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        
        {/* Finalize Modal */}
        <Modal visible={finalizeModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.finalizeHeader}>
                <Feather name="award" size={32} color="#10B981" />
                <Text style={styles.modalTitle}>Final Approval</Text>
              </View>
              
              <Text style={styles.finalizeMessage}>
                As the Lead Reviewer, approving this image will finalize it and make it available in Browse Works for publishing.
              </Text>
              
              <Text style={styles.finalizeQuestion}>
                Do you want to finalize and approve this image?
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setFinalizeModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={handleFinalize}
                >
                  <Feather name="check" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.modalConfirmText}>Finalize & Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
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
  groupTitle: {
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
  imageContainer: {
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
    padding: 16,
  },
  image: {
    width: '100%',
    height: '100%',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  membersList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  memberItemSelected: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  modalConfirmButton: {
    backgroundColor: '#10B981',
  },
  modalCancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  finalizeHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  finalizeMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  finalizeQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
});
