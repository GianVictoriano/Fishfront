import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AboutScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>About Our Community</Text>

        <View style={styles.section}>
          <Text style={styles.heading}>Our Vision</Text>
          <Text style={styles.paragraph}>
            To be a leading and proactive fishing community, fostering a sustainable and technologically advanced fishing industry in the region, recognized for its innovation, collaboration, and commitment to environmental stewardship.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Our Mission</Text>
          <Text style={styles.paragraph}>
            To empower our local fishermen by providing access to modern technology, real-time data, and a collaborative platform that enhances safety, increases efficiency, and ensures the long-term viability of our marine resources for future generations.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Our Core Values</Text>
          <View style={styles.valueItem}>
            <Text style={styles.valueTitle}>Community:</Text>
            <Text style={styles.valueText}>We foster a spirit of collaboration, mutual support, and shared knowledge among all members.</Text>
          </View>
          <View style={styles.valueItem}>
            <Text style={styles.valueTitle}>Innovation:</Text>
            <Text style={styles.valueText}>We embrace technology and new ideas to solve challenges and create opportunities.</Text>
          </View>
          <View style={styles.valueItem}>
            <Text style={styles.valueTitle}>Sustainability:</Text>
            <Text style={styles.valueText}>We are committed to responsible fishing practices that protect our marine ecosystem for the future.</Text>
          </View>
          <View style={styles.valueItem}>
            <Text style={styles.valueTitle}>Integrity:</Text>
            <Text style={styles.valueText}>We operate with honesty, transparency, and respect for our members and the environment.</Text>
          </View>
          <View style={styles.valueItem}>
            <Text style={styles.valueTitle}>Safety:</Text>
            <Text style={styles.valueText}>We prioritize the well-being and safety of our fishermen above all else.</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a237e',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 25,
  },
  heading: {
    fontSize: 22,
    fontWeight: '600',
    color: '#3f51b5',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 5,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  valueItem: {
    marginBottom: 10,
  },
  valueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  valueText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#444',
    paddingLeft: 10,
  },
});
