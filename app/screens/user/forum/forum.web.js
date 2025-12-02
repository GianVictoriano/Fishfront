import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Switch,
  Modal,
  SafeAreaView
} from 'react-native';
import { Button } from 'react-native-web';
import { useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import AppNavbar from '../../../../components/AppNavbar';
import apiClient from '../../../../utils/api';
import { useAuth } from '../../../../context/AuthContext';

const Forum = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { user } = useAuth();

  // Dynamic styles based on screen size
  const dynamicStyles = {
    topicModalContainer: {
      backgroundColor: '#fff',
      borderRadius: 12,
      margin: width < 600 ? 0 : 20,
      width: width < 600 ? '90%' : '70%',
      maxHeight: '80%',
      alignSelf: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    reportModalContainer: {
      backgroundColor: '#fff',
      borderRadius: 12,
      margin: width < 600 ? 0 : 20,
      width: width < 600 ? '90%' : '50%',
      maxWidth: width < 600 ? 'none' : 400,
      maxHeight: '80%',
      alignSelf: 'center',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
  };

  const [topics, setTopics] = useState([]);
  const [filteredTopics, setFilteredTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState('date_desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateFilterEnabled, setDateFilterEnabled] = useState(false);
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [newTopic, setNewTopic] = useState({
    title: '',
    body: '',
    category: '',
    is_anonymous: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [isCommentAnonymous, setIsCommentAnonymous] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportingItemId, setReportingItemId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: '', message: '', type: 'info' });
  const [topicModalVisible, setTopicModalVisible] = useState(false);
  const [selectedTopicForModal, setSelectedTopicForModal] = useState(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState({ type: '', id: null });
  const [selectedReportReason, setSelectedReportReason] = useState('');
  
  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const categories = ['General', 'Fishing Tips', 'Equipment', 'Locations', 'Techniques', 'Conservation'];

  const showModal = (title, message, type = 'info') => {
    setModalConfig({ title, message, type });
    setModalVisible(true);
  };

  const openTopicModal = async (topicId) => {
    try {
      const response = await apiClient.get(`/topics/${topicId}`);
      setSelectedTopicForModal(response.data);
      setTopicModalVisible(true);
    } catch (error) {
      console.error('Error fetching topic details:', error);
      showModal('Error', 'Failed to load topic details.', 'error');
    }
  };

  const userCommentStats = {};
  const userLastCommentTime = {};

  const isSpamming = (userId) => {
    const now = Date.now();
    const userStats = userCommentStats[userId] || { count: 0, firstCommentTime: now };
    const timeSinceFirst = now - userStats.firstCommentTime;
    const timeSinceLast = now - (userLastCommentTime[userId] || 0);
    
    if (timeSinceLast < 30000) {
      return true;
    }
    
    if (timeSinceFirst < 300000 && userStats.count >= 5) {
      return true;
    }
    
    return false;
  };

  const updateUserCommentStats = (userId) => {
    const now = Date.now();
    if (!userCommentStats[userId]) {
      userCommentStats[userId] = { count: 0, firstCommentTime: now };
    }
    userCommentStats[userId].count++;
    userCommentStats[userId].firstCommentTime = userCommentStats[userId].firstCommentTime || now;
    userLastCommentTime[userId] = now;
  };

  const detectSuspiciousActivity = (topic) => {
    const commentCount = topic.comments_count || 0;
    // Simplified detection since we don't have individual comment data
    const estimatedUniqueUsers = Math.min(Math.max(1, Math.floor(commentCount * 0.7)), commentCount);
    const topicAge = Date.now() - new Date(topic.created_at).getTime();
    const hoursOld = topicAge / (1000 * 60 * 60);
    
    if (commentCount > 10 && estimatedUniqueUsers <= 2 && hoursOld < 1) {
      return true;
    }
    
    if (commentCount > 20 && estimatedUniqueUsers <= 3 && hoursOld < 6) {
      return true;
    }
    
    return false;
  };

  const calculateTopicScore = (topic) => {
    const commentCount = topic.comments_count || 0;
    // Note: We can't calculate unique users from comments_count alone, so we'll use a simplified scoring
    const estimatedUniqueUsers = Math.min(Math.max(1, Math.floor(commentCount * 0.7)), commentCount);
    const topicAge = Date.now() - new Date(topic.created_at).getTime();
    const hoursOld = topicAge / (1000 * 60 * 60);
    
    let score = commentCount * 1 + (estimatedUniqueUsers * 3);
    
    if (hoursOld > 72) {
      score = score * Math.exp(-hoursOld / 336);
    }
    
    if (detectSuspiciousActivity(topic)) {
      score = score * 0.3;
    }
    
    return Math.round(score * 10) / 10;
  };

  useEffect(() => {
    let filtered = topics;
    
    // Only apply date filtering on client side
    if (dateFilterEnabled && (startDate || endDate)) {
      filtered = filtered.filter(t => {
        const topicDate = new Date(t.created_at).toISOString().split('T')[0];
        const start = startDate ? new Date(startDate).toISOString().split('T')[0] : null;
        const end = endDate ? new Date(endDate).toISOString().split('T')[0] : null;
        
        if (start && end) {
          return topicDate >= start && topicDate <= end;
        } else if (start) {
          return topicDate >= start;
        } else if (end) {
          return topicDate <= end;
        }
        return true;
      });
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
  }, [topics, sortOption, dateFilterEnabled, startDate, endDate]);

  const fetchTopics = async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      
      // Add search and filter parameters
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (selectedCategory !== 'All') {
        params.append('category', selectedCategory);
      }
      
      const response = await apiClient.get(`/topics?${params.toString()}`);
      const data = response.data;
      
      if (reset) {
        setTopics(data.data || []);
        setPage(2);
      } else {
        setTopics(prev => [...prev, ...(data.data || [])]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(data.current_page < data.last_page);
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleReport = (type, id) => {
    setReportTarget({ type, id });
    setSelectedReportReason('');
    setReportModalVisible(true);
  };

  const submitReport = async () => {
    if (!selectedReportReason.trim()) {
      showModal('Required', 'Please select a reason for reporting.', 'warning');
      return;
    }

    try {
      setReporting(true);
      setReportingItemId(reportTarget.id);
      
      if (reportTarget.type === 'topic') {
        await apiClient.post(`/topics/${reportTarget.id}/report`, { reason: selectedReportReason });
        setTopics(topics.map(topic => 
          topic.id === reportTarget.id ? { ...topic, status: 'reported' } : topic
        ));
        if (selectedTopicForModal?.id === reportTarget.id) {
          setSelectedTopicForModal({ ...selectedTopicForModal, status: 'reported' });
        }
      } else if (reportTarget.type === 'comment') {
        await apiClient.post(`/comments/${reportTarget.id}/report`, { reason: selectedReportReason });
        if (selectedTopicForModal) {
          const updatedComments = selectedTopicForModal.comments.map(comment => 
            comment.id === reportTarget.id ? { ...comment, status: 'reported' } : comment
          );
          setSelectedTopicForModal({ ...selectedTopicForModal, comments: updatedComments });
        }
      }
      
      setReportModalVisible(false);
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
    if (!newTopic.title.trim()) return;
    
    setSubmitting(true);
    try {
      const currentUserId = user?.id || '1';
      
      const payload = {
        title: newTopic.title,
        body: newTopic.body,
        category: newTopic.category,
        secret: newTopic.is_anonymous,
        user_id: currentUserId
      };
      
      await apiClient.post('/topics', payload);
      setNewTopic({ title: '', body: '', category: '', is_anonymous: false });
      setShowNewTopicForm(false);
      fetchTopics(true); // Refresh topics list
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
    fetchTopics(true);
  };

  const loadMoreTopics = () => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      fetchTopics(false);
    }
  };
  
  useEffect(() => {
    fetchTopics();
  }, []);

  // Reset pagination when search or category changes
  useEffect(() => {
    setLoading(true);
    fetchTopics(true);
  }, [searchQuery, selectedCategory]);

  const renderSidebar = () => (
    <View style={styles.sidebar}>
      <View style={styles.sidebarSection}>
        <Text style={styles.sidebarTitle}>Search</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search topics... (use # to search hashtags)"
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
        <Text style={styles.sidebarTitle}>Date Filter</Text>
        <View style={styles.checkboxContainer}>
          <input
            type="checkbox"
            checked={dateFilterEnabled}
            onChange={(e) => setDateFilterEnabled(e.target.checked)}
            style={styles.checkbox}
          />
          <Text style={styles.checkboxLabel}>Enable date filtering</Text>
        </View>
        {dateFilterEnabled && (
          <View style={styles.dateInputsContainer}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={styles.dateInput}
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={styles.dateInput}
            />
          </View>
        )}
      </View>
    </View>
  );

  const handleHashtagChange = (text) => {
    // If text ends with space, add a hashtag after the space
    if (text.endsWith(' ')) {
      const trimmedText = text.trimEnd();
      setNewTopic({ ...newTopic, category: trimmedText + ' #' });
    } else {
      setNewTopic({ ...newTopic, category: text });
    }
  };

  const handleHashtagClick = () => {
    // Add hashtag when field is clicked if it's empty
    if (!newTopic.category.trim()) {
      setNewTopic({ ...newTopic, category: '#' });
    }
  };

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
        <Text style={styles.pickerLabel}>Hashtag:</Text>
        <TextInput
          style={styles.input}
          placeholder="#hashtag"
          value={newTopic.category}
          onChangeText={handleHashtagChange}
          onFocus={handleHashtagClick}
        />
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
          disabled={!newTopic.title.trim() || submitting}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <AppNavbar />
      
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Fisherman Forum</Text>
        <Button 
          title={showNewTopicForm ? "Cancel" : "+ Topic"} 
          onPress={() => setShowNewTopicForm(!showNewTopicForm)} 
        />
      </View>
      
      {showNewTopicForm && renderNewTopicForm()}
      
      <View style={isMobile ? styles.outerContainerMobile : styles.outerContainer}>
        {!isMobile && renderSidebar()}
        
        <View style={{ flex: 3, flexDirection: 'column' }}>
          {isMobile ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007BFF" />
                  <Text>Loading Topics...</Text>
                </View>
              ) : (
                <View style={{ paddingBottom: 20 }}>
                  {filteredTopics.map((item) => (
                    <TouchableOpacity 
                      key={item.id}
                      style={styles.topicCard}
                      onPress={() => openTopicModal(item.id)}
                    >
                      <Text style={styles.topicTitle}>
                        {item.title}
                        {item.category && (
                          <Text style={styles.hashtag}> {item.category}</Text>
                        )}
                      </Text>
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
                          {item.comments_count || 0} comments
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {hasMore && (
                    <TouchableOpacity 
                      style={styles.loadMoreButton}
                      onPress={loadMoreTopics}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <View style={styles.loadingMore}>
                          <ActivityIndicator size="small" color="#007BFF" />
                          <Text style={styles.loadingMoreText}>Loading more...</Text>
                        </View>
                      ) : (
                        <Text style={styles.loadMoreText}>Load More Topics</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {filteredTopics.length === 0 && !loading && (
                    <View style={styles.centered}>
                      <Text style={styles.noTopics}>No topics match your criteria.</Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          ) : (
            // Desktop view - simplified to just show topic list
            <>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007BFF" />
                  <Text>Loading Topics...</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredTopics}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.topicCard}
                      onPress={() => openTopicModal(item.id)}
                    >
                      <Text style={styles.topicTitle}>
                        {item.title}
                        {item.category && (
                          <Text style={styles.hashtag}> {item.category}</Text>
                        )}
                      </Text>
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
                          {item.comments_count || 0} comments
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                  }
                  onEndReached={loadMoreTopics}
                  onEndReachedThreshold={0.1}
                  ListFooterComponent={
                    loadingMore ? (
                      <View style={styles.loadingMore}>
                        <ActivityIndicator size="small" color="#007BFF" />
                        <Text style={styles.loadingMoreText}>Loading more...</Text>
                      </View>
                    ) : null
                  }
                  ListEmptyComponent={
                    <View style={styles.centered}>
                      <Text style={styles.noTopics}>No topics match your criteria.</Text>
                    </View>
                  }
                  contentContainerStyle={filteredTopics.length === 0 ? styles.emptyListContent : styles.listContent}
                />
              )}
            </>
          )}
        </View>
        
        {!isMobile && (
          <View style={styles.rightPanel}>
            <Text style={styles.rightPanelTitle}>Popular Topics</Text>
            {topics
              .slice()
              .sort((a, b) => calculateTopicScore(b) - calculateTopicScore(a))
              .slice(0, 5)
              .map(topic => {
                const isSuspicious = detectSuspiciousActivity(topic);
                const score = calculateTopicScore(topic);
                const estimatedUniqueUsers = Math.min(Math.max(1, Math.floor((topic.comments_count || 0) * 0.7)), topic.comments_count || 0);
                return (
                  <TouchableOpacity
                    key={topic.id}
                    style={[
                      styles.recentTopicItem,
                      selectedTopic && selectedTopic.id === topic.id ? styles.activePopularTopic : null,
                      isSuspicious ? styles.suspiciousTopic : null
                    ]}
                    onPress={() => openTopicModal(topic.id)}
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
                          Score: {score} ({topic.comments_count || 0} comments, {estimatedUniqueUsers} users)
                          {isSuspicious && (
                            <Text style={styles.spamPenaltyText}> • 70% penalty</Text>
                          )}
                        </Text>
                      </View>
                      <Text style={[
                        styles.recentTopicCount,
                        isSuspicious ? styles.suspiciousCount : null
                      ]}>
                        {topic.comments_count || 0}
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
        )}
      </View>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={topicModalVisible}
        onRequestClose={() => setTopicModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={dynamicStyles.topicModalContainer}>
            <View style={styles.topicModalHeader}>
              <Text style={styles.topicModalTitle}>Topic Details</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setTopicModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.topicModalContent} contentContainerStyle={{ paddingBottom: 20 }}>
              {selectedTopicForModal && (
                <>
                  <View style={styles.topicHeader}>
                    <Text style={styles.topicDetailsTitle}>
                      {selectedTopicForModal.title}
                      {selectedTopicForModal.category && (
                        <Text style={styles.hashtag}> {selectedTopicForModal.category}</Text>
                      )}
                      {selectedTopicForModal.status === 'reported' ? (
                        <Text style={styles.reportedBadge}> (Reported)</Text>
                      ) : (
                        <Text>
                          {' '}
                          <Text 
                            onPress={() => !reporting && handleReport('topic', selectedTopicForModal.id)}
                            style={styles.reportButton}
                          >
                            {reporting && reportingItemId === selectedTopicForModal.id ? (
                              width < 600 ? '⚠️' : '(Reporting...)'
                            ) : (
                              width < 600 ? '⚠️' : '(Report)'
                            )}
                          </Text>
                        </Text>
                      )}
                    </Text>
                  </View>
                  
                  <View style={styles.topicHeader}>
                    <Text style={styles.topicMeta}>
                      {selectedTopicForModal.secret ? (
                        'Anonymous'
                      ) : selectedTopicForModal.user?.profile?.is_anonymous ? (
                        selectedTopicForModal.user?.profile?.anonymous_name || 'Anonymous User'
                      ) : (
                        <Text 
                          style={styles.clickableUsername}
                          onPress={() => selectedTopicForModal.user?.id && router.push(`/user-profile/${selectedTopicForModal.user.id}`)}
                        >
                          {selectedTopicForModal.user?.name || 'Anonymous'}
                        </Text>
                      )} • {new Date(selectedTopicForModal.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <Text style={styles.topicDetailsBody}>{selectedTopicForModal.body}</Text>
                  <Text style={styles.commentCount}>{selectedTopicForModal.comments?.length || 0} comments</Text>
                  
                  <View style={styles.commentsSection}>
                    {selectedTopicForModal.comments && selectedTopicForModal.comments.length > 0 ? (
                      selectedTopicForModal.comments.map((comment, idx) => (
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
                                  {reporting && reportingItemId === comment.id ? (
                                    width < 600 ? '⚠️' : 'Reporting...'
                                  ) : (
                                    width < 600 ? '⚠️' : 'Report'
                                  )}
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
                  </View>
                  
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
                        
                        const currentUserId = '1';
                        
                        if (isSpamming(currentUserId)) {
                          showModal('Rate Limit', 'Please wait before posting more comments. This helps prevent spam.', 'warning');
                          return;
                        }
                        
                        const recentComments = selectedTopicForModal.comments?.slice(-5) || [];
                        const isDuplicate = recentComments.some(comment => 
                          comment.body.toLowerCase().trim() === commentText.toLowerCase().trim()
                        );
                        
                        if (isDuplicate) {
                          showModal('Duplicate Content', 'This comment appears to be a duplicate. Please write something original.', 'warning');
                          return;
                        }
                        
                        setPostingComment(true);
                        try {
                          await apiClient.post(`/topics/${selectedTopicForModal.id}/comments`, { 
                            body: commentText,
                            secret: isCommentAnonymous ? 1 : 0
                          });
                          
                          updateUserCommentStats(currentUserId);
                          
                          setTopics(prevTopics => prevTopics.map(topic =>
                            topic.id === selectedTopicForModal.id
                              ? { 
                                  ...topic, 
                                  comments: [
                                    ...(topic.comments || []), 
                                    { 
                                      body: commentText, 
                                      user: { profile: { name: isCommentAnonymous ? 'Anonymous' : 'You' } }, 
                                      created_at: new Date().toISOString() 
                                    }
                                  ],
                                  comments_count: (topic.comments_count || 0) + 1
                                }
                              : topic
                          ));
                          
                          const response = await apiClient.get(`/topics/${selectedTopicForModal.id}`);
                          setSelectedTopicForModal(response.data);
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
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      <Modal
        animationType="fade"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={dynamicStyles.reportModalContainer}>
            <View style={styles.reportModalHeader}>
              <Text style={styles.reportModalTitle}>Report Content</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.reportModalContent}>
              <Text style={styles.reportModalSubtitle}>Please select a reason for reporting:</Text>
              
              <ScrollView style={styles.reportReasonsList}>
                {[
                  'Spam or misleading content',
                  'Inappropriate language',
                  'Harassment or bullying',
                  'False information',
                  'Off-topic content',
                  'Violence or threats',
                  'Hate speech',
                  'Copyright violation',
                  'Privacy violation',
                  'Other'
                ].map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reportReasonItem,
                      selectedReportReason === reason && styles.reportReasonItemSelected
                    ]}
                    onPress={() => setSelectedReportReason(reason)}
                  >
                    <View style={styles.reportReasonRadio}>
                      <View style={[
                        styles.reportReasonRadioCircle,
                        selectedReportReason === reason && styles.reportReasonRadioCircleSelected
                      ]}>
                        {selectedReportReason === reason && (
                          <View style={styles.reportReasonRadioCircleInner} />
                        )}
                      </View>
                    </View>
                    <Text style={styles.reportReasonText}>{reason}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.reportModalActions}>
                <TouchableOpacity
                  style={[styles.reportModalButton, styles.reportModalCancelButton]}
                  onPress={() => setReportModalVisible(false)}
                >
                  <Text style={styles.reportModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.reportModalButton, 
                    styles.reportModalSubmitButton,
                    !selectedReportReason && styles.reportModalButtonDisabled
                  ]}
                  onPress={submitReport}
                  disabled={!selectedReportReason || reporting}
                >
                  <Text style={styles.reportModalSubmitText}>
                    {reporting ? 'Reporting...' : 'Submit Report'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      
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
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  outerContainerMobile: {
    flex: 1,
    flexDirection: 'column',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  sidebar: {
    width: 260,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginRight: 20,
    borderWidth: 1,
    borderColor: '#e3eafc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sidebarSection: {
    marginBottom: 24,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9fafb',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  dropdown: {
    padding: 12,
    fontSize: 14,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    width: '100%',
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
  },
  rightPanelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  recentTopicItem: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#cbd5e1',
    transition: 'all 0.2s ease',
  },
  recentTopicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentTopicTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    marginRight: 8,
  },
  recentTopicCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  topicScore: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  spamWarning: {
    color: '#f59e0b',
  },
  spamPenaltyText: {
    color: '#ef4444',
  },
  suspiciousTopic: {
    backgroundColor: '#fef2f2',
    borderLeftColor: '#fca5a5',
  },
  suspiciousCount: {
    backgroundColor: '#fecaca',
    color: '#dc2626',
  },
  spamInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    border: 1,
    borderColor: '#bae6fd',
  },
  spamInfoText: {
    fontSize: 12,
    color: '#0369a1',
    lineHeight: 16,
  },
  activePopularTopic: {
    backgroundColor: '#dbeafe',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
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
  newTopicForm: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3eafc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
  },
  bodyInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryOption: {
    padding: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: '#f9fafb',
  },
  categoryOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  categoryOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  anonymousLabel: {
    fontSize: 16,
    color: '#374151',
  },
  buttonRow: {
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicDetailsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#eee',
  },
  topicDetailsContainerMobile: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#eee',
  },
  topicContent: {
    flex: 1,
  },
  commentsScrollView: {
    flex: 1,
  },
  commentsScrollViewContent: {
    paddingBottom: 20,
    paddingLeft: -13,
    paddingRight: 10,
    paddingTop: 5,
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
  topicHeader: {
    marginBottom: 12,
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
  topicMeta: {
    fontSize: 14,
    color: '#666',
  },
  clickableUsername: {
    color: '#1976d2',
    textDecorationLine: 'underline',
  },
  commentCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
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
  topicCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e3eafc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e88e5',
    marginBottom: 8,
  },
  topicMetaContainer: {
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 8,
    width: 16,
    height: 16,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  dateInputsContainer: {
    marginTop: 8,
    marginRight: 15,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    fontSize: 14,
    backgroundColor: '#fff',
    width: '100%',
  },
  topicBody: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentCountContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noTopics: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyListContent: {
    flexGrow: 1,
  },
  listContent: {
    padding: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    minWidth: 300,
    maxWidth: '80%',
    alignItems: 'center',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalError: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  modalWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  modalSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  modalHeader: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalTitleError: {
    color: '#ef4444',
  },
  modalTitleWarning: {
    color: '#f59e0b',
  },
  modalTitleSuccess: {
    color: '#10b981',
  },
  modalBody: {
    marginBottom: 16,
  },
  modalMessage: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  modalFooter: {
    alignItems: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#6b7280',
  },
  modalButtonError: {
    backgroundColor: '#ef4444',
  },
  modalButtonWarning: {
    backgroundColor: '#f59e0b',
  },
  modalButtonSuccess: {
    backgroundColor: '#10b981',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  hashtag: {
    backgroundColor: '#e5f3ff',
    color: '#0066cc',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 6,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  topicModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  topicModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  topicModalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  reportModalContent: {
    padding: 16,
  },
  reportModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  reportReasonsList: {
    maxHeight: 300,
  },
  reportReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  reportReasonItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  reportReasonRadio: {
    marginRight: 12,
  },
  reportReasonRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportReasonRadioCircleSelected: {
    borderColor: '#007BFF',
  },
  reportReasonRadioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007BFF',
  },
  reportReasonText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  reportModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  reportModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reportModalCancelButton: {
    backgroundColor: '#f8f9fa',
    marginRight: 8,
  },
  reportModalSubmitButton: {
    backgroundColor: '#007BFF',
    marginLeft: 8,
  },
  reportModalButtonDisabled: {
    backgroundColor: '#ccc',
  },
  reportModalCancelText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  reportModalSubmitText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});

export default Forum;
