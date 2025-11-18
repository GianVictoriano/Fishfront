// app/news/featured.js
import { Link, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AppNavbar from '../../components/AppNavbar';
import NewsNavbar from '../../components/newsnavbar';
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
  featuredCardWide: {
    flexDirection: 'row',
    display: 'flex',
    backgroundColor: '#fff',
    borderRadius: 0,
    overflow: 'hidden',
    marginBottom: 24,
    boxShadow: 'none',
    border: 'none',
    minHeight: 220,
  },
  featuredImageContainer: {
    width: '30%',
    minWidth: '30%',
    maxWidth: '30%',
    overflow: 'hidden',
    flexShrink: 0,
  },
  featuredImageStyle: {
    width: '100%',
    height: '100%',
    minHeight: 220,
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
    minWidth: 0,
    flexShrink: 1,
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
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 32,
    marginBottom: 16,
    textAlign: 'left',
    flexWrap: 'wrap',
    includeFontPadding: false,
    width: '100%',
    maxWidth: '100%',
  },
  featuredMetaInfo: {
    fontSize: 13,
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
    title: 'No Featured Articles Available',
    excerpt: 'Check back later for featured content...',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    category: 'Featured'
  }
];

const FeaturedArticleCard = ({ item, onInteraction }) => {
  const router = useRouter();
  const defaultImage = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070';
  
  const getImageUrl = (url) => {
    if (!url) return defaultImage;
    const urlStr = String(url);
    if (urlStr.startsWith('http')) return urlStr;
    return `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}${urlStr}`;
  };
  
  const [imageUri, setImageUri] = useState(getImageUrl(item?.image));
  
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
      style={styles.featuredCardWide}
      activeOpacity={0.9}
      onPress={handlePress}
    >
      <View style={styles.featuredImageContainer}>
        <Image
          source={{ uri: imageUri || defaultImage }}
          style={styles.featuredImageStyle}
          onError={handleImageError}
          defaultSource={{ uri: defaultImage }}
          resizeMode="cover"
        />
      </View>
      <View style={styles.featuredContentContainer}>
        <Text style={styles.featuredCategoryLabel}>FEATURED</Text>
        <Text style={styles.featuredTitleText}>{item?.title}</Text>
        <Text style={styles.featuredMetaInfo}>{item?.date}</Text>
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
  const [currentUser, setCurrentUser] = useState(null);
  const [displayedArticles, setDisplayedArticles] = useState(9);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { recordView } = useInteractionTracking(currentUser?.id);
  const { setActiveGenre } = useNewsStore();

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
      // Check cache first
      const cachedData = await getCachedData('featured');
      if (cachedData) {
        setFeaturedData(cachedData);
        setLoading(false);
        return;
      }

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
            category: article.genre || 'Featured',
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
      }
    };

    fetchFeaturedData();
  }, []);

  const currentArticles = featuredData.slice(0, displayedArticles);
  const hasMoreArticles = featuredData.length > displayedArticles;
  
  const handleLoadMore = () => {
    setDisplayedArticles(prev => prev + 8);
  };

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
            <View>
              {currentArticles.map((item) => (
                <FeaturedArticleCard
                  key={item.id}
                  item={item}
                  onInteraction={recordView}
                />
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
