// Native-specific article detail screen (Android/iOS)
// No web-only CSS strings; numeric styles only, no tracking hooks.

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import apiClient from '../../../utils/api';

const fallbackImage = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070';

const getImageUrl = (url) => {
  if (!url) return fallbackImage;
  const src = String(url);
  if (src.startsWith('http')) return src;
  return `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}/storage/${src.replace('public/', '')}`;
};

export default function ArticleNative() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allIds, setAllIds] = useState([]);
  
  // Derive current index from allIds and id
  const currentIdx = allIds.indexOf(String(id));

  // Fetch all article IDs once
  useEffect(() => {
    apiClient
      .get('/public/articles?sort=published_at:desc')
      .then(res => {
        const arr = (res.data?.data || []).map(a => String(a.id));
        setAllIds(arr);
      })
      .catch(e => console.log('Failed to fetch article IDs', e));
  }, []);

  // Fetch current article when id changes
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient
      .get(`/public/articles/${id}`)
      .then(res => {
        const raw = res.data?.data ?? res.data;
        setArticle({
          title: raw.title,
          author: raw.user?.name ?? 'Unknown',
          published_at: raw.published_at?.slice(0, 10) || '',
          image: raw.media && raw.media.length ? getImageUrl(raw.media[0].file_path) : fallbackImage,
          content: raw.content?.replace(/<[^>]*>/g, '') || '',
        });
        setError(null);
      })
      .catch(e => {
        console.error('Failed to load article', e);
        setError('Failed to load article');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const onSwipe = (direction) => {
    'worklet';
    if (direction === 'left' && currentIdx >= 0 && currentIdx < allIds.length - 1) {
      runOnJS(router.push)(`/news/article/${allIds[currentIdx + 1]}`);
    }
    if (direction === 'right' && currentIdx > 0) {
      runOnJS(router.push)(`/news/article/${allIds[currentIdx - 1]}`);
    }
  };

  const panGesture = Gesture.Pan().onFinalize((e) => {
    if (Math.abs(e.translationX) > 80) {
      if (e.translationX < 0) onSwipe('left');
      else onSwipe('right');
    }
  });

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (error || !article) return <View style={styles.center}><Text>{error || 'Article not found'}</Text></View>;

  return (
    <GestureDetector gesture={panGesture}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <Image source={{ uri: article.image }} style={styles.hero} resizeMode="cover" />
          <Text style={styles.title}>{article.title}</Text>
          <Text style={styles.meta}>{`${article.author} • ${article.published_at}`}</Text>
          <Text style={styles.body}>{article.content}</Text>
        </ScrollView>
      </View>
    </GestureDetector>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { width: '100%', height: width * 0.6, borderRadius: 8, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8, color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280', marginBottom: 16 },
  body: { fontSize: 16, lineHeight: 24, color: '#1F2937' },
});
