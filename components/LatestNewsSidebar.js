import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import apiClient from '../utils/api';
import { useRouter } from 'expo-router';

export default function LatestNewsSidebar({ genre, currentId }) {
  const [latest, setLatest] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchLatestNews = async () => {
    try {
      console.log(`📰 Fetching latest news - Genre: ${genre}`);
      setLoading(true);

      let url = `/public/articles?limit=10`;
      if (genre && genre !== 'News') {
        url = `/public/articles?genre=${genre.toLowerCase()}&limit=10`;
      }

      console.log(`🔗 API URL: ${url}`);
      
      const response = await apiClient.get(url);
      let articles = Array.isArray(response.data?.data) ? response.data.data : [];
      
      console.log(`📊 Raw articles received: ${articles.length}`);
      
      // Exclude current article
      const originalLength = articles.length;
      articles = articles.filter(a => a.id?.toString() !== currentId);
      console.log(`🗑️ Filtered out ${originalLength - articles.length} articles (current ID: ${currentId})`);

      // Ensure we only show 10 articles max (API might return more than requested)
      if (articles.length > 10) {
        articles = articles.slice(0, 10);
        console.log(`✂️ Sliced to 10 articles (had ${articles.length} after filtering)`);
      }

      console.log(`🔄 Setting ${articles.length} articles as list`);
      setLatest(articles);
    } catch (error) {
      console.error('❌ Error fetching latest news:', error);
      setLatest([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestNews();
  }, [genre, currentId]);

  if (loading) {
    return <ActivityIndicator size="small" style={{ marginVertical: 12 }} />;
  }
  if (!latest.length) {
    return <Text style={{ color: '#888', fontSize: 12, marginVertical: 8 }}>No latest news found.</Text>;
  }
  return (
    <View style={{ marginTop: 8 }}>
      {latest.map(article => (
        <TouchableOpacity 
          key={article.id} 
          onPress={() => {
            const route = Platform.OS === 'web' 
              ? `/news/article/${article.id}` 
              : `/news/article/native_article/${article.id}`;
            router.push(route);
          }} 
          style={{ marginBottom: 12 }}
        >
          <Text style={{ fontWeight: '600', color: '#232323', fontSize: 14 }} numberOfLines={2}>{article.title}</Text>
          <Text style={{ color: '#888', fontSize: 11 }}>{article.published_at ? new Date(article.published_at).toLocaleDateString() : ''}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
