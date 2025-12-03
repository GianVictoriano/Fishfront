import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import apiClient from '../utils/api';

const RecommendedContent = ({ userId, onInteraction }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  
  // Mouse drag scrolling state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollContainerRef = useRef(null);

  // Mouse drag scrolling handlers
  const handleMouseDown = (e) => {
    if (Platform.OS === 'web' && scrollContainerRef.current) {
      setIsDragging(true);
      setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
      setScrollLeft(scrollContainerRef.current.scrollLeft);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || Platform.OS !== 'web' || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Global mouse event listeners for drag scrolling
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleGlobalMouseMove = (e) => {
      handleMouseMove(e);
    };

    const handleGlobalMouseUp = () => {
      handleMouseUp();
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, startX, scrollLeft]);

  useEffect(() => {
    fetchRecommendations();
  }, [userId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const endpoint = userId ? '/recommendations' : '/public/recommendations';
      const response = await apiClient.get(endpoint, {
        params: { limit: 6 }
      });
      
      let recommendations = response.data?.data || [];
      
      // Normalize image field for personalized recommendations
      recommendations = recommendations.map(rec => ({
        ...rec,
        image: rec.image || rec.image_path
      }));
      
      // If we have less than 6 recommendations, fill with most reacted/popular articles
      if (recommendations.length < 6) {
        try {
          const popularResponse = await apiClient.get('/public/trending-articles', {
            params: { limit: 6 - recommendations.length }
          });
          
          const popularArticles = popularResponse.data?.data || [];
          
          // Filter out articles that are already in recommendations to avoid duplicates
          const recommendationIds = new Set(recommendations.map(r => r.id));
          const additionalArticles = popularArticles
            .filter(article => !recommendationIds.has(article.id))
            .map(article => ({
              ...article,
              image: article.image || article.image_path // Normalize image field
            }));
          
          recommendations = [...recommendations, ...additionalArticles];
        } catch (popularError) {
          console.warn('Could not fetch popular articles:', popularError);
        }
      }
      
      setRecommendations(Array.isArray(recommendations) ? recommendations.slice(0, 6) : []); // Ensure we don't exceed 6
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      
      // Fallback: try to get popular articles if recommendations fail
      try {
        const popularResponse = await apiClient.get('/public/trending-articles', {
          params: { limit: 6 }
        });
        setRecommendations(popularResponse.data?.data?.slice(0, 6) || []);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        setError('Failed to load recommendations');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleArticlePress = async (article) => {
    // Record interaction if user is authenticated
    if (userId && onInteraction) {
      await onInteraction(article.id, 'view');
    }
    router.push(`/news/article/${article.id}`);
  };

  const getImageUrl = (url) => {
    if (!url) return 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070';
    // Convert to string if it's a number or other type
    const urlStr = String(url);
    if (urlStr.startsWith('http')) return urlStr;
    // Handle both /storage/ path (from recommendations) and media file paths (from trending)
    if (urlStr.startsWith('/storage/')) return `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}${urlStr}`;
    return `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}/storage/${urlStr.replace('public/', '')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const RecommendationCard = ({ item }) => {
    const [imageUri, setImageUri] = useState(getImageUrl(item.image));
    const [isHovered, setIsHovered] = useState(false);

    const handleImageError = () => {
      setImageUri('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070');
    };
    
    return (
      <TouchableOpacity
        style={[
          styles.recommendationCard,
          isHovered && styles.recommendationCardHover
        ]}
        onPress={() => handleArticlePress(item)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        activeOpacity={0.9}
      >
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: imageUri }}
            style={styles.recommendationImage}
            onError={handleImageError}
            resizeMode="cover"
          />
          <View style={[
            styles.cardOverlay,
            isHovered && styles.cardOverlayHover
          ]}>
            <Text style={styles.cardReadMore}>Read Full Story</Text>
          </View>
        </View>
        <View style={styles.recommendationContent}>
          <Text style={styles.recommendationCategory}>
            {item.genre || item.category || 'Recommended'}
          </Text>
          <Text style={styles.recommendationTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.recommendationDate}>
            {formatDate(item.published_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🤖 Recommended for You</Text>
          <Text style={styles.headerSubtitle}>Powered by AI</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007BFF" />
          <Text style={styles.loadingText}>Finding the best stories for you...</Text>
        </View>
      </View>
    );
  }

  if (error || recommendations.length === 0) {
    return null; // Don't show anything if there's an error or no recommendations
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🤖 Recommended for You</Text>
        <Text style={styles.headerSubtitle}>
          {userId ? 'Personalized recommendations & trending stories' : 'Popular content & trending stories'}
        </Text>
      </View>
      <div 
        ref={scrollContainerRef}
        style={{ 
          overflowX: 'auto', 
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row',
          paddingTop: 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
          gap: '12px',
        }}>
          {recommendations.map((item) => (
            <RecommendationCard key={item.id.toString()} item={item} />
          ))}
        </div>
      </div>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginBottom: 20,
    borderRadius: 12,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: '1px solid #e4e8ee',
  },
  header: {
    padding: 16,
    paddingBottom: 12,
    backgroundColor: '#f8f9ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e8ee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  scrollContainer: {
    flexGrow: 0,
    flexShrink: 0,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
  },
  recommendationCard: {
    width: 200,
    minWidth: 200,
    marginRight: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#e4e8ee',
    boxShadow: '0 4px 24px 0 rgba(60,72,88,0.09)',
    transition: 'box-shadow 0.25s cubic-bezier(.4,2,.6,1), transform 0.18s cubic-bezier(.4,2,.6,1)',
    cursor: 'pointer',
    flexShrink: 0,
  },
  recommendationCardHover: {
    boxShadow: '0 10px 32px 0 rgba(60,72,88,0.18)',
    transform: 'translateY(-4px) scale(1.025)',
    borderColor: '#d0d6e0',
  },
  recommendationImage: {
    width: '100%',
    height: 100,
    transition: 'filter 0.2s',
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
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  recommendationContent: {
    padding: 12,
  },
  recommendationCategory: {
    fontSize: 10,
    color: '#007BFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    lineHeight: 18,
    marginBottom: 6,
  },
  recommendationDate: {
    fontSize: 11,
    color: '#888',
  },
});

export default RecommendedContent;
