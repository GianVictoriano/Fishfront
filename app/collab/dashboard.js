import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '~/context/AuthContext';
import { useRouter } from 'expo-router';

const StatCard = ({ title, value, iconName, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.iconContainer, { backgroundColor: color }]}>
      <Feather name={iconName} size={24} color="#fff" />
    </View>
    <View>
      <Text style={styles.statCardTitle}>{title}</Text>
      <Text style={styles.statCardValue}>{value}</Text>
    </View>
  </View>
);

const ActivityItem = ({ text, time, iconName }) => (
  <View style={styles.activityItem}>
    <Feather name={iconName} size={20} color="#555" />
    <Text style={styles.activityText}>{text}</Text>
    <Text style={styles.activityTime}>{time}</Text>
  </View>
);

const QuickAction = ({ title, iconName, href }) => {
  const router = useRouter();
  return (
    <TouchableOpacity style={styles.quickAction} onPress={() => router.push(href)}>
      <Feather name={iconName} size={22} color="#303F9F" />
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );
};

export default function DashboardScreen() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, {user?.profile?.name || 'Collaborator'}!</Text>
        <Text style={styles.subtitle}>Here's a summary of your workspace.</Text>
      </View>

      <View style={styles.statsContainer}>
        <StatCard title="In Review" value="1" iconName="file-text" color="#FFA726" />
        <StatCard title="Approved" value="1" iconName="check-square" color="#66BB6A" />
        <StatCard title="Pending Tasks" value="2" iconName="alert-circle" color="#EF5350" />
        <StatCard title="Team Members" value="2" iconName="users" color="#5C6BC0" />
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction title="Collaborate" iconName="plus-circle" href="/collab/collaborate" />
          <QuickAction title="Review Content" iconName="eye" href="/collab/review-content" />
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          <ActivityItem iconName="git-pull-request" text="VICTORIANO GIAN PATRICK submitted new content for review." time="2h ago" />
          <ActivityItem iconName="check-circle" text="Intrams Basketball Tournament was approved." time="1d ago" />
          <ActivityItem iconName="user-plus" text="gian patrick victoriano joined the team." time="3d ago" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: 24, // Add space from sidebar
    paddingRight: 24,
  },
  header: {
    marginBottom: 30,
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
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '46%', // Responsive width
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  iconContainer: {
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
  },
  statCardTitle: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A202C',
    marginTop: 4,
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
    width: '46%',
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  quickActionText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#303F9F',
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
});
