import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import apiClient from '../../utils/api';
import { useBranding } from '~/context/BrandingContext';

export default function LiteraryWorksScreen() {
  const router = useRouter();
  const { colors } = useBranding();
  const [literaryWorks, setLiteraryWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLiteraryWorks = async () => {
    try {
      const response = await apiClient.get('/literary-works');
      if (response.data.success) {
        setLiteraryWorks(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching literary works:', error);
      Alert.alert('Error', 'Failed to load literary works');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiteraryWorks();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLiteraryWorks();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'published':
        return 'Published';
      default:
        return 'Draft';
    }
  };

  const renderLiteraryWork = ({ item }) => (
    <TouchableOpacity 
      style={styles.workCard}
      onPress={() => {
        if (item.heyzine_url) {
          if (Platform.OS === 'web') {
            window.open(item.heyzine_url, '_blank');
          } else {
            Alert.alert('Flipbook Available', `View your flipbook at: ${item.heyzine_url}`);
          }
        }
      }}
    >
      <View style={styles.workHeader}>
        <View style={styles.workInfo}>
          <Text style={styles.workTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.workDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <View style={styles.workFooter}>
        <View style={styles.workMeta}>
          <Text style={styles.authorText}>
            by {item.user?.name || 'Unknown'}
          </Text>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        
        {item.heyzine_url && (
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={(e) => {
              e.stopPropagation();
              if (Platform.OS === 'web') {
                window.open(item.heyzine_url, '_blank');
              } else {
                Alert.alert('Flipbook Available', `View your flipbook at: ${item.heyzine_url}`);
              }
            }}
          >
            <Feather name="external-link" size={16} color={colors.primary || '#1a237e'} />
            <Text style={[styles.viewButtonText, { color: colors.primary || '#1a237e' }]}>
              View
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary || '#1a237e'} />
        <Text style={styles.loadingText}>Loading literary works...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary || '#1a237e'} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.primary || '#1a237e' }]}>
            Literary Works
          </Text>
          <Text style={styles.subtitle}>Your published flipbooks and drafts</Text>
        </View>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => router.push('/collab/create-literary-work')}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {literaryWorks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="link-variant" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Literary Works Yet</Text>
          <Text style={styles.emptyDescription}>
            Create your first literary work by adding a Heyzine flipbook URL
          </Text>
          <TouchableOpacity
            style={[styles.emptyActionButton, { backgroundColor: colors.primary || '#1a237e' }]}
            onPress={() => router.push('/collab/create-literary-work')}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.emptyActionText}>Add Literary Work</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={literaryWorks}
          renderItem={renderLiteraryWork}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a237e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  listContainer: {
    padding: 20,
  },
  workCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workInfo: {
    flex: 1,
    marginRight: 12,
  },
  workTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  workDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  workFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workMeta: {
    flex: 1,
  },
  authorText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
