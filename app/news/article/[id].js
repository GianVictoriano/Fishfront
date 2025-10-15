import React, { useEffect, useState, useRef } from 'react';
import RenderHTML from 'react-native-render-html';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  SafeAreaView, 
  Platform, 
  TouchableOpacity,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import Navbar from '../../../components/Navbar';
import NewsNavbar from '../../../components/newsnavbar';
import apiClient from '../../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useArticleTracking from '../../../hooks/useArticleTracking';
import { MaterialIcons, Feather } from '@expo/vector-icons';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    width: '100%',
  },
  contentContainer: {
    alignItems: 'flex-start',
    minHeight: '100vh',
  },
  detailWrapper: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'flex-start',
    marginVertical: 24,
  },
  image: {
    width: '100%',
    height: 320,
    objectFit: 'cover',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    width: '100%',
    textAlign: 'left',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1a1a1a',
    textAlign: 'left',
    width: '100%',
  },
  meta: {
    color: '#555',
    fontWeight: '500',
    marginBottom: 18,
    fontSize: 14,
    textTransform: 'capitalize',
    textAlign: 'left',
    width: '100%',
  },
  metricsContainer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  metricsText: {
    fontSize: 14,
    color: '#4b5563',
    marginRight: 20,
  },
  reactionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  reactBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  reactLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
    position: 'relative',
  },
  rowMain: {
    flexDirection: 'row',
    minHeight: '100%',
    padding: 24,
  },
  articleContainer: {
    width: '75%',
    paddingRight: 24,
  },
  sidebar: {
    width: '25%',
    paddingLeft: 24,
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  storyItem: {
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactIcon: {
    marginRight: 10,
    color: '#93c5fd',
  },
  contactText: {
    color: 'white',
    fontSize: 14,
  },
  copyrightBar: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#495f6b',
    marginTop: 30,
  },
  copyrightText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
    footer: {
    backgroundColor: '#3a505b',
    color: 'white',
    padding: '40px 20px 20px',
    marginTop: '40px',
    marginLeft: -24,
    marginRight: -24,
    marginBottom: -24,
    flexShrink: 0,
    width: 'calc(100% + 48px)',
    alignSelf: 'stretch',
  },
  footerContent: {
    marginLeft: '30px',
    maxWidth: '1200px',
    margin: '0 auto',
    flexWrap: 'wrap',
    gap: '40px',
    marginBottom: '0px',
  },
  footerSection: {
    flex: 1,
    minWidth: '250px',
  },
  footerHeading: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '20px',
    color: 'white',
    paddingTop: '20px',
  },
    copyright: {
    textAlign: 'center',
    padding: '20px',
    borderTop: '1px solid #334155',
    color: '#94a3b8',
    fontSize: '0.9rem',
  },
    footerLink: {
    color: 'white',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    ':hover': {
      color: '#ffffff',
      textDecoration: 'underline',
    },
  },
});

