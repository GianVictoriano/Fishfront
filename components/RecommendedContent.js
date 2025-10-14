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

  const RecommendationCard = ({ item }) => (
    <TouchableOpacity
      style={styles.recommendationCard}
      onPress={() => handleArticlePress(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: getImageUrl(item.image) }}
        style={styles.recommendationImage}
        resizeMode="cover"
      />
      <View style={styles.recommendationContent}>
        <Text style={styles.recommendationCategory}>
          {item.genre || 'Recommended'}
        </Text>
        <Text style={styles.recommendationTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.recommendationMeta}>
          {item.author?.name || 'Anonymous'} • {item.published_at}
        </Text>
      </View>
    </TouchableOpacity>
  );

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
    borderWidth: 1,
    borderColor: '#e0e0e0',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  recommendationImage: {
    width: '100%',
    height: 100,
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
  recommendationMeta: {
    fontSize: 11,
    color: '#888',
  },
});

export default RecommendedContent;
