import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView, Switch, TextInput, Modal, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import apiClient from '~/utils/api';
import { useAuth } from '~/context/AuthContext';
import { Picker } from '@react-native-picker/picker';

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
    const [position, setPosition] = useState('');
    const [level, setLevel] = useState(1);
    const [showLogoutPrompt, setShowLogoutPrompt] = useState(false);
    const [showAssignedModal, setShowAssignedModal] = useState(false);
    const [assignedModules, setAssignedModules] = useState([]);

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
        setPosition(profileData.position || '');
        setLevel(profileData.level || 1);
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
        setPosition(collaboratorProfile.position || '');
        setLevel(collaboratorProfile.level || 1);
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
            setError(null); // Clear previous errors

            const moduleUpdatePromise = apiClient.post(`/collaborators/${profile.id}/modules`, {
                modules: Array.from(selectedModules),
            });

            const positionUpdatePromise = apiClient.patch(`/collaborators/${profile.id}`, {
                position: position,
                level: level,
            });

            await Promise.all([moduleUpdatePromise, positionUpdatePromise]);

            await fetchData(); // Reload data to reflect changes
            
            if (user && String(id) === String(user.id)) {
                setShowLogoutPrompt(true); // Prompt for re-login if managing self
            } else {
                // Show assigned modules modal for other users
                const assigned = allModules.filter(m => selectedModules.has(m.id)).map(m => m.display_name);
                setAssignedModules(assigned);
                setShowAssignedModal(true);
            }

        } catch (err) {
            console.error('Failed to save changes:', err);
            setError('Failed to save changes. Please check your permissions and try again.');
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
            <Text style={styles.title}>Manage Collaborator</Text>
            <Text style={styles.userName}>{collaborator?.name}</Text>

            <Text style={styles.label}>Position</Text>
            <TextInput
                style={styles.input}
                value={position}
                onChangeText={setPosition}
                placeholder="e.g., Lead Developer"
                placeholderTextColor="#9CA3AF"
            />

            {/* Only show level selector if user is level 3 and managing someone else */}
            {user?.profile?.level === 3 && String(id) !== String(user.id) && (
                <>
                    <Text style={styles.label}>Contributor Level</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={level}
                            onValueChange={(itemValue) => setLevel(itemValue)}
                            style={styles.picker}
                        >
                            <Picker.Item label="Level 1 - Basic Collaborator" value={1} />
                            <Picker.Item label="Level 2 - Manager" value={2} />
                            <Picker.Item label="Level 3 - Administrator" value={3} />
                        </Picker>
                    </View>
                    <Text style={styles.helperText}>
                        Current level: {profile?.level || 1} | Your level: {user?.profile?.level}
                    </Text>
                </>
            )}

            <Text style={[styles.label, { marginTop: 20 }]}>Modules</Text>

            {(() => {
                let displayableModules = allModules;
                // New Rule: Filter modules for Level 2 managing Level 1
                if (user?.profile?.level === 2 && profile?.level === 1) {
                    const allowedModuleNames = ['dashboard', 'collaborate', 'review-content'];
                    displayableModules = allModules.filter(module => allowedModuleNames.includes(module.name));
                }

                // Group modules by category
                const moduleGroups = {
                    'Monitoring': [
                        'dashboard',
                        'activity-monitor'
                    ],
                    'Content Management': [
                        'create-content',
                        'review-content',
                        'collaborate'
                    ],
                    'User & Access Management': [
                        'applicants',
                        'users',
                        'requests'
                    ],
                    'System Administration': [
                        'branding',
                        'forum',
                        'folio',
                        'archives',
                        'manage-media'
                    ]
                };

                return Object.entries(moduleGroups).map(([category, moduleNames]) => {
                    const categoryModules = displayableModules.filter(module => 
                        moduleNames.includes(module.name)
                    );

                    // Skip empty categories
                    if (categoryModules.length === 0) return null;

                    return (
                        <View key={category} style={styles.categoryContainer}>
                            <Text style={styles.categoryTitle}>{category}</Text>
                            <View style={styles.categoryModules}>
                                {categoryModules.map(module => (
                                    <View key={module.id} style={styles.moduleRow}>
                                        <Text style={styles.moduleName}>{module.display_name}</Text>
                                        <Switch
                                            value={selectedModules.has(module.id)}
                                            onValueChange={() => handleToggleModule(module.id)}
                                        />
                                    </View>
                                ))}
                            </View>
                        </View>
                    );
                }).filter(Boolean); // Remove null entries
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
        <Modal
          visible={showAssignedModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAssignedModal(false)}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 8, alignItems: 'center', width: 300, maxHeight: 400 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Modules Assigned</Text>
              <ScrollView style={{ width: '100%', marginBottom: 16 }}>
                {assignedModules.length > 0 ? (
                  assignedModules.map((module, index) => (
                    <Text key={index} style={{ fontSize: 16, marginBottom: 4, textAlign: 'center' }}>
                      • {module}
                    </Text>
                  ))
                ) : (
                  <Text style={{ fontSize: 16, textAlign: 'center', color: '#6B7280' }}>No modules assigned</Text>
                )}
              </ScrollView>
              <Pressable
                style={{ backgroundColor: '#3B82F6', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 6 }}
                onPress={() => {
                  setShowAssignedModal(false);
                  router.back(); // Go back to manage users
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>OK</Text>
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
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        height: 44,
        borderColor: '#D1D5DB',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: '#FFF',
        fontSize: 16,
        marginBottom: 20,
    },
    pickerContainer: {
        borderColor: '#D1D5DB',
        borderWidth: 1,
        borderRadius: 8,
        backgroundColor: '#FFF',
        marginBottom: 8,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        width: '100%',
    },
    helperText: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 20,
        fontStyle: 'italic',
    },
    userName: {
        fontSize: 20,
        color: '#3B82F6',
        marginBottom: 25,
    },
    categoryContainer: {
        marginBottom: 25,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        padding: 15,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    categoryModules: {
        paddingHorizontal: 5,
    },
    moduleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    moduleName: {
        fontSize: 16,
        color: '#374151',
        flex: 1,
        marginRight: 10,
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
