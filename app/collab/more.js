import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '~/context/AuthContext';

const MoreScreen = () => {
  const router = useRouter();
  const { user, logout, hasModule } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const menuItems = [
    hasModule('users') && { name: 'Users', href: '/collab/users', icon: 'user-check' },
    hasModule('branding') && { name: 'Branding', href: '/collab/branding', icon: 'image' },
    // Add other links for level 2 & 3 users here
  ].filter(Boolean);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>More Options</Text>
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={() => router.push(item.href)}>
              <Feather name={item.icon} size={24} color="#1F2937" />
              <Text style={styles.menuItemText}>{item.name}</Text>
              <Feather name="chevron-right" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={24} color="#EF4444" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 30,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuItemText: {
    flex: 1,
    marginLeft: 20,
    fontSize: 18,
    color: '#1F2937',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  logoutButtonText: {
    marginLeft: 12,
    fontSize: 18,
    color: '#EF4444',
    fontWeight: 'bold',
  },
});

export default MoreScreen;
