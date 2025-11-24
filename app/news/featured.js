// app/news/featured.js
import { Link, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AppNavbar from '../../components/AppNavbar';
import NewsNavbar from '../../components/newsnavbar';
import RecommendedContent from '../../components/RecommendedContent';
import useInteractionTracking from '../../hooks/useInteractionTracking';
import apiClient from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useNewsStore from '../../store/newsStore';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  newsPageScroll: {
    padding: 24,
    paddingTop: 12,
    alignItems: 'center',
    backgroundColor: '#f4f6f8',
  },
  newsMainRow: {
    width: '100%',
    maxWidth: 1300,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 32,
  },
  latestContentTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
    marginLeft: 2,
    letterSpacing: 0.2,
  },
  threeColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 14,
    width: '100%',
  },
  featuredCardWide: {
    gridColumn: '1 / -1',
    flexDirection: 'row',
    display: 'flex',
    backgroundColor: '#fff',
    borderRadius: 0,
    overflow: 'hidden',
    marginBottom: 32,
    boxShadow: 'none',
    border: 'none',
    minHeight: 280,
  },
  featuredImageContainer: {
    width: '35%',
    minWidth: '280px',
    maxWidth: '400px',
    overflow: 'hidden',
  },
  featuredImageStyle: {
    width: '100%',
    height: '100%',
    minHeight: 280,
    objectFit: 'cover',
  },
  featuredContentContainer: {
    flex: 1,
    paddingLeft: 40,
    paddingRight: 40,
    paddingTop: 24,
    paddingBottom: 24,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  featuredCategoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ff6b35',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  featuredTitleText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 36,
    marginBottom: 12,
    textAlign: 'left',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  featuredExcerptText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 1.5,
    marginBottom: 16,
  },
  featuredMetaInfo: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
  },
  regularCardNarrow: {
    gridColumn: 'span 1',
  },
  card: {
    backgroundColor: '#f4f6f8',
    overflow: 'hidden',
    marginBottom: 0,
    position: 'relative',
    transition: 'box-shadow 0.25s cubic-bezier(.4,2,.6,1), transform 0.18s cubic-bezier(.4,2,.6,1), background-color 0.2s ease',
    cursor: 'pointer',
    flex: 1,
    minWidth: 0,
    borderRadius: 0,
    flexDirection: 'column',
    display: 'flex',
    paddingTop: 20,
    paddingBottom: 20,
  },
  cardHover: {
    backgroundColor: '#f4f6f8',
    boxShadow: '0 10px 32px 0 rgba(60,72,88,0.18)',
    transform: 'translateY(-4px) scale(1.02)',
  },
  cardImage: {
    width: '100%',
    height: 180,
    objectFit: 'cover',
    borderRadius: 0,
    transition: 'opacity 0.2s',
    marginBottom: 12,
  },
  cardImageWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  cardOverlayHover: {
    opacity: 1,
  },
  cardReadMore: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  cardContent: {
    flex: 1,
    backgroundColor: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  cardCategory: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 22,
    marginBottom: 8,
    marginTop: 0,
    paddingTop: 0,
    paddingBottom: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    textAlign: 'left',
    textIndent: 0,
  },
  cardTimeStamp: {
    fontSize: 11,
    color: '#999',
    fontWeight: '400',
  },
  loadMoreButton: {
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 24,
    marginBottom: 16,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    ':hover': {
      backgroundColor: '#f9fafb',
      borderColor: '#9ca3af'
    }
  },
  loadMoreButtonText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
});

// Fallback static data
const fallbackFeaturedData = [
  {
    id: '1',
    title: 'Welcome to Featured Articles',
    excerpt: 'Stay tuned for the latest featured articles...',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    category: 'Featured'
  }
];

const defaultImage = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070';

const getImageUrl = (url) => {
  if (!url) return defaultImage;
  // Convert to string if it's a number or other type
  const urlStr = String(url);
  if (urlStr.startsWith('http')) return urlStr;
  return `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}${urlStr}`;
};

const NewsCard = ({ item, compact, onInteraction }) => {
  const router = useRouter();

  const [imageUri, setImageUri] = useState(getImageUrl(item?.image));
  const [isHovered, setIsHovered] = useState(false);

  const handlePress = () => {
    if (onInteraction) {
      onInteraction(item.id, 'view');
    }
    router.push(`/news/article/${item.id}`);
  };

  useEffect(() => {
    setImageUri(getImageUrl(item?.image));
  }, [item?.image]);

  const handleImageError = () => {
    setImageUri(defaultImage);
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isHovered && styles.cardHover,
      ]}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.cardImageWrapper}>
        <Image
          source={{ uri: imageUri }}
          style={styles.cardImage}
          onError={handleImageError}
          defaultSource={{ uri: defaultImage }}
          resizeMode="cover"
        />
        <View
          style={[
            styles.cardOverlay,
            isHovered && styles.cardOverlayHover
          ]}
        >
          <Text style={styles.cardReadMore}>Read Full Story</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardCategory}>
          {item?.category || 'General'}
        </Text>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item?.title || 'Untitled Article'}
        </Text>
        <Text style={styles.cardTimeStamp}>
          {item?.date || ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const LoadingSpinner = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#3b82f6" />
    <Text style={styles.loadingText}>Loading featured articles...</Text>
  </View>
);

