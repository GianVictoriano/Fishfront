import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View, SafeAreaView } from 'react-native';
import apiClient from '../../../../utils/api';
import { Linking, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';


export default function ManageApplicantsScreen() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchApplicants = async () => {
    try {
      const res = await apiClient.get('/api/applications');
      // Laravel paginate returns { data: [...], ... } – fall back to res.data if not paginated
      const list = res.data.data ?? res.data;
      setApplicants(list);
    } catch (err) {
      console.error('Failed to load applicants', err);
      setError('Failed to load applicants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Manage Applicants</Text>
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
          data={applicants}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
 <View style={styles.nameRow}>
  <Text style={styles.name}>{item.full_name}</Text>
  <TouchableOpacity 
    style={styles.contactButton}
    onPress={() => Linking.openURL(`mailto:${item.email}`)}
  >
    <MaterialIcons name="email" size={16} color="#1565c0" />
    <Text style={styles.contactText}>Contact</Text>
  </TouchableOpacity>
</View>
              <Text style={styles.detail}>SR Code: {item.sr_code}</Text>
              <Text style={styles.detail}>Email: {item.email}</Text>
              <Text style={styles.detail}>Enrollment Year: {item.enrollment_year}</Text>
              <Text style={styles.detail}>Department: {item.department}</Text>
              <Text style={styles.detail}>Desired Role: {item.desired_role}</Text>
              <Text style={styles.status(item.status)}>{item.status.toUpperCase()}</Text>
            </View>
          )}
        />
      )}
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
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1a237e',
  },
  detail: {
    fontSize: 14,
    color: '#333',
  },
  status: (s) => ({
    marginTop: 6,
    fontWeight: 'bold',
    color: s === 'approved' ? '#28a745' : s === 'rejected' ? '#dc3545' : '#ffc107',
  }),
  title: {
    marginTop: 16,
    marginLeft: 19,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
  },
  contactButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  // Update name style to remove bottom margin:
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    marginRight: 8,
  },
  contactText: {
    color: '#1565c0',
    marginLeft: 4,
    fontWeight: '500',
  },
});