export default function ArticleDetail() {
  const router = useRouter();
  const { id: articleId } = useLocalSearchParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reactingType, setReactingType] = useState(null);
  const [newsData, setNewsData] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Add activeGenre state for navbar
  const [activeGenre, setActiveGenre] = useState('News');
  
  // Bookmark states
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState(null);
  const [showBookmarkButton, setShowBookmarkButton] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);
  const [bookmarkNotes, setBookmarkNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const contentRef = useRef(null);

  // Initialize article tracking (time & scroll)
  const { handleScroll, currentScrollPercentage, timeSpent } = useArticleTracking(
    articleId, 
    currentUser?.id
  );

  // Load activeGenre from AsyncStorage on mount
  useEffect(() => {
    const loadActiveGenre = async () => {
      try {
        const savedGenre = await AsyncStorage.getItem('activeNewsGenre');
        if (savedGenre && ['News', 'Articles', 'Opinion', 'Sports', 'Editorial', 'Creative'].includes(savedGenre)) {
          setActiveGenre(savedGenre);
        }
      } catch (error) {
        console.log('Error loading active genre:', error);
      }
    };
    loadActiveGenre();
  }, []);

  // Get current user for tracking
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token'); // Fixed: use 'auth_token' not 'authToken'
        console.log('🔑 Auth Token:', token ? 'EXISTS' : 'MISSING');
        if (token) {
          const userData = await AsyncStorage.getItem('user_data');
          if (userData) {
            const user = JSON.parse(userData);
            console.log('👤 Current User:', user);
            setCurrentUser(user);
          } else {
            // Fallback: fetch from API
            const response = await apiClient.get('/user');
            console.log('👤 Current User (from API):', response.data);
            setCurrentUser(response.data);
          }
        } else {
          console.log('⚠️ No auth token - user not logged in');
        }
      } catch (error) {
        console.error('❌ Error getting user:', error);
      }
    };
    getCurrentUser();
  }, []);

  // Fetch bookmarks for this article
  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!articleId || !currentUser) return;
      
      try {
        const response = await apiClient.get(`/bookmarks/article/${articleId}`);
        setBookmarks(response.data);
      } catch (error) {
        console.error('Error fetching bookmarks:', error);
      }
    };
    
    fetchBookmarks();
  }, [articleId, currentUser]);

  // Inject CSS to enable text selection on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Add CSS to enable text selection in article content
    const style = document.createElement('style');
    style.innerHTML = `
      .article-content {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        cursor: text !important;
      }
      .article-content * {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
      .article-content p,
      .article-content span,
      .article-content div,
      .article-content h1,
      .article-content h2,
      .article-content h3,
      .article-content li,
      .article-content blockquote {
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
      
      if (text && text.length > 0) {
        setSelectedText(text);
        
        // Get selection position for button placement
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setSelectionPosition({
          top: rect.top + window.scrollY - 50,
          left: rect.left + rect.width / 2
        });
        setShowBookmarkButton(true);
      } else {
        setShowBookmarkButton(false);
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  // Save bookmark
  const handleSaveBookmark = async () => {
    if (!selectedText || !currentUser) {
      Alert.alert('Error', 'Please log in to save bookmarks');
      return;
    }

    try {
      const response = await apiClient.post('/bookmarks', {
        article_id: articleId,
        highlighted_text: selectedText,
        notes: bookmarkNotes || null
      });

      setBookmarks([...bookmarks, response.data.bookmark]);
      setShowBookmarkButton(false);
      setShowNotesModal(false);
      setBookmarkNotes('');
      setSelectedText('');
      
      // Clear selection
      if (Platform.OS === 'web') {
        window.getSelection().removeAllRanges();
      }
      
      Alert.alert('Success', 'Bookmark saved successfully!');
    } catch (error) {
      console.error('Error saving bookmark:', error);
      Alert.alert('Error', 'Failed to save bookmark');
    }
  };

  // Delete bookmark
  const handleDeleteBookmark = async (bookmarkId) => {
    try {
      await apiClient.delete(`/bookmarks/${bookmarkId}`);
      setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
      Alert.alert('Success', 'Bookmark deleted');
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      Alert.alert('Error', 'Failed to delete bookmark');
    }
  };

  // Handle genre change from navbar - save to storage and navigate back to news
  const handleGenreChange = async (genre) => {
    setActiveGenre(genre);
    try {
      await AsyncStorage.setItem('activeNewsGenre', genre);
      // Navigate back to news page with the selected genre
      router.push('/news');
    } catch (error) {
      console.log('Error saving active genre:', error);
      router.push('/news');
    }
  };

  // Fetch article data
  useEffect(() => {
    if (!articleId) return;
    
    const fetchArticle = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/public/articles/${articleId}`);
        const raw = res.data?.data ? res.data.data : res.data;
        
        // Map backend data to front-end expectations
        const mapped = {
          id: raw.id?.toString() || '',
          title: raw.title,
          content: raw.content,
          published_at: raw.published_at,
          // Build full image URL if media exists
          image: raw.media && raw.media.length > 0
            ? `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}/storage/${raw.media[0].file_path.replace('public/', '')}`
            : null,
          author: raw.user?.name || null,
          metrics: raw.metrics ?? { visits: 0, like_count: 0, heart_count: 0, sad_count: 0, wow_count: 0 },
        };
        setArticle(mapped);
        
        // Track the visit after successfully loading the article
        try {
          await apiClient.post(`/public/articles/${articleId}/visit`);
        } catch (visitError) {
          console.error('Error tracking visit:', visitError);
          // Don't fail the whole component if visit tracking fails
        }
      } catch (err) {
        console.error('Error fetching article:', err);
        setError('Failed to load article');
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticle();
  }, [articleId]);

  // Fetch related articles using ML-based content similarity
  useEffect(() => {
    const fetchRelatedArticles = async () => {
      if (!article) return;
      
      try {
        const res = await apiClient.get('/public/articles');
        if (Array.isArray(res.data?.data)) {
          const allArticles = res.data.data.filter(item => item.id?.toString() !== articleId);
          
          // Calculate similarity scores based on content analysis
          const scoredArticles = allArticles.map(otherArticle => {
            const similarity = calculateContentSimilarity(article, otherArticle);
            return {
              ...otherArticle,
              id: otherArticle.id?.toString() || '',
              similarity
            };
          });
          
          // Sort by similarity and take top 10
          const related = scoredArticles
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 10);
          
          setNewsData(related);
        }
      } catch (err) {
        console.error('Error fetching related articles:', err);
      }
    };
    
    if (article && articleId) {
      fetchRelatedArticles();
    }
  }, [article, articleId]);

  // Debug: Log tracking status
  useEffect(() => {
    if (articleId && currentUser?.id) {
      console.log('🔍 Tracking Status:', {
        articleId,
        userId: currentUser?.id,
        isTracking: true,
        currentScrollPercentage,
        timeSpent
      });
    }
  }, [articleId, currentUser, currentScrollPercentage, timeSpent]);

  // ML-based content similarity calculation
  const calculateContentSimilarity = (currentArticle, otherArticle) => {
    let score = 0;
    
    // Genre similarity (high weight)
    if (currentArticle.genre === otherArticle.genre) {
      score += 0.5;
    }
    
    // Title similarity using advanced text analysis
    const titleSimilarity = calculateAdvancedTextSimilarity(currentArticle.title, otherArticle.title);
    score += titleSimilarity * 0.3;
    
    // Content similarity (if available)
    if (currentArticle.content && otherArticle.content) {
      const contentSimilarity = calculateAdvancedTextSimilarity(
        stripHtmlTags(currentArticle.content), 
        stripHtmlTags(otherArticle.content)
      );
      score += contentSimilarity * 0.2;
    }
    
    return score;
  };
  
  // Advanced text similarity using TF-IDF-like approach
  const calculateAdvancedTextSimilarity = (text1, text2) => {
    if (!text1 || !text2) return 0;
    
    const words1 = tokenizeAndNormalize(text1);
    const words2 = tokenizeAndNormalize(text2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    // Calculate word frequency vectors
    const allWords = new Set([...words1, ...words2]);
    const vector1 = [];
    const vector2 = [];
    
    allWords.forEach(word => {
      vector1.push(getWordFrequency(word, words1));
      vector2.push(getWordFrequency(word, words2));
    });
    
    return calculateCosineSimilarity(vector1, vector2);
  };
  
  // Tokenize and normalize text for ML processing
  const tokenizeAndNormalize = (text) => {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those']);
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .map(word => stemWord(word));
  };
  
  // Basic word stemming
  const stemWord = (word) => {
    const suffixes = ['ing', 'ed', 'er', 'est', 'ly', 'ion', 'tion', 'ness', 'ment'];
    for (const suffix of suffixes) {
      if (word.endsWith(suffix) && word.length > suffix.length + 2) {
        return word.slice(0, -suffix.length);
      }
    }
    return word;
  };
  
  // Calculate word frequency for TF-IDF
  const getWordFrequency = (word, words) => {
    const count = words.filter(w => w === word).length;
    return count / words.length;
  };

  // Cosine similarity for vectors
  const calculateCosineSimilarity = (vectorA, vectorB) => {
    const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  };
  
  // Strip HTML tags for content analysis
  const stripHtmlTags = (html) => {
    return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
  };

  const react = async (type) => {
    if (!article || reactingType) return; // Prevent multiple clicks
    
    try {
      setReactingType(type);
      console.log('Sending reaction:', type);
      const response = await apiClient.post(`/public/articles/${articleId}/react`, { type });
      
      // Update UI with server response
      if (response.data && response.data.metrics) {
        setArticle(prev => ({
          ...prev,
          metrics: {
            ...prev.metrics, // Keep existing metrics
            ...response.data.metrics, // Update with server metrics
            visits: prev.metrics?.visits || 0, // Preserve visits count
          }
        }));
      }
    } catch (e) {
      console.error('Error reacting:', e);
    } finally {
      setReactingType(null);
    }
  };

  if (loading || !article) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  const defaultImage = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070';
  const imageUrl = article.image || defaultImage;

  // Render floating bookmark button
  const renderBookmarkButton = () => {
    if (!showBookmarkButton || !selectionPosition || Platform.OS !== 'web') return null;
    
    return (
      <View
        style={{
          position: 'absolute',
          top: selectionPosition.top,
          left: selectionPosition.left - 75,
          zIndex: 1000,
          backgroundColor: '#1a237e',
          borderRadius: 8,
          padding: 8,
          flexDirection: 'row',
          gap: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => setShowNotesModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Feather name="bookmark" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
            Bookmark
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setShowBookmarkButton(false);
            setSelectedText('');
            if (Platform.OS === 'web') {
              window.getSelection().removeAllRanges();
            }
          }}
          style={{ paddingHorizontal: 8 }}
        >
          <Feather name="x" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderBookmarkButton()}
      <Navbar />
      <NewsNavbar activeGenre={activeGenre} onGenreChange={handleGenreChange} />
      <View style={styles.scrollContainer}>
        <ScrollView
          onScroll={handleScroll}
          scrollEventThrottle={200}
        >
          <View style={styles.rowMain}>
            <View style={styles.articleContainer}>
              <View style={styles.detailWrapper}>
                <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
                <View style={styles.content}>
                  <Text style={styles.title}>{article.title}</Text>
                  <Text style={styles.meta}>
                    By {article.author || 'Unknown'} | {article.published_at ? new Date(article.published_at).toLocaleDateString() : ''}
                  </Text>
                  {Platform.OS === 'web' ? (
                    <div 
                      ref={contentRef}
                      className="article-content"
                      style={{ 
                        userSelect: 'text',
                        WebkitUserSelect: 'text',
                        MozUserSelect: 'text',
                        msUserSelect: 'text',
                        cursor: 'text',
                      }}
                    >
                      <RenderHTML
                        contentWidth={900}
                        source={{ html: article.content || '' }}
                        tagsStyles={{
                          p: { fontSize: 18, lineHeight: 28, color: '#232323', marginBottom: 12 },
                          h1: { fontSize: 32, fontWeight: '700', marginBottom: 12, color: '#1a1a1a' },
                          h2: { fontSize: 28, fontWeight: '700', marginBottom: 10, color: '#1a1a1a' },
                          h3: { fontSize: 24, fontWeight: '600', marginBottom: 8, color: '#1a1a1a' },
                        }}
                        enableExperimentalMarginCollapsing={true}
                        systemFonts={['system-ui', '-apple-system', 'BlinkMacSystemFont']}
                      />
                    </div>
                  ) : (
                    <View ref={contentRef}>
                      <RenderHTML
                        contentWidth={900}
                        source={{ html: article.content || '' }}
                        tagsStyles={{
                          p: { fontSize: 18, lineHeight: 28, color: '#232323', marginBottom: 12 },
                          h1: { fontSize: 32, fontWeight: '700', marginBottom: 12, color: '#1a1a1a' },
                          h2: { fontSize: 28, fontWeight: '700', marginBottom: 10, color: '#1a1a1a' },
                          h3: { fontSize: 24, fontWeight: '600', marginBottom: 8, color: '#1a1a1a' },
                        }}
                      />
                    </View>
                  )}

                  {/* Metrics & Reactions */}
                  <View style={styles.metricsContainer}>
                    <View style={styles.reactionRow}>
                      <Text style={styles.metricsText}>Total Visitors: {article.metrics?.visits || 0}</Text>
                      {[
                        { type: 'like', emoji: '👍' },
                        { type: 'heart', emoji: '❤️' },
                        { type: 'sad', emoji: '😢' },
                        { type: 'wow', emoji: '😲' }
                      ].map(({ type, emoji }) => (
                        <TouchableOpacity 
                          key={type} 
                          style={[styles.reactBtn, reactingType === type && { opacity: 0.7 }]} 
                          onPress={() => react(type)} 
                          disabled={!!reactingType}
                        >
                          {reactingType === type ? (
                            <ActivityIndicator size="small" color="#000" />
                          ) : (
                            <Text style={styles.reactLabel}>
                              {emoji} {article.metrics?.[`${type}_count`] || 0}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.sidebar}>
              <Text style={[styles.sidebarTitle, { color: '#dc3545' }]}>Related Stories</Text>
              <Text style={styles.sidebarSubtitle}>Based on content similarity and machine learning</Text>
              {newsData.length > 0 ? (
                newsData.map((item, index) => (
                  <TouchableOpacity key={item.id} style={styles.storyItem} onPress={() => router.push(`/news/article/${item.id}`)}>
                    <View style={styles.relatedItemHeader}>
                      <Text style={{ flex: 1 }}>
                        <Text style={{ color: '#dc3545', fontWeight: '600' }}>
                          {item.genre ? `${item.genre} | ` : ''}
                        </Text>
                        <Text style={{ fontWeight: '600', color: '#333' }}>
                          {item.title}
                        </Text>
                      </Text>
                      <View style={styles.similarityBadge}>
                        <Text style={styles.similarityText}>{Math.round(item.similarity * 100)}%</Text>
                      </View>
                    </View>
                    <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                      {item.published_at ? new Date(item.published_at).toLocaleDateString() : ''}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noRelatedText}>No related articles found</Text>
              )}
            </View>
          </View>

          {/* View Bookmarks Button */}
          {currentUser && bookmarks.length > 0 && (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => setShowBookmarksModal(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#1a237e',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                }}
              >
                <Feather name="bookmark" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
                  View My Bookmarks ({bookmarks.length})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer Section */}
                  <footer style={styles.footer}>
                    <View style={styles.footerContent}>
                      <View style={styles.footerSection}>
                        <Text style={styles.footerHeading}>Contact Us</Text>
                        <View style={styles.contactItem}>
                          <MaterialIcons name="facebook" size={20} color="#93c5fd" style={styles.contactIcon} />
                          <Text
                            style={styles.footerLink}
                            onPress={() => window.open('https://facebook.com/fishermannetwork', '_blank')}
                          >
                            fishermannetwork
                          </Text>
                        </View>
                        <View style={styles.contactItem}>
                          <MaterialIcons name="email" size={20} color="#93c5fd" style={styles.contactIcon} />
                          <Text
                            style={styles.footerLink}
                            onPress={() => window.open('mailto:info@fisherman.network')}
                          >
                            info@fisherman.network
                          </Text>
                        </View>
                        <View style={styles.contactItem}>
                          <MaterialIcons name="phone" size={20} color="#93c5fd" style={styles.contactIcon} />
                          <Text style={styles.contactText}>+63 2 8123 4567</Text>
                        </View>
                        <View style={styles.contactItem}>
                          <MaterialIcons name="smartphone" size={20} color="#93c5fd" style={styles.contactIcon} />
                          <Text style={styles.contactText}>+63 912 345 6789</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.copyright}>
                      &copy; {new Date().getFullYear()} Fisherman's Network. All rights reserved.
                    </View>
                  </footer>
        </ScrollView>
      </View>

      {/* Notes Modal */}
      <Modal
        visible={showNotesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotesModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 500,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>
                Add Bookmark
              </Text>
              <TouchableOpacity onPress={() => setShowNotesModal(false)}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={{
              backgroundColor: '#F3F4F6',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 14, color: '#374151', fontStyle: 'italic' }}>
                "{selectedText}"
              </Text>
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              Add Notes (Optional)
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                padding: 12,
                fontSize: 15,
                minHeight: 100,
                textAlignVertical: 'top',
                marginBottom: 20,
              }}
              placeholder="Add your thoughts or notes..."
              value={bookmarkNotes}
              onChangeText={setBookmarkNotes}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowNotesModal(false);
                  setBookmarkNotes('');
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#374151', fontWeight: '600', fontSize: 15 }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveBookmark}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: '#1a237e',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                  Save Bookmark
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bookmarks List Modal */}
      <Modal
        visible={showBookmarksModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBookmarksModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            maxHeight: '80%',
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>
                My Bookmarks
              </Text>
              <TouchableOpacity onPress={() => setShowBookmarksModal(false)}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {bookmarks.map((bookmark, index) => (
                <View
                  key={bookmark.id}
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    borderLeftWidth: 4,
                    borderLeftColor: '#1a237e',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, color: '#111827', fontWeight: '600', flex: 1 }}>
                      "{bookmark.highlighted_text}"
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteBookmark(bookmark.id)}
                      style={{ padding: 4 }}
                    >
                      <Feather name="trash-2" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  
                  {bookmark.notes && (
                    <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 8, fontStyle: 'italic' }}>
                      Note: {bookmark.notes}
                    </Text>
                  )}
                  
                  <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                    Saved on {new Date(bookmark.created_at).toLocaleDateString()} at {new Date(bookmark.created_at).toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
