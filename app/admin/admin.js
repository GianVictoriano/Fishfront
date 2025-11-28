import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Image, SafeAreaView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '~/context/AuthContext';
import { useBranding } from '~/context/BrandingContext';
import apiClient from '../../utils/api';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const { colors } = useBranding();
    const router = useRouter();
    const [allUsers, setAllUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [filteredCollaborators, setFilteredCollaborators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchAllUsers = useCallback(async () => {
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
    }, []);

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

    const handleAssignCollaborator = async (userId) => {
        try {
            console.log('[Admin] Attempting to assign collaborator for user:', userId);
            
            const response = await apiClient.patch(`/users/${userId}/assign-collaborator`, {
                level: 3,
                role: 'collaborator'
            });
            
            console.log('[Admin] Assign collaborator response:', response.data);
            
            // Refresh the users list
            fetchAllUsers();
            
            Alert.alert('Success', 'User has been assigned as collaborator (Level 3)');
        } catch (error) {
            console.error('[Admin] Failed to assign collaborator:', error);
            console.error('[Admin] Error response:', error.response?.data);
            console.error('[Admin] Error status:', error.response?.status);
            
            if (error.response?.status === 401) {
                Alert.alert('Authentication Error', 'Your admin session has expired. Please log in again.');
                // Redirect to login
                router.replace('/signin');
            } else {
                Alert.alert('Error', `Failed to assign user as collaborator: ${error.response?.data?.message || error.message}`);
            }
        }
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/');
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background || '#F7F8FA' }]}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background || '#F7F8FA' }]}>
                <View style={styles.center}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            </SafeAreaView>
        );
    }

    const renderCollaborator = (collaborator) => (
        <View style={[styles.userCard, { backgroundColor: colors.card || '#FFFFFF' }]}>
            <Image source={{ uri: String(collaborator.profile?.avatar || '') }} style={styles.avatar} />
            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text_primary || '#111827' }]}>{collaborator.name}</Text>
                <Text style={[styles.userEmail, { color: colors.text_secondary || '#6B7280' }]}>{collaborator.email}</Text>
                {collaborator.profile?.position && (
                    <Text style={[styles.userPosition, { color: colors.text_muted || '#9CA3AF' }]}>{collaborator.profile.position}</Text>
                )}
                <Text style={[styles.level, { color: colors.text_primary || '#374151' }]}>Level: {collaborator.profile?.level || 'N/A'}</Text>
            </View>
            <Pressable style={[styles.manageButton, { backgroundColor: colors.primary || '#3B82F6' }]} onPress={() => handleAssignCollaborator(collaborator.id)}>
                <Text style={styles.manageButtonText}>Assign</Text>
            </Pressable>
        </View>
    );

    const renderUser = (regularUser) => (
        <View style={[styles.userCard, { backgroundColor: colors.card || '#FFFFFF' }]}>
            <Image source={{ uri: String(regularUser.profile?.avatar || '') }} style={styles.avatar} />
            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text_primary || '#111827' }]}>{regularUser.name}</Text>
                <Text style={[styles.userEmail, { color: colors.text_secondary || '#6B7280' }]}>{regularUser.email}</Text>
                {regularUser.profile?.position && (
                    <Text style={[styles.userPosition, { color: colors.text_muted || '#9CA3AF' }]}>{regularUser.profile.position}</Text>
                )}
                <Text style={[styles.level, { color: colors.text_primary || '#374151' }]}>Level: {regularUser.profile?.level || 'N/A'}</Text>
            </View>
            <Pressable style={[styles.manageButton, { backgroundColor: colors.primary || '#3B82F6' }]} onPress={() => handleAssignCollaborator(regularUser.id)}>
                <Text style={styles.manageButtonText}>Assign</Text>
            </Pressable>
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
                return <Text style={[styles.sectionTitle, { color: colors.text_primary || '#374151' }]}>{item.title}</Text>;
            case 'empty':
                return <Text style={[styles.emptyText, { color: colors.text_secondary || '#6B7280' }]}>{item.text}</Text>;
            case 'collaborator':
                return renderCollaborator(item);
            case 'user':
                return renderUser(item);
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background || '#F7F8FA' }]}>
            <View style={styles.container}>
                <View style={styles.headerContainer}>
                    <View>
                        <Text style={[styles.title, { color: colors.text_primary || '#111827' }]}>Admin - Manage Users</Text>
                        <Text style={[styles.subtitle, { color: colors.text_secondary || '#6B7280' }]}>
                            Welcome, {user?.profile?.name || 'Admin'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={[styles.logoutButton, { backgroundColor: colors.primary || '#111827' }]}>
                        <Feather name="log-out" size={20} color={colors.text_primary || '#FFFFFF'} />
                    </TouchableOpacity>
                </View>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={[styles.searchInput, { 
                            backgroundColor: colors.card || '#FFFFFF',
                            borderColor: colors.border || '#D1D5DB',
                            color: colors.text_primary || '#111827'
                        }]}
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
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    logoutButton: {
        padding: 10,
        borderRadius: 8,
    },
    searchContainer: {
        marginBottom: 20,
    },
    searchInput: {
        height: 44,
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        borderWidth: 1,
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
        marginTop: 20,
        marginBottom: 10,
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        padding: 20,
        fontStyle: 'italic',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
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
    },
    userEmail: {
        fontSize: 14,
        marginTop: 2,
    },
    userPosition: {
        fontSize: 13,
        marginTop: 2,
        fontStyle: 'italic',
    },
    level: {
        fontSize: 12,
        marginTop: 4,
        fontWeight: '500',
    },
    manageButton: {
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

export default AdminDashboard;
