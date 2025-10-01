import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Image } from 'react-native';
import { useAuth } from '~/context/AuthContext';
import apiClient from '~/utils/api';
import { useRouter } from 'expo-router';



const ManageUsersScreen = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [collaborators, setCollaborators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCollaborators = useCallback(async () => {
        if (user?.profile?.level < 2) {
            setError('You are not authorized to view this page.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await apiClient.get('/collaborators');
            setCollaborators(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch collaborators:', err);
            // Check if the error response has a specific message from the server
            const message = err.response?.data?.message || 'Failed to load collaborators. Please try again later.';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchCollaborators();
    }, [fetchCollaborators]);

    const handleManageModules = (collaboratorId) => {
        router.push(`/collab/manage-modules/${collaboratorId}`);
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

    const renderCollaborator = ({ item }) => (
        <View style={styles.collaboratorItem}>
            {/* The 'item' is the profile object from the backend */}
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={styles.collaboratorInfo}>
                {/* User details are nested in the 'user' object */}
                <Text style={styles.name}>{item.user.name}</Text>
                <Text style={styles.email}>{item.user.email}</Text>
                <Text style={styles.level}>Level: {item.level}</Text>
            </View>
            {/* Pass the USER id to the management screen */}
            <Pressable style={styles.manageButton} onPress={() => handleManageModules(item.user.id)}>
                <Text style={styles.manageButtonText}>Manage Modules</Text>
            </Pressable>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Manage Collaborators</Text>
            <FlatList
                data={collaborators}
                renderItem={renderCollaborator}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContainer}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#F7F8FA',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#111827',
    },
    errorText: {
        fontSize: 16,
        color: 'red',
    },
    listContainer: {
        paddingBottom: 20,
    },
    collaboratorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    collaboratorInfo: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    email: {
        fontSize: 14,
        color: '#6B7280',
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
