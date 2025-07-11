import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const Card = ({ title, children }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    <View style={styles.cardContent}>{children}</View>
  </View>
);

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Collaborator Dashboard</Text>
      <Card title="Projects Overview">
        <Text style={styles.paragraph}>You are currently assigned to 3 active projects. The deadline for the 'Fisheries Data Analysis' project is approaching.</Text>
      </Card>
      <Card title="Shared Resources">
        <Text style={styles.paragraph}>A new research paper on 'Sustainable Aquaculture' has been added to the shared drive.</Text>
      </Card>
      <Card title="Assigned Tasks">
        <Text style={styles.paragraph}>You have 5 pending tasks. The task 'Review Q2 Report' is due tomorrow.</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f4f8',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    borderLeftWidth: 5,
    borderLeftColor: '#3949ab',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#303f9f',
    marginBottom: 10,
  },
  cardContent: {},
  paragraph: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 10,
  },
});
