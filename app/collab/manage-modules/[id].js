import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import apiClient from '~/utils/api';
import { useAuth } from '~/context/AuthContext';

import { Modal } from 'react-native';

const ManageModulesScreen = () => {
    const { id } = useLocalSearchParams();
    const { user, logout } = useAuth();
    const router = useRouter();

    const [collaborator, setCollaborator] = useState(null);
    const [profile, setProfile] = useState(null); // State to hold the full profile object
    const [allModules, setAllModules] = useState([]);
    const [selectedModules, setSelectedModules] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [showLogoutPrompt, setShowLogoutPrompt] = useState(false);

    const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      // Fetch all available modules
      const modulesResponse = await apiClient.get('/modules');
      setAllModules(modulesResponse.data);

      if (user && String(id) === String(user.id)) {
        // Fetch own profile (with modules) if managing self
        const profileResponse = await apiClient.get('/profile');
        const profileData = profileResponse.data;
        setCollaborator(user); // user object from context
        setProfile(profileData);
        const initialSelected = new Set((profileData.modules || []).map(m => m.id));
        setSelectedModules(initialSelected);
      } else {
        // Fetch all manageable collaborators
        const collaboratorResponse = await apiClient.get('/collaborators');
        const collaboratorProfile = collaboratorResponse.data.find(p => p.user.id == id);
        if (!collaboratorProfile) {
          throw new Error('Collaborator not found or you do not have permission to manage them.');
        }
        setCollaborator(collaboratorProfile.user);
        setProfile(collaboratorProfile);
        const initialSelected = new Set((collaboratorProfile.modules || []).map(m => m.id));
        setSelectedModules(initialSelected);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data. Please go back and try again.');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleModule = (moduleId) => {
        const newSelection = new Set(selectedModules);
        if (newSelection.has(moduleId)) {
            newSelection.delete(moduleId);
        } else {
            newSelection.add(moduleId);
        }
        setSelectedModules(newSelection);
    };

    const handleSaveChanges = async () => {
        try {
            setSaving(true);
            // The backend route for updating is /collaborators/{profile}/modules
            // We need the profile ID, not the user ID.
            await apiClient.post(`/collaborators/${profile.id}/modules`,
             {
                modules: Array.from(selectedModules)
            });
            await fetchData(); // Reload the data after saving
            if (user && String(id) === String(user.id)) {
                setShowLogoutPrompt(true); // Only show prompt for own modules
            }
        } catch (err) {
            console.error('Failed to save changes:', err);
            setError('Failed to save changes. You may not have permission to assign all selected modules.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" /></View>;
    }

    if (error) {
        return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
    }

    return (
        <>
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Manage Modules for</Text>
            <Text style={styles.userName}>{collaborator?.name}</Text>

            {(() => {
                let displayableModules = allModules;
                // New Rule: Filter modules for Level 2 managing Level 1
                if (user?.profile?.level === 2 && profile?.level === 1) {
                    const allowedModuleNames = ['dashboard', 'collaborate', 'review-content'];
                    displayableModules = allModules.filter(module => allowedModuleNames.includes(module.name));
                }

                return displayableModules.map(module => (
            
                <View key={module.id} style={styles.moduleRow}>
                    <Text style={styles.moduleName}>{module.display_name}</Text>
                    <Switch
                        value={selectedModules.has(module.id)}
                        onValueChange={() => handleToggleModule(module.id)}
                    />
                </View>
            ));
            })()}

            <Pressable style={styles.saveButton} onPress={handleSaveChanges} disabled={saving}>
                {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
            </Pressable>
             {error && <Text style={[styles.errorText, {marginTop: 15}]}>{error}</Text>}
        </ScrollView>
        <Modal
          visible={showLogoutPrompt}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowLogoutPrompt(false)}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 8, alignItems: 'center', width: 300 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>System Update Required</Text>
              <Text style={{ fontSize: 16, marginBottom: 24, textAlign: 'center' }}>
                You need to log out and log in again to update your system permissions.
              </Text>
              <Pressable
                style={{ backgroundColor: '#EF4444', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 6, marginTop: 8 }}
                onPress={async () => {
                   setShowLogoutPrompt(false);
                   await logout();
                 }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Log Out</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        </>
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    userName: {
        fontSize: 20,
        color: '#3B82F6',
        marginBottom: 25,
    },
    moduleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    moduleName: {
        fontSize: 16,
        color: '#374151',
    },
    saveButton: {
        backgroundColor: '#16A34A', // Green for save
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 30,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        fontSize: 14,
        color: 'red',
        textAlign: 'center',
    },
});

export default ManageModulesScreen;
