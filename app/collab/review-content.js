import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../../utils/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const ReviewItem = ({ item, isMobile, onPreview }) => {
  const fileType = item._type === 'image' ? 'Image' : 'Document';
  const title = item.title || (item.group ? item.group.name : 'Untitled');
  const uploader = item.user?.name || 'Unknown User';
  const uploadDate = item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString() : 'N/A';

  return (
    <View style={[styles.itemCard, isMobile && styles.itemCardMobile]}>
      {item._type === 'image' && (
        <Image
          source={{ uri: `${API_URL}/storage/${item.file}` }}
          style={styles.itemImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Feather name={item._type === 'image' ? 'image' : 'file-text'} size={18} color="#4A5568" />
          <Text style={styles.itemType}>{fileType}</Text>
          <View style={[styles.statusBadge, styles[`status_${item.status}`]]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemMeta}>
          Submitted by {uploader} on {uploadDate}
        </Text>
        <TouchableOpacity style={styles.previewButton} onPress={() => onPreview(item)}>
          <Text style={styles.previewButtonText}>Preview & Approve</Text>
          <Feather name="arrow-right-circle" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function ReviewContentScreen() {
  const [reviewContent, setReviewContent] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const router = useRouter();

  useEffect(() => {
    const fetchGroupChats = async () => {
      try {
        const response = await apiClient.get('/group-chats');
        setGroupChats(response.data);
        if (response.data.length > 0) {
          setSelectedGroupId(response.data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch group chats:', error);
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroupChats();
  }, []);

  useEffect(() => {
    if (!selectedGroupId) return;

    const fetchReviewContent = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
            status: statusFilter,
            group_id: selectedGroupId,
        });
        const url = `/review-content?${params.toString()}`;
        const imagesUrl = `/review-images?${params.toString()}`;

        const [draftsRes, imagesRes] = await Promise.all([
          apiClient.get(url),
          apiClient.get(imagesUrl),
        ]);

        const drafts = draftsRes.data.map(d => ({ ...d, _type: 'draft' }));
        const images = imagesRes.data.map(img => ({ ...img, _type: 'image' }));
        
        setReviewContent([...drafts, ...images]);
      } catch (error) {
        console.error('Failed to fetch review content:', error);
        setReviewContent([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviewContent();
  }, [selectedGroupId, statusFilter]);

  const sortedContent = useMemo(() => {
    return [...reviewContent].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
  }, [reviewContent]);

  const handlePreview = (item) => {
    const path = item._type === 'image' ? '/collab/review-image-preview' : '/collab/review-preview';
    const params = item._type === 'image' ? { id: item.id } : { file: item.file, id: item.id };
    router.push({ pathname: path, params });
  };

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#303F9F" style={{ marginTop: 40 }} />;
    }
    if (sortedContent.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Feather name="inbox" size={48} color="#A0AEC0" />
          <Text style={styles.emptyText}>No content to review in this group.</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={sortedContent}
        renderItem={({ item }) => <ReviewItem item={item} isMobile={isMobile} onPreview={handlePreview} />}
        keyExtractor={(item) => `${item._type}-${item.id}`}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Review Content</Text>
        <Text style={styles.subtitle}>Select a group and status to see submissions.</Text>
      </View>

      <View style={[styles.filterContainer, isMobile && styles.filterContainerMobile]}>
        {/* Group Picker */}
        <View style={[styles.pickerWrapper, !isMobile && { flex: 1 }, isMobile && styles.pickerWrapperMobile]}>
          <Text style={styles.pickerLabel}>Group</Text>
          <View style={styles.pickerShell}>
            <Picker
              selectedValue={selectedGroupId}
              onValueChange={(itemValue) => setSelectedGroupId(itemValue)}
              style={styles.picker}
              enabled={!loadingGroups}
            >
              {groupChats.map(group => (
                <Picker.Item key={group.id} label={group.name} value={group.id} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Status Picker */}
        <View style={[styles.pickerWrapper, !isMobile && { flex: 1 }, isMobile && styles.pickerWrapperMobile]}>
          <Text style={styles.pickerLabel}>Status</Text>
          <View style={styles.pickerShell}>
            <Picker
              selectedValue={statusFilter}
              onValueChange={(itemValue) => setStatusFilter(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Pending" value="pending" />
              <Picker.Item label="Approved" value="approved" />
              <Picker.Item label="Rejected" value="rejected" />
            </Picker>
          </View>
        </View>
      </View>

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    padding: Platform.OS === 'web' ? 24 : 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  filterContainerMobile: {
    flexDirection: 'column',
  },
  pickerWrapper: {
    // On web, this will be combined with flex: 1
    marginRight: 16,
  },
  pickerWrapperMobile: {
    width: '100%',
    marginRight: 0,
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568',
    marginBottom: 8,
  },
  pickerShell: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
  },
  picker: {
    height: 55,
    width: '100%',
    borderWidth: 0, // For web, to hide default browser style
    backgroundColor: 'transparent',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#718096',
    marginTop: 16,
    textAlign: 'center',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: 150,
  },
  itemContent: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemType: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568',
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  status_pending: { backgroundColor: '#FFEDD5' },
  status_approved: { backgroundColor: '#D1FAE5' },
  status_rejected: { backgroundColor: '#FEE2E2' },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9A3412', // Default, will be overridden
    ...Platform.select({
      'status_pending': { color: '#9A3412' },
      'status_approved': { color: '#065F46' },
      'status_rejected': { color: '#991B1B' },
    }),
  },
  previewButton: {
    backgroundColor: '#303F9F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
});