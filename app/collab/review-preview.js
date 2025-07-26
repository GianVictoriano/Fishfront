import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import apiClient from '../../utils/api';

export default function ReviewPreviewScreen() {
  const { file } = useLocalSearchParams();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFile = async () => {
      try {
        
        // file param is a relative path like review_uploads/filename.txt
        const url = `http://192.168.250.65:8000/files/review_uploads/${file}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch file');
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError('Unable to load file preview.');
      } finally {
        setLoading(false);
      }
    };
    if (file) fetchFile();
  }, [file]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>File Preview</Text>
      <Text style={styles.filePath}>{file}</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#374151" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView style={styles.previewBox}>
          <Text style={styles.content}>{content}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f4f8',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 10,
    textAlign: 'center',
  },
  filePath: {
    fontSize: 12,
    color: '#555',
    marginBottom: 10,
    textAlign: 'center',
  },
  previewBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    minHeight: 200,
    maxHeight: 400,
  },
  content: {
    fontFamily: 'monospace',
    fontSize: 15,
    color: '#222',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
});
