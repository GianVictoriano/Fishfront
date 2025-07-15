// app/forum.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Button, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, SafeAreaView, Platform
} from 'react-native';
import Navbar from '../components/Navbar';
import { useRouter } from 'expo-router';
import apiClient from '../utils/api';

export default function ForumScreen() {
  const [navVisible, setNavVisible] = useState(false);
  const router = useRouter();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: '', body: '', category: '' });
  const [submitting, setSubmitting] = useState(false);

  const categories = ['Sports', 'Literature', 'Technology', 'Other'];
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [sortOption, setSortOption] = useState('date_desc');

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTopics, setFilteredTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

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

  const handleCreateTopic = async () => {
    if (!newTopic.title.trim() || !newTopic.category) return;
    
    setSubmitting(true);
    try {
      const payload = {
        title: newTopic.title,
        body: newTopic.body,
        category: newTopic.category
      };
      await apiClient.post('/topics', payload);
      setNewTopic({ title: '', body: '', category: '' });
      setShowNewTopicForm(false);
      await fetchTopics();
    } catch (error) {
      console.error('Detailed error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      alert(`Error creating topic: ${error.response?.data?.message || error.message}`);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Loading Topics...</Text>
      </SafeAreaView>
    );
  }

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
      </View>
      <View style={styles.buttonRow}>
        <Button 
          title="Cancel" 
          onPress={() => {
            setShowNewTopicForm(false);
            setNewTopic({ title: '', body: '', category: '' });
          }} 
          color="#999"
        />
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
      {Platform.OS === 'web' ? (
        <Navbar />
      ) : (
        <>
          <TouchableOpacity style={styles.menuButton} onPress={() => setNavVisible(true)}>
            <Text style={styles.menuButtonText}>☰</Text>
          </TouchableOpacity>
          <Modal
            animationType="slide"
            transparent
            visible={navVisible}
            onRequestClose={() => setNavVisible(false)}
          >
            <TouchableOpacity style={styles.modalOverlayNav} activeOpacity={1} onPressOut={() => setNavVisible(false)}>
              <View style={styles.modalViewNav}>
                <Navbar onLinkPress={() => setNavVisible(false)} />
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}

      {/* Forum header and Create New Topic button under Navbar */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Fisherman Forum</Text>
        <Button title={showNewTopicForm ? "Cancel" : "Create New Topic"} onPress={() => setShowNewTopicForm(!showNewTopicForm)} />
      </View>
      {showNewTopicForm && renderNewTopicForm()}
      {/* Three-panel row: sidebar, main, right panel */}
      <View style={styles.outerContainer}>
        {Platform.OS === 'web' && renderSidebar()}
        <View style={{ flex: 3, flexDirection: 'column' }}>
          {/* Main content area: topic list or topic details */}
          {selectedTopic ? (
            <View style={styles.topicDetailsContainer}>
              <TouchableOpacity style={styles.backButton} onPress={() => setSelectedTopic(null)}>
                <Text style={styles.backButtonIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.topicDetailsTitle}>{selectedTopic.title}</Text>
              <Text style={styles.topicMeta}>
                {selectedTopic.user?.name || 'Anonymous'} • {new Date(selectedTopic.created_at).toLocaleDateString()}
              </Text>
              <Text style={styles.topicDetailsBody}>{selectedTopic.body}</Text>
              <Text style={styles.commentCount}>{selectedTopic.comments?.length || 0} comments</Text>
              <View style={styles.commentsSection}>
                {selectedTopic.comments && selectedTopic.comments.length > 0 ? (
                  selectedTopic.comments.map((comment, idx) => (
                    <View key={comment.id || idx} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>{comment.user?.name || 'Anonymous'}</Text>
                        <Text style={styles.commentDate}>{new Date(comment.created_at).toLocaleDateString()}</Text>
                      </View>
                      <Text style={styles.commentBody}>{comment.body}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noComments}>No comments yet.</Text>
                )}
                {/* Add Comment Form */}
                <View style={styles.addCommentSection}>
                  <TextInput
                    style={styles.addCommentInput}
                    placeholder="Add a comment..."
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.addCommentButton}
                    onPress={async () => {
                      if (!commentText.trim()) return;
                      setPostingComment(true);
                      // Simulate posting (append locally)
                      const newComment = {
                        id: Date.now(),
                        body: commentText,
                        created_at: new Date().toISOString(),
                        user: { name: "You" },
                      };
                      setSelectedTopic(prev => ({
                        ...prev,
                        comments: [...(prev.comments || []), newComment],
                      }));
                      setCommentText("");
                      setPostingComment(false);
                    }}
                    disabled={postingComment || !commentText.trim()}
                  >
                    <Text style={styles.addCommentButtonText}>{postingComment ? 'Posting...' : 'Post Comment'}</Text>
                  </TouchableOpacity>
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
                  <Text style={styles.topicMeta}>
                    {item.user?.name || 'Anonymous'} • {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                  {item.body && (
                    <Text style={styles.topicBody} numberOfLines={2} ellipsizeMode="tail">
                      {item.body}
                    </Text>
                  )}
                  <Text style={styles.commentCount}>
                    {item.comments?.length || 0} comments
                  </Text>
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
        {Platform.OS === 'web' && (
          <View style={styles.rightPanel}>
            <Text style={styles.rightPanelTitle}>Popular Topics</Text>
            {topics
              .slice()
              .sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0))
              .slice(0, 5)
              .map(topic => (
                <TouchableOpacity
                  key={topic.id}
                  style={[
                    styles.recentTopicItem,
                    selectedTopic && selectedTopic.id === topic.id ? styles.activePopularTopic : null
                  ]}
                  onPress={() => setSelectedTopic(topic)}
                >
                  <View style={styles.recentTopicRow}>
                    <Text style={styles.recentTopicTitle} numberOfLines={1}>{topic.title}</Text>
                    <Text style={styles.recentTopicCount}>{topic.comments?.length || 0}</Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        )}
      </View>
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
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e3eafc',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: '#0d47a1',
    fontSize: 15,
  },
  commentDate: {
    color: '#888',
    fontSize: 13,
  },
  commentBody: {
    color: '#333',
    fontSize: 15,
    lineHeight: 20,
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
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 16,
    minHeight: 200,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#eee',
  },
  topicDetailsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e88e5',
    marginBottom: 8,
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
    marginRight: 10,
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
    marginLeft: 12, // reduced space from center
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

  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 10 : 40,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  menuButtonText: {
    fontSize: 28,
    color: '#007BFF',
  },
  modalOverlayNav: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalViewNav: {
    width: '75%',
    height: '100%',
    backgroundColor: '#fff',
  },
  outerContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12, // reduced space between panels
  },
  sidebar: {
    width: 280,
    backgroundColor: '#fff',
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderRightWidth: 1,
    borderRightColor: '#eee',
    marginRight: 12, // reduced space to center panel
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
  recentTopic: {
    paddingVertical: 4,
    color: '#333'
  },
  categoryFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
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
  filtersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#f1f3f6',
    marginRight: 8,
  },
  filtersToggleText: {
    color: '#1e88e5',
    fontWeight: 'bold',
    fontSize: 15,
    marginRight: 6,
  },
  filtersToggleIcon: {
    color: '#1e88e5',
    fontSize: 14,
  },
  searchToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#f1f3f6',
    marginRight: 4,
  },
  searchToggleIcon: {
    fontSize: 14,
    color: '#1e88e5',
    marginRight: 2,
  },
  searchToggleTextSmall: {
    color: '#1e88e5',
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersModalPanel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    minWidth: 220,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 30,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filtersPopoverTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e88e5',
    marginBottom: 6,
    marginTop: 2,
    letterSpacing: 0.2
  },
  sortButton: {
    borderWidth: 0,
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 3,
    backgroundColor: '#f1f3f6',
  },
  sortButtonActive: {
    backgroundColor: '#1e88e5',
  },
  sortButtonText: {
    color: '#333',
    fontWeight: '500',
    fontSize: 13,
    letterSpacing: 0.1,
  },
  sortButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.1,
  },
  filterButton: {
    borderWidth: 0,
    borderRadius: 24,
    minHeight: 36,
    minWidth: 80,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginRight: 12,
    marginBottom: 10,
    backgroundColor: '#f1f3f6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: '#1e88e5',
    elevation: 4,
  },
  filterButtonText: {
    color: '#333',
    fontWeight: '500',
    fontSize: 15,
  },
  filterButtonTextActive: {
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
  topicMeta: {
    color: '#666',
    fontSize: 12,
    marginBottom: 8,
  },
  topicBody: {
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  commentCount: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
  },
  noTopics: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
});