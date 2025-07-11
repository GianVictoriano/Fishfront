import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, SafeAreaView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import apiClient from '../../utils/api';

// Dummy data for messages
const getDummyMessages = (userName) => [
  { id: '1', text: `Hi! How is the project going, ${userName}?`, sender: 'other' },
  { id: '2', text: 'Hey! Going well. Just pushed the latest updates.', sender: 'me' },
  { id: '3', text: 'Great! I will check it out.', sender: 'other' },
];

export default function CollaborateScreen() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get('/users');
        const allUsers = response.data.users || [];
        setUsers(allUsers);
        setFilteredUsers(allUsers);
        // Select the first user by default if available
        if (allUsers.length > 0) {
          setSelectedUser(allUsers[0]);
          setMessages(getDummyMessages(allUsers[0].name));
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setMessages(getDummyMessages(user.name)); // Load dummy messages for the selected user
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg = { id: Date.now().toString(), text: newMessage, sender: 'me' };
      setMessages(prevMessages => [...prevMessages, newMsg]);
      setNewMessage('');
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.centered} size="large" />;
  }

  const renderUser = ({ item }) => (
    <TouchableOpacity 
      style={[styles.userItem, selectedUser?.id === item.id && styles.selectedUserItem]}
      onPress={() => handleSelectUser(item)}
    >
      <Image 
        source={{ uri: `https://i.pravatar.cc/150?u=${item.email}` }} 
        style={styles.avatar}
      />
      <Text style={styles.userName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }) => (
    <View style={[styles.messageBubble, item.sender === 'me' ? styles.myMessage : styles.theirMessage]}>
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.chatContainer}>
        {/* Left Panel: User List */}
        <View style={styles.userListPanel}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <FlatList
            data={filteredUsers}
            renderItem={renderUser}
            keyExtractor={item => item.id.toString()}
            ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
          />
        </View>

        {/* Right Panel: Chat Window */}
        <View style={styles.chatWindowPanel}>
          {selectedUser ? (
            <>
              <View style={styles.chatHeader}>
                <Text style={styles.chatHeaderText}>{selectedUser.name}</Text>
              </View>
              <FlatList
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.messagesContainer}
                inverted
              />
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Type a message..."
                  value={newMessage}
                  onChangeText={setNewMessage}
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                  <MaterialIcons name="send" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.centered}>
              <Text>Select a user to start chatting.</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatContainer: { flexDirection: 'row', flex: 1 },
  userListPanel: {
    width: 300,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  searchInput: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    fontSize: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedUserItem: { backgroundColor: '#e3f2fd' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15 },
  userName: { fontSize: 16, fontWeight: '500' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#666' },
  chatWindowPanel: { flex: 1, flexDirection: 'column' },
  chatHeader: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  chatHeaderText: { fontSize: 18, fontWeight: 'bold' },
  messagesContainer: { padding: 10, flexDirection: 'column-reverse' },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    marginVertical: 5,
    maxWidth: '75%',
  },
  myMessage: {
    backgroundColor: '#1a237e',
    alignSelf: 'flex-end',
  },
  theirMessage: {
    backgroundColor: '#e0e0e0',
    alignSelf: 'flex-start',
  },
  messageText: { color: '#fff', fontSize: 15 },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  messageInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a237e',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});
