import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';

export default function CollaborateMinimal() {
  console.log('CollaborateMinimal render'); // Debug log
  
  const [search, setSearch] = useState('');
  const [inputText, setInputText] = useState('');
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Minimal Collaborate Test</Text>
      
      {/* Search Input */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search chats..."
        value={search}
        onChangeText={setSearch}
      />
      
      {/* Chat Input */}
      <View style={styles.chatContainer}>
        <TextInput
          style={styles.chatInput}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
      
      <Text>Search: {search}</Text>
      <Text>Input: {inputText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  chatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
