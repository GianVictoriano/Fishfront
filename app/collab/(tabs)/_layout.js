import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '~/context/AuthContext';
import { Platform, useWindowDimensions } from 'react-native';

export default function TabsLayout() {
  const { hasModule, user } = useAuth();
  const { width } = useWindowDimensions();
  const tabWidth = width / 3; // Ensure exactly 3 tabs are visible

  // Define all possible tabs
  const allTabs = [
    { name: 'dashboard', title: 'Dashboard', icon: 'grid' },
    { name: 'create-content', title: 'Create', icon: 'plus-square' },
    { name: 'review-content', title: 'Review', icon: 'eye' },
    { name: 'collaborate', title: 'Chat', icon: 'message-square' },
  ];

  // Filter tabs based on user permissions
  const accessibleTabs = allTabs.filter(tab => hasModule(tab.name));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#111827',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarScrollEnabled: true, // This enables horizontal scrolling
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60, // A standard tab bar height
        },
        tabBarItemStyle: {
          width: tabWidth, // Dynamically set width for each tab
          flexGrow: 0, // Prevent the tab from growing
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 12,
          width: '100%', // Ensure label respects the container width
        },
      }}
    >
      {accessibleTabs.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => <Feather name={tab.icon} size={24} color={color} />,
          }}
        />
      ))}

      {/* The 'More' tab with its own logic remains unchanged */}
      {(user?.profile?.level === 2 || user?.profile?.level === 3) && (
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: ({ color, size }) => <Feather name="more-horizontal" size={24} color={color} />,
          }}
        />
      )}
    </Tabs>
  );
}
