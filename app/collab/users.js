import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import apiClient from '../../utils/api';

const UserCard = ({ user, onActionPress }) => {
  const { showActionSheetWithOptions } = useActionSheet();

  const handleActionPress = () => {
    const options = ['Change Role', 'Assign Actions', 'Delete User', 'Cancel'];
    const destructiveButtonIndex = 2;
    const cancelButtonIndex = 3;

    showActionSheetWithOptions({
      options,
      cancelButtonIndex,
      destructiveButtonIndex,
      title: `Manage ${user.name}`,
      message: 'Select an action to perform',
      anchor: 1,
      tintColor: '#1a237e',
      userInterfaceStyle: 'light',
    }, (selectedIndex) => {
      switch (selectedIndex) {
        case 0:
          Alert.alert('Change Role', `Change role for ${user.name}`);
          // Implement role change logic here
          break;
        case 1:
          Alert.alert('Assign Actions', `Assign actions to ${user.name}`);
          // Implement assign actions logic here
          break;
        case destructiveButtonIndex:
          Alert.alert(
            'Delete User',
            `Are you sure you want to delete ${user.name}?`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  // Implement delete logic here
                  console.log('Delete user:', user.id);
                },
              },
            ]
          );
          break;
      }
    });
  };

  return (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>
      <TouchableOpacity 
        style={styles.editButton}
        onPress={handleActionPress}
      >
        <MaterialIcons name="more-vert" size={24} color="#666" />
      </TouchableOpacity>
    </View>
  );
};

export default function UsersScreen() {
  const [users, setUsers] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        // Assuming your backend provides a '/users' endpoint
        const response = await apiClient.get('/users');
        const allUsers = response.data.users;

        const regularUsers = allUsers.filter(u => u.profile.role === 'user');
        const collaboratorUsers = allUsers.filter(u => u.profile.role === 'collaborator');

        setUsers(regularUsers);
        setCollaborators(collaboratorUsers);
        setError(null);
      } catch (e) {
        setError('Failed to fetch users. Please try again later.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#1a237e" style={styles.centered} />;
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  // Combine both lists into a single data source with type indicators
  const combinedData = [
    { type: 'header', title: 'User Management' },
    { type: 'section', title: 'Collaborators' },
    ...(collaborators.length > 0 
      ? collaborators.map(user => ({ ...user, type: 'collaborator' })) 
      : [{ type: 'empty', text: 'No collaborators found.' }]
    ),
    { type: 'section', title: 'Users' },
    ...(users.length > 0 
      ? users.map(user => ({ ...user, type: 'user' })) 
      : [{ type: 'empty', text: 'No users found.' }]
    )
  ];

  const renderItem = ({ item }) => {
    switch (item.type) {
      case 'header':
        return <Text style={styles.header}>{item.title}</Text>;
      case 'section':
        return <Text style={styles.sectionTitle}>{item.title}</Text>;
      case 'empty':
        return <Text style={styles.emptyText}>{item.text}</Text>;
      default:
        return <UserCard user={item} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={combinedData}
        renderItem={renderItem}
        keyExtractor={(item, index) => 
          item.id ? item.id.toString() : `${item.type}-${index}`
        }
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a237e',
    padding: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#303f9f',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  editButton: {
    padding: 8,
    marginLeft: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  errorText: {
    flex: 1,
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
    color: 'red',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    padding: 20,
  }
});
