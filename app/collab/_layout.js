import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';

// A single link in the sidebar
const SidebarLink = ({ href, text, icon, isMinimized, onPress }) => {
  const router = useRouter();
  return (
    <TouchableOpacity 
      style={styles.sidebarLink}
      onPress={() => onPress ? onPress() : router.push(href)}
    >
      <Text style={styles.sidebarIcon}>{icon}</Text>
      {!isMinimized && <Text style={styles.sidebarLinkText}>{text}</Text>}
    </TouchableOpacity>
  );
};

// The main sidebar component
import { useAuth } from '~/context/AuthContext';

const Sidebar = ({ isMinimized }) => {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/'); // Redirect to login screen
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };


  return (
    <View style={[styles.sidebar, isMinimized && styles.sidebarMinimized]}>
      <ScrollView>
        <SidebarLink href="/collab/dashboard" text="Dashboard" icon="📊" isMinimized={isMinimized} />
        <SidebarLink href="/collab/create-content" text="Create Content" icon="✍️" isMinimized={isMinimized} />
        <SidebarLink href="/collab/review-content" text="Review Content" icon="👀" isMinimized={isMinimized} />
        <SidebarLink href="/collab/collaborate" text="Collaborate" icon="🤝" isMinimized={isMinimized} />
        <SidebarLink href="/collab/users" text="Users" icon="👥" isMinimized={isMinimized} />
      </ScrollView>
      <View style={styles.sidebarFooter}>
        <SidebarLink text="Logout" icon="🚪" isMinimized={isMinimized} onPress={handleLogout} />
      </View>
    </View>
  );
};

export default function CollaboratorLayout() {
  const [isMinimized, setIsMinimized] = useState(false);

  // Sidebar is only for web for now
  if (Platform.OS !== 'web') {
    return <Slot />;
  }

  return (
    <ActionSheetProvider>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.layout}>
          <Sidebar isMinimized={isMinimized} />
          <View style={styles.contentContainer}>
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => setIsMinimized(!isMinimized)}
            >
              <Text style={styles.toggleButtonText}>{isMinimized ? '»' : '«'}</Text>
            </TouchableOpacity>
            <Slot />
          </View>
        </View>
      </SafeAreaView>
    </ActionSheetProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 250,
    backgroundColor: '#1a237e',
    paddingVertical: 20,
    transition: 'width 0.3s ease',
  },
  sidebarMinimized: {
    width: 80,
  },
  sidebarLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
  },
  sidebarIcon: {
    fontSize: 20,
    marginRight: 15,  
  },
  sidebarLinkText: {
    fontSize: 18,
    color: '#e8eaf6',
    fontWeight: '500',
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#303f9f',
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  toggleButton: {
    position: 'absolute',
    top: 15,
    left: -20,
    backgroundColor: '#1a237e',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
});
