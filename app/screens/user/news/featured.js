// app/screens/user/news/featured.js
// Fallback file for platforms that don't have specific implementations
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default function FeaturedScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Featured Articles</Text>
        <Text style={styles.message}>
          This platform is not yet supported. Please use the web or mobile app to view featured articles.
        </Text>
      </View>
    </SafeAreaView>
  );
}