import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Picker } from 'react-native';
import { useRouter } from 'expo-router';
import apiClient from '../../utils/api';
import { TextInput } from 'react-native';

export default function ReviewContentScreen() {
  const [reviewContent, setReviewContent] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [search, setSearch] = useState('');

  // Fetch group chats from API on mount
  useEffect(() => {
    const fetchGroupChats = async () => {
      try {
        const response = await apiClient.get('/group-chats');
        setGroupChats(response.data);
        // Optionally auto-select first group if desired:
        // if (!selectedGroupId && response.data.length > 0) setSelectedGroupId(response.data[0].id);
      } catch (error) {
        console.error('Failed to fetch group chats:', error);
      }
    };
    fetchGroupChats();
  }, []);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending'); // Default to 'pending'
  const [sortKey, setSortKey] = useState('uploaded_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviewContent = async (opts = {}) => {
    setLoading(true);
    try {
      let url = '/review-content';
      const params = [];
      if (opts.status && opts.status !== 'all') params.push(`status=${opts.status}`);
      if (opts.group_id) params.push(`group_id=${opts.group_id}`);
      if (params.length > 0) url += '?' + params.join('&');
      const [draftsRes, imagesRes] = await Promise.all([
        apiClient.get(url),
        apiClient.get('/review-images' + (opts.status && opts.status !== 'all' || opts.group_id ? `?${[
          opts.status && opts.status !== 'all' ? `status=${opts.status}` : '',
          opts.group_id ? `group_id=${opts.group_id}` : ''
        ].filter(Boolean).join('&')}` : '')),
      ]);
      // Mark type for rendering
      const drafts = draftsRes.data.map(d => ({ ...d, _type: 'draft' }));
      const images = imagesRes.data.map(img => ({ ...img, _type: 'image' }));
      setReviewContent([...drafts, ...images]);
    } catch (error) {
      console.error('Failed to fetch review content:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch review content when group or status changes
  useEffect(() => {
    if (selectedGroupId) {
      fetchReviewContent({ status: statusFilter, group_id: selectedGroupId });
    }
  }, [selectedGroupId, statusFilter]);

  const handleApprove = async (id) => {
    try {
      await apiClient.patch(`/review-content/${id}/approve`);
      fetchReviewContent({ status: statusFilter });
    } catch (error) {
      alert('Failed to approve.');
    }
  };

  const handleReject = async (id) => {
    try {
      await apiClient.patch(`/review-content/${id}/reject`);
      fetchReviewContent({ status: statusFilter });
    } catch (error) {
      alert('Failed to reject.');
    }
  };

  // Sorting
  const sortedContent = [...reviewContent].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'uploaded_at') {
      cmp = new Date(a.uploaded_at) - new Date(b.uploaded_at);
    } else if (sortKey === 'no_of_approval') {
      cmp = a.no_of_approval - b.no_of_approval;
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const router = useRouter();

  const renderItem = ({ item }) => {
    if (item._type === 'image') {
      return (
        <View style={styles.itemBox}>
          <Text style={styles.fileName}>Image Draft</Text>
          <Image source={{ uri: `http://192.168.254.114:8000/storage/${item.file}` }} style={{ width: '100%', height: 120, borderRadius: 8, marginBottom: 8, backgroundColor: '#eee' }} resizeMode="cover" />
          <TouchableOpacity onPress={() => router.push({ pathname: '/collab/review-image-preview', params: { id: item.id } })}>
            <Text style={styles.link}>Preview</Text>
          </TouchableOpacity>
          <Text>Status: <Text style={styles.status}>{item.status}</Text></Text>
          <Text>Uploaded by: {item.user?.name || item.user_id}</Text>
          <Text>Uploaded at: {item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : 'N/A'}</Text>
          <Text>Approvals: {item.no_of_approval}</Text>
        </View>
      );
    }
    // Default: file draft
    return (
      <View style={styles.itemBox}>
        <Text style={styles.fileName}>Title: {item.group?.name || 'N/A'}</Text>
        <TouchableOpacity onPress={() => router.push({ pathname: '/collab/review-preview', params: { file: item.file, id: item.id } })}>
          <Text style={styles.link}>Preview</Text>
        </TouchableOpacity>
        <Text>Status: <Text style={styles.status}>{item.status}</Text></Text>
        <Text>Uploaded by: {item.user?.name || item.user_id}</Text>
        <Text>Uploaded at: {item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : 'N/A'}</Text>
        <Text>Approvals: {item.no_of_approval}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, position: 'relative', justifyContent: 'center' }}>
  {selectedGroupId ? (
    <TouchableOpacity onPress={() => setSelectedGroupId(null)} style={{ position: 'absolute', left: 0 }}>
      <Text style={{ color: '#222', fontSize: 18 }}>{'< Back'}</Text>
    </TouchableOpacity>
  ) : null}
  <Text style={[styles.title, { flex: 1, textAlign: 'center', marginLeft: selectedGroupId ? 0 : 0 }]}>Review Content</Text>
</View>
      {/* Group selection modal */}
      {!selectedGroupId && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Group</Text>
            <TextInput
              style={styles.searchBar}
              placeholder="Search groups..."
              placeholderTextColor="#8ca3c1"
              value={search}
              onChangeText={setSearch}
              clearButtonMode="while-editing"
            />
            <View style={styles.groupTable}>
              {groupChats.filter(g => g.name.toLowerCase().includes(search.toLowerCase())).map(group => (
                <TouchableOpacity
                  key={group.id}
                  style={styles.groupTableRow}
                  onPress={() => setSelectedGroupId(group.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.groupTableCell}>{group.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Only show filters/content if a group is selected */}
      {selectedGroupId ? (
        <>
          <View style={styles.filterRow}>
            <Text>Status: </Text>
            <Picker
              selectedValue={statusFilter}
              style={styles.picker}
              onValueChange={v => setStatusFilter(v)}
            >
              <Picker.Item label="Pending" value="pending" />
              <Picker.Item label="All" value="all" />
              <Picker.Item label="Approved" value="approved" />
              <Picker.Item label="Rejected" value="rejected" />
            </Picker>
            <Text>Sort by: </Text>
            <Picker
              selectedValue={sortKey}
              style={styles.picker}
              onValueChange={v => setSortKey(v)}
            >
              <Picker.Item label="Date" value="uploaded_at" />
              <Picker.Item label="Approvals" value="no_of_approval" />
            </Picker>
            <Picker
              selectedValue={sortOrder}
              style={styles.picker}
              onValueChange={v => setSortOrder(v)}
            >
              <Picker.Item label="Descending" value="desc" />
              <Picker.Item label="Ascending" value="asc" />
            </Picker>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color="#374151" />
          ) : sortedContent.length === 0 ? (
            <Text style={styles.subtitle}>No content pending review for this group.</Text>
          ) : (
            <FlatList
              data={sortedContent}
              renderItem={renderItem}
              keyExtractor={item => `${item._type}-${item.id}`}
              contentContainerStyle={{ paddingBottom: 20 }}
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchReviewContent({ status: statusFilter, group_id: selectedGroupId }); }}
            />
          )}
        </>
      ) : (
        <Text style={styles.subtitle}>Select a group to view review content.</Text>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 32,
    width: 650,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
  },
  searchBar: {
    width: '100%',
    boxSizing: 'border-box',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    backgroundColor: '#f6faff',
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 16,
    marginTop: 2,
    shadowColor: '#3b82f644',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
    elevation: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 18,
    color: '#1a237e',
    textAlign: 'center',
  },
  cardList: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    rowGap: 10,
    columnGap: 10,
  },
  groupCard: {
    backgroundColor: 'rgba(255,255,255,0.12)', // glass effect
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 10,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1e40af55',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 2,
    width: 120,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    backdropFilter: 'blur(8px)', // for web
    transition: 'transform 0.1s, box-shadow 0.1s',
  },
  groupTable: {
    width: '100%',
    marginTop: 8,
  },
  groupTableRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 4,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'flex-start',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e7ef',
    shadowColor: '#1e40af22',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
    elevation: 1,
    width: '100%',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  goBackButton: {
    backgroundColor: '#2563eb',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 24,
    alignSelf: 'center',
    marginBottom: 18,
    marginTop: 2,
    shadowColor: '#2563eb66',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 6,
    elevation: 2,
  },
  goBackButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  groupTableCell: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: 'bold',
    textAlign: 'left',
    width: '100%',
  },
  groupCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: '#1e40af88',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  groupListRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  groupButton: {
    backgroundColor: '#e0e7ef',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  selectedGroupButton: {
    backgroundColor: '#374151',
  },
  groupText: {
    color: '#374151',
    fontWeight: 'bold',
  },
  selectedGroupText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f4f8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
  },
  itemBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  fileName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
  },
  status: {
    fontWeight: 'bold',
    color: '#374151',
  },
  link: {
    color: '#007bff',
    textDecorationLine: 'underline',
    marginBottom: 6,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  approveBtn: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  rejectBtn: {
    backgroundColor: '#c62828',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e7ef',
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    marginTop: 8,
  },
  picker: {
    width: 130,
    marginHorizontal: 8,
    backgroundColor: '#f5f7fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cfd8dc',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
});
