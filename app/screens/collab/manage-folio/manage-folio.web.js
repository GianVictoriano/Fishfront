import React from 'react';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';

export default function ManageFolioScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centeredContainer}>
        <Text style={styles.title}>Manage Portfolio</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
});