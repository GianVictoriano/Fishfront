// app/topic-details.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiClient } from '../utils/api';

export default function TopicDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [topic, setTopic] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchTopic = async () => {
    try {
      const response = await apiClient.get(`/topics/${id}`);
      setTopic(response.data);
    } catch (error) {
      console.error('Error fetching topic:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    
    setSubmitting(true);
    try {
      await apiClient.post(`/topics/${id}/comments`, { body: comment });
      setComment('');
      await fetchTopic(); // Refresh comments
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTopic();
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!topic) {
    return (
      <View style={styles.centered}>
        <Text>Topic not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topicContainer}>
        <Text style={styles.title}>{topic.title}</Text>
        <Text style={styles.author}>By: {topic.user?.name}</Text>
        <Text style={styles.body}>{topic.body}</Text>
      </View>

      <Text style={styles.sectionTitle}>
        Comments ({topic.comments?.length || 0})
      </Text>
      
      <FlatList
        data={topic.comments || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.commentContainer}>
            <Text style={styles.commentAuthor}>{item.user?.name}</Text>
            <Text style={styles.commentBody}>{item.body}</Text>
            <Text style={styles.commentDate}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.noComments}>No comments yet. Be the first to comment!</Text>
        }
        style={styles.commentsList}
        contentContainerStyle={styles.commentsContent}
      />

      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Write a comment..."
          value={comment}
          onChangeText={setComment}
          multiline
          placeholderTextColor="#999"
        />
        <Button 
          title={submitting ? "Posting..." : "Post Comment"} 
          onPress={handleAddComment} 
          disabled={!comment.trim() || submitting}
        />
      </View>
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
  },
  topicContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  author: {
    color: '#666',
    fontSize: 14,
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    margin: 16,
    marginBottom: 8,
    color: '#333',
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  commentContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  commentAuthor: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#1e88e5',
  },
  commentBody: {
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  noComments: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
  },
  commentInputContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  commentInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#333',
  },
});