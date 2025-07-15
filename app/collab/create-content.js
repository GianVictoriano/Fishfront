import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const CreateOptionCard = ({ icon, title, description, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={40} color="#1a237e" />
    <View style={styles.cardTextContainer}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  </TouchableOpacity>
);

export default function CreateContentScreen() {
  const router = useRouter();

  const handlePress = (type) => {
    // For now, we'll show an alert. Later, this can navigate to the specific creation screen.
    Alert.alert(
      `Create New ${type}`,
      `You are about to create a new ${type.toLowerCase()}. This will navigate to the creation form.`
    );
    // Example navigation:
    // router.push(`/collab/create-${type.toLowerCase()}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create New Content</Text>
      <Text style={styles.subtitle}>Select a content type to begin.</Text>
      
      <View style={styles.optionsGrid}>
        <CreateOptionCard 
          icon="view-dashboard-variant-outline"
          title="Scrum"
          description="Organize tasks in a new scrum board."
          onPress={() => handlePress('Scrum')}
        />
        <CreateOptionCard 
          icon="folder-multiple-outline"
          title="Folio"
          description="Group related documents in a folio."
          onPress={() => handlePress('Folio')}
        />
        <CreateOptionCard 
          icon="forum-outline"
          title="Topic"
          description="Start a new discussion in the forum."
          onPress={() => router.push('/forum')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 30,
  },
  optionsGrid: {
    // Using a simple column layout for now
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343a40',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
});
