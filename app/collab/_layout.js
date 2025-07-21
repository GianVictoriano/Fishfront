import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Image, Pressable } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '~/context/AuthContext';
import { useBranding } from '~/context/BrandingContext';

// A single link in the sidebar with hover effects
const SidebarLink = ({ href, text, iconName, isMinimized, onPress }) => {
  const router = useRouter();
  const segments = useSegments();
  const isActive = href ? segments.includes(href.split('/').pop()) : false;
  const isLogout = text === 'Logout';

  // Use Pressable's render prop to get hover state on web
  return (
    <Pressable
      onPress={() => (onPress ? onPress() : router.push(href))}
      style={({ hovered }) => [
        styles.sidebarLink,
        isActive && styles.sidebarLinkActive,
        hovered && Platform.OS === 'web' && (isLogout ? styles.logoutHover : styles.sidebarLinkHover),
      ]}
    >
      {({ hovered }) => (
        <>
          <Feather
            name={iconName}
            style={[
              styles.sidebarIcon,
              isActive && styles.sidebarIconActive,
              hovered && Platform.OS === 'web' && (isLogout ? styles.logoutIconHover : styles.sidebarIconHover),
            ]}
          />
          {!isMinimized && (
            <Text
              style={[
                styles.sidebarLinkText,
                isActive && styles.sidebarLinkTextActive,
                hovered && Platform.OS === 'web' && (isLogout ? styles.logoutTextHover : styles.sidebarLinkTextHover),
              ]}
            >
              {text}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
};

// The main sidebar component
const Sidebar = ({ isMinimized }) => {
  const { user, logout } = useAuth();
  const { logoUrl, loading: brandingLoading } = useBranding();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/'); // Redirect is handled by AuthContext now, but good to have fallback.
  };

  return (
    <View style={[styles.sidebar, isMinimized && styles.sidebarMinimized]}>
       <View style={styles.sidebarHeader}>
        {brandingLoading ? (
          <View style={styles.logoPlaceholder} />
        ) : (
          <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" />
        )}
        {!isMinimized && <Text style={styles.sidebarTitle}>Fisherman</Text>}
      </View>
      <ScrollView>
        <SidebarLink href="/collab/dashboard" text="Dashboard" iconName="grid" isMinimized={isMinimized} />
        <SidebarLink href="/collab/create-content" text="Create Content" iconName="plus-square" isMinimized={isMinimized} />
        <SidebarLink href="/collab/review-content" text="Review Content" iconName="eye" isMinimized={isMinimized} />
        <SidebarLink href="/collab/collaborate" text="Collaborate" iconName="users" isMinimized={isMinimized} />
        <SidebarLink href="/collab/users" text="Users" iconName="user-check" isMinimized={isMinimized} />
        {(user?.profile?.role === 'admin' || user?.profile?.role === 'collaborator') && (
          <SidebarLink href="/collab/branding" text="Branding" iconName="image" isMinimized={isMinimized} />
        )}
      </ScrollView>
      <View style={styles.sidebarFooter}>
        <SidebarLink text="Logout" iconName="log-out" isMinimized={isMinimized} onPress={handleLogout} />
      </View>
    </View>
  );
};

export default function CollaboratorLayout() {
  const [isMinimized, setIsMinimized] = useState(false);

  // Sidebar is only for web for now
  if (Platform.OS !== 'web') {
    // On mobile, we might want a different navigation like tabs or a drawer
    return <Slot />;
  }

  return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.layout}>
          <Sidebar isMinimized={isMinimized} />
          <View style={styles.contentContainer}>
            <Pressable 
              style={styles.toggleButton}
              onPress={() => setIsMinimized(!isMinimized)}
            >
              <Feather name={isMinimized ? 'chevron-right' : 'chevron-left'} size={24} color="#FFF" />
            </Pressable>
            <ScrollView style={styles.contentScrollView}>
              <Slot />
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingBottom: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)', // Lighter border for dark bg
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  sidebarTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#FFFFFF', // White title for dark bg
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA', // A lighter, cleaner background
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 260,
    backgroundColor: '#111827', // Dark navy background
    paddingVertical: 25,
    transition: 'width 0.2s ease-in-out',
    borderRightWidth: 0, // No border needed with high contrast
  },
  sidebarMinimized: {
    width: 90,
    alignItems: 'center',
  },
  sidebarLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
    marginBottom: 8,
    borderRadius: 8,
    marginHorizontal: 15,
  },
  sidebarLinkActive: {
    backgroundColor: '#374151', // A lighter gray for active state on dark bg
  },
  sidebarLinkHover: {
    backgroundColor: '#1F2937', // Slightly lighter navy for hover
  },
  logoutHover: {
    backgroundColor: '#991B1B', // A deeper red for dark theme
  },
  sidebarIcon: {
    fontSize: 22,
    color: '#D1D5DB', // Light gray for icons
    marginRight: 20,
    width: 24,
    textAlign: 'center',
  },
  sidebarIconActive: {
    color: '#FFFFFF', // White for active icon
  },
  sidebarIconHover: {
    color: '#FFFFFF', // White for hover icon
  },
  logoutIconHover: {
    color: '#FEE2E2', // Light red for logout icon on hover
  },
  sidebarLinkText: {
    fontSize: 16,
    color: '#D1D5DB', // Light gray for text
    flexShrink: 1,
  },
  sidebarLinkTextActive: {
    color: '#FFFFFF', // White for active text
    fontWeight: '600',
  },
  sidebarLinkTextHover: {
    color: '#FFFFFF', // White for hover text
  },
  logoutTextHover: {
    color: '#FEE2E2', // Light red for logout text on hover
  },
  sidebarFooter: {
    marginTop: 'auto',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)', // Lighter border for dark bg
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  contentScrollView: {
    flex: 1,
    padding: 30,
  },
  toggleButton: {
    position: 'absolute',
    top: 20,
    left: -16, // Adjust position for dark theme
    backgroundColor: '#111827', // Match hover state
    borderWidth: 2,
    borderColor: '#111827',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
