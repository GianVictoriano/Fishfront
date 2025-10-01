import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function NotAuthorized() {
  return (
    <View style={styles.container}>
      <MaterialIcons name="lock" size={60} color="#d32f2f" />
      <Text style={styles.header}>Access Denied</Text>
      <Text style={styles.message}>You do not have the required permissions to view this page.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginTop: 20,
    marginBottom: 10,
  },
  message: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
  },
});
