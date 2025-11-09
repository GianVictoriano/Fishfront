import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Modal, TextInput, FlatList, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '~/context/AuthContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const StatCard = ({ title, value, iconName, color, isMobile, cardStyle }) => (
  <View style={[styles.statCard, isMobile && styles.statCardMobile, cardStyle]}>
    <View style={[styles.iconContainer, { backgroundColor: color }, isMobile && styles.iconContainerMobile]}>
      <Feather name={iconName} size={isMobile ? 18 : 24} color="#fff" />
    </View>
    <View>
      <Text style={[styles.statCardTitle, isMobile && styles.statCardTitleMobile]}>{title}</Text>
      <Text style={[styles.statCardValue, isMobile && styles.statCardValueMobile]}>{value}</Text>
    </View>
  </View>
);

const ActivityItem = ({ text, time, iconName, isMobile }) => (
  <View style={styles.activityItem}>
    <Feather name={iconName} size={isMobile ? 18 : 24} color="#555" />
    <Text style={styles.activityText}>{text}</Text>
    <Text style={styles.activityTime}>{time}</Text>
  </View>
);

const UpcomingActivityItem = ({ title, date, time, location, creator, isMobile }) => (
  <View style={styles.activityItem}>
    <Feather name="calendar" size={isMobile ? 18 : 24} color="#555" />
    <View style={styles.activityContent}>
      <Text style={styles.activityTitle}>{title}</Text>
      <View style={styles.activityDetails}>
        <Text style={styles.activityDetail}>{date} at {time}</Text>
        {location && <Text style={styles.activityDetail}>📍 {location}</Text>}
        <Text style={styles.activityDetail}>by {creator}</Text>
      </View>
    </View>
  </View>
);

