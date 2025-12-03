import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Button, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, SafeAreaView, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import apiClient from '../../../../utils/api';

export default function ManageForumScreen() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState('date_desc');
  const [filteredTopics, setFilteredTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active');
  const [selectedComment, setSelectedComment] = useState(null);
  const [viewMode, setViewMode] = useState('topics'); // 'topics' or 'comments'

  const categories = ['Sports', 'Literature', 'Technology', 'Other'];
  const statuses = [
    { value: 'active', label: 'Active' },
    { value: 'reported', label: 'Reported' },
    { value: 'deleted', label: 'Deleted' }
  ];

  useEffect(() => {
    let filtered = [...topics];
    
    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    
    // Apply status and view mode filters
    if (statusFilter === 'active') {
      // For active view, show all non-deleted topics
      filtered = filtered.filter(t => t.status !== 'deleted');
    } else if (statusFilter === 'reported' || statusFilter === 'deleted') {
      // For reported/deleted views, filter based on view mode
      if (viewMode === 'topics') {
        filtered = filtered.filter(t => t.status === statusFilter);
      } else {
        // For comments view, show topics that have comments matching the status
        filtered = filtered.filter(topic => 
          Array.isArray(topic.comments) && topic.comments.some(comment => comment.status === statusFilter)
        );
      }
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const lower = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(lower) || 
        (t.user && t.user.name.toLowerCase().includes(lower))
      );
    }
    
    // Apply sorting
    const sorted = Array.isArray(filtered) ? [...filtered] : [];
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
  }, [topics, searchQuery, selectedCategory, sortOption, statusFilter]);

  const fetchTopics = async () => {
    try {
      console.log('Fetching topics...');
      const response = await apiClient.get('/topics');
      console.log('Topics response:', response);
      
      if (response && response.data) {
        // Handle paginated response - get the data array
        const topicsData = response.data.data || response.data;
        console.log('Fetched topics:', topicsData);
        
        // Ensure it's an array before setting state
        if (Array.isArray(topicsData)) {
          setTopics(topicsData);
        } else {
          console.error('Topics data is not an array:', topicsData);
          setTopics([]);
        }
      } else {
        console.error('Unexpected response format:', response);
        Alert.alert('Error', 'Received unexpected response format from server');
        setTopics([]);
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error status:', error.response.status);
        Alert.alert('Error', `Server responded with status ${error.response.status}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        Alert.alert('Error', 'No response received from server. Please check your connection.');
      } else {
        console.error('Error setting up request:', error.message);
        Alert.alert('Error', `Failed to load forum topics: ${error.message}`);
      }
      setTopics([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteTopic = async (topicId) => {
    setActionLoading(true);
    try {
      await apiClient.delete(`/topics/${topicId}`);
      await fetchTopics();
      setSelectedTopic(null);
      setShowDeleteModal(false);
      Alert.alert('Success', 'Topic deleted successfully');
    } catch (error) {
      console.error('Error deleting topic:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete topic');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    setActionLoading(true);
    try {
      await apiClient.delete(`/comments/${commentId}`);
      await fetchTopics(); // Refresh the topics to update the comments list
      setSelectedComment(null);
      setShowDeleteCommentModal(false);
      Alert.alert('Success', 'Comment deleted successfully');
    } catch (error) {
      console.error('Error deleting comment:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to delete comment');
    } finally {
      setActionLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTopics();
  };

  const confirmDeleteComment = (comment) => {
    setSelectedComment(comment);
    setShowDeleteCommentModal(true);
  };
  
  useEffect(() => {
    fetchTopics();
  }, []);

  const renderCommentCard = (comment, topic) => (
    <View key={`comment-${comment.id}`} style={[styles.topicItem, styles.commentCard]}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentTopicTitle} numberOfLines={1}>
          Re: {topic.title}
        </Text>
        <Text style={styles.commentMeta}>
          by {comment.user?.name || 'Anonymous'} • {new Date(comment.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.commentBody}>
        {comment.body}
      </Text>
      <View style={styles.commentFooter}>
        <TouchableOpacity 
          onPress={() => confirmDeleteComment(comment)}
          style={styles.deleteButton}
        >
          <Feather name="trash-2" size={16} color="#e74c3c" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTopicItem = ({ item }) => {
    // For active view, show comments in the topic card
    if (statusFilter === 'active') {
      // Debug: Log the comments array to see what we're working with
      console.log('All comments for topic:', JSON.stringify(item.comments, null, 2));
      
      // Show all comments regardless of status in active view
      const allComments = Array.isArray(item.comments) 
        ? item.comments.filter(comment => comment && comment.body) // Only filter out falsy comments or those without body
        : [];
      
      console.log('All valid comments:', allComments);
      const commentCount = allComments.length;
      const showComments = allComments.slice(0, 2);
      console.log('Showing comments:', showComments);
      
      return (
        <View style={styles.topicItem}>
          <View style={styles.topicHeader}>
            <Text style={styles.topicTitle}>
              {item.title}
            </Text>
            <Text style={styles.topicMeta}>
              by {item.user?.name || 'Unknown'} • {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          <Text style={styles.topicExcerpt} numberOfLines={2}>
            {item.body?.substring(0, 150)}{item.body?.length > 150 ? '...' : ''}
          </Text>
          
          {/* Comments Section - Only for active view */}
          {commentCount > 0 && (
            <View style={[styles.commentsContainer, styles.activeComments]}>
              <Text style={styles.commentsHeader}>
                {commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}:
              </Text>
              {showComments.map((comment, index) => (
                <View key={comment.id || index} style={styles.commentItem}>
                  <View style={styles.commentContent}>
                    <Text style={styles.commentAuthor}>
                      {comment.user?.name || 'Anonymous'}:
                    </Text>
                    <Text style={styles.commentText} numberOfLines={1}>
                      {comment.body}
                    </Text>
                    {comment.status && comment.status !== 'active' && (
                      <Text style={[styles.commentStatus, styles[`status-${comment.status}`]]}>
                        {comment.status.toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity 
                    onPress={() => confirmDeleteComment(comment)}
                    style={styles.deleteCommentButton}
                  >
                    <Feather name="trash-2" size={14} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.topicFooter}>
            <View style={styles.topicStats}>
              <Text style={styles.stat}>
                <Feather name="message-square" size={14} /> {commentCount}
              </Text>
              {item.status === 'reported' && (
                <Text style={[styles.stat, styles.reportCount]}>⚠️ Reported</Text>
              )}
            </View>
            <View style={styles.topicActions}>
              <TouchableOpacity onPress={() => {
                setSelectedTopic(item);
                setShowDeleteModal(true);
              }}>
                <Feather name="trash-2" size={20} color="#e74c3c" style={styles.actionIcon} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }
    
    // For reported/deleted views, just show the topic info
    return (
      <View style={styles.topicItem}>
        <View style={styles.topicHeader}>
          <Text style={styles.topicTitle}>
            {item.title}
          </Text>
          <Text style={styles.topicMeta}>
            by {item.user?.name || 'Unknown'} • {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.topicExcerpt} numberOfLines={2}>
          {item.body?.substring(0, 150)}{item.body?.length > 150 ? '...' : ''}
        </Text>
        
        <View style={styles.topicFooter}>
          <View style={styles.topicStats}>
            <Text style={styles.stat}>
              <Feather name="message-square" size={14} /> {item.comments?.length || 0}
            </Text>
            <Text style={[styles.stat, styles.reportCount]}>
              {item.status === 'reported' ? '⚠️ Reported' : '🗑️ Deleted'}
            </Text>
          </View>
          <View style={styles.topicActions}>
            <TouchableOpacity onPress={() => {
              setSelectedTopic(item);
              setShowDeleteModal(true);
            }}>
              <Feather name="trash-2" size={20} color="#e74c3c" style={styles.actionIcon} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderViewTabs = () => {
    if (statusFilter === 'active') return null; // No tabs for active view
    
    return (
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, viewMode === 'topics' && styles.activeTab]}
          onPress={() => setViewMode('topics')}
        >
          <Text style={[styles.tabText, viewMode === 'topics' && styles.activeTabText]}>
            Topics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, viewMode === 'comments' && styles.activeTab]}
          onPress={() => setViewMode('comments')}
        >
          <Text style={[styles.tabText, viewMode === 'comments' && styles.activeTabText]}>
            Comments
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filterContainer}>
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={viewMode === 'comments' ? 'Search comments...' : 'Search topics...'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <View style={styles.filterRow}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Category:</Text>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={styles.dropdown}
          >
            <option value="All">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </View>
        
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Status:</Text>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={styles.dropdown}
            >
              <option value="active">Active</option>
              <option value="reported">Reported</option>
              <option value="deleted">Deleted</option>
            </select>
        </View>
        
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Sort By:</Text>
          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value)}
            style={styles.dropdown}
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="alpha_asc">A-Z</option>
            <option value="alpha_desc">Z-A</option>
            <option value="reports">Most Reported</option>
          </select>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Loading forum topics...</Text>
      </SafeAreaView>
    );
  }

  // Render comments as separate cards in the list
  const renderCommentsList = () => {
    const commentItems = [];
    
    // Ensure filteredTopics is an array before iterating
    if (!Array.isArray(filteredTopics)) {
      console.error('filteredTopics is not an array:', filteredTopics);
      return (
        <View style={styles.centered}>
          <Feather name="message-square" size={48} color="#ddd" />
          <Text style={styles.emptyText}>
            Error loading comments
          </Text>
        </View>
      );
    }
    
    filteredTopics.forEach(topic => {
      const topicComments = topic.comments?.filter(comment => comment.status === statusFilter) || [];
      topicComments.forEach(comment => {
        commentItems.push({
          ...comment,
          topic: {
            id: topic.id,
            title: topic.title,
            user: topic.user
          }
        });
      });
    });
    
    if (commentItems.length === 0) {
      return (
        <View style={styles.centered}>
          <Feather name="message-square" size={48} color="#ddd" />
          <Text style={styles.emptyText}>
            No {statusFilter} comments found
          </Text>
        </View>
      );
    }
    
    return (
      <FlatList
        data={commentItems}
        renderItem={({ item }) => renderCommentCard(item, item.topic)}
        keyExtractor={item => `comment-${item.id}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Forum Management</Text>
        
        {renderFilters()}
        {renderViewTabs()}
        
        {statusFilter !== 'active' && viewMode === 'comments' ? (
          renderCommentsList()
        ) : (
          <FlatList
            data={filteredTopics}
            renderItem={renderTopicItem}
            keyExtractor={item => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="message-square" size={48} color="#ddd" />
                <Text style={styles.emptyText}>
                  {statusFilter === 'active' ? 'No active topics found' : `No ${statusFilter} topics found`}
                </Text>
              </View>
            }
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
      
      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Topic</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete "{selectedTopic?.title}"? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setShowDeleteModal(false)}
                color="#666"
                disabled={actionLoading}
              />
              <Button
                title={actionLoading ? 'Deleting...' : 'Delete'}
                onPress={() => handleDeleteTopic(selectedTopic?.id)}
                color="#e74c3c"
                disabled={actionLoading}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Comment Confirmation Modal */}
      <Modal
        visible={showDeleteCommentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteCommentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Comment</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete this comment? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setShowDeleteCommentModal(false)}
                color="#666"
                disabled={actionLoading}
              />
              <Button
                title={actionLoading ? 'Deleting...' : 'Delete'}
                onPress={() => handleDeleteComment(selectedComment?.id)}
                color="#e74c3c"
                disabled={actionLoading}
              />
            </View>
          </View>
        </View>
      </Modal>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  commentsContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
  },
  reportedComments: {
    backgroundColor: '#fff5f5',
    borderLeftWidth: 3,
    borderLeftColor: '#e74c3c',
  },
  noReportedComments: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 3,
    borderLeftColor: '#95a5a6',
  },
  noCommentsText: {
    color: '#7f8c8d',
    fontStyle: 'italic',
    fontSize: 13,
  },
  commentsHeader: {
    fontWeight: '600',
    marginBottom: 6,
    color: '#2c3e50',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007BFF',
    fontWeight: '600',
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff9f9',
    borderRadius: 4,
  },
  commentContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  deleteCommentButton: {
    padding: 4,
    marginLeft: 8,
    borderRadius: 4,
  },
  commentAuthor: {
    fontWeight: '600',
    marginRight: 6,
    color: '#2c3e50',
    fontSize: 13,
  },
  commentText: {
    flex: 1,
    color: '#34495e',
    fontSize: 13,
  },
  viewMoreComments: {
    marginTop: 4,
    color: '#3498db',
    fontSize: 12,
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
    padding: 16,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
  },
  filterContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#333',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterGroup: {
    flex: 1,
    minWidth: 180,
  },
  filterLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  dropdown: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  listContainer: {
    paddingBottom: 20,
  },
  topicItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  commentCard: {
    marginLeft: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#e0e0e0',
  },
  commentHeader: {
    marginBottom: 8,
  },
  commentTopicTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  commentMeta: {
    fontSize: 12,
    color: '#888',
  },
  commentBody: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#e74c3c',
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  commentCard: {
    marginLeft: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#e0e0e0',
  },
  commentHeader: {
    marginBottom: 8,
  },
  commentTopicTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  commentMeta: {
    fontSize: 12,
    color: '#888',
  },
  commentBody: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#e74c3c',
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  commentCard: {
    marginLeft: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#e0e0e0',
  },
  commentHeader: {
    marginBottom: 8,
  },
  commentTopicTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  commentMeta: {
    fontSize: 12,
    color: '#888',
  },
  commentBody: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#e74c3c',
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  pinnedTopic: {
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  topicHeader: {
    marginBottom: 8,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  topicMeta: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  topicExcerpt: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    lineHeight: 20,
  },
  topicFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  topicStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stat: {
    fontSize: 13,
    color: '#7f8c8d',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportCount: {
    color: '#e74c3c',
    fontWeight: '500',
  },
  topicActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    color: '#95a5a6',
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    borderRadius: 8,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#2c3e50',
  },
  commentText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
    lineHeight: 22,
  },
  commentStatus: {
    fontSize: 10,
    padding: 2,
    borderRadius: 3,
    marginLeft: 8,
    color: '#fff',
    backgroundColor: '#888',
    alignSelf: 'flex-start',
  },
  'status-reported': {
    backgroundColor: '#e67e22',
  },
  'status-deleted': {
    backgroundColor: '#e74c3c',
    textDecoration: 'line-through',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});