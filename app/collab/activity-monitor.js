import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, FlatList, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '~/context/AuthContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../utils/api';

const ActivityItem = ({ activity, isMobile }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'login': return 'log-in';
      case 'logout': return 'log-out';
      case 'create': return 'plus';
      case 'update': return 'edit';
      case 'delete': return 'trash-2';
      case 'view': return 'eye';
      case 'comment': return 'message-square';
      default: return 'activity';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'login': return '#4CAF50';
      case 'logout': return '#FF9800';
      case 'create': return '#2196F3';
      case 'update': return '#FF9800';
      case 'delete': return '#F44336';
      case 'view': return '#9C27B0';
      case 'comment': return '#FF5722';
      default: return '#607D8B';
    }
  };

  return (
    <View style={[styles.activityItem, isMobile && styles.activityItemMobile]}>
      <View style={[styles.activityIcon, { backgroundColor: getActivityColor(activity.type) }]}>
        <Feather name={getActivityIcon(activity.type)} size={isMobile ? 14 : 16} color="#fff" />
      </View>
      <View style={styles.activityContent}>
        <Text style={[styles.activityText, isMobile && styles.activityTextMobile]}>
          <Text style={styles.activityUser}>{activity.user_name}</Text> {activity.description}
        </Text>
        <Text style={[styles.activityTime, isMobile && styles.activityTimeMobile]}>
          {activity.timestamp}
        </Text>
      </View>
      {activity.details && (
        <TouchableOpacity style={styles.detailsButton}>
          <Feather name="chevron-right" size={isMobile ? 16 : 18} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const ActivityFilter = ({ filter, setFilter, isMobile }) => {
  const filters = [
    { key: 'all', label: 'All Activities', icon: 'activity' },
    { key: 'user', label: 'User Actions', icon: 'user' },
    { key: 'content', label: 'Content Changes', icon: 'file-text' },
    { key: 'system', label: 'System Events', icon: 'settings' },
  ];

  return (
    <View style={[styles.filterContainer, isMobile && styles.filterContainerMobile]}>
      <ScrollView
        horizontal={isMobile}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={isMobile ? styles.filterScrollMobile : styles.filterScroll}
      >
        {filters.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.filterButton,
              filter === item.key && styles.filterButtonActive,
              isMobile && styles.filterButtonMobile
            ]}
            onPress={() => setFilter(item.key)}
          >
            <Feather
              name={item.icon}
              size={isMobile ? 14 : 16}
              color={filter === item.key ? '#fff' : '#666'}
            />
            <Text style={[
              styles.filterText,
              filter === item.key && styles.filterTextActive,
              isMobile && styles.filterTextMobile
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default function ActivityMonitorScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, [filter, search]);

  const fetchActivities = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({
        limit: '50',
        filter: filter,
        search: search,
      });

      const response = await apiClient.get(`/public/activity-data?${params}`);
      const data = response.data;

      if (data.success) {
        setActivities(data.data || []);
      } else {
        console.error('API Error:', data.message);
        setActivities([]);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchActivities(true);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <View>
          <Text style={[styles.title, isMobile && styles.titleMobile]}>
            Activity Monitor
          </Text>
          <Text style={[styles.subtitle, isMobile && styles.subtitleMobile]}>
            Track user activities and system events in real-time
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshButton, isMobile && styles.refreshButtonMobile]}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Feather
            name="refresh-cw"
            size={isMobile ? 16 : 20}
            color={refreshing ? "#ccc" : "#303F9F"}
            style={{ transform: [{ rotate: refreshing ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={[styles.controlsContainer, isMobile && styles.controlsContainerMobile]}>
        <View style={[styles.searchContainer, isMobile && styles.searchContainerMobile]}>
          <Feather name="search" size={isMobile ? 16 : 18} color="#666" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, isMobile && styles.searchInputMobile]}
            placeholder="Search activities..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <ActivityFilter filter={filter} setFilter={setFilter} isMobile={isMobile} />
      </View>

      {/* Activity Feed */}
      <View style={[styles.feedContainer, isMobile && styles.feedContainerMobile]}>
        <View style={styles.feedHeader}>
          <Text style={[styles.feedTitle, isMobile && styles.feedTitleMobile]}>
            Recent Activities ({activities.length})
          </Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Feather name="activity" size={32} color="#ccc" />
            <Text style={styles.loadingText}>Loading activities...</Text>
          </View>
        ) : activities.length > 0 ? (
          <FlatList
            data={activities}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <ActivityItem activity={item} isMobile={isMobile} />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.activityList}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Feather name="activity" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No activities found</Text>
            <Text style={styles.emptySubtext}>
              {search || filter !== 'all' ? 'Try adjusting your filters' : 'Activities will appear here when users interact with the system'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerMobile: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  titleMobile: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    marginTop: 4,
  },
  subtitleMobile: {
    fontSize: 14,
  },
  refreshButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonMobile: {
    padding: 6,
  },
  controlsContainer: {
    marginBottom: 24,
  },
  controlsContainerMobile: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  searchContainerMobile: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A202C',
  },
  searchInputMobile: {
    fontSize: 14,
  },
  filterContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  filterContainerMobile: {
    padding: 12,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterScrollMobile: {
    paddingHorizontal: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  filterButtonActive: {
    backgroundColor: '#303F9F',
  },
  filterButtonMobile: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  filterTextMobile: {
    fontSize: 12,
    marginLeft: 6,
  },
  feedContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  feedContainerMobile: {
    borderRadius: 8,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
  feedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  feedTitleMobile: {
    fontSize: 16,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  activityList: {
    padding: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
  activityItemMobile: {
    paddingVertical: 10,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  activityTextMobile: {
    fontSize: 13,
    lineHeight: 18,
  },
  activityUser: {
    fontWeight: '600',
    color: '#1A202C',
  },
  activityTime: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 2,
  },
  activityTimeMobile: {
    fontSize: 11,
    marginTop: 1,
  },
  detailsButton: {
    padding: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 16,
    color: '#A0AEC0',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#A0AEC0',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CBD5E0',
    marginTop: 8,
    textAlign: 'center',
  },
});
