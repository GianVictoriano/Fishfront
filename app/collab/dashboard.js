import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '~/context/AuthContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = `${process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.2:8000'}/api`;

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

const ActivityItem = ({ text, time, iconName, isMobile }) => {
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <View style={styles.activityItem}>
      <Feather name={iconName} size={isMobile ? 18 : 24} color="#555" />
      <Text style={styles.activityText}>{text}</Text>
      <Text style={styles.activityTime}>{getTimeAgo(time)}</Text>
    </View>
  );
};

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
  const { user, logout, hasModule } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [activities, setActivities] = useState([]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        console.error('No auth token found');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/dashboard/statistics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data.data;
      const statsArray = [];

      // Build stats based on user's modules
      if (hasModule('review-content') && data.pending_reviews !== undefined) {
        statsArray.push({
          title: "Pending Reviews",
          value: data.pending_reviews.toString(),
          iconName: "file-text",
          color: "#FFA726"
        });
      }

      if (hasModule('collaborate')) {
        if (data.total_group_chats !== undefined) {
          statsArray.push({
            title: "Group Chats",
            value: data.total_group_chats.toString(),
            iconName: "users",
            color: "#5C6BC0"
          });
        }
        if (data.active_group_chats !== undefined) {
          statsArray.push({
            title: "Active Chats",
            value: data.active_group_chats.toString(),
            iconName: "message-circle",
            color: "#66BB6A"
          });
        }
      }

      if (hasModule('forum') && data.reported_topics !== undefined) {
        statsArray.push({
          title: "Reported Topics",
          value: data.reported_topics.toString(),
          iconName: "alert-triangle",
          color: "#EF5350"
        });
      }

      if (hasModule('requests') && data.pending_coverage_requests !== undefined) {
        statsArray.push({
          title: "Coverage Requests",
          value: data.pending_coverage_requests.toString(),
          iconName: "camera",
          color: "#AB47BC"
        });
      }

      if (hasModule('folio')) {
        if (data.pending_folio_submissions !== undefined) {
          statsArray.push({
            title: "Pending Submissions",
            value: data.pending_folio_submissions.toString(),
            iconName: "book",
            color: "#FF7043"
          });
        }
        if (data.approved_folio_submissions !== undefined) {
          statsArray.push({
            title: "Approved Works",
            value: data.approved_folio_submissions.toString(),
            iconName: "check-circle",
            color: "#66BB6A"
          });
        }
      }

      // User's own contributions
      if (data.my_contributions) {
        statsArray.push({
          title: "My Pending",
          value: data.my_contributions.pending.toString(),
          iconName: "clock",
          color: "#FFA726"
        });
      }

      setStats(statsArray);
      setActivities(data.recent_activity || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set default stats on error
      setStats([
        { title: "Error Loading", value: "0", iconName: "alert-circle", color: "#EF5350" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#303F9F" />
        <Text style={{ marginTop: 10, color: '#718096' }}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Welcome, {user?.profile?.name || 'Collaborator'}!</Text>
            <Text style={styles.subtitle}>Here's a summary of your workspace.</Text>
          </View>
        </View>

        {stats.length > 0 && (
          isMobile ? (
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
          )
        )}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={[styles.quickActionsGrid, isMobile && styles.mobileQuickActionsGrid]}>
            {hasModule('create-content') && (
              <QuickAction title="Publish" iconName="send" href="/collab/create-content" isMobile={isMobile} />
            )}
            <QuickAction title="Go to Home" iconName="home" href="/home" isMobile={isMobile} />
          </View>
        </View>

        {activities.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityList}>
              {activities.map((activity, index) => (
                <ActivityItem 
                  key={index}
                  iconName={activity.icon} 
                  text={activity.text} 
                  time={activity.time} 
                  isMobile={isMobile} 
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
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
    alignItems: 'center',
    marginBottom: 30,
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

  mobileQuickActionsGrid: {
    flexDirection: 'column',
  },
});
