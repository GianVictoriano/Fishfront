import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Image, SafeAreaView, TextInput, TouchableOpacity } from 'react-native';
import { useAuth } from '~/context/AuthContext';
import apiClient from '~/utils/api';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';



const ManageUsersScreen = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [allUsers, setAllUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [filteredCollaborators, setFilteredCollaborators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchAllUsers = useCallback(async () => {
        if (user?.profile?.level < 2) {
            setError('You are not authorized to view this page.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await apiClient.get('/users');
            const usersData = response.data.users || [];
            setAllUsers(usersData);
            // Set initial filtered lists
            setFilteredUsers(usersData.filter(u => u.profile && u.profile.role === 'user'));
            setFilteredCollaborators(usersData.filter(u => u.profile && u.profile.role === 'collaborator'));
            setError(null);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            const message = err.response?.data?.message || 'Failed to load users. Please try again later.';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchAllUsers();
    }, [fetchAllUsers]);

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

    const handleManageModules = (userId) => {
        router.push(`/collab/manage-modules/${userId}`);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    const renderCollaborator = (collaborator) => (
        <View style={styles.userCard}>
            <Image source={{ uri: collaborator.profile?.avatar }} style={styles.avatar} />
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{collaborator.name}</Text>
                <Text style={styles.userEmail}>{collaborator.email}</Text>
                {collaborator.profile?.position && (
                    <Text style={styles.userPosition}>{collaborator.profile.position}</Text>
                )}
                <Text style={styles.level}>Level: {collaborator.profile?.level || 'N/A'}</Text>
            </View>
            <Pressable style={styles.manageButton} onPress={() => handleManageModules(collaborator.id)}>
                <Text style={styles.manageButtonText}>Manage Modules</Text>
            </Pressable>
        </View>
    );

    const renderUser = (regularUser) => (
        <View style={styles.userCard}>
            <Image source={{ uri: regularUser.profile?.avatar }} style={styles.avatar} />
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{regularUser.name}</Text>
                <Text style={styles.userEmail}>{regularUser.email}</Text>
                {regularUser.profile?.position && (
                    <Text style={styles.userPosition}>{regularUser.profile.position}</Text>
                )}
            </View>
        </View>
    );

    const combinedData = [
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
            case 'section':
                return <Text style={styles.sectionTitle}>{item.title}</Text>;
            case 'empty':
                return <Text style={styles.emptyText}>{item.text}</Text>;
            case 'collaborator':
                return renderCollaborator(item);
            case 'user':
                return renderUser(item);
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>User Management</Text>
                    <Pressable 
                        style={styles.myModulesButton} 
                        onPress={() => handleManageModules(user.id)}
                    >
                        <MaterialIcons name="settings" size={20} color="#FFFFFF" />
                        <Text style={styles.myModulesButtonText}>My Modules</Text>
                    </Pressable>
                </View>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name, email, or position..."
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        placeholderTextColor="#9CA3AF"
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
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F7F8FA',
    },
    container: {
        flex: 1,
        padding: 20,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
    },
    myModulesButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#16A34A',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
    },
    myModulesButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    searchContainer: {
        marginBottom: 15,
    },
    searchInput: {
        height: 44,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        textAlign: 'center',
    },
    listContainer: {
        paddingBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#374151',
        marginTop: 20,
        marginBottom: 10,
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#6B7280',
        padding: 20,
        fontStyle: 'italic',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
        backgroundColor: '#E5E7EB',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    userEmail: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    userPosition: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 2,
        fontStyle: 'italic',
    },
    level: {
        fontSize: 12,
        color: '#374151',
        marginTop: 4,
        fontWeight: '500',
    },
    manageButton: {
        backgroundColor: '#3B82F6',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    manageButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
});

export default ManageUsersScreen;
