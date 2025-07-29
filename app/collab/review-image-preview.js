import React, { useState, useEffect } from 'react';
import { View, Text, Image, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import apiClient from '../../utils/api';

export default function ReviewImagePreviewScreen() {
  const { id } = useLocalSearchParams();
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchImage = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get(`/review-images/${id}`);
        setImageData(response.data);
      } catch (e) {
        setError('Failed to load image.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchImage();
  }, [id]);

  const handleAction = async (action) => {
    setLoading(true);
    try {
      await apiClient.patch(`/review-images/${id}/${action}`);
      setConfirmation(action === 'approve' ? 'The image draft was approved!' : 'The image draft was rejected!');
      setTimeout(() => {
        setConfirmation(null);
        router.replace('/collab/review-content');
      }, 1500);
    } catch (e) {
      setConfirmation('Failed to ' + action + ' image.');
      setTimeout(() => setConfirmation(null), 2500);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#374151" style={{ marginTop: 40 }} />;
  if (error) return <Text style={{ color: 'red', marginTop: 40 }}>{error}</Text>;
  if (!imageData) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Image Preview</Text>
      {confirmation && (
        <View style={{position:'absolute',top:10,left:0,right:0,alignItems:'center',zIndex:10}}>
          <View style={{backgroundColor:'#222',padding:12,borderRadius:8,minWidth:200}}>
            <Text style={{color:'#fff',fontWeight:'bold',textAlign:'center'}}>{confirmation}</Text>
          </View>
        </View>
      )}
      <Image source={{ uri: `http://192.168.254.114:8000/storage/${imageData.file}` }} style={styles.image} resizeMode="contain" />
      <Text>Status: <Text style={styles.status}>{imageData.status}</Text></Text>
      <Text>Uploaded by: {imageData.user_id}</Text>
      <Text>Uploaded at: {imageData.uploaded_at ? new Date(imageData.uploaded_at).toLocaleString() : 'N/A'}</Text>
      <Text>Approvals: {imageData.no_of_approval}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24, gap: 16 }}>
        <TouchableOpacity style={{ backgroundColor: '#43a047', padding: 12, borderRadius: 8, marginRight: 10 }} onPress={() => handleAction('approve')}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ backgroundColor: '#e53935', padding: 12, borderRadius: 8 }} onPress={() => handleAction('reject')}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Reject</Text>
        </TouchableOpacity>
      </View>
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
  image: {
    width: '100%',
    height: 320,
    marginBottom: 18,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  status: {
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
});
