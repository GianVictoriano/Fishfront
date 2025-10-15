// app/screens/user/creative/creative.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CreativeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Creative Screen - Mobile version coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f6f8',
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});
