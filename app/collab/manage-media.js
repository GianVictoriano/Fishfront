import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';

const ManageMedia = ({ navigation }) => {
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

  const genres = ['articles', 'opinion', 'sports', 'editorial', 'creative'];

  useEffect(() => {
    fetchArticles();
  }, [selectedGenre, showFeaturedOnly]);

  useEffect(() => {
    filterArticles();
  }, [articles, search]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = {
        genre: selectedGenre !== 'all' ? selectedGenre : undefined,
        featured: showFeaturedOnly ? 'true' : undefined,
        search: search.trim() || undefined,
      };
      
      const response = await api.get('/media/articles', { params });
      setArticles(response.data.data || []);
      setFilteredArticles(response.data.data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      Alert.alert('Error', 'Failed to fetch articles');
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    if (!search.trim()) {
      setFilteredArticles(articles);
      return;
    }

    const filtered = articles.filter(article =>
      article.title.toLowerCase().includes(search.toLowerCase()) ||
      article.content.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredArticles(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchArticles();
    setRefreshing(false);
  };

  const toggleArchive = async (article) => {
    const action = article.status === 'archived' ? 'unarchive' : 'archive';
    
    try {
      const response = await api.patch(`/articles/${article.id}/archive`);
      console.log('Archive API response:', response.data);
      
      Alert.alert('Success', `Article ${action}d successfully`);
      fetchArticles();
    } catch (error) {
      console.error('Error toggling archive:', error.response?.data || error.message);
      Alert.alert('Error', `Failed to ${action} article: ${error.response?.data?.message || error.message}`);
    }
  };

  const toggleFeatured = async (article) => {
    console.log('Toggle featured called for article:', article.id, 'Current status:', article.is_featured);
    const action = article.is_featured ? 'unfeature' : 'feature';
    
    console.log('Making API call to:', `/articles/${article.id}/feature`);
    try {
      const response = await api.patch(`/articles/${article.id}/feature`);
      console.log('API response:', response.data);
      
      Alert.alert('Success', `Article ${action}d successfully`);
      fetchArticles();
    } catch (error) {
      console.error('Error toggling featured:', error.response?.data || error.message);
      Alert.alert('Error', `Failed to ${action} article: ${error.response?.data?.message || error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return '#10b981';
      case 'draft': return '#6b7280';
      case 'archived': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published': return 'checkmark-circle';
      case 'draft': return 'document-text';
      case 'archived': return 'archive';
      default: return 'document-text';
    }
  };

  const renderArticleItem = (article) => (
    <View key={article.id} style={styles.articleCard}>
      <View style={styles.articleHeader}>
        <View style={styles.articleInfo}>
          <Text style={styles.articleTitle} numberOfLines={2}>
            {article.title}
          </Text>
          <View style={styles.articleMeta}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(article.status) }]}>
              <Ionicons 
                name={getStatusIcon(article.status)} 
                size={12} 
                color="white" 
                style={styles.statusIcon}
              />
              <Text style={styles.statusText}>{article.status}</Text>
            </View>
            {article.is_featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={12} color="#fbbf24" />
                <Text style={styles.featuredText}>Featured</Text>
                {article.featured_at && (
                  <Text style={styles.featuredDate}>
                    {new Date(article.featured_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
            )}
            <Text style={styles.genreText}>{article.genre}</Text>
          </View>
          <Text style={styles.articleDate}>
            {new Date(article.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.articleContent} numberOfLines={3}>
        {article.content.replace(/<[^>]*>/g, '')}
      </Text>

      <View style={styles.articleActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.featureButton]}
          onPress={() => {
            console.log('Feature button clicked for article:', article.id, 'is_featured:', article.is_featured);
            toggleFeatured(article);
          }}
        >
          <Ionicons 
            name={article.is_featured ? "star" : "star-outline"} 
            size={16} 
            color={article.is_featured ? "#fbbf24" : "#6b7280"} 
          />
          <Text style={[styles.actionText, { color: article.is_featured ? "#fbbf24" : "#6b7280" }]}>
            {article.is_featured ? 'Featured' : 'Feature'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.archiveButton]}
          onPress={() => toggleArchive(article)}
        >
          <Ionicons 
            name={article.status === 'archived' ? "archive" : "archive-outline"} 
            size={16} 
            color={article.status === 'archived' ? "#f97316" : "#6b7280"} 
          />
          <Text style={[styles.actionText, { color: article.status === 'archived' ? "#f97316" : "#6b7280" }]}>
            {article.status === 'archived' ? 'Archived' : 'Archive'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading your articles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Manage Media</Text>
          <Text style={styles.subtitle}>
            View, edit, archive, and feature your published articles
          </Text>
        </View>
        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.genreFilters}>
              {['all', ...genres].map((genre) => (
                <TouchableOpacity
                  key={genre}
                  style={[
                    styles.genreFilterChip,
                    selectedGenre === genre && styles.genreFilterChipActive,
                  ]}
                  onPress={() => setSelectedGenre(genre)}
                >
                  <Text
                    style={[
                      styles.genreFilterChipText,
                      selectedGenre === genre && styles.genreFilterChipTextActive,
                    ]}
                  >
                    {genre.charAt(0).toUpperCase() + genre.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity
            style={[
              styles.featuredToggle,
              showFeaturedOnly && styles.featuredToggleActive,
            ]}
            onPress={() => setShowFeaturedOnly(!showFeaturedOnly)}
          >
            <Ionicons 
              name="star" 
              size={16} 
              color={showFeaturedOnly ? "#fbbf24" : "#6b7280"} 
            />
            <Text
              style={[
                styles.featuredToggleText,
                showFeaturedOnly && styles.featuredToggleTextActive,
              ]}
            >
              Featured
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search articles..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <ScrollView
        style={styles.articlesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredArticles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>
              {search ? 'No articles found matching your search' : 'No articles found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {search ? 'Try adjusting your search terms' : 'Start by creating your first article'}
            </Text>
          </View>
        ) : (
          filteredArticles.map(renderArticleItem)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 16,
  },
  titleSection: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  filtersSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genreFilters: {
    flexDirection: 'row',
    marginRight: 16,
  },
  genreFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  genreFilterChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  genreFilterChipText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  genreFilterChipTextActive: {
    color: 'white',
  },
  featuredToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  featuredToggleActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
  },
  featuredToggleText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  featuredToggleTextActive: {
    color: '#92400e',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#111827',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterScrollView: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: 'white',
  },
  articlesList: {
    flex: 1,
    padding: 16,
  },
  articleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  articleHeader: {
    marginBottom: 12,
  },
  articleInfo: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 24,
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    marginRight: 8,
  },
  featuredText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400e',
    marginLeft: 4,
  },
  featuredDate: {
    fontSize: 10,
    color: '#92400e',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  genreText: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  articleDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  articleContent: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  articleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    minWidth: 60,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  editButton: {
    backgroundColor: '#eff6ff',
  },
  featureButton: {
    backgroundColor: '#fef3c7',
  },
  archiveButton: {
    backgroundColor: '#f0fdf4',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalSaveButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  modalSaveText: {
    color: 'white',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  formTextarea: {
    height: 200,
    textAlignVertical: 'top',
  },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  genreChipActive: {
    backgroundColor: '#3b82f6',
  },
  genreChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  genreChipTextActive: {
    color: 'white',
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  statusChipActive: {
    backgroundColor: '#10b981',
  },
  statusChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusChipTextActive: {
    color: 'white',
  },
});

export default ManageMedia;
