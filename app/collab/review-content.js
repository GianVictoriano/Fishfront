import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../../utils/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const ReviewItem = ({ item, isMobile, onPreview }) => {
  const fileType = item._type === 'image' ? 'Image' : 'Document';
  const title = item.title || (item.group ? item.group.name : 'Untitled');
  const uploader = item.user?.name || 'Unknown User';
  const uploadDate = item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString() : 'N/A';

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return { bg: '#FEF3C7', text: '#92400E', icon: 'clock' };
      case 'approved': return { bg: '#D1FAE5', text: '#065F46', icon: 'check-circle' };
      case 'rejected': return { bg: '#FEE2E2', text: '#991B1B', icon: 'x-circle' };
      default: return { bg: '#F3F4F6', text: '#6B7280', icon: 'help-circle' };
    }
  };

  const statusStyle = getStatusColor(item.status);

  return (
    <TouchableOpacity 
      style={[styles.itemCard, isMobile && styles.itemCardMobile]}
      onPress={() => onPreview(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContainer}>
        {item._type === 'image' && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: `${API_URL}/storage/${item.file}` }}
              style={styles.itemImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <View style={styles.imageTypeTag}>
                <Feather name="image" size={14} color="#fff" />
                <Text style={styles.imageTypeText}>Image</Text>
              </View>
            </View>
          </View>
        )}
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <View style={styles.typeContainer}>
              <View style={[styles.iconCircle, item._type === 'image' ? styles.iconCircleImage : styles.iconCircleDoc]}>
                <Feather 
                  name={item._type === 'image' ? 'image' : 'file-text'} 
                  size={14} 
                  color={item._type === 'image' ? '#8B5CF6' : '#3B82F6'} 
                />
              </View>
              <Text style={styles.itemType}>{fileType}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Feather name={statusStyle.icon} size={10} color={statusStyle.text} />
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.itemTitle} numberOfLines={2}>{title}</Text>
            <TouchableOpacity style={styles.previewButton} onPress={() => onPreview(item)}>
              <Text style={styles.previewButtonText}>Review</Text>
              <Feather name="arrow-right" size={12} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Feather name="user" size={12} color="#9CA3AF" />
              <Text style={styles.itemMeta}>{uploader}</Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={12} color="#9CA3AF" />
              <Text style={styles.itemMeta}>{uploadDate}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function ReviewContentScreen() {
  const [reviewContent, setReviewContent] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const ALL_GROUPS_ID = 'all';
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const { status: initialStatus } = useLocalSearchParams();
  const [statusFilter, setStatusFilter] = useState(initialStatus ?? 'pending');

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const router = useRouter();

  useEffect(() => {
    const fetchGroupChats = async () => {
      try {
        const response = await apiClient.get('/group-chats');
        // Sort groups by latest (most recent created_at or updated_at first)
        const sortedGroups = response.data.sort((a, b) => {
          const dateA = new Date(b.updated_at || b.created_at);
          const dateB = new Date(a.updated_at || a.created_at);
          return dateA - dateB;
        });
        setGroupChats(sortedGroups);
      } catch (error) {
        console.error('Failed to fetch group chats:', error);
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroupChats();
  }, []);

  useEffect(() => {
    const fetchReviewContent = async () => {
      setLoading(true);
      try {
        // Get current user
        const userResponse = await apiClient.get('/user');
        const currentUser = userResponse.data;
        
        const params = new URLSearchParams({
          status: statusFilter,
        });
        
        // Only add group_id to params if a specific group is selected (not 'all')
        if (selectedGroupId !== ALL_GROUPS_ID) {
          params.append('group_id', selectedGroupId);
        }
        
        // IMPORTANT: Only show items assigned to current user as reviewer
        // This ensures users only see content they need to review
        if (statusFilter === 'pending') {
          params.append('current_reviewer_id', currentUser.id);
        }
        
        const url = `/review-content?${params.toString()}`;
        const imagesUrl = `/review-images?${params.toString()}`;

        const [draftsRes, imagesRes, groupsRes] = await Promise.all([
          apiClient.get(url),
          apiClient.get(imagesUrl),
          apiClient.get('/group-chats'),
        ]);

        // Create a map of group_id to group object for quick lookup
        const groupsMap = {};
        groupsRes.data.forEach(group => {
          groupsMap[group.id] = group;
        });

        const drafts = draftsRes.data.map(d => ({ ...d, _type: 'draft' }));
        const images = imagesRes.data.map(img => ({
          ...img,
          _type: 'image',
          // Add group object if not present
          group: img.group || (img.group_id ? groupsMap[img.group_id] : null)
        }));
        
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
          <View style={styles.emptyIconContainer}>
            <Feather name="inbox" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>No Content Found</Text>
          <Text style={styles.emptyText}>There are no {statusFilter} items to review in the selected group.</Text>
        </View>
      );
    }
    return (
      <View>
        {sortedContent.map((item) => (
          <ReviewItem key={`${item._type}-${item.id}`} item={item} isMobile={isMobile} onPreview={handlePreview} />
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={true}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Feather name="check-square" size={24} color="#1a237e" />
            </View>
            <Text style={styles.title}>Review Content</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{sortedContent.length}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Feather name="filter" size={18} color="#374151" />
          <Text style={styles.filterTitle}>Filters</Text>
        </View>
        <View style={[styles.filterContainer, isMobile && styles.filterContainerMobile]}>
          {/* Group Picker */}
          <View style={[styles.pickerWrapper, !isMobile && { flex: 1 }, isMobile && styles.pickerWrapperMobile]}>
            <View style={styles.pickerLabelContainer}>
              <Feather name="users" size={14} color="#6B7280" />
              <Text style={styles.pickerLabel}>Group</Text>
            </View>
            <View style={styles.pickerShell}>
              <Picker
                selectedValue={selectedGroupId}
                onValueChange={(itemValue) => setSelectedGroupId(itemValue)}
                style={styles.picker}
                enabled={!loadingGroups}
              >
                <Picker.Item label="All Groups" value={ALL_GROUPS_ID} />
                {groupChats.map(group => (
                  <Picker.Item key={group.id} label={group.name} value={group.id} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Status Picker */}
          <View style={[styles.pickerWrapper, !isMobile && { flex: 1 }, isMobile && styles.pickerWrapperMobile]}>
            <View style={styles.pickerLabelContainer}>
              <Feather name="tag" size={14} color="#6B7280" />
              <Text style={styles.pickerLabel}>Status</Text>
            </View>
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
      </View>

      {renderContent()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: Platform.OS === 'web' ? 24 : 16,
  },
  header: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 6,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a237e',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  filterContainerMobile: {
    flexDirection: 'column',
  },
  pickerWrapper: {
    marginRight: 0,
  },
  pickerWrapperMobile: {
    width: '100%',
    marginBottom: 16,
  },
  pickerLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  pickerShell: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
  },
  picker: {
    height: 44,
    width: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    maxWidth: 300,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardContainer: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
  },
  imageOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  imageTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  imageTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  itemContent: {
    padding: 18,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  iconCircleImage: {
    backgroundColor: '#F3E8FF',
  },
  iconCircleDoc: {
    backgroundColor: '#DBEAFE',
  },
  itemType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemMeta: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  previewButton: {
    backgroundColor: '#1a237e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});