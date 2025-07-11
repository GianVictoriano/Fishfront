// app/forum.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Button, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import apiClient from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ForumScreen() {
  const router = useRouter();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: '', body: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTopics = async () => {
    try {
      const response = await apiClient.get('/topics');
      setTopics(response.data);
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateTopic = async () => {
    if (!newTopic.title.trim()) return;
    
    setSubmitting(true);
    try {
      console.log('Creating topic with data:', newTopic);
      const response = await apiClient.post('/topics', newTopic);
      console.log('Topic created:', response.data);
      setNewTopic({ title: '', body: '' });
      setShowNewTopicForm(false);
      await fetchTopics();
    } catch (error) {
      console.error('Detailed error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
      });
      alert(`Error creating topic: ${error.response?.data?.message || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTopics();
  };
  
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      console.log('Auth token:', token ? 'Exists' : 'Missing');
    };
    checkAuth();
  }, []);
  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      console.log('Token length:', token?.length);
      console.log('Token starts with:', token?.substring(0, 10) + '...');
    };
    checkToken();
  }, []);

  useEffect(() => {
    fetchTopics();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fisherman's Forum</Text>
        <Button 
          title="New Topic" 
          onPress={() => setShowNewTopicForm(!showNewTopicForm)} 
          disabled={submitting}
        />
      </View>

      {showNewTopicForm && (
        <View style={styles.newTopicForm}>
          <TextInput
            style={styles.input}
            placeholder="Topic title *"
            value={newTopic.title}
            onChangeText={(text) => setNewTopic({ ...newTopic, title: text })}
            placeholderTextColor="#999"
          />
          <TextInput
            style={[styles.input, styles.bodyInput]}
            placeholder="What's on your mind?"
            value={newTopic.body}
            onChangeText={(text) => setNewTopic({ ...newTopic, body: text })}
            multiline
            placeholderTextColor="#999"
          />
          <View style={styles.buttonRow}>
            <Button 
              title="Cancel" 
              onPress={() => {
                setShowNewTopicForm(false);
                setNewTopic({ title: '', body: '' });
              }} 
              color="#999"
            />
            <Button 
              title={submitting ? "Posting..." : "Post Topic"} 
              onPress={handleCreateTopic} 
              disabled={!newTopic.title.trim() || submitting}
            />
          </View>
        </View>
      )}

      <FlatList
        data={topics}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.topicCard}
            onPress={() => router.push(`/topic-details?id=${item.id}`)}
          >
            <Text style={styles.topicTitle}>{item.title}</Text>
            <Text style={styles.topicMeta}>
              {item.user?.name} • {new Date(item.created_at).toLocaleDateString()}
            </Text>
            {item.body && (
              <Text style={styles.topicBody} numberOfLines={2} ellipsizeMode="tail">
                {item.body}
              </Text>
            )}
            <Text style={styles.commentCount}>
              {item.comments?.length || 0} comments
            </Text>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.noTopics}>No topics yet. Be the first to post!</Text>
          </View>
        }
        contentContainerStyle={topics.length === 0 ? styles.emptyListContent : styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  newTopicForm: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    elevation: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    color: '#333',
  },
  bodyInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  topicCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 1,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1e88e5',
  },
  topicMeta: {
    color: '#666',
    fontSize: 12,
    marginBottom: 8,
  },
  topicBody: {
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  commentCount: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
  },
  noTopics: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
});