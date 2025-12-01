import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, TextInput } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import apiClient from '../../utils/api';
import { useBranding } from '../../context/BrandingContext';
import { useAuth } from '../../context/AuthContext';

const BroadcastNotification = ({ visible, onDismiss, broadcasts, onAcceptSuccess }) => {
  const { colors } = useBranding();
  const { user } = useAuth();
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
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

      // If this was an acceptance, call the success callback and dispatch event
      if (response === 'accepted') {
        if (onAcceptSuccess) {
          onAcceptSuccess();
        }
        // Dispatch custom event to refresh dashboard
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('broadcastAccepted'));
        }
      }

      // Remove the responded broadcast from the list
      onDismiss(broadcastId);
      
      // Reset form
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

  const confirmAction = async () => {
    if (confirmingAction && selectedActionBroadcast) {
      // Set submitting to true to show loading state
      setSubmittingResponse(true);
      
      try {
        // Handle the response directly
        const broadcastId = selectedActionBroadcast.id;
        const action = confirmingAction;
        await handleRespond(broadcastId, action);
      } catch (error) {
        console.error('Failed to respond:', error);
        setSubmittingResponse(false);
      }
    }
  };

  const getCurrentUserId = () => {
    return user?.id;
  };

  const formatDate = (dateString) => {
    console.log('Parsing date:', dateString);
    
    let date;
    
    // Handle different date formats
    if (dateString.includes('T') && dateString.includes('Z')) {
      // ISO format with timezone (from Laravel): 2025-12-01T10:00:00.000000Z
      // Remove the Z and treat as local time to match the description
      const localDateString = dateString.replace('Z', '');
      date = new Date(localDateString);
    } else if (dateString.includes('T') && !dateString.includes('Z')) {
      // ISO format without timezone: 2025-12-01T10:00:00
      date = new Date(dateString);
    } else if (dateString.includes(' ')) {
      // Space format: 2025-12-01 10:00:00 (local time)
      date = new Date(dateString.replace(' ', 'T'));
    } else {
      // Try as is
      date = new Date(dateString);
    }
    
    console.log('Parsed date:', date);
    console.log('Is valid:', !isNaN(date.getTime()));
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
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
            {!submittingResponse && broadcasts.map((broadcast) => (
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
                    <Feather name="x-circle" size={16} color="#fff" />
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
        visible={!!confirmingAction || submittingResponse}
        transparent
        animationType="fade"
        onRequestClose={() => !submittingResponse && setConfirmingAction(null)}
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
                  setSubmittingResponse(true);
                  setTimeout(() => {
                    setConfirmingAction(null);
                    setSelectedActionBroadcast(null);
                    setSubmittingResponse(false);
                  }, 100); // Small delay to prevent flash
                }}
                disabled={submittingResponse}
              >
                <Text style={styles.cancelConfirmationText}>
                  {submittingResponse ? 'Canceling...' : 'Cancel'}
                </Text>
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
