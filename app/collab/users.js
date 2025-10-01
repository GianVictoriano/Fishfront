import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import apiClient from '../../utils/api';

const UserCard = ({ user }) => {
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
      <View style={styles.rightContainer}>
        {user.profile?.position ? (
          <Text style={styles.userPosition}>{user.profile.position}</Text>
        ) : null}
        <TouchableOpacity 
          style={styles.editButton}
          onPress={handleActionPress}
        >
          <MaterialIcons name="more-vert" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function UsersScreen() {
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filteredCollaborators, setFilteredCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Effect for fetching users once
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/users');
        const usersData = response.data.users || [];
        setAllUsers(usersData);
        // Set initial filtered lists
        setFilteredUsers(usersData.filter(u => u.profile && u.profile.role === 'user'));
        setFilteredCollaborators(usersData.filter(u => u.profile && u.profile.role === 'collaborator'));
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

  // Effect for filtering based on search term
  useEffect(() => {
    const lowercasedTerm = searchTerm.toLowerCase();
    const filterUsers = (users) => {
      if (!searchTerm) {
        return users;
      }
      return users.filter(u =>
        (u.name?.toLowerCase().includes(lowercasedTerm)) ||
        (u.email?.toLowerCase().includes(lowercasedTerm)) ||
        (u.profile?.position?.toLowerCase().includes(lowercasedTerm))
      );
    };

    const regularUsers = allUsers.filter(u => u.profile && u.profile.role === 'user');
    const collaboratorUsers = allUsers.filter(u => u.profile && u.profile.role === 'collaborator');

    setFilteredUsers(filterUsers(regularUsers));
    setFilteredCollaborators(filterUsers(collaboratorUsers));

  }, [searchTerm, allUsers]);

  if (loading) {
    return <ActivityIndicator size="large" color="#1a237e" style={styles.centered} />;
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  const combinedData = [
    { type: 'header', title: 'User Management' },
    { type: 'section', title: 'Collaborators' },
    ...(filteredCollaborators.length > 0
      ? filteredCollaborators.map(user => ({ ...user, type: 'collaborator' }))
      : [{ type: 'empty', text: 'No collaborators found.' }]
    ),
    { type: 'section', title: 'Users' },
    ...(filteredUsers.length > 0
      ? filteredUsers.map(user => ({ ...user, type: 'user' }))
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
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or position..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>
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
  searchContainer: {
    padding: 10,
    backgroundColor: '#f0f4f8',
  },
  searchInput: {
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  userPosition: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    fontStyle: 'italic',
  },
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
