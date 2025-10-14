import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text } from 'react-native';

// Simple test component to check if the issue is with the main component
export default function TestInputScreen() {
  const [text, setText] = useState('');
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Input Focus</Text>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Type here to test focus..."
      />
      <Text>Current text: {text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
});
