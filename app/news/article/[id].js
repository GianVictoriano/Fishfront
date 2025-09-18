import React, { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, Image, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, Platform, TouchableOpacity } from 'react-native';
import Navbar from '../../../components/Navbar';
import NewsNavbar from '../../../components/newsnavbar';
import apiClient from '../../../utils/api';

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
  body: {
    fontSize: 18,
    color: '#232323',
    lineHeight: 1.8,
    marginBottom: 12,
    whiteSpace: 'pre-line',
    textAlign: 'left',
    width: '100%',
  },
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
  },
});

export default function ArticleDetail() {
  const router = useRouter();
  const { id: articleId } = useLocalSearchParams();
  const [article, setArticle] = useState(null);
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!articleId) return;
    setLoading(true);
    apiClient.get(`/public/articles/${articleId}`)
      .then(res => {
        // Laravel API Resource returns data under res.data.data
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
      })
      .catch(err => {
        console.error('Error fetching article:', err);
        setError('Failed to load article');
      })
      .finally(() => setLoading(false));
  }, [articleId]);

  // Fetch list of articles for sidebar
  useEffect(() => {
    apiClient.get('/public/articles')
      .then(res => {
        if (Array.isArray(res.data?.data)) {
          const mapped = res.data.data.map(item => ({
            id: item.id?.toString() || '',
            title: item.title,
            published_at: item.published_at,
          })).filter(item => item.id !== articleId);
          setNewsData(mapped);
        }
      })
      .catch(err => console.error('Error fetching fresh stories:', err));
  }, [articleId]);

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 60 }} />;
  }
  if (!article) {
    return <Text style={{ marginTop: 60, color: 'red' }}>Article not found.</Text>;
  }
  const defaultImage = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070';
  const imageUrl = article.image || defaultImage;

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'web' ? (
        <>
          <Navbar />
          <NewsNavbar />
        </>
      ) : (
        <>
          <Navbar />
          <NewsNavbar />
        </>
      )}
      <View style={styles.rowMain}>
        <ScrollView
          style={styles.articleContainer}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.detailWrapper}>
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
            <View style={styles.content}>
              <Text style={styles.title}>{article.title}</Text>
              <Text style={styles.meta}>
                By {article.author || 'Unknown'} | {article.published_at ? new Date(article.published_at).toLocaleDateString() : ''}
              </Text>
              <Text style={styles.body}>{article.content}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Fresh Stories</Text>
          {newsData.slice(0,5).map(item => (
            <TouchableOpacity key={item.id} style={styles.storyItem} onPress={() => router.push(`/news/article/${item.id}`)}>
              <Text style={{ fontWeight: '600' }}>{item.title}</Text>
              <Text style={{ color: '#666', fontSize: 12 }}>{item.published_at ? new Date(item.published_at).toLocaleDateString() : ''}</Text>
            </TouchableOpacity>
          ))}
          <Text style={[styles.sidebarTitle,{marginTop:24}]}>Latest Articles</Text>
          {newsData.slice(5,10).map(item => (
            <TouchableOpacity key={item.id} style={styles.storyItem} onPress={() => router.push(`/news/article/${item.id}`)}>
              <Text style={{ fontWeight: '600' }}>{item.title}</Text>
              <Text style={{ color: '#666', fontSize: 12 }}>{item.published_at ? new Date(item.published_at).toLocaleDateString() : ''}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
