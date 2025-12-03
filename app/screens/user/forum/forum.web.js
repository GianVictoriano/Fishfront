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

const Forum = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

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

  const categories = ['General', 'Fishing Tips', 'Equipment', 'Locations', 'Techniques', 'Conservation'];

  const showModal = (title, message, type = 'info') => {
    setModalConfig({ title, message, type });
    setModalVisible(true);
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
    const commentCount = topic.comments?.length || 0;
    const uniqueUsers = new Set(Array.isArray(topic.comments) ? topic.comments.map(c => c.user_id || c.user?.id).filter(Boolean) : []);
    const topicAge = Date.now() - new Date(topic.created_at).getTime();
    const hoursOld = topicAge / (1000 * 60 * 60);
    
    if (commentCount > 10 && uniqueUsers.size <= 2 && hoursOld < 1) {
      return true;
    }
    
    if (commentCount > 20 && uniqueUsers.size <= 3 && hoursOld < 6) {
      return true;
    }
    
    return false;
  };

  const calculateTopicScore = (topic) => {
    const commentCount = topic.comments?.length || 0;
    const uniqueUsers = new Set(Array.isArray(topic.comments) ? topic.comments.map(c => c.user_id || c.user?.id).filter(Boolean) : []);
    const topicAge = Date.now() - new Date(topic.created_at).getTime();
    const hoursOld = topicAge / (1000 * 60 * 60);
    
    let score = commentCount * 1 + (uniqueUsers.size * 3);
    
    if (hoursOld > 72) {
      score = score * Math.exp(-hoursOld / 336);
    }
    
    if (detectSuspiciousActivity(topic)) {
      score = score * 0.3;
    }
    
    return Math.round(score * 10) / 10;
  };

  useEffect(() => {
    if (!Array.isArray(topics)) {
      setFilteredTopics([]);
      return;
    }
    
    let filtered = topics;
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(t => t && t.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const lower = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(t => t && t.title && t.title.toLowerCase().includes(lower));
    }
    if (dateFilterEnabled && (startDate || endDate)) {
      filtered = filtered.filter(t => {
        if (!t || !t.created_at) return false;
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
    
    const sorted = Array.isArray(filtered) ? [...filtered] : [];
    if (sortOption === 'date_desc') {
      sorted.sort((a, b) => {
        const dateA = a && a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b && b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB - dateA;
      });
    } else if (sortOption === 'date_asc') {
      sorted.sort((a, b) => {
        const dateA = a && a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b && b.created_at ? new Date(b.created_at) : new Date(0);
        return dateA - dateB;
      });
    } else if (sortOption === 'alpha_asc') {
      sorted.sort((a, b) => {
        const titleA = a && a.title ? a.title : '';
        const titleB = b && b.title ? b.title : '';
        return titleA.localeCompare(titleB);
      });
    } else if (sortOption === 'alpha_desc') {
      sorted.sort((a, b) => {
        const titleA = a && a.title ? a.title : '';
        const titleB = b && b.title ? b.title : '';
        return titleB.localeCompare(titleA);
      });
    }
    setFilteredTopics(Array.isArray(sorted) ? sorted : []);
  }, [topics, searchQuery, selectedCategory, sortOption, dateFilterEnabled, startDate, endDate]);

  const fetchTopics = async () => {
    try {
      const response = await apiClient.get('/topics');
      setTopics(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching topics:', error);
      setTopics([]);
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
        setTopics(Array.isArray(topics) ? topics.map(topic => 
          topic.id === id ? { ...topic, status: 'reported' } : topic
        ) : []);
        if (selectedTopic?.id === id) {
          setSelectedTopic({ 
            ...selectedTopic, 
            status: 'reported',
            comments: Array.isArray(selectedTopic.comments) ? selectedTopic.comments : []
          });
        }
      } else if (type === 'comment') {
        await apiClient.post(`/comments/${id}/report`);
        if (selectedTopic) {
          const updatedComments = Array.isArray(selectedTopic.comments) ? selectedTopic.comments.map(comment => 
            comment.id === id ? { ...comment, status: 'reported' } : comment
          ) : [];
          setSelectedTopic({ 
            ...selectedTopic, 
            comments: updatedComments 
          });
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
      const currentUserId = '1';
      
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
              ) : selectedTopic ? (
                <View style={styles.topicDetailsContainerMobile}>
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
                        )} • {selectedTopic.created_at ? new Date(selectedTopic.created_at).toLocaleDateString() : 'Unknown date'}
                      </Text>
                    </View>
                    <Text style={styles.topicDetailsBody}>{selectedTopic.body || 'No content'}</Text>
                    <Text style={styles.commentCount}>{selectedTopic.comments?.length || 0} comments</Text>
                    <View style={styles.commentsSection}>
                      <ScrollView style={styles.commentsScrollView} contentContainerStyle={styles.commentsScrollViewContent}>
                        {Array.isArray(selectedTopic.comments) && selectedTopic.comments.length > 0 ? (
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
                                      {comment.created_at ? new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown date'}
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
                            
                            const recentComments = Array.isArray(selectedTopic.comments) ? selectedTopic.comments.slice(-5) : [];
                            const isDuplicate = recentComments.some(comment => 
                              comment && comment.body && comment.body.toLowerCase().trim() === commentText.toLowerCase().trim()
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
                              
                              updateUserCommentStats(currentUserId);
                              
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
                              const response = await apiClient.get(`/topics/${selectedTopic.id}`);
                              setSelectedTopic({
                              ...response.data,
                              comments: Array.isArray(response.data?.comments) ? response.data.comments : []
                            });
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
                  keyExtractor={(item, index) => (item.id || index).toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.topicCard}
                      onPress={() => setSelectedTopic({
                      ...item,
                      comments: Array.isArray(item.comments) ? item.comments : []
                    })}
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
                          )} • {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown date'}
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
            </ScrollView>
          ) : (
            // Desktop view (unchanged)
            <>
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
                        )} • {selectedTopic.created_at ? new Date(selectedTopic.created_at).toLocaleDateString() : 'Unknown date'}
                      </Text>
                    </View>
                    <Text style={styles.topicDetailsBody}>{selectedTopic.body || 'No content'}</Text>
                    <Text style={styles.commentCount}>{selectedTopic.comments?.length || 0} comments</Text>
                    <View style={styles.commentsSection}>
                      <ScrollView style={styles.commentsScrollView} contentContainerStyle={styles.commentsScrollViewContent}>
                        {Array.isArray(selectedTopic.comments) && selectedTopic.comments.length > 0 ? (
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
                                      {comment.created_at ? new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown date'}
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
                            
                            const recentComments = Array.isArray(selectedTopic.comments) ? selectedTopic.comments.slice(-5) : [];
                            const isDuplicate = recentComments.some(comment => 
                              comment && comment.body && comment.body.toLowerCase().trim() === commentText.toLowerCase().trim()
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
                              
                              updateUserCommentStats(currentUserId);
                              
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
                              const response = await apiClient.get(`/topics/${selectedTopic.id}`);
                              setSelectedTopic({
                              ...response.data,
                              comments: Array.isArray(response.data?.comments) ? response.data.comments : []
                            });
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
                  keyExtractor={(item, index) => (item.id || index).toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.topicCard}
                      onPress={() => setSelectedTopic({
                      ...item,
                      comments: Array.isArray(item.comments) ? item.comments : []
                    })}
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
                          )} • {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown date'}
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
            </>
          )}
        </View>
        
        {!isMobile && (
          <View style={styles.rightPanel}>
            <Text style={styles.rightPanelTitle}>Popular Topics</Text>
            {Array.isArray(topics) && topics
              .slice()
              .sort((a, b) => calculateTopicScore(b) - calculateTopicScore(a))
              .slice(0, 5)
              .map(topic => {
                const isSuspicious = detectSuspiciousActivity(topic);
                const score = calculateTopicScore(topic);
                const uniqueUsers = new Set(Array.isArray(topic.comments) ? topic.comments.map(c => c.user_id || c.user?.id).filter(Boolean) : []);
                return (
                  <TouchableOpacity
                    key={topic.id}
                    style={[
                      styles.recentTopicItem,
                      selectedTopic && selectedTopic.id === topic.id ? styles.activePopularTopic : null,
                      isSuspicious ? styles.suspiciousTopic : null
                    ]}
                    onPress={() => setSelectedTopic({
                      ...topic,
                      comments: Array.isArray(topic.comments) ? topic.comments : []
                    })}
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
        )}
      </View>
      
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
});

export default Forum;
