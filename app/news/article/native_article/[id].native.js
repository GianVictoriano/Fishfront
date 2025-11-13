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
  Dimensions,
  Animated,
  TouchableOpacity
} from 'react-native';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import apiClient from '../../../../utils/api';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  metricsContainer: {
    marginTop: 20,
    marginBottom: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 12,
  },
  reactBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  reactLabel: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  content: {
    padding: 16,
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    lineHeight: 32,
  },
  meta: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  articleContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  pageContainer: {
    flex: 1,
    width: width,
    overflow: 'hidden',
  },
  pageFlipContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  articlePage: {
    width: width,
    flex: 1,
  },
  navigationHint: {
    position: 'absolute',
    top: '50%',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    zIndex: 10,
  },
  navigationHintLeft: {
    left: 10,
  },
  navigationHintRight: {
    right: 10,
  },
  navigationHintText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default function NativeArticleDetail() {
  const router = useRouter();
  const { id: articleId } = useLocalSearchParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allArticles, setAllArticles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [nextArticle, setNextArticle] = useState(null);
  const [prevArticle, setPrevArticle] = useState(null);
  const [preloadedArticles, setPreloadedArticles] = useState({}); // Cache for preloaded articles
  const [reactingType, setReactingType] = useState(null);
  
  // Animation values for page flip effect
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Fetch 5 articles before and after for instant navigation
  const fetchAdjacentArticles = async (index) => {
    if (!allArticles || allArticles.length === 0) return;
    
    try {
      const preloadCount = 5; // Load 5 articles before and after
      const startIndex = Math.max(0, index - preloadCount);
      const endIndex = Math.min(allArticles.length - 1, index + preloadCount);
      
      const newPreloadedArticles = { ...preloadedArticles };
      
      // Fetch articles in the range
      for (let i = startIndex; i <= endIndex; i++) {
        if (i !== index && !newPreloadedArticles[allArticles[i].id]) {
          try {
            const res = await apiClient.get(`/public/articles/${allArticles[i].id}`);
            const raw = res.data?.data ? res.data.data : res.data;
            const mappedArticle = {
              id: raw.id?.toString() || '',
              title: raw.title,
              content: raw.content,
              published_at: raw.published_at,
              image: raw.media && raw.media.length > 0
                ? `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}/storage/${raw.media[0].file_path.replace('public/', '')}` 
                : null,
              author: raw.user?.name || null,
            };
            newPreloadedArticles[allArticles[i].id] = mappedArticle;
          } catch (err) {
            console.error(`Error preloading article ${allArticles[i].id}:`, err);
          }
        }
      }
      
      setPreloadedArticles(newPreloadedArticles);
      
      // Set immediate next and previous articles
      if (index > 0) {
        setPrevArticle(newPreloadedArticles[allArticles[index - 1].id]);
      } else {
        setPrevArticle(null);
      }
      
      if (index < allArticles.length - 1) {
        setNextArticle(newPreloadedArticles[allArticles[index + 1].id]);
      } else {
        setNextArticle(null);
      }
    } catch (err) {
      console.error('Error fetching adjacent articles:', err);
    }
  };

  // Fetch all articles for navigation
  useEffect(() => {
    const fetchAllArticles = async () => {
      try {
        const res = await apiClient.get('/public/articles');
        if (Array.isArray(res.data?.data)) {
          const articles = res.data.data.map(item => ({
            ...item,
            id: item.id?.toString() || '',
            image: item.media && item.media.length > 0
              ? `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}/storage/${item.media[0].file_path.replace('public/', '')}` 
              : null,
            author: item.user?.name || null,
          }));
          setAllArticles(articles);
          
          // Find current article index
          const index = articles.findIndex(a => a.id === articleId);
          setCurrentIndex(index >= 0 ? index : 0);
          
          // Pre-fetch adjacent articles for instant navigation
          if (index >= 0) {
            fetchAdjacentArticles(index);
          }
        }
      } catch (err) {
        console.error('Error fetching articles:', err);
      }
    };
    
    fetchAllArticles();
  }, [articleId]);

  // Fetch current article data
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

  // Pre-fetch adjacent articles when current index changes
  useEffect(() => {
    if (allArticles.length > 0) {
      fetchAdjacentArticles(currentIndex);
    }
  }, [currentIndex, allArticles]);

  // Handle emoji reactions
  const react = async (type) => {
    if (!article || reactingType) return; // Prevent multiple clicks
    
    try {
      setReactingType(type);
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

  // Navigate to previous article
  const navigateToPrevious = () => {
    if (currentIndex > 0 && !isNavigating && prevArticle) {
      setIsNavigating(true);
      const newIndex = currentIndex - 1;
      
      // Animate page flip to the left first
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: width,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Change content ONLY after animation completes
        setArticle(prevArticle);
        setCurrentIndex(newIndex);
        
        // Reset animation
        translateX.setValue(-width);
        scale.setValue(0.8);
        opacity.setValue(0.5);
        
        // Animate in the new article
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsNavigating(false);
        });
      });
    }
  };

  // Navigate to next article
  const navigateToNext = () => {
    if (currentIndex < allArticles.length - 1 && !isNavigating && nextArticle) {
      setIsNavigating(true);
      const newIndex = currentIndex + 1;
      
      // Animate page flip to the right first
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -width,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Change content ONLY after animation completes
        setArticle(nextArticle);
        setCurrentIndex(newIndex);
        
        // Reset animation
        translateX.setValue(width);
        scale.setValue(0.8);
        opacity.setValue(0.5);
        
        // Animate in the new article
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsNavigating(false);
        });
      });
    }
  };

  // Handle pan gesture for swipe navigation
  const handlePanGesture = (event) => {
    if (isNavigating) return;
    
    const { translationX } = event.nativeEvent;
    
    // Only allow swipe animation if adjacent articles are loaded
    const canSwipeLeft = currentIndex < allArticles.length - 1 && nextArticle;
    const canSwipeRight = currentIndex > 0 && prevArticle;
    
    if ((translationX > 50 && canSwipeRight) || 
        (translationX < -50 && canSwipeLeft)) {
      translateX.setValue(translationX);
      scale.setValue(1 - Math.abs(translationX) / (width * 2));
      opacity.setValue(1 - Math.abs(translationX) / (width * 2));
    }
  };

  const handlePanGestureStateChange = (event) => {
    if (isNavigating) return;
    
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      
      // Determine if swipe should trigger navigation
      const swipeThreshold = width / 3;
      const velocityThreshold = 500;
      
      // Only allow swipe if articles are pre-loaded
      if (translationX > swipeThreshold || velocityX > velocityThreshold) {
        if (currentIndex > 0 && prevArticle) {
          navigateToPrevious();
        }
      } else if (translationX < -swipeThreshold || velocityX < -velocityThreshold) {
        if (currentIndex < allArticles.length - 1 && nextArticle) {
          navigateToNext();
        }
      } else {
        // Animate back to original position
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.spring(opacity, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
        ]).start();
      }
    }
  };

  if (loading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  if (error) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  if (!article) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Article not found</Text>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  const defaultImage = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070';
  const imageUrl = article.image || defaultImage;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.pageContainer}>
        <PanGestureHandler
          onGestureEvent={handlePanGesture}
          onHandlerStateChange={handlePanGestureStateChange}
          activeOffsetX={[-15, 15]} // Only activate on horizontal movement
          failOffsetY={[-30, 30]} // Fail if vertical movement exceeds 30
        >
          <Animated.View
            style={[
              styles.pageFlipContainer,
              {
                transform: [
                  { translateX },
                  { scale },
                ],
                opacity,
              }
            ]}
          >
            <View style={styles.articlePage}>
              <ScrollView style={styles.scrollContainer}>
                <View style={styles.content}>
                  <Image source={{ uri: imageUrl }} style={styles.image} />
                  
                  <Text style={styles.title}>{article.title}</Text>
                  
                  <Text style={styles.meta}>
                    By {article.author || 'Unknown'} • {article.published_at ? new Date(article.published_at).toLocaleDateString() : ''}
                  </Text>
                  
                  <RenderHTML
                    contentWidth={width - 32}
                    source={{ html: article.content || '' }}
                    tagsStyles={{
                      p: { fontSize: 16, lineHeight: 24, color: '#333333', marginBottom: 16 },
                      h1: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' },
                      h2: { fontSize: 20, fontWeight: 'bold', marginBottom: 14, color: '#1a1a1a' },
                      h3: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#1a1a1a' },
                      img: { 
                        width: '100%', 
                        height: 'auto', 
                        maxWidth: width - 32, 
                        resizeMode: 'contain',
                        marginVertical: 16 
                      },
                    }}
                  />
                  
                  {/* Emoji Reactions */}
                  <View style={styles.metricsContainer}>
                    <View style={styles.reactionRow}>
                      {[
                        { type: 'like', emoji: '👍' },
                        { type: 'heart', emoji: '❤️' },
                        { type: 'sad', emoji: '😢' },
                        { type: 'wow', emoji: '😲' }
                      ].map(({ type, emoji }) => (
                        <TouchableOpacity 
                          key={type} 
                          style={[styles.reactBtn, reactingType === type && { opacity: 0.7, backgroundColor: '#e9ecef' }]} 
                          onPress={() => react(type)} 
                          disabled={!!reactingType}
                        >
                          {reactingType === type ? (
                            <ActivityIndicator size="small" color="#007AFF" />
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
              </ScrollView>
            </View>
          </Animated.View>
        </PanGestureHandler>
        
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
