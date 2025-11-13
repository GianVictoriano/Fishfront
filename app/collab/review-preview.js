import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, SafeAreaView, Modal, TextInput, Alert, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import RenderHTML from 'react-native-render-html';
import apiClient from '../../utils/api';
import { useAuth } from '~/context/AuthContext';

export default function ReviewPreviewScreen() {
  const { file, id } = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [localComments, setLocalComments] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [selectionText, setSelectionText] = useState('');
  const [showCommentButton, setShowCommentButton] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState(null);
  const [showCommentsSection, setShowCommentsSection] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const contentRef = useRef(null);

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

  // Inject CSS to enable text selection on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Add CSS to enable text selection in review content
    const style = document.createElement('style');
    style.innerHTML = `
      .review-content {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        cursor: text !important;
      }
      .review-content * {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
      .review-content p,
      .review-content span,
      .review-content div,
      .review-content h1,
      .review-content h2,
      .review-content h3,
      .review-content li,
      .review-content blockquote {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handle text selection on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      // Don't clear selection if modal is open - preserve the selected text
      if (commentModalVisible) {
        return;
      }
      
      if (text && text.length > 0) {
        setSelectionText(text);
        
        // Get selection position for button placement
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setSelectionPosition({
          top: rect.top + window.scrollY,
          left: rect.right + window.scrollX
        });
        setShowCommentButton(true);
      } else {
        setShowCommentButton(false);
        setSelectionText('');
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [commentModalVisible]);

  useEffect(() => {
    const fetchComments = async () => {
      if (!id) return;
      
      setCommentsLoading(true);
      try {
        console.log('Fetching comments for review content ID:', id);
        const response = await apiClient.get(`/review-comments/${id}`);
        console.log('Comments response:', response.data);
        setComments(response.data || []);
        processHighlights(response.data || []);
      } catch (err) {
        console.error('Failed to fetch comments:', err);
      } finally {
        setCommentsLoading(false);
      }
    };
    
    if (id) fetchComments();
  }, [id]);

  // Combine local and database comments for display
  const allComments = [...comments, ...localComments].sort((a, b) => 
    new Date(a.created_at) - new Date(b.created_at)
  );

  // Process highlights for all comments (local + database)
  useEffect(() => {
    processHighlights(allComments);
  }, [allComments]);

  const processHighlights = (commentsData) => {
    const highlightsData = commentsData.map(comment => ({
      id: comment.id,
      start: comment.start_index,
      end: comment.end_index,
      text: comment.highlighted_text,
      comment: comment.comment,
      user: comment.user.name,
      color: getRandomHighlightColor()
    }));
    setHighlights(highlightsData);
  };

  const getRandomHighlightColor = () => {
    const colors = ['#FEF3C7', '#DBEAFE', '#E0E7FF', '#F3E8FF', '#FCE7F3'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleTextSelect = () => {
    if (selectionText) {
      // selectionText is already set by the selection handler, no need to set selectedText
      setCommentModalVisible(true);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectionText) {
      Alert.alert('Error', 'Please select text and enter a comment.');
      return;
    }

    try {
      // For web selection, we'll use the first occurrence of the selected text
      const startIndex = content.indexOf(selectionText);
      const endIndex = startIndex + selectionText.length;
      
      // Create local comment object with temporary ID
      const localComment = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique temporary ID
        review_content_id: id,
        comment: newComment,
        start_index: startIndex,
        end_index: endIndex,
        highlighted_text: selectionText,
        user: {
          id: currentUser.id,
          name: currentUser.name
        },
        created_at: new Date().toISOString(),
        isLocal: true // Flag to indicate this is a local comment
      };

      // Add to local comments instead of database
      setLocalComments(prev => [...prev, localComment]);
      
      // Reset form
      setNewComment('');
      setCommentModalVisible(false);
      setShowCommentButton(false);
      setSelectionText('');
      setShowCommentsSection(true); // Show comments after adding one
      
      // Clear selection
      if (Platform.OS === 'web') {
        window.getSelection().removeAllRanges();
      }
      
      Alert.alert('Success', 'Comment added locally. It will be saved when you submit your review.');
    } catch (error) {
      console.error('Failed to add comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    }
  };

  const handleDeleteComment = async (commentId) => {
    console.log('Attempting to delete comment:', commentId);
    console.log('Current user:', currentUser);
    
    // Check if this is a local comment
    const isLocalComment = commentId.toString().startsWith('local_');
    console.log('Is local comment:', isLocalComment);
    
    if (isLocalComment) {
      console.log('Current local comments:', localComments);
      console.log('Comment to delete:', commentId);
      
      // Delete local comment immediately without confirmation
      setLocalComments(prev => {
        const filtered = prev.filter(c => {
          console.log('Comparing:', c.id, '!==', commentId, '=', c.id !== commentId);
          return c.id !== commentId;
        });
        console.log('Filtered local comments:', filtered);
        return filtered;
      });
      
      // Optional: Show brief feedback
      console.log('Local comment deleted successfully');
    } else {
      // Delete database comment with API call
      Alert.alert(
        'Delete Comment',
        'Are you sure you want to delete this comment?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('Sending delete request to:', `/review-comments/${commentId}`);
                const response = await apiClient.delete(`/review-comments/${commentId}`);
                console.log('Delete response:', response);
                
                const updatedComments = comments.filter(c => c.id !== commentId);
                setComments(updatedComments);
                processHighlights(updatedComments);
                Alert.alert('Success', 'Comment deleted successfully!');
              } catch (error) {
                console.error('Failed to delete comment:', error);
                console.error('Error response:', error.response?.data);
                console.error('Error status:', error.response?.status);
                
                let errorMessage = 'Failed to delete comment.';
                if (error.response?.status === 403) {
                  errorMessage = 'You can only delete your own comments.';
                } else if (error.response?.data?.message) {
                  errorMessage = error.response.data.message;
                }
                
                Alert.alert('Error', errorMessage);
              }
            }
          }
        ]
      );
    }
  };

  // Render floating comment button
  const renderCommentButton = () => {
    if (!showCommentButton || !selectionPosition || Platform.OS !== 'web') return null;
    
    const viewportWidth = window.innerWidth;
    const buttonWidth = 100; // Slightly wider to accommodate the text
    const buttonHeight = 36;
    const padding = 10;
    
    // Get selection rectangle
    const range = window.getSelection().getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Calculate position - default to above the selection
    let left = rect.left + (rect.width / 2) - (buttonWidth / 2);
    let top = rect.top - buttonHeight - 8; // 8px above selection
    
    // Adjust if too close to top
    if (top < padding) {
      top = rect.bottom + 8; // Show below if no space above
    }
    
    // Ensure button stays within viewport
    left = Math.max(padding, Math.min(left, viewportWidth - buttonWidth - padding));
    
    return (
      <View
        style={{
          position: 'fixed', // Changed from 'absolute' to 'fixed'
          top: `${Math.max(padding, top)}px`,
          left: `${left}px`,
          zIndex: 1000,
          backgroundColor: '#10B981',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          transform: 'translateZ(0)', // Force hardware acceleration
        }}
      >
        <TouchableOpacity
          onPress={handleTextSelect}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Feather name="message-circle" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
            Add Comment
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHighlightedContent = () => {
    if (!content) return null;
    
    const elements = [];
    let lastIndex = 0;
    
    // Sort highlights by start index
    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);
    
    sortedHighlights.forEach((highlight, index) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        elements.push(
          <Text key={`text-${index}`} style={styles.content}>
            {content.substring(lastIndex, highlight.start)}
          </Text>
        );
      }
      
      // Add highlighted text
      elements.push(
        <View key={`highlight-${index}`} style={[styles.highlightContainer, { backgroundColor: highlight.color }]}>
          <Text style={styles.highlightedText}>
            {content.substring(highlight.start, highlight.end)}
          </Text>
          <View style={styles.commentBadge}>
            <Text style={styles.commentBadgeText}>{highlight.user}</Text>
          </View>
        </View>
      );
      
      lastIndex = highlight.end;
    });
    
    // Add remaining text
    if (lastIndex < content.length) {
      elements.push(
        <Text key="text-final" style={styles.content}>
          {content.substring(lastIndex)}
        </Text>
      );
    }
    
    return elements;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Floating Comment Button */}
      {renderCommentButton()}
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#1a237e" />
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
                {Platform.OS === 'web' ? (
                  <div 
                    ref={contentRef}
                    className="review-content"
                    style={{ 
                      userSelect: 'text',
                      WebkitUserSelect: 'text',
                      MozUserSelect: 'text',
                      msUserSelect: 'text',
                      cursor: 'text',
                      padding: 20
                    }}
                  >
                    <RenderHTML
                      contentWidth={600}
                      source={{ html: `<div>${content.replace(/\n/g, '<br>')}</div>` || '' }}
                      tagsStyles={{
                        p: { fontSize: 14, lineHeight: 22, color: '#1F2937', fontFamily: 'monospace', marginBottom: 8 },
                        div: { fontSize: 14, lineHeight: 22, color: '#1F2937', fontFamily: 'monospace' },
                        span: { fontSize: 14, lineHeight: 22, color: '#1F2937', fontFamily: 'monospace' }
                      }}
                      systemFonts={['monospace', 'Courier New', 'system-ui']}
                    />
                  </div>
                ) : (
                  <View style={styles.contentContainer}>
                    <Text style={styles.content}>{content}</Text>
                  </View>
                )}
                
                <View style={styles.selectionHint}>
                  <Feather name="edit-3" size={14} color="#6B7280" />
                  <Text style={styles.selectionHintText}>
                    {Platform.OS === 'web' ? 'Select text with your mouse to add comments' : 'Tap and drag to select text for commenting'}
                  </Text>
                </View>
              </ScrollView>
              
              {/* Show Comments Button */}
              {!showCommentsSection && allComments.length > 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() => setShowCommentsSection(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#1a237e',
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 8,
                    }}
                  >
                    <Feather name="message-circle" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15, marginLeft: 8 }}>
                      Show My Comments ({allComments.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Comments Section - Only show when expanded */}
              {showCommentsSection && (
                <View style={styles.commentsSection}>
                  <View style={styles.commentsHeader}>
                    <Feather name="message-circle" size={18} color="#374151" />
                    <Text style={styles.commentsHeaderText}>Comments ({allComments.length})</Text>
                    <TouchableOpacity
                      onPress={() => setShowCommentsSection(false)}
                      style={{ padding: 4 }}
                    >
                      <Feather name="chevron-up" size={18} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                
                {commentsLoading ? (
                  <View style={styles.commentsLoading}>
                    <ActivityIndicator size="small" color="#1a237e" />
                    <Text style={styles.commentsLoadingText}>Loading comments...</Text>
                  </View>
                ) : allComments.length === 0 ? (
                  <View style={styles.noComments}>
                    <Feather name="message-square" size={32} color="#9CA3AF" />
                    <Text style={styles.noCommentsText}>No comments yet. Select text to add a comment.</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
                    {allComments.map((comment) => {
                      console.log('Rendering comment:', comment);
                      console.log('Comment user ID:', comment.user?.id);
                      console.log('Current user ID:', currentUser?.id);
                      console.log('Is local:', comment.isLocal);
                      console.log('Can delete:', currentUser?.id === comment.user?.id);
                      
                      const isLocalComment = comment.isLocal;
                      
                      return (
                      <View key={comment.id} style={[
                        styles.commentItem,
                        isLocalComment && styles.localCommentItem
                      ]}>
                        <View style={styles.commentHeader}>
                          <View style={styles.commentAuthor}>
                            <Text style={styles.commentAuthorText}>
                              {comment.user.name}
                              {isLocalComment && (
                                <Text style={styles.localIndicator}> (Local)</Text>
                              )}
                            </Text>
                            <Text style={styles.commentDate}>
                              {new Date(comment.created_at).toLocaleDateString()}
                              {isLocalComment && (
                                <Text style={styles.localTimeIndicator}> • Not saved yet</Text>
                              )}
                            </Text>
                          </View>
                          {currentUser && currentUser.id === comment.user.id && (
                            <TouchableOpacity
                              style={styles.deleteCommentButton}
                              onPress={() => handleDeleteComment(comment.id)}
                            >
                              <Feather name="trash-2" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={styles.highlightedSection}>
                          <Text style={styles.highlightedSectionText}>
                            "{comment.highlighted_text}"
                          </Text>
                        </View>
                        <Text style={styles.commentText}>{comment.comment}</Text>
                      </View>
                      );
                    })}
                  </ScrollView>
                )}
                </View>
              )}
            </View>
            <View style={styles.actionsContainer}>
              <ApproveRejectButtons />
            </View>
          </>
        )}
        
        {/* Comment Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={commentModalVisible}
          onRequestClose={() => setCommentModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.commentModal}>
              <View style={styles.modalHeader}>
                <Feather name="message-circle" size={24} color="#1a237e" />
                <Text style={styles.modalTitle}>Add Comment</Text>
                <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                  <Feather name="x" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalContent}>
                <Text style={styles.modalLabel}>Selected Text:</Text>
                <View style={styles.selectedTextContainer}>
                  <Text style={styles.selectedText}>
                    {selectionText || 'Please select text in the document first'}
                  </Text>
                </View>
                
                <Text style={styles.modalLabel}>Your Comment:</Text>
                <TextInput
                  style={styles.commentInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Enter your comment here..."
                  value={newComment}
                  onChangeText={setNewComment}
                  textAlignVertical="top"
                />
              </View>
              
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setCommentModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveButton, !newComment.trim() && styles.buttonDisabled]}
                  onPress={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  <Feather name="save" size={16} color="#fff" style={{marginRight: 6}} />
                  <Text style={styles.modalSaveText}>Save Comment</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

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

  const handleReject = () => {
    setRejectModalVisible(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectComment.trim()) {
      Alert.alert('Error', 'Please enter a rejection comment.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.patch(`/review-content/${id}/reject`, {
        comment: rejectComment.trim()
      });
      setRejectModalVisible(false);
      setRejectComment('');
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

      {/* Reject Comment Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={rejectModalVisible}
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.forwardModal}>
            <View style={styles.modalHeader}>
              <Feather name="x-circle" size={24} color="#EF4444" />
              <Text style={styles.modalTitle}>Reject Document</Text>
              <TouchableOpacity onPress={() => {
                setRejectModalVisible(false);
                setRejectComment('');
              }}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={{padding: 20}}>
              <Text style={styles.modalSubtitle}>
                Please provide a reason for rejection
              </Text>
              
              <TextInput
                style={styles.rejectCommentInput}
                multiline
                numberOfLines={4}
                placeholder="Enter your rejection reason here..."
                value={rejectComment}
                onChangeText={setRejectComment}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectComment('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalForwardButton, {backgroundColor: '#EF4444'}, !rejectComment.trim() && styles.buttonDisabled]}
                onPress={handleRejectConfirm}
                disabled={!rejectComment.trim() || loading}
              >
                <Feather name="x" size={16} color="#fff" style={{marginRight: 6}} />
                <Text style={styles.modalForwardText}>Reject</Text>
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
  rejectCommentInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#fff',
    minHeight: 100,
    marginTop: 10,
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
  // Highlighting and Commenting Styles
  contentContainer: {
    padding: 20,
  },
  selectionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    marginTop: 8,
    marginHorizontal: 20,
    gap: 6,
  },
  selectionHintText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  highlightContainer: {
    borderRadius: 4,
    padding: 2,
    marginVertical: 2,
    position: 'relative',
  },
  highlightedText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 22,
  },
  commentBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#1a237e',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  commentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  commentsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  commentsHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  commentsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  commentsLoadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  noComments: {
    alignItems: 'center',
    padding: 40,
  },
  noCommentsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
  commentsList: {
    maxHeight: 200,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  commentItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    flex: 1,
  },
  commentAuthorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  commentDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  deleteCommentButton: {
    padding: 4,
  },
  highlightedSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
    padding: 8,
    marginVertical: 4,
  },
  highlightedSectionText: {
    fontSize: 13,
    color: '#92400E',
    fontStyle: 'italic',
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  commentModal: {
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
  modalContent: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  selectedTextContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  selectedText: {
    fontSize: 14,
    color: '#1F2937',
    fontStyle: 'italic',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#fff',
    minHeight: 80,
  },
  modalSaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#10B981',
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
