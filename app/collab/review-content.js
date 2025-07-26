import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Picker } from 'react-native';
import { useRouter } from 'expo-router';
import apiClient from '../../utils/api';

export default function ReviewContentScreen() {
  const [reviewContent, setReviewContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('uploaded_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviewContent = async (opts = {}) => {
    setLoading(true);
    try {
      let url = '/review-content';
      const params = [];
      if (opts.status && opts.status !== 'all') params.push(`status=${opts.status}`);
      if (params.length > 0) url += '?' + params.join('&');
      const response = await apiClient.get(url);
      setReviewContent(response.data);
    } catch (error) {
      console.error('Failed to fetch review content:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviewContent({ status: statusFilter });
  }, [statusFilter]);

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

  const renderItem = ({ item }) => (
    <View style={styles.itemBox}>
      <Text style={styles.fileName}>File: {item.file}</Text>
      <TouchableOpacity onPress={() => router.push({ pathname: '/collab/review-preview', params: { file: item.file } })}>
        <Text style={styles.link}>Preview</Text>
      </TouchableOpacity>
      <Text>Status: <Text style={styles.status}>{item.status}</Text></Text>
      <Text>Uploaded by: {item.uploader_name || item.user_id}</Text>
      <Text>Uploaded at: {item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : 'N/A'}</Text>
      <Text>Approvals: {item.no_of_approval}</Text>
      {item.status === 'pending' && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item.id)}>
            <Text style={styles.btnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.id)}>
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Review Content</Text>
      <View style={styles.filterRow}>
        <Text>Status: </Text>
        <Picker
          selectedValue={statusFilter}
          style={styles.picker}
          onValueChange={v => setStatusFilter(v)}
        >
          <Picker.Item label="All" value="all" />
          <Picker.Item label="Pending" value="pending" />
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
        <Text style={styles.subtitle}>No content pending review for your groups.</Text>
      ) : (
        <FlatList
          data={sortedContent}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchReviewContent({ status: statusFilter }); }}
        />
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
