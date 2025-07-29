import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import apiClient from '../../utils/api';

export default function ReviewPreviewScreen() {
  const { file, id } = useLocalSearchParams();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPreviewText = async () => {
      setLoading(true);
      try {
        let reviewId = id;
        // If id is not provided, try to extract it from the file path (if possible)
        if (!reviewId && file) {
          // fallback logic if needed, otherwise show error
          setError('No review content ID provided.');
          setLoading(false);
          return;
        }
        const response = await apiClient.get(`/review-content/preview/${reviewId}`);
        setContent(response.data.text || 'No text extracted.');
      } catch (err) {
        setError(err.message || 'Unable to load file preview.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPreviewText();
  }, [id]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>File Preview</Text>
      <Text style={styles.filePath}>{file}</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#374151" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <ScrollView style={styles.previewBox}>
            <Text style={styles.content}>{content}</Text>
          </ScrollView>
          <View style={{ marginTop: 24, flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
            <ApproveRejectButtons />
          </View>
        </>
      )}
    </View>
  );
}

function ApproveRejectButtons() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  const handleAction = async (action) => {
    setLoading(true);
    try {
      await apiClient.patch(`/review-content/${id}/${action}`);
      setConfirmation(action === 'approve' ? 'The draft was approved!' : 'The draft was rejected!');
      setTimeout(() => {
        setConfirmation(null);
        router.replace('/collab/review-content');
      }, 1500);
    } catch (error) {
      setConfirmation(`Failed to ${action}.`);
      setTimeout(() => setConfirmation(null), 2500);
    } finally {
      setLoading(false);
    }
  };

  // ... inside return:
  // {confirmation && <View style={{position:'absolute',top:10,left:0,right:0,alignItems:'center',zIndex:10}}><View style={{backgroundColor:'#222',padding:12,borderRadius:8}}><Text style={{color:'#fff'}}>{confirmation}</Text></View></View>}

  return (
    <>
      {confirmation && (
        <View style={{position:'absolute',top:10,left:0,right:0,alignItems:'center',zIndex:10}}>
          <View style={{backgroundColor:'#222',padding:12,borderRadius:8,minWidth:200}}>
            <Text style={{color:'#fff',fontWeight:'bold',textAlign:'center'}}>{confirmation}</Text>
          </View>
        </View>
      )}
      <TouchableOpacity style={{ backgroundColor: '#43a047', padding: 12, borderRadius: 8, marginRight: 10 }} disabled={loading} onPress={() => handleAction('approve')}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Approve</Text>
      </TouchableOpacity>
      <TouchableOpacity style={{ backgroundColor: '#e53935', padding: 12, borderRadius: 8 }} disabled={loading} onPress={() => handleAction('reject')}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Reject</Text>
      </TouchableOpacity>
    </>
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
