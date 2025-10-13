import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Image,
  ScrollView,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import apiClient from '../../../../utils/api';

export default function ManageFolioScreen() {
  const [selected, setSelected] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContributions = async () => {
    try {
      console.log('Fetching contributions...');
      const res = await apiClient.get('/contributions');
      console.log('API Response:', res.data);
      // Handle both paginated and non-paginated responses
      const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
      console.log('Processed contributions:', list);
      setContributions(list);
      setError(null);
    } catch (err) {
      console.error('Failed to load contributions:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers,
      });
      setError(err.response?.data?.message || 'Failed to load contributions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContributions();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await apiClient.post(`/api/contributions/${id}/status`, { status });
      setContributions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
    } catch (err) {
      console.error('Failed to update status', err);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const deleteContribution = async (id) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this contribution?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/api/contributions/${id}`);
            setContributions((prev) => prev.filter((c) => c.id !== id));
          } catch (err) {
            console.error('Failed to delete contribution', err);
            Alert.alert('Error', 'Failed to delete contribution');
          }
        },
      },
    ]);
  };

  const handlePreview = (item) => {
    setSelected(item);
    setPreviewVisible(true);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handlePreview(item)}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.status(item.status)}>{item.status.toUpperCase()}</Text>
      </View>
      <Text style={styles.detail}>Category: {item.category}</Text>
      <Text style={styles.detail}>Author ID: {item.user_id}</Text>
      <View style={styles.actionRow}>
        {item.status !== 'approved' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => updateStatus(item.id, 'approved')}
          >
            <MaterialIcons name="check" size={16} color="#28a745" />
            <Text style={styles.actionText}>Approve</Text>
          </TouchableOpacity>
        )}
        {item.status !== 'rejected' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => updateStatus(item.id, 'rejected')}
          >
            <MaterialIcons name="close" size={16} color="#dc3545" />
            <Text style={styles.actionText}>Reject</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => deleteContribution(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#6c757d" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.screenTitle}>Manage Contributions</Text>
      {loading && (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#1a237e" />
        </View>
      )}
      {error && (
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {!loading && !error && (
        <FlatList
          data={contributions}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          ListEmptyComponent={() => (
            <View style={styles.centeredContainer}>
              <Text>No contributions found.</Text>
            </View>
          )}
        />
      )}
    {/* Preview Modal */}
    <Modal
      visible={previewVisible}
      animationType="slide"
      onRequestClose={() => setPreviewVisible(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <TouchableOpacity style={styles.closeButton} onPress={() => setPreviewVisible(false)}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
        {selected && (
          <ScrollView contentContainerStyle={styles.previewContent}>
            <Text style={styles.previewTitle}>{selected.title}</Text>
            <Text style={styles.previewMeta}>Category: {selected.category}</Text>
            {selected.category === 'artwork' ? (
              selected.media && selected.media.length ? (
                selected.media.map((m) => (
                  <Image
                    key={m.id}
                    source={{ uri: `${process.env.EXPO_PUBLIC_API_URL}/storage/${m.file_path}` }}
                    style={styles.previewImage}
                  />
                ))
              ) : (
                <Text>No media files attached.</Text>
              )
            ) : (
              <Text style={styles.previewText}>{selected.content}</Text>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContent: {
    padding: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  detail: {
    fontSize: 14,
    color: '#333',
  },
  status: (s) => ({
    fontWeight: 'bold',
    color: s === 'approved' ? '#28a745' : s === 'rejected' ? '#dc3545' : '#ffc107',
  }),
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#e9ecef',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  actionText: {
    marginLeft: 4,
    fontWeight: '500',
  },
  screenTitle: {
    marginTop: 16,
    marginLeft: 16,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
  },
  previewContent: {
    padding: 16,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a237e',
  },
  previewMeta: {
    fontSize: 14,
    marginBottom: 12,
    color: '#555',
  },
  previewText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
  },
  previewImage: {
    width: '100%',
    height: 250,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 12,
  },
});