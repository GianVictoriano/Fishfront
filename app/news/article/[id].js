import React, { useEffect, useState } from 'react';
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
  TouchableOpacity 
} from 'react-native';
import Navbar from '../../../components/Navbar';
import NewsNavbar from '../../../components/newsnavbar';
import apiClient from '../../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useArticleTracking from '../../../hooks/useArticleTracking';

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
  // The 'body' style is no longer needed as RenderHTML handles styling.
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 24,
  },
  articleContainer: {
    width: '80%',
    paddingRight: 24,
  },
  sidebar: {
    width: '20%',
    paddingLeft: 24,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  storyItem: {
    marginBottom: 16,
  }
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

  // Initialize article tracking (time & scroll)
  const { handleScroll, currentScrollPercentage, timeSpent } = useArticleTracking(
    articleId, 
    currentUser?.id
  );

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

  return (
    <SafeAreaView style={styles.container}>
      <Navbar />
      <NewsNavbar />
      <View style={styles.rowMain}>
        <ScrollView
          style={styles.articleContainer}
          contentContainerStyle={styles.contentContainer}
          onScroll={handleScroll}
          scrollEventThrottle={200}
        >
          <View style={styles.detailWrapper}>
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
            <View style={styles.content}>
              <Text style={styles.title}>{article.title}</Text>
              <Text style={styles.meta}>
                By {article.author || 'Unknown'} | {article.published_at ? new Date(article.published_at).toLocaleDateString() : ''}
              </Text>
              <RenderHTML
                contentWidth={900} // Adjust width as needed
                source={{ html: article.content || '' }}
                tagsStyles={{
                  p: { fontSize: 18, lineHeight: 28, color: '#232323', marginBottom: 12 },
                  h1: { fontSize: 32, fontWeight: '700', marginBottom: 12, color: '#1a1a1a' },
                  // Add other tag styles as needed
                }}
              />

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
        </ScrollView>

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
    </SafeAreaView>
  );
}
