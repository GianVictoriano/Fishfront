import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ReviewContentScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Review Content</Text>
      <Text style={styles.subtitle}>Content pending review and approval will be displayed here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f4f8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});
