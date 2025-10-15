import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import apiClient from '../utils/api';

const RecommendedContent = ({ userId, onInteraction }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchRecommendations();
  }, [userId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const endpoint = userId ? '/recommendations' : '/public/recommendations';
      const response = await apiClient.get(endpoint, {
        params: { limit: 5 }
      });
      
      if (response.data?.data) {
        setRecommendations(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to load recommendations');
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
    if (url.startsWith('http')) return url;
    return `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}${url}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const RecommendationCard = ({ item }) => {
    const [isHovered, setIsHovered] = useState(false);
    
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
            source={{ uri: getImageUrl(item.image) }}
            style={styles.recommendationImage}
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
            {item.genre || 'Recommended'}
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
          <Text style={styles.loadingText}>Learning your preferences...</Text>
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
          {userId ? 'Based on your reading patterns' : 'Popular content'}
        </Text>
      </View>
      <FlatList
        data={recommendations}
        renderItem={({ item }) => <RecommendationCard item={item} />}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
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
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recommendationCard: {
    width: 200,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#e4e8ee',
    boxShadow: '0 4px 24px 0 rgba(60,72,88,0.09)',
    transition: 'box-shadow 0.25s cubic-bezier(.4,2,.6,1), transform 0.18s cubic-bezier(.4,2,.6,1)',
    cursor: 'pointer',
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
