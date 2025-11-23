import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Modal, TextInput, FlatList, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '~/context/AuthContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../utils/api';
import Svg, { Rect, Circle, Text as SvgText, Line, Path } from 'react-native-svg';

// Simple Bar Chart Component
const SimpleBarChart = ({ data, width = 300, height = 200 }) => {
  if (!data || !data.datasets || !data.labels) return null;

  const values = data.datasets[0].data;
  const maxValue = Math.max(...values);
  const barWidth = (width - 40) / values.length;
  const chartHeight = height - 40;

  return (
    <Svg width={width} height={height}>
      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
        const value = Math.round(maxValue * ratio);
        const y = 20 + (1 - ratio) * (chartHeight - 40);
        return (
          <SvgText
            key={i}
            x={10}
            y={y + 4}
            fontSize="10"
            fill="#666"
            textAnchor="end"
          >
            {value}
          </SvgText>
        );
      })}

      {/* Bars */}
      {values.map((value, index) => {
        const barHeight = (value / maxValue) * (chartHeight - 40);
        const x = 30 + index * barWidth;
        const y = 20 + (chartHeight - 40) - barHeight;

        return (
          <Rect
            key={index}
            x={x}
            y={y}
            width={barWidth - 5}
            height={barHeight}
            fill="#4CAF50"
            rx="2"
          />
        );
      })}

      {/* X-axis labels */}
      {data.labels.map((label, index) => {
        const x = 30 + index * barWidth + (barWidth - 5) / 2;
        return (
          <SvgText
            key={index}
            x={x}
            y={height - 5}
            fontSize="8"
            fill="#666"
            textAnchor="middle"
          >
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
};

// Simple Pie Chart Component
const SimplePieChart = ({ data, width = 300, height = 200 }) => {
  if (!data || !Array.isArray(data)) return null;

  const total = data.reduce((sum, item) => sum + item.count, 0);
  const radius = Math.min(width, height) / 2 - 20;
  const centerX = width / 2;
  const centerY = height / 2;

  const colors = ['#FF5722', '#FF9800', '#4CAF50', '#2196F3', '#9C27B0'];

  let currentAngle = -Math.PI / 2; // Start from top

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Svg width={width} height={height}>
        {data.map((item, index) => {
          const percentage = item.count / total;
          const angle = percentage * 2 * Math.PI;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;

          const x1 = centerX + radius * Math.cos(startAngle);
          const y1 = centerY + radius * Math.sin(startAngle);
          const x2 = centerX + radius * Math.cos(endAngle);
          const y2 = centerY + radius * Math.sin(endAngle);

          const largeArcFlag = percentage > 0.5 ? 1 : 0;
          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');

          currentAngle = endAngle;

          return (
            <Path
              key={index}
              d={pathData}
              fill={colors[index % colors.length]}
              stroke="#fff"
              strokeWidth="1"
            />
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={{ marginLeft: 20 }}>
        {data.map((item, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View
              style={{
                width: 12,
                height: 12,
                backgroundColor: colors[index % colors.length],
                marginRight: 8,
                borderRadius: 2
              }}
            />
            <Text style={{ fontSize: 12, color: '#666' }}>
              {item.name}: {item.count}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Simple Line Chart Component
const SimpleLineChart = ({ data, width = 300, height = 200 }) => {
  if (!data || !data.datasets || !data.labels) return null;

  const values = data.datasets[0].data;
  const maxValue = Math.max(...values);
  const chartWidth = width - 40;
  const chartHeight = height - 40;
  const stepX = chartWidth / (values.length - 1);

  const points = values.map((value, index) => {
    const x = 20 + index * stepX;
    const y = 20 + (1 - value / maxValue) * (chartHeight - 40);
    return `${x},${y}`;
  }).join(' ');

  return (
    <Svg width={width} height={height}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
        const y = 20 + ratio * (chartHeight - 40);
        return (
          <Line
            key={i}
            x1="20"
            y1={y}
            x2={width - 20}
            y2={y}
            stroke="#e0e0e0"
            strokeWidth="1"
          />
        );
      })}

      {/* Line */}
      <Path
        d={`M ${points}`}
        stroke="#2196F3"
        strokeWidth="3"
        fill="none"
      />

      {/* Data points */}
      {values.map((value, index) => {
        const x = 20 + index * stepX;
        const y = 20 + (1 - value / maxValue) * (chartHeight - 40);
        return (
          <Circle
            key={index}
            cx={x}
            cy={y}
            r="4"
            fill="#2196F3"
            stroke="#fff"
            strokeWidth="2"
          />
        );
      })}

      {/* Y-axis labels */}
      {[0, 0.5, 1].map((ratio, i) => {
        const value = Math.round(maxValue * ratio);
        const y = 20 + (1 - ratio) * (chartHeight - 40);
        return (
          <SvgText
            key={i}
            x="15"
            y={y + 4}
            fontSize="10"
            fill="#666"
            textAnchor="end"
          >
            {value}
          </SvgText>
        );
      })}

      {/* X-axis labels */}
      {data.labels.map((label, index) => {
        const x = 20 + index * stepX;
        return (
          <SvgText
            key={index}
            x={x}
            y={height - 5}
            fontSize="10"
            fill="#666"
            textAnchor="middle"
          >
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
};

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

  const getStatusStyle = (status) => {
    switch (status) {
      case 'approved':
        return styles.approvedStatus;
      case 'review':
        return styles.reviewStatus;
      default:
        return styles.pendingStatus;
    }
  };

const UpcomingActivityItem = ({ title, date, time, location, creator, isMobile }) => (
  <View style={styles.activityItem}>
    <Feather name="calendar" size={isMobile ? 18 : 24} color="#555" />
    <View style={styles.activityContent}>
      <Text style={styles.activityTitle}>{title}</Text>
      <View style={styles.activityDetails}>
        <Text style={styles.activityDetail}>📅 {date} at {time}</Text>
        <Text style={styles.activityDetail}>📍 {location}</Text>
        <Text style={styles.activityDetail}>👤 Created by {creator}</Text>
      </View>
    </View>
  </View>
);

  const { user, logout, hasModule } = useAuth();
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
  const [topContributors, setTopContributors] = useState(null); // Start with null to indicate initial loading
  const [showContributorsModal, setShowContributorsModal] = useState(false);
  const [allContributors, setAllContributors] = useState([]);
  const [contributorsSearch, setContributorsSearch] = useState('');
  const [contributorsRole, setContributorsRole] = useState('all');
  const [loadingContributors, setLoadingContributors] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [graphData, setGraphData] = useState(null);
  const [loadingGraphs, setLoadingGraphs] = useState(false);
  const [groupChatTimeline, setGroupChatTimeline] = useState([]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const fetchGraphData = async () => {
    try {
      setLoadingGraphs(true);
      
      const response = await apiClient.get('/graph-data?period=30');
      const data = response.data;
      
      setGraphData(data);
    } catch (error) {
      console.error('Error fetching graph data:', error);
    } finally {
      setLoadingGraphs(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    console.log('Stats state changed:', stats);
  }, [stats]);

  useEffect(() => {
    console.log('Upcoming activities state changed:', upcomingActivities);
  }, [upcomingActivities]);

  useEffect(() => {
    console.log('Top contributors state changed:', topContributors);
  }, [topContributors]);

  useEffect(() => {
    console.log('Graph data state changed:', graphData);
  }, [graphData]);

  useEffect(() => {
    console.log('Loading states changed:', { loading, loadingGraphs, refreshing });
  }, [loading, loadingGraphs, refreshing]);

  const fetchDashboardStats = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await apiClient.get('/dashboard-stats');
      const data = response.data;
      
      setStats([
        { title: "In Review", value: data.in_review.toString(), iconName: "file-text", color: "#FFA726" },
        { title: "Approved", value: data.approved.toString(), iconName: "check-square", color: "#66BB6A" },
        { title: "Pending Tasks", value: data.pending_tasks.toString(), iconName: "alert-circle", color: "#EF5350" },
        { title: "Active Projects", value: data.active_projects.toString(), iconName: "briefcase", color: "#5C6BC0" },
      ]);
      
      setUpcomingActivities(data.upcoming_activities || []);
      
      // Ensure we have valid data and it's an array
      const contributors = Array.isArray(data.top_contributors) ? data.top_contributors : [];
      setTopContributors(contributors);
      
      // Set group chat timeline
      setGroupChatTimeline(data.group_chat_timeline || []);
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
      const params = new URLSearchParams({
        search: contributorsSearch,
        timeframe: '30', // Always use 30 days for consistency with main list
        role: contributorsRole,
      });
      
      const response = await apiClient.get(`/contributors?${params}`);
      const data = response.data;
      
      // Handle paginated response - data is in data.data for contributors endpoint
      const contributors = data.data || data || [];
      setAllContributors(contributors);
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
  }, [showContributorsModal, contributorsSearch, contributorsRole]);

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
            {topContributors && topContributors.length > 0 ? (
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
                <Text style={styles.noContributorsText}>
                  {topContributors === null ? 'Loading contributors...' : 'No contributor data available'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Project Timeline</Text>
          <View style={styles.timelineList}>
            {groupChatTimeline.length > 0 ? (
              groupChatTimeline.map((item, index) => (
                <View key={item.id} style={styles.timelineItem}>
                  <View style={styles.timelineConnector}>
                    <View style={styles.timelineDot} />
                    {index < groupChatTimeline.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineHeader}>
                      <Text style={styles.timelineTitle}>{item.name}</Text>
                      <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                        <Text style={styles.statusText}>{item.status === 'approved' ? 'Approved' : item.status === 'review' ? 'In Review' : 'Pending'}</Text>
                      </View>
                    </View>
                    <View style={styles.timelineDetails}>
                      <Text style={styles.timelineDeadline}>📅 Deadline: {item.deadline || 'No deadline set'}</Text>
                      <Text style={styles.timelineLead}>👤 Lead: {item.lead_reviewer}</Text>
                      <Text style={styles.timelineMembers}>👥 {item.members_count} members</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noTimelineContainer}>
                <Feather name="calendar" size={32} color="#ccc" />
                <Text style={styles.noTimelineText}>No projects with deadlines found</Text>
                <Text style={styles.noTimelineSubtext}>Projects with deadlines will appear here</Text>
              </View>
            )}
          </View>
        </View>

        {/* Charts Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Project Status Overview</Text>
          
          {/* Content Submissions Over Time */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Content Submissions (Last 30 Days)</Text>
            {loadingGraphs ? (
              <View style={styles.loadingContainer}>
                <Text>Loading chart data...</Text>
              </View>
            ) : graphData && graphData.content_submissions && graphData.content_submissions.length > 0 ? (
              <SimpleLineChart
                data={{
                  labels: graphData.content_submissions.map(item => {
                    const date = new Date(item.date);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }),
                  datasets: [{
                    data: graphData.content_submissions.map(item => item.count),
                  }]
                }}
                width={isMobile ? width - 48 : width - 370} // Use full screen width without 800px limit
                height={220}
              />
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No submission data available</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          
          <View style={[styles.chartsGrid, isMobile && styles.mobileChartsGrid]}>
            
            {/* Group Chat Status Distribution */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Project Status</Text>
              {loadingGraphs ? (
                <View style={styles.loadingContainer}>
                  <Text>Loading...</Text>
                </View>
              ) : graphData && graphData.group_chat_status ? (
                <SimplePieChart
                  data={[
                    {
                      name: 'Pending',
                      count: graphData.group_chat_status.pending || 0,
                    },
                    {
                      name: 'In Review',
                      count: graphData.group_chat_status.in_review || 0,
                    },
                    {
                      name: 'Approved',
                      count: graphData.group_chat_status.approved || 0,
                    }
                  ].filter(item => item.count > 0)}
                  width={isMobile ? width - 48 : 350}
                  height={200}
                />
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No status data</Text>
                </View>
              )}
            </View>

            {/* Most Viewed Articles by Genre */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Most Viewed by Genre</Text>
              {loadingGraphs ? (
                <View style={styles.loadingContainer}>
                  <Text>Loading...</Text>
                </View>
              ) : graphData && graphData.article_publications && graphData.article_publications.length > 0 ? (
                <SimpleBarChart
                  data={{
                    labels: graphData.article_publications.map(item => item.genre),
                    datasets: [{
                      data: graphData.article_publications.map(item => item.count)
                    }]
                  }}
                  width={isMobile ? width - 32 : 534} // Bigger width for most viewed by genre
                  height={200}
                />
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No publication data</Text>
                </View>
              )}
            </View>
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

          {/* Search */}
          <View style={styles.filtersContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search contributors by name or email..."
              value={contributorsSearch}
              onChangeText={setContributorsSearch}
            />
          </View>

          {/* Contributors List */}
          {loadingContributors ? (
            <View style={styles.loadingContainer}>
              <Text>Loading contributors...</Text>
            </View>
          ) : allContributors && allContributors.length > 0 ? (
            <FlatList
              data={allContributors}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => (
                <View key={item.id} style={styles.contributorItem}>
                  <View style={styles.contributorRank}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.contributorInfo}>
                    <Text style={styles.contributorName}>{item.name}</Text>
                    <Text style={styles.contributorEmail}>{item.email}</Text>
                    <View style={styles.contributorBadges}>
                      <View style={[styles.badge, styles.approvedBadge]}>
                        <Text style={styles.badgeText}>✓ {item.approved || 0}</Text>
                      </View>
                      <View style={[styles.badge, styles.reviewBadge]}>
                        <Text style={styles.badgeText}>⏳ {item.in_review || 0}</Text>
                      </View>
                      <View style={[styles.badge, styles.pendingBadge]}>
                        <Text style={styles.badgeText}>! {item.pending || 0}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.contributorStats}>
                    <Text style={styles.contributorCount}>{item.total_assigned || 0}</Text>
                    <Text style={styles.contributorLabel}>Assigned</Text>
                  </View>
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.noContributorsContainer}>
              <Feather name="users" size={32} color="#ccc" />
              <Text style={styles.noContributorsText}>No contributors found</Text>
            </View>
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
  modalContributorsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  modalContributorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
  // Chart Styles
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  mobileChartsGrid: {
    flexDirection: 'column',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  noDataText: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
  },
  // Timeline Styles
  timelineList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
  timelineConnector: {
    width: 40,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#303F9F',
  },
  timelineLine: {
    width: 2,
    height: 40,
    backgroundColor: '#E2E8F0',
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  approvedStatus: {
    backgroundColor: '#D4EDDA',
  },
  reviewStatus: {
    backgroundColor: '#FFF3CD',
  },
  pendingStatus: {
    backgroundColor: '#F8D7DA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D3748',
  },
  timelineDetails: {
    gap: 4,
  },
  timelineDeadline: {
    fontSize: 14,
    color: '#4A5568',
  },
  timelineLead: {
    fontSize: 14,
    color: '#4A5568',
  },
  timelineMembers: {
    fontSize: 14,
    color: '#4A5568',
  },
  noTimelineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  noTimelineText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A0AEC0',
    marginTop: 8,
  },
  noTimelineSubtext: {
    fontSize: 14,
    color: '#CBD5E0',
    marginTop: 4,
    textAlign: 'center',
  },
});
