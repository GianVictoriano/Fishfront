// app/screens/forum/index.web.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Button, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, SafeAreaView, Platform, ScrollView
} from 'react-native';
import AppNavbar from '../../../../components/AppNavbar';
import { useRouter } from 'expo-router';
import { Switch } from 'react-native';
import apiClient from '../../../../utils/api';

export default function ForumScreen() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: '', body: '', category: '', is_anonymous: false });
  const [submitting, setSubmitting] = useState(false);
  const categories = ['Sports', 'Literature', 'Technology', 'Other'];

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState('date_desc');
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTopics, setFilteredTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [isCommentAnonymous, setIsCommentAnonymous] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportingItemId, setReportingItemId] = useState(null);
  
  // Anti-spam states
  const [userLastCommentTime, setUserLastCommentTime] = useState({});
  const [userCommentCount, setUserCommentCount] = useState({});
  const [suspiciousUsers, setSuspiciousUsers] = useState(new Set());
  
  // Modal states for notifications
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' // 'info', 'warning', 'error', 'success'
  });

  const router = useRouter();

  // Modal notification utility
  const showModal = (title, message, type = 'info') => {
    setModalConfig({ title, message, type });
    setModalVisible(true);
  };

  // Anti-spam utility functions
  const isSpamming = (userId) => {
    const now = Date.now();
    const lastCommentTime = userLastCommentTime[userId] || 0;
    const commentCount = userCommentCount[userId] || 0;
    
    // Rate limiting: no more than 3 comments per minute
    if (now - lastCommentTime < 20000 && commentCount >= 3) {
      return true;
    }
    
    // No more than 10 comments per hour
    if (now - lastCommentTime < 3600000 && commentCount >= 10) {
      return true;
    }
    
    return false;
  };

  const updateUserCommentStats = (userId) => {
    const now = Date.now();
    const lastCommentTime = userLastCommentTime[userId] || 0;
    
    // Reset count if more than an hour has passed
    if (now - lastCommentTime > 3600000) {
      setUserCommentCount(prev => ({ ...prev, [userId]: 1 }));
    } else {
      setUserCommentCount(prev => ({ ...prev, [userId]: (prev[userId] || 0) + 1 }));
    }
    
    setUserLastCommentTime(prev => ({ ...prev, [userId]: now }));
  };

  const detectSuspiciousActivity = (topic) => {
    // Check for unusual patterns that might indicate spam
    const commentCount = topic.comments?.length || 0;
    const uniqueUsers = new Set(topic.comments?.map(c => c.user_id || c.user?.id).filter(Boolean));
    
    // Only flag for extreme cases: Many comments from very few users
    if (commentCount > 50 && uniqueUsers.size < 2) {
      return true;
    }
    
    // Only flag for extreme rapid commenting
    if (topic.comments && topic.comments.length > 0) {
      const recentComments = topic.comments.filter(c => {
        const commentTime = new Date(c.created_at).getTime();
        const now = Date.now();
        return now - commentTime < 3600000; // Last hour
      });
      
      if (recentComments.length > 100) {
        return true;
      }
    }
    
    return false;
  };

  const calculateTopicScore = (topic) => {
    const commentCount = topic.comments?.length || 0;
    const uniqueUsers = new Set(topic.comments?.map(c => c.user_id || c.user?.id).filter(Boolean));
    const topicAge = Date.now() - new Date(topic.created_at).getTime();
    const hoursOld = topicAge / (1000 * 60 * 60);
    
    // Simple, visible scoring system
    let score = commentCount * 1 + (uniqueUsers.size * 3); // Each comment = 1 point, each unique user = 3 points
    
    // Mild time decay: only significant after 3 days
    if (hoursOld > 72) {
      score = score * Math.exp(-hoursOld / 336); // Much gentler decay over 2 weeks
    }
    
    // Moderate penalty for obvious spam (not as harsh)
    if (detectSuspiciousActivity(topic)) {
      score = score * 0.3; // 70% reduction instead of 90%
    }
    
    return Math.round(score * 10) / 10; // Round to 1 decimal place
  };

  useEffect(() => {
    let filtered = topics;
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const lower = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(t => t.title.toLowerCase().includes(lower));
    }
    
    const sorted = [...filtered];
    if (sortOption === 'date_desc') {
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortOption === 'date_asc') {
      sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortOption === 'alpha_asc') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOption === 'alpha_desc') {
      sorted.sort((a, b) => b.title.localeCompare(a.title));
    }
    setFilteredTopics(sorted);
  }, [topics, searchQuery, selectedCategory, sortOption]);

  const fetchTopics = async () => {
    try {
      const response = await apiClient.get('/topics');
      setTopics(response.data);
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReport = async (type, id) => {
    try {
      setReporting(true);
      setReportingItemId(id);
      
      if (type === 'topic') {
        await apiClient.post(`/topics/${id}/report`);
        // Update the topic status in the UI
        setTopics(topics.map(topic => 
          topic.id === id ? { ...topic, status: 'reported' } : topic
        ));
        if (selectedTopic?.id === id) {
          setSelectedTopic({ ...selectedTopic, status: 'reported' });
        }
      } else if (type === 'comment') {
        await apiClient.post(`/comments/${id}/report`);
        // Update the comment status in the UI
        if (selectedTopic) {
          const updatedComments = selectedTopic.comments.map(comment => 
            comment.id === id ? { ...comment, status: 'reported' } : comment
          );
          setSelectedTopic({ ...selectedTopic, comments: updatedComments });
        }
      }
      
      showModal('Reported', 'Content has been reported. Thank you for your feedback.', 'success');
    } catch (error) {
      console.error('Error reporting content:', error);
      showModal('Error', 'Failed to report content. Please try again.', 'error');
    } finally {
      setReporting(false);
      setReportingItemId(null);
    }
  };

  const handleCreateTopic = async () => {
    if (!newTopic.title.trim() || !newTopic.category) return;
    
    setSubmitting(true);
    try {
      // Get the current user ID from your auth context or wherever it's stored
      const currentUserId = '1'; // Replace with actual user ID from your auth system
      
      const payload = {
        title: newTopic.title,
        body: newTopic.body,
        category: newTopic.category,
        secret: newTopic.is_anonymous ? 1 : 0,
        user_id: currentUserId
      };
      
      await apiClient.post('/topics', payload);
      setNewTopic({ title: '', body: '', category: '', is_anonymous: false });
      setShowNewTopicForm(false);
      await fetchTopics();
    } catch (error) {
      console.error('Error creating topic:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      showModal('Error', `Error creating topic: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTopics();
  };
  
  useEffect(() => {
    fetchTopics();
  }, []);

  const renderSidebar = () => (
    <View style={styles.sidebar}>
      <View style={styles.sidebarSection}>
        <Text style={styles.sidebarTitle}>Search</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search topics..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <View style={styles.sidebarSection}>
        <Text style={styles.sidebarTitle}>Sort By</Text>
        <View style={styles.dropdownContainer}>
          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value)}
            style={styles.dropdown}
          >
            <option value="date_desc">Newest</option>
            <option value="date_asc">Oldest</option>
            <option value="alpha_asc">A-Z</option>
            <option value="alpha_desc">Z-A</option>
          </select>
        </View>
      </View>
      <View style={styles.sidebarSection}>
        <Text style={styles.sidebarTitle}>Categories</Text>
        <View style={styles.dropdownContainer}>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={styles.dropdown}
          >
            <option value="All">All</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </View>
      </View>
    </View>
  );

  const renderNewTopicForm = () => (
    <View style={styles.newTopicForm}>
      <TextInput
        style={styles.input}
        placeholder="Topic Title"
        value={newTopic.title}
        onChangeText={text => setNewTopic({ ...newTopic, title: text })}
      />
      <TextInput
        style={[styles.input, styles.bodyInput]}
        placeholder="Topic Body"
        value={newTopic.body}
        onChangeText={text => setNewTopic({ ...newTopic, body: text })}
        multiline
      />
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Category:</Text>
        <View style={styles.pickerRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryOption, newTopic.category === cat && styles.categoryOptionActive]}
              onPress={() => setNewTopic({ ...newTopic, category: cat })}
            >
              <Text style={newTopic.category === cat ? styles.categoryOptionTextActive : styles.categoryOptionText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.anonymousToggle}>
          <Text style={styles.anonymousLabel}>Post Anonymously</Text>
          <Switch
            value={newTopic.is_anonymous}
            onValueChange={(value) => setNewTopic({...newTopic, is_anonymous: value})}
          />
        </View>
      </View>
      <View style={styles.buttonRow}>
        <Button 
          title={submitting ? "Posting..." : "Post Topic"} 
          onPress={handleCreateTopic} 
          disabled={!newTopic.title.trim() || submitting || !newTopic.category}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <AppNavbar />
      
      {/* Forum header and Create New Topic button under Navbar */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Fisherman Forum</Text>
        <Button 
          title={showNewTopicForm ? "Cancel" : "Create New Topic"} 
          onPress={() => setShowNewTopicForm(!showNewTopicForm)} 
        />
      </View>
      
      {showNewTopicForm && renderNewTopicForm()}
      
      {/* Three-panel row: sidebar, main, right panel */}
      <View style={styles.outerContainer}>
        {renderSidebar()}
        
        <View style={{ flex: 3, flexDirection: 'column', height: '100%' }}>
          {/* Main content area: topic list or topic details */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007BFF" />
              <Text>Loading Topics...</Text>
            </View>
          ) : selectedTopic ? (
            <View style={styles.topicDetailsContainer}>
              <View style={styles.topicContent}>
                <TouchableOpacity style={styles.backButton} onPress={() => setSelectedTopic(null)}>
                  <Text style={styles.backButtonIcon}>←</Text>
                </TouchableOpacity>
              <View style={styles.topicHeader}>
                <Text style={styles.topicDetailsTitle}>
                  {selectedTopic.title}
                  {selectedTopic.status === 'reported' ? (
                    <Text style={styles.reportedBadge}> (Reported)</Text>
                  ) : (
                    <Text>
                      {' '}
                      <Text 
                        onPress={() => !reporting && handleReport('topic', selectedTopic.id)}
                        style={styles.reportButton}
                      >
                        {reporting && reportingItemId === selectedTopic.id ? '(Reporting...)' : '(Report)'}
                      </Text>
                    </Text>
                  )}
                </Text>
              </View>
              <View style={styles.topicHeader}>
                <Text style={styles.topicMeta}>
                  {selectedTopic.secret ? (
                    'Anonymous'
                  ) : selectedTopic.user?.profile?.is_anonymous ? (
                    selectedTopic.user?.profile?.anonymous_name || 'Anonymous User'
                  ) : (
                    <Text 
                      style={styles.clickableUsername}
                      onPress={() => selectedTopic.user?.id && router.push(`/user-profile/${selectedTopic.user.id}`)}
                    >
                      {selectedTopic.user?.name || 'Anonymous'}
                    </Text>
                  )} • {new Date(selectedTopic.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.topicDetailsBody}>{selectedTopic.body}</Text>
              <Text style={styles.commentCount}>{selectedTopic.comments?.length || 0} comments</Text>
              <View style={styles.commentsSection}>
                <ScrollView style={styles.commentsScrollView} contentContainerStyle={styles.commentsScrollViewContent}>
                {selectedTopic.comments && selectedTopic.comments.length > 0 ? (
                  selectedTopic.comments.map((comment, idx) => (
                    <View key={comment.id || idx} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <View style={styles.commentUserInfo}>
                          <View style={styles.commentAvatar}>
                            <Text style={styles.commentAvatarText}>
                              {comment.secret ? 'A' : 
                               comment.user?.profile?.is_anonymous ? 
                                 (comment.user?.profile?.anonymous_name?.charAt(0).toUpperCase() || 'A') :
                                 (comment.user?.profile?.name?.charAt(0).toUpperCase() || comment.user?.name?.charAt(0).toUpperCase() || 'A')}
                            </Text>
                          </View>
                          <View>
                            {comment.secret ? (
                              <Text style={styles.commentAuthor}>Anonymous User</Text>
                            ) : comment.user?.profile?.is_anonymous ? (
                              <Text style={styles.commentAuthor}>
                                {comment.user?.profile?.anonymous_name || 'Anonymous User'}
                              </Text>
                            ) : (
                              <TouchableOpacity 
                                onPress={() => comment.user?.id && router.push(`/user-profile/${comment.user.id}`)}
                              >
                                <Text style={[styles.commentAuthor, styles.clickableUsername]}>
                                  {comment.user?.profile?.name || comment.user?.name || 'Anonymous User'}
                                </Text>
                              </TouchableOpacity>
                            )}
                            <Text style={styles.commentDate}>
                              {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Text>
                          </View>
                        </View>
                        {comment.status === 'reported' ? (
                          <Text style={styles.reportedBadge}>Reported</Text>
                        ) : (
                          <TouchableOpacity 
                            onPress={() => handleReport('comment', comment.id)}
                            disabled={reporting && reportingItemId === comment.id}
                            style={styles.reportButtonContainer}
                          >
                            <Text style={styles.reportButton}>
                              {reporting && reportingItemId === comment.id ? 'Reporting...' : 'Report'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.commentBody}>{comment.body}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noComments}>No comments yet.</Text>
                )}
                </ScrollView>
                {/* Add Comment Form */}
                <View style={styles.addCommentSection}>
                  <TextInput
                    style={styles.addCommentInput}
                    placeholder="Add a comment..."
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                  />
                  <View style={styles.anonymousToggle}>
                    <Text style={styles.anonymousLabel}>Post Anonymously</Text>
                    <Switch
                      value={isCommentAnonymous}
                      onValueChange={setIsCommentAnonymous}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.addCommentButton}
                    onPress={async () => {
                      if (!commentText.trim()) return;
                      
                      // Get current user ID (you'll need to implement this based on your auth system)
                      const currentUserId = '1'; // Replace with actual user ID
                      
                      // Check if user is spamming
                      if (isSpamming(currentUserId)) {
                        showModal('Rate Limit', 'Please wait before posting more comments. This helps prevent spam.', 'warning');
                        return;
                      }
                      
                      // Check for duplicate/similar content
                      const recentComments = selectedTopic.comments?.slice(-5) || [];
                      const isDuplicate = recentComments.some(comment => 
                        comment.body.toLowerCase().trim() === commentText.toLowerCase().trim()
                      );
                      
                      if (isDuplicate) {
                        showModal('Duplicate Content', 'This comment appears to be a duplicate. Please write something original.', 'warning');
                        return;
                      }
                      
                      setPostingComment(true);
                      try {
                        await apiClient.post(`/topics/${selectedTopic.id}/comments`, { 
                          body: commentText,
                          secret: isCommentAnonymous ? 1 : 0
                        });
                        
                        // Update user comment stats
                        updateUserCommentStats(currentUserId);
                        
                        // Optimistically update comment count in topics list
                        setTopics(prevTopics => prevTopics.map(topic =>
                          topic.id === selectedTopic.id
                            ? { 
                                ...topic, 
                                comments: [
                                  ...(topic.comments || []), 
                                  { 
                                    body: commentText, 
                                    user: { profile: { name: isCommentAnonymous ? 'Anonymous' : 'You' } }, 
                                    created_at: new Date().toISOString() 
                                  }
                                ] 
                              }
                            : topic
                        ));
                        // Re-fetch the selected topic to update comments
                        const response = await apiClient.get(`/topics/${selectedTopic.id}`);
                        setSelectedTopic(response.data);
                        setCommentText("");
                      } catch (error) {
                        console.error('Failed to post comment:', error);
                        showModal('Error', 'Failed to post comment. Please try again.', 'error');
                      } finally {
                        setPostingComment(false);
                      }
                    }}
                    disabled={postingComment || !commentText.trim()}
                  >
                    <Text style={styles.addCommentButtonText}>
                      {postingComment ? 'Posting...' : 'Post Comment'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              </View>
            </View>
          ) : (
            <FlatList
              data={filteredTopics}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.topicCard}
                  onPress={() => setSelectedTopic(item)}
                >
                  <Text style={styles.topicTitle}>{item.title}</Text>
                  <View style={styles.topicMetaContainer}>
                    <Text style={styles.topicMeta}>
                      {item.secret ? (
                        'Anonymous'
                      ) : item.user?.profile?.is_anonymous ? (
                        item.user?.profile?.anonymous_name || 'Anonymous User'
                      ) : (
                        <Text 
                          style={styles.clickableUsername}
                          onPress={(e) => {
                            e.stopPropagation();
                            item.user?.id && router.push(`/user-profile/${item.user.id}`);
                          }}
                        >
                          {item.user?.name || 'Anonymous'}
                        </Text>
                      )} • {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {item.body && (
                    <Text style={styles.topicBody} numberOfLines={2} ellipsizeMode="tail">
                      {item.body}
                    </Text>
                  )}
                  <View style={styles.commentCountContainer}>
                    <Text style={styles.commentCount}>
                      {item.comments?.length || 0} comments
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Text style={styles.noTopics}>No topics match your criteria.</Text>
                </View>
              }
              contentContainerStyle={filteredTopics.length === 0 ? styles.emptyListContent : styles.listContent}
            />
          )}
        </View>
        
        <View style={styles.rightPanel}>
          <Text style={styles.rightPanelTitle}>Popular Topics</Text>
          {topics
            .slice()
            .sort((a, b) => calculateTopicScore(b) - calculateTopicScore(a))
            .slice(0, 5)
            .map(topic => {
              const isSuspicious = detectSuspiciousActivity(topic);
              const score = calculateTopicScore(topic);
              const uniqueUsers = new Set(topic.comments?.map(c => c.user_id || c.user?.id).filter(Boolean));
              return (
                <TouchableOpacity
                  key={topic.id}
                  style={[
                    styles.recentTopicItem,
                    selectedTopic && selectedTopic.id === topic.id ? styles.activePopularTopic : null,
                    isSuspicious ? styles.suspiciousTopic : null
                  ]}
                  onPress={() => setSelectedTopic(topic)}
                >
                  <View style={styles.recentTopicRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentTopicTitle} numberOfLines={1}>
                        {topic.title}
                        {isSuspicious && (
                          <Text style={styles.spamWarning}> ⚠️</Text>
                        )}
                      </Text>
                      <Text style={styles.topicScore}>
                        Score: {score} ({topic.comments?.length || 0} comments, {uniqueUsers.size} users)
                        {isSuspicious && (
                          <Text style={styles.spamPenaltyText}> • 70% penalty</Text>
                        )}
                      </Text>
                    </View>
                    <Text style={[
                      styles.recentTopicCount,
                      isSuspicious ? styles.suspiciousCount : null
                    ]}>
                      {topic.comments?.length || 0}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          <View style={styles.spamInfo}>
            <Text style={styles.spamInfoText}>
              ⚠️ Topics with unusual activity may be penalized
            </Text>
          </View>
        </View>
      </View>
      
      {/* Notification Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContainer,
            modalConfig.type === 'error' && styles.modalError,
            modalConfig.type === 'warning' && styles.modalWarning,
            modalConfig.type === 'success' && styles.modalSuccess
          ]}>
            <View style={styles.modalHeader}>
              <Text style={[
                styles.modalTitle,
                modalConfig.type === 'error' && styles.modalTitleError,
                modalConfig.type === 'warning' && styles.modalTitleWarning,
                modalConfig.type === 'success' && styles.modalTitleSuccess
              ]}>
                {modalConfig.title}
              </Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>{modalConfig.message}</Text>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  modalConfig.type === 'error' && styles.modalButtonError,
                  modalConfig.type === 'warning' && styles.modalButtonWarning,
                  modalConfig.type === 'success' && styles.modalButtonSuccess
                ]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    addCommentSection: {
      marginTop: 10,
      backgroundColor: '#f5f7fa',
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: '#e3eafc',
      flexDirection: 'column',
      gap: 6,
    },
    addCommentInput: {
      minHeight: 40,
      borderColor: '#bcdffb',
      borderWidth: 1,
      borderRadius: 6,
      padding: 8,
      backgroundColor: '#fff',
      marginBottom: 6,
      fontSize: 15,
    },
    addCommentButton: {
      alignSelf: 'flex-end',
      backgroundColor: '#1976d2',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 6,
    },
    addCommentButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 15,
    },
    activePopularTopic: {
      backgroundColor: '#e3eafc',
      borderLeftWidth: 4,
      borderLeftColor: '#1976d2',
    },
    commentsSection: {
      marginTop: 20,
    },
    commentCard: {
      backgroundColor: '#f7fafd',
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#e0e0e0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    commentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    commentUserInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    commentAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#e3eafc',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    commentAvatarText: {
      color: '#1e88e5',
      fontWeight: 'bold',
      fontSize: 14,
    },
    reportButtonContainer: {
      padding: 4,
    },
    reportButton: {
      color: '#f44336',
      fontSize: 12,
      padding: 4,
    },
    reportedBadge: {
      color: '#ff4d4f',
      fontSize: 12,
      padding: 4,
      fontStyle: 'italic',
    },

    commentAuthor: {
      fontWeight: '600',
      fontSize: 14,
      color: '#333',
    },
    commentDate: {
      color: '#888',
      fontSize: 12,
      marginTop: 2,
    },
    commentBody: {
      color: '#333',
      lineHeight: 22,
      fontSize: 14,
    },
    noComments: {
      color: '#888',
      fontStyle: 'italic',
      marginTop: 6,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginBottom: 8,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      backgroundColor: '#e3eafc',
    },
    backButtonIcon: {
      fontSize: 20,
      color: '#0d47a1',
      fontWeight: 'bold',
      marginRight: 2,
    },
    topicDetailsContainer: {
      flex: 1,
      backgroundColor: '#fff',
      borderRadius: 10,
      padding: 20,
      elevation: 1,
      borderWidth: 1,
      borderColor: '#eee',
      height: '100%',
    },
    topicContent: {
      flex: 1,
      overflow: 'scroll',
    },
    commentsScrollView: {
      flex: 1,
      overflow: 'scroll',
    },
    commentsScrollViewContent: {
      paddingBottom: 20,
      paddingLeft: -13,
      paddingRight: 10,
      paddingTop: 5,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    topicDetailsTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#1e88e5',
      flex: 1,
      marginRight: 10,
    },
    reportButton: {
      color: '#f44336',
      fontWeight: '500',
      fontSize: 14,
    },
    reportedBadge: {
      color: '#f44336',
      fontWeight: '500',
      fontSize: 14,
      fontStyle: 'italic',
    },
    topicDetailsBody: {
      fontSize: 16,
      color: '#333',
      marginBottom: 16,
      lineHeight: 22,
    },
    headerRow: {
    flexDirection: 'row',
      alignItems: 'center',
    justifyContent: 'space-between',
      backgroundColor: '#fff',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    rightPanel: {
      width: 260,
      backgroundColor: '#fafbff',
      borderLeftWidth: 1,
      borderLeftColor: '#eee',
      paddingTop: 24,
      paddingHorizontal: 18,
      paddingBottom: 20,
      alignItems: 'stretch',
      marginLeft: 12,
      borderRadius: 12,
      minHeight: 400,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    rightPanelTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 18,
      color: '#0d47a1',
      letterSpacing: 0.2,
    },
    recentTopicItem: {
      flexDirection: 'row',
    alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 8,
      marginBottom: 6,
      backgroundColor: '#f5f7fa',
    },
    recentTopicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    },
    recentTopicTitle: {
      flex: 1,
      fontSize: 15,
      color: '#1e88e5',
      marginRight: 10,
    },
    recentTopicCount: {
      fontSize: 13,
      color: '#666',
      backgroundColor: '#e3eafc',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      minWidth: 24,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    suspiciousTopic: {
      backgroundColor: '#fff3cd',
      borderColor: '#ffeaa7',
      borderWidth: 1,
    },
    suspiciousCount: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
    },
    spamWarning: {
      color: '#f39c12',
      fontSize: 12,
    },
    topicScore: {
      fontSize: 11,
      color: '#888',
      marginTop: 2,
    },
    spamPenaltyText: {
      color: '#dc3545',
      fontSize: 10,
      fontStyle: 'italic',
    },
    spamInfo: {
      marginTop: 16,
      padding: 12,
      backgroundColor: '#f8f9fa',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#e9ecef',
    },
    spamInfoText: {
      fontSize: 12,
      color: '#6c757d',
      textAlign: 'center',
      fontStyle: 'italic',
    },
    outerContainer: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: '#f5f5f5',
      paddingVertical: 16,
      paddingHorizontal: 20,
      gap: 12,
    },
    sidebar: {
      width: 280,
      backgroundColor: '#fff',
      paddingTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderRightWidth: 1,
      borderRightColor: '#eee',
      marginRight: 12,
      borderRadius: 12,
      minHeight: 400,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    sidebarSection: {
      marginBottom: 24,
    },
    sidebarTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
    },
    dropdownContainer: {
      marginBottom: 12,
    },
    dropdown: {
      width: '100%',
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ddd',
      backgroundColor: '#f8f9fa',
      fontSize: 15,
      color: '#333',
      marginTop: 4,
    },
    searchInput: {
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      padding: 12,
      backgroundColor: '#f8f9fa',
      color: '#333',
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 40,
    },
    newTopicForm: {
      backgroundColor: '#fff',
      padding: 16,
      margin: 16,
      borderRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: '#eee'
    },
    pickerContainer: {
      marginBottom: 12,
    },
    pickerLabel: {
      fontWeight: 'bold',
      marginBottom: 8,
      color: '#333',
    },
    pickerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    categoryOption: {
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 14,
      marginRight: 8,
      marginBottom: 8,
      backgroundColor: '#f8f9fa',
    },
    categoryOptionActive: {
      backgroundColor: '#0d47a1',
      borderColor: '#0d47a1',
    },
    categoryOptionText: {
      color: '#333',
      fontWeight: '500',
    },
    categoryOptionTextActive: {
      color: '#fff',
      fontWeight: 'bold',
    },
    input: {
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      backgroundColor: '#f8f9fa',
      color: '#333',
    },
    bodyInput: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 8,
    },
    listContent: {
      padding: 16,
      paddingBottom: 80,
    },
    emptyListContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    topicCard: {
      backgroundColor: '#fff',
      padding: 16,
      borderRadius: 8,
      marginBottom: 12,
      elevation: 1,
      borderWidth: 1,
      borderColor: '#eee'
    },
    topicTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 4,
      color: '#1e88e5',
  },
  topicMetaContainer: {
    marginBottom: 8,
  },
  topicMeta: {
    color: '#666',
    fontSize: 12,
  },
  clickableUsername: {
    color: '#1e88e5',
    fontWeight: '600',
    textDecorationLine: 'underline',
    cursor: 'pointer',
  },
    topicBody: {
      color: '#333',
      marginBottom: 8,
      lineHeight: 20,
  },
  commentCountContainer: {
    marginTop: 8,
  },
  commentCount: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
    noTopics: {
      textAlign: 'center',
      color: '#666',
      fontSize: 16,
    },
    anonymousToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: 10,
      padding: 10,
      backgroundColor: '#f5f5f5',
      borderRadius: 8,
    },
    anonymousLabel: {
      fontSize: 14,
      color: '#666',
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 0,
      width: '80%',
      maxWidth: 400,
      minWidth: 300,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    modalError: {
      borderTopWidth: 4,
      borderTopColor: '#dc3545',
    },
    modalWarning: {
      borderTopWidth: 4,
      borderTopColor: '#ffc107',
    },
    modalSuccess: {
      borderTopWidth: 4,
      borderTopColor: '#28a745',
    },
    modalHeader: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#333',
      textAlign: 'center',
    },
    modalTitleError: {
      color: '#dc3545',
    },
    modalTitleWarning: {
      color: '#856404',
    },
    modalTitleSuccess: {
      color: '#155724',
    },
    modalBody: {
      padding: 20,
    },
    modalMessage: {
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
      lineHeight: 22,
    },
    modalFooter: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: '#eee',
    },
    modalButton: {
      backgroundColor: '#007bff',
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 6,
      alignSelf: 'center',
    },
    modalButtonError: {
      backgroundColor: '#dc3545',
    },
    modalButtonWarning: {
      backgroundColor: '#ffc107',
    },
    modalButtonSuccess: {
      backgroundColor: '#28a745',
    },
    modalButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });