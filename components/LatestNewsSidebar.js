import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import apiClient from '../utils/api';
import { useRouter } from 'expo-router';

export default function LatestNewsSidebar({ genre, currentId }) {
  const [latest, setLatest] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let url = '/public/articles';
    if (genre && genre !== 'News') {
      url = `/public/articles?genre=${genre.toLowerCase()}`;
    }
    setLoading(true);
    apiClient.get(url)
      .then(res => {
        let articles = Array.isArray(res.data?.data) ? res.data.data : [];
        // Exclude current article; show all others
        articles = articles.filter(a => a.id?.toString() !== currentId);
        setLatest(articles);
      })
      .catch(() => setLatest([]))
      .finally(() => setLoading(false));
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
        <TouchableOpacity key={article.id} onPress={() => router.push(`/news/article/${article.id}`)} style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: '600', color: '#232323', fontSize: 14 }} numberOfLines={2}>{article.title}</Text>
          <Text style={{ color: '#888', fontSize: 11 }}>{article.published_at ? new Date(article.published_at).toLocaleDateString() : ''}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
