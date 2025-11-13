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
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../../utils/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const ArchiveItem = ({ item, isMobile, onPreview }) => {
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
              <View style={[styles.iconCircle, item._type === 'image' ? styles.iconCircleImage : item._type === 'article' ? styles.iconCircleArticle : styles.iconCircleDoc]}>
                <Feather 
                  name={item._type === 'image' ? 'image' : item._type === 'article' ? 'file-text' : 'file-text'} 
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
              <Text style={styles.previewButtonText}>View</Text>
              <Feather name="eye" size={12} color="#fff" />
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

export default function ArchivesScreen() {
  const [archiveContent, setArchiveContent] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const router = useRouter();

  useEffect(() => {
    const fetchGroupChats = async () => {
      try {
        const response = await apiClient.get('/group-chats');
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
    fetchArchiveContent();
  }, [selectedGroupId, selectedType, selectedStatus]);

  const fetchArchiveContent = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Add filters
      if (selectedGroupId !== 'all') {
        params.append('group_id', selectedGroupId);
      }
      if (selectedType !== 'all') {
        params.append('type', selectedType);
      }
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }
      
      const url = `/review-content?${params.toString()}`;
      const imagesUrl = `/review-images?${params.toString()}`;

      const [draftsRes, imagesRes, groupsRes] = await Promise.all([
        apiClient.get(url),
        apiClient.get(imagesUrl),
        apiClient.get('/group-chats'),
      ]);

      const groupsMap = {};
      groupsRes.data.forEach(group => {
        groupsMap[group.id] = group;
      });

      // Process drafts and images only
      const drafts = draftsRes.data
        .filter(d => !d.is_folio_submission)
        .map(d => ({ ...d, _type: 'draft' }));
      
      const images = imagesRes.data
        .filter(img => !img.is_folio_submission)
        .map(img => ({
          ...img,
          _type: 'image',
          group: img.group || (img.group_id ? groupsMap[img.group_id] : null)
        }));
      
      setArchiveContent([...drafts, ...images]);
    } catch (error) {
      console.error('Failed to fetch archive content:', error);
      setArchiveContent([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchArchiveContent().finally(() => setRefreshing(false));
  };

  const sortedContent = useMemo(() => {
    return [...archiveContent].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
  }, [archiveContent]);

  const handlePreview = (item) => {
    if (item._type === 'image') {
      router.push(`/collab/archive-image-preview?id=${item.id}`);
    } else if (item._type === 'draft') {
      router.push(`/collab/archive-document-preview?id=${item.id}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Archives</Text>
        <Text style={styles.subtitle}>Browse all historical content</Text>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <View style={[styles.filterGroup, isMobile && styles.filterGroupMobile]}>
            <Text style={styles.filterLabel}>Group:</Text>
            <Picker
              selectedValue={selectedGroupId}
              onValueChange={setSelectedGroupId}
              style={[styles.picker, isMobile && styles.pickerMobile]}
            >
              <Picker.Item label="All Groups" value="all" />
              {groupChats.map(group => (
                <Picker.Item key={group.id} label={group.name} value={group.id} />
              ))}
            </Picker>
          </View>

          <View style={[styles.filterGroup, isMobile && styles.filterGroupMobile]}>
            <Text style={styles.filterLabel}>Type:</Text>
            <Picker
              selectedValue={selectedType}
              onValueChange={setSelectedType}
              style={[styles.picker, isMobile && styles.pickerMobile]}
            >
              <Picker.Item label="All Types" value="all" />
              <Picker.Item label="Images" value="image" />
              <Picker.Item label="Documents" value="draft" />
            </Picker>
          </View>

          <View style={[styles.filterGroup, isMobile && styles.filterGroupMobile]}>
            <Text style={styles.filterLabel}>Status:</Text>
            <Picker
              selectedValue={selectedStatus}
              onValueChange={setSelectedStatus}
              style={[styles.picker, isMobile && styles.pickerMobile]}
            >
              <Picker.Item label="All Status" value="all" />
              <Picker.Item label="Approved" value="approved" />
              <Picker.Item label="Pending" value="pending" />
              <Picker.Item label="Rejected" value="rejected" />
            </Picker>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#303F9F" />
            <Text style={styles.loadingText}>Loading archives...</Text>
          </View>
        ) : sortedContent.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="archive" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No archived content found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        ) : (
          <View style={styles.itemsContainer}>
            {sortedContent.map((item) => (
              <ArchiveItem
                key={`${item._type}-${item.id}`}
                item={item}
                isMobile={isMobile}
                onPreview={handlePreview}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 16,
  },
  filterGroup: {
    flex: 1,
  },
  filterGroupMobile: {
    minWidth: 120,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  picker: {
    height: 40,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  pickerMobile: {
    height: 36,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  itemsContainer: {
    gap: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemCardMobile: {
    padding: 12,
  },
  cardContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-end',
    padding: 4,
  },
  imageTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  imageTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleImage: {
    backgroundColor: '#EDE9FE',
  },
  iconCircleArticle: {
    backgroundColor: '#DBEAFE',
  },
  iconCircleDoc: {
    backgroundColor: '#FEF3C7',
  },
  itemType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 12,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#303F9F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
});