export default function FeaturedScreen() {
  const [featuredData, setFeaturedData] = useState(fallbackFeaturedData);
  const [trendingStories, setTrendingStories] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [displayedArticles, setDisplayedArticles] = useState(9);
  const [loading, setLoading] = useState(false);
  const [activeRequests, setActiveRequests] = useState(new Set());
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const router = useRouter();
  const { recordView } = useInteractionTracking(currentUser?.id);
  const { setActiveGenre } = useNewsStore();

  // State for featured image with error handling
  const [featuredImageUri, setFeaturedImageUri] = useState(defaultImage);

  // Listen for screen size changes
  useEffect(() => {
    const onChange = (result) => {
      setScreenWidth(result.window.width);
    };
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  // Determine if we should use mobile layout
  const isMobile = screenWidth <= 700;

  // Set active genre to Featured when component mounts
  useEffect(() => {
    setActiveGenre('Featured');
  }, [setActiveGenre]);

  // Get current user for personalization
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token'); 
        if (token) {
          const userData = await AsyncStorage.getItem('user_data');
          if (userData) {
            setCurrentUser(JSON.parse(userData));
          } else {
            const response = await apiClient.get('/user');
            setCurrentUser(response.data);
          }
        }
      } catch (error) {
        console.log('User not authenticated');
      }
    };
    getCurrentUser();
  }, []);

  // Cache management functions
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  const getCachedData = async (key) => {
    try {
      const cached = await AsyncStorage.getItem(`news_cache_${key}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const { data, timestamp } = parsed || {};
        if (data && typeof timestamp === 'number' && Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    } catch (error) {
      console.log('Cache read error:', error);
    }
    return null;
  };

  const setCachedData = async (key, data) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(`news_cache_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.log('Cache write error:', error);
    }
  };

  // Fetch featured articles
  useEffect(() => {
    const fetchFeaturedData = async () => {
      const requestId = 'featured-news';
      if (activeRequests.has(requestId)) return;

      // Check cache first
      const cachedData = await getCachedData('featured');
      if (cachedData) {
        setFeaturedData(cachedData);
        setLoading(false);
        return;
      }

      setActiveRequests(prev => new Set(prev).add(requestId));
      setLoading(true);
      setDisplayedArticles(9);

      try {
        const res = await apiClient.get('/public/featured-articles');

        if (Array.isArray(res.data?.data)) {
          const limit = 20;
          const mapped = res.data.data.slice(0, limit).map(article => ({
            id: article.id?.toString() || '',
            title: article.title,
            excerpt: article.content ? article.content.substring(0, 150) + '...' : '',
            image: article.media && article.media.length > 0
              ? `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}/storage/${article.media[0].file_path.replace('public/', '')}`
              : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070',
            date: article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
            category: 'Featured',
          }));
          setFeaturedData(mapped);
          // Cache the result
          await setCachedData('featured', mapped);
        }
      } catch (error) {
        console.log('Failed to fetch featured data:', error);
        setFeaturedData(fallbackFeaturedData);
      } finally {
        setLoading(false);
        setActiveRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(requestId);
          return newSet;
        });
      }
    };

    fetchFeaturedData();
  }, []);

  // fetch trending stories
  useEffect(() => {
    const fetchTrendingStories = async () => {
      const requestId = 'trending-stories';
      if (activeRequests.has(requestId)) return;

      // Check cache first
      const cachedData = await getCachedData('trending-stories');
      if (cachedData) {
        setTrendingStories(cachedData);
        return;
      }

      setActiveRequests(prev => new Set(prev).add(requestId));

      try {
        const res = await apiClient.get('/public/trending-articles');
        if (Array.isArray(res.data?.data)) {
          const mapped = res.data.data.slice(0, 25).map(a => ({
            id: a.id?.toString() || '',
            title: a.title,
            category: a.genre || 'News',
            published_at: a.published_at,
            image: getImageUrl(a.image),
          }));
          setTrendingStories(mapped);
          await setCachedData('trending-stories', mapped);
        }
      } catch (error) {
        console.log('Error fetching trending stories:', error);
        setTrendingStories([]);
      } finally {
        setActiveRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(requestId);
          return newSet;
        });
      }
    };

    fetchTrendingStories();
  }, []);

  const featuredStory = featuredData[0];
  const gridStories = featuredData.slice(1, displayedArticles);
  const currentArticles = featuredData.slice(0, displayedArticles);
  const hasMoreArticles = featuredData.length > displayedArticles;
  
  const handleLoadMore = () => {
    setDisplayedArticles(prev => prev + 8);
  };

  // Update featured image URI when featured story changes
  useEffect(() => {
    if (featuredStory) {
      setFeaturedImageUri(getImageUrl(featuredStory.image));
    }
  }, [featuredData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppNavbar />
        <NewsNavbar />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppNavbar />
      <NewsNavbar />
      
      <ScrollView contentContainerStyle={styles.newsPageScroll}>
        <View style={styles.newsMainRow}>
          <View style={{ width: '100%', maxWidth: 1300 }}>
            <Text style={styles.latestContentTitle}>Featured Content</Text>
            <View style={styles.threeColumnGrid}>
              {currentArticles.map((item) => (
                <View
                  key={item.id}
                  style={styles.regularCardNarrow}
                >
                  <NewsCard
                    item={item}
                    compact
                    onInteraction={recordView}
                  />
                </View>
              ))}
            </View>
            {hasMoreArticles && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMore}
                activeOpacity={0.8}
              >
                <Text style={styles.loadMoreButtonText}>Load More Articles</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