const QuickAction = ({ title, iconName, href, isMobile }) => {
  const router = useRouter();
  return (
    <TouchableOpacity style={[styles.quickAction, isMobile && styles.quickActionMobile]} onPress={() => router.push(href)}>
      <Feather name={iconName} size={isMobile ? 16 : 22} color="#303F9F" />
      <Text style={[styles.quickActionText, isMobile && styles.quickActionTextMobile]}>{title}</Text>
    </TouchableOpacity>
  );
};

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [stats, setStats] = useState([
    { title: "In Review", value: "0", iconName: "file-text", color: "#FFA726" },
    { title: "Approved", value: "0", iconName: "check-square", color: "#66BB6A" },
    { title: "Pending Tasks", value: "0", iconName: "alert-circle", color: "#EF5350" },
    { title: "Active Projects", value: "0", iconName: "briefcase", color: "#5C6BC0" },
  ]);
  const [loading, setLoading] = useState(true);
  const [upcomingActivities, setUpcomingActivities] = useState([]);
  const [topContributors, setTopContributors] = useState([]);
  const [showContributorsModal, setShowContributorsModal] = useState(false);
  const [allContributors, setAllContributors] = useState([]);
  const [contributorsSearch, setContributorsSearch] = useState('');
  const [contributorsTimeframe, setContributorsTimeframe] = useState('30');
  const [contributorsRole, setContributorsRole] = useState('all');
  const [loadingContributors, setLoadingContributors] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/dashboard-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Dashboard data received:', data);
        
        setStats([
          { title: "In Review", value: data.in_review.toString(), iconName: "file-text", color: "#FFA726" },
          { title: "Approved", value: data.approved.toString(), iconName: "check-square", color: "#66BB6A" },
          { title: "Pending Tasks", value: data.pending_tasks.toString(), iconName: "alert-circle", color: "#EF5350" },
          { title: "Active Projects", value: data.active_projects.toString(), iconName: "briefcase", color: "#5C6BC0" },
        ]);
        
        console.log('Setting upcoming activities:', data.upcoming_activities);
        setUpcomingActivities(data.upcoming_activities || []);
        
        console.log('Setting top contributors:', data.top_contributors);
        setTopContributors(data.top_contributors || []);
      } else {
        console.error('Failed to fetch dashboard stats');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAllContributors = async () => {
    setLoadingContributors(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const params = new URLSearchParams({
        search: contributorsSearch,
        timeframe: contributorsTimeframe,
        role: contributorsRole,
      });
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/contributors?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllContributors(data.data || []);
      } else {
        console.error('Failed to fetch all contributors');
      }
    } catch (error) {
      console.error('Error fetching all contributors:', error);
    } finally {
      setLoadingContributors(false);
    }
  };

  useEffect(() => {
    if (showContributorsModal) {
      fetchAllContributors();
    }
  }, [showContributorsModal, contributorsSearch, contributorsTimeframe, contributorsRole]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Welcome, {user?.profile?.name || 'Collaborator'}!</Text>
            <Text style={styles.subtitle}>Here's a summary of your workspace.</Text>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => fetchDashboardStats(true)}
            disabled={refreshing}
          >
            <Feather 
              name="refresh-cw" 
              size={20} 
              color={refreshing ? "#ccc" : "#303F9F"} 
              style={{ transform: [{ rotate: refreshing ? '180deg' : '0deg' }] }}
            />
          </TouchableOpacity>
        </View>

        {isMobile ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsContainerHorizontal}
          >
            {stats.map(stat => <StatCard key={stat.title} {...stat} isMobile={isMobile} cardStyle={{ width: width * 0.75 }} />)}
          </ScrollView>
        ) : (
          <View style={styles.statsContainer}>
            {stats.map(stat => <StatCard key={stat.title} {...stat} isMobile={isMobile} />)}
          </View>
        )}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={[styles.quickActionsGrid, isMobile && styles.mobileQuickActionsGrid]}>
            <QuickAction title="Collaborate" iconName="plus-circle" href="/collab/collaborate" isMobile={isMobile} />
            <QuickAction title="Review Content" iconName="eye" href="/collab/review-content" isMobile={isMobile} />
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Upcoming Activities</Text>
          <View style={styles.activityList}>
            {upcomingActivities.length > 0 ? (
              upcomingActivities.map((activity, index) => (
                <UpcomingActivityItem
                  key={activity.id}
                  title={activity.title}
                  date={activity.date}
                  time={activity.time}
                  location={activity.location}
                  creator={activity.creator}
                  isMobile={isMobile}
                />
              ))
            ) : (
              <View style={styles.noActivitiesContainer}>
                <Feather name="calendar" size={32} color="#ccc" />
                <Text style={styles.noActivitiesText}>No upcoming activities</Text>
                <Text style={styles.noActivitiesSubtext}>You'll see activities you're enrolled in here</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Contributors (Last 30 Days)</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => setShowContributorsModal(true)}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <Feather name="chevron-right" size={16} color="#303F9F" />
            </TouchableOpacity>
          </View>
          <View style={styles.contributorsList}>
            {topContributors.length > 0 ? (
              topContributors.map((contributor, index) => (
                <View key={contributor.id} style={styles.contributorItem}>
                  <View style={styles.contributorRank}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.contributorInfo}>
                    <Text style={styles.contributorName}>{contributor.name}</Text>
                    <Text style={styles.contributorEmail}>{contributor.email}</Text>
                    <View style={styles.contributorBadges}>
                      <View style={[styles.badge, styles.approvedBadge]}>
                        <Text style={styles.badgeText}>✓ {contributor.approved}</Text>
                      </View>
                      <View style={[styles.badge, styles.reviewBadge]}>
                        <Text style={styles.badgeText}>⏳ {contributor.in_review}</Text>
                      </View>
                      <View style={[styles.badge, styles.pendingBadge]}>
                        <Text style={styles.badgeText}>! {contributor.pending}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.contributorStats}>
                    <Text style={styles.contributorCount}>{contributor.total_assigned}</Text>
                    <Text style={styles.contributorLabel}>Assigned</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noContributorsContainer}>
                <Feather name="users" size={32} color="#ccc" />
                <Text style={styles.noContributorsText}>No contributor data available</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Contributors Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showContributorsModal}
        onRequestClose={() => setShowContributorsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowContributorsModal(false)}>
              <Feather name="arrow-left" size={24} color="#303F9F" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>All Contributors</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Search and Filters */}
          <View style={styles.filtersContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search contributors..."
              value={contributorsSearch}
              onChangeText={setContributorsSearch}
            />
            <View style={styles.filterRow}>
              <TouchableOpacity 
                style={[styles.filterButton, contributorsTimeframe === '7' && styles.filterButtonActive]}
                onPress={() => setContributorsTimeframe('7')}
              >
                <Text style={[styles.filterText, contributorsTimeframe === '7' && styles.filterTextActive]}>7 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterButton, contributorsTimeframe === '30' && styles.filterButtonActive]}
                onPress={() => setContributorsTimeframe('30')}
              >
                <Text style={[styles.filterText, contributorsTimeframe === '30' && styles.filterTextActive]}>30 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterButton, contributorsTimeframe === '90' && styles.filterButtonActive]}
                onPress={() => setContributorsTimeframe('90')}
              >
                <Text style={[styles.filterText, contributorsTimeframe === '90' && styles.filterTextActive]}>90 Days</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Contributors List */}
          {loadingContributors ? (
            <View style={styles.loadingContainer}>
              <Text>Loading contributors...</Text>
            </View>
          ) : (
            <FlatList
              data={allContributors}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => (
                <View style={styles.modalContributorItem}>
                  <View style={styles.contributorRank}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.contributorInfo}>
                    <Text style={styles.contributorName}>{item.name}</Text>
                    <Text style={styles.contributorEmail}>{item.email}</Text>
                    <View style={styles.contributorBadges}>
                      <View style={[styles.badge, styles.approvedBadge]}>
                        <Text style={styles.badgeText}>✓ {item.approved}</Text>
                      </View>
                      <View style={[styles.badge, styles.reviewBadge]}>
                        <Text style={styles.badgeText}>⏳ {item.in_review}</Text>
                      </View>
                      <View style={[styles.badge, styles.pendingBadge]}>
                        <Text style={styles.badgeText}>! {item.pending}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.contributorStats}>
                    <Text style={styles.contributorCount}>{item.total_assigned}</Text>
                    <Text style={styles.contributorLabel}>Assigned</Text>
                  </View>
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 48, // Ensure space at the bottom
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statsContainerHorizontal: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    flexBasis: '46%',
    flexGrow: 1,
  },
  statCardMobile: {
    padding: 8,
    margin: 6,
    borderRadius: 8,
  },
  iconContainer: {
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
  },
  iconContainerMobile: {
    padding: 8,
    marginRight: 10,
    borderRadius: 6,
  },
  statCardTitle: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  statCardTitleMobile: {
    fontSize: 12,
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A202C',
    marginTop: 4,
  },
  statCardValueMobile: {
    fontSize: 18,
    marginTop: 1,
  },
  sectionContainer: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 15,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexBasis: '46%',
    flexGrow: 1,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  quickActionMobile: {
    padding: 10,
    borderRadius: 10,
    margin: 6,
  },
  quickActionText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#303F9F',
  },
  quickActionTextMobile: {
    marginLeft: 10,
    fontSize: 14,
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
  activityText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#4A4A4A',
  },
  activityTime: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  activityDetails: {
    gap: 2,
  },
  activityDetail: {
    fontSize: 12,
    color: '#718096',
  },
  noActivitiesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  noActivitiesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A0AEC0',
    marginTop: 8,
  },
  noActivitiesSubtext: {
    fontSize: 14,
    color: '#CBD5E0',
    marginTop: 4,
    textAlign: 'center',
  },

  mobileQuickActionsGrid: {
    flexDirection: 'column',
  },
  // Contributors Section Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F7F8FA',
    borderRadius: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#303F9F',
    marginRight: 4,
  },
  contributorsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  contributorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
  contributorRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#303F9F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  contributorInfo: {
    flex: 1,
  },
  contributorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
  contributorEmail: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  contributorBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 32,
    alignItems: 'center',
  },
  approvedBadge: {
    backgroundColor: '#D4EDDA',
  },
  reviewBadge: {
    backgroundColor: '#FFF3CD',
  },
  pendingBadge: {
    backgroundColor: '#F8D7DA',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  contributorStats: {
    alignItems: 'flex-end',
  },
  contributorCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#303F9F',
  },
  contributorLabel: {
    fontSize: 11,
    color: '#A0AEC0',
    marginTop: 2,
  },
  noContributorsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  noContributorsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A0AEC0',
    marginTop: 8,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  filtersContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#303F9F',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  filterTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  modalContributorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
});
