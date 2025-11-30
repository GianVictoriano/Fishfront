import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, TextInput } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import apiClient from '../../utils/api';
import { useBranding } from '../../context/BrandingContext';
import { useAuth } from '../../context/AuthContext';

const BroadcastNotification = ({ visible, onDismiss, broadcasts }) => {
  const { colors } = useBranding();
  const { user } = useAuth();
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState(null); // 'accept' or 'decline'
  const [selectedActionBroadcast, setSelectedActionBroadcast] = useState(null);

  const handleRespond = async (broadcastId, response, message = null) => {
    setSubmittingResponse(true);
    try {
      // Respond to the broadcast
      await apiClient.post(`/broadcasts/${broadcastId}/respond`, {
        response: response,
        message: message || null
      });

      // Remove the responded broadcast from the list
      onDismiss(broadcastId);
      
      // Reset form
      setSelectedBroadcast(null);
      setResponseMessage('');
      setConfirmingAction(null);
      setSelectedActionBroadcast(null);
      
    } catch (error) {
      console.error('Failed to respond to broadcast:', error);
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleActionPress = (broadcast, action) => {
    setSelectedActionBroadcast(broadcast);
    setConfirmingAction(action);
  };

  const confirmAction = () => {
    if (confirmingAction && selectedActionBroadcast) {
      if (confirmingAction === 'accepted') {
        // Close confirmation modal immediately
        setConfirmingAction(null);
        setSelectedActionBroadcast(null);
        // Then handle the response
        handleRespond(selectedActionBroadcast.id, 'accepted');
      } else {
        // For decline, show the reason modal first
        setSelectedBroadcast(selectedActionBroadcast);
        setConfirmingAction(null);
        setSelectedActionBroadcast(null);
      }
    }
  };

  const getCurrentUserId = () => {
    return user?.id;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onDismiss()}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.notificationModal}>
          <View style={styles.modalHeader}>
            <View style={styles.headerIconContainer}>
              <MaterialCommunityIcons name="bell-ring" size={28} color={colors.primary} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.modalTitle}>Activity Invitations</Text>
              <Text style={styles.modalSubtitle}>
                {broadcasts.length} pending invitation{broadcasts.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={() => onDismiss()}>
              <Feather name="x" size={24} color="#6c757d" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {broadcasts.map((broadcast) => (
              <View key={broadcast.id} style={styles.broadcastCard}>
                <View style={styles.broadcastHeader}>
                  <View style={styles.broadcastIcon}>
                    <MaterialCommunityIcons name="calendar-check" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.broadcastTitleContainer}>
                    <Text style={styles.broadcastTitle}>{broadcast.title}</Text>
                    <Text style={styles.broadcastSender}>
                      From: {broadcast.sender?.name || 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Pending</Text>
                  </View>
                </View>

                <View style={styles.broadcastDetails}>
                  <View style={styles.detailRow}>
                    <Feather name="calendar" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>{formatDate(broadcast.activity_date)}</Text>
                  </View>
                  
                  {broadcast.activity_location && (
                    <View style={styles.detailRow}>
                      <Feather name="map-pin" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>{broadcast.activity_location}</Text>
                    </View>
                  )}

                  {(broadcast.required_writers > 0 || broadcast.required_photographers > 0) && (
                    <View style={styles.requirementsRow}>
                      {broadcast.required_writers > 0 && (
                        <View style={styles.requirementBadge}>
                          <MaterialCommunityIcons name="pencil" size={14} color="#1a237e" />
                          <Text style={styles.requirementText}>{broadcast.required_writers} Writer{broadcast.required_writers !== 1 ? 's' : ''}</Text>
                        </View>
                      )}
                      {broadcast.required_photographers > 0 && (
                        <View style={styles.requirementBadge}>
                          <MaterialCommunityIcons name="camera" size={14} color="#1a237e" />
                          <Text style={styles.requirementText}>{broadcast.required_photographers} Photographer{broadcast.required_photographers !== 1 ? 's' : ''}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {broadcast.description && (
                    <Text style={styles.description}>{broadcast.description}</Text>
                  )}
                </View>

                <View style={styles.responseSection}>
                  <TouchableOpacity
                    style={[styles.responseButton, styles.acceptButton]}
                    onPress={() => handleActionPress(broadcast, 'accepted')}
                    disabled={submittingResponse}
                  >
                    <MaterialCommunityIcons name="check-circle" size={16} color="#fff" />
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.responseButton, styles.declineButton]}
                    onPress={() => handleActionPress(broadcast, 'declined')}
                    disabled={submittingResponse}
                  >
                    <MaterialCommunityIcons name="x-circle" size={16} color="#fff" />
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={!!confirmingAction}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingAction(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationModal}>
            <View style={styles.confirmationHeader}>
              <MaterialCommunityIcons 
                name={confirmingAction === 'accepted' ? 'check-circle' : 'x-circle'} 
                size={32} 
                color={confirmingAction === 'accepted' ? '#10B981' : '#EF4444'} 
              />
              <Text style={styles.confirmationTitle}>
                {confirmingAction === 'accepted' ? 'Accept Activity Invitation' : 'Decline Activity Invitation'}
              </Text>
            </View>
            
            <Text style={styles.confirmationMessage}>
              {confirmingAction === 'accepted' 
                ? `Are you sure you want to accept "${selectedActionBroadcast?.title}"? This will show your interest in joining the activity.`
                : `Are you sure you want to decline "${selectedActionBroadcast?.title}"?`
              }
            </Text>

            <View style={styles.confirmationDetails}>
              <View style={styles.detailRow}>
                <Feather name="calendar" size={16} color="#6B7280" />
                <Text style={styles.detailText}>
                  {selectedActionBroadcast ? formatDate(selectedActionBroadcast.activity_date) : ''}
                </Text>
              </View>
              
              {selectedActionBroadcast?.activity_location && (
                <View style={styles.detailRow}>
                  <Feather name="map-pin" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{selectedActionBroadcast.activity_location}</Text>
                </View>
              )}
            </View>

            <View style={styles.confirmationActions}>
              <TouchableOpacity
                style={styles.cancelConfirmationButton}
                onPress={() => {
                  setConfirmingAction(null);
                  setSelectedActionBroadcast(null);
                }}
                disabled={submittingResponse}
              >
                <Text style={styles.cancelConfirmationText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmActionButton, confirmingAction === 'accepted' ? styles.confirmAcceptButton : styles.confirmDeclineButton]}
                onPress={confirmAction}
                disabled={submittingResponse}
              >
                <Text style={[styles.confirmActionText, confirmingAction === 'accepted' ? styles.confirmAcceptText : styles.confirmDeclineText]}>
                  {submittingResponse ? 'Processing...' : `Yes, ${confirmingAction === 'accepted' ? 'Accept' : 'Decline'}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Decline Reason Modal */}
      <Modal
        visible={!!selectedBroadcast}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBroadcast(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.declineModal}>
            <View style={styles.declineHeader}>
              <Text style={styles.declineTitle}>Decline Invitation</Text>
              <TouchableOpacity onPress={() => setSelectedBroadcast(null)}>
                <Feather name="x" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.declineSubtitle}>
              Why can't you attend this activity?
            </Text>
            
            <ScrollView style={styles.messageInputContainer}>
              <TextInput
                style={styles.messageInput}
                multiline
                placeholder="Optional: Add a reason for declining..."
                value={responseMessage}
                onChangeText={setResponseMessage}
                placeholderTextColor="#9CA3AF"
              />
            </ScrollView>

            <View style={styles.declineActions}>
              <TouchableOpacity
                style={styles.cancelDeclineButton}
                onPress={() => {
                  setSelectedBroadcast(null);
                  setResponseMessage('');
                }}
              >
                <Text style={styles.cancelDeclineText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmDeclineButton}
                onPress={() => {
                  if (selectedBroadcast) {
                    handleRespond(selectedBroadcast.id, 'declined');
                  }
                }}
                disabled={submittingResponse}
              >
                <Text style={styles.confirmDeclineText}>Confirm Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 0,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
  },
  broadcastCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  broadcastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  broadcastIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  broadcastTitleContainer: {
    flex: 1,
  },
  broadcastTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  broadcastSender: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  broadcastDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  requirementsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  requirementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  requirementText: {
    fontSize: 12,
    color: '#1a237e',
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 8,
  },
  responseSection: {
    flexDirection: 'row',
    gap: 12,
  },
  responseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  declineModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  declineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  declineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  declineSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  messageInputContainer: {
    maxHeight: 100,
    marginBottom: 16,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  declineActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelDeclineButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelDeclineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmDeclineButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  confirmDeclineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Confirmation Modal Styles
  confirmationModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  confirmationHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginTop: 12,
  },
  confirmationMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  confirmationDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  confirmationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelConfirmationButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelConfirmationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmAcceptButton: {
    backgroundColor: '#10B981',
  },
  confirmDeclineButton: {
    backgroundColor: '#EF4444',
  },
  confirmActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmAcceptText: {
    color: '#fff',
  },
  confirmDeclineText: {
    color: '#fff',
  },
});

export default BroadcastNotification;
