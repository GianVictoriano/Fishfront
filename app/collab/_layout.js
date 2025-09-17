import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Image, Pressable, ScrollView } from 'react-native';
import { Slot, useRouter, useSegments, Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useWindowDimensions } from 'react-native';
import { useAuth } from '~/context/AuthContext';
import { useBranding } from '~/context/BrandingContext';
import { Scrollbars } from 'react-custom-scrollbars-2';

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
        isActive && !isMinimized && styles.sidebarLinkActive,
        isActive && isMinimized && styles.sidebarLinkActiveMinimized,
        hovered && Platform.OS === 'web' && (isLogout ? styles.logoutHover : styles.sidebarLinkHover),
      ]}
    >
      {({ hovered }) => (
        <>
          <Feather
            name={iconName}
            style={[
              styles.sidebarIcon,
              isMinimized && styles.sidebarIconMinimized,
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
const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#FFFFFF' }}>
      <View style={styles.tabBarContainer}>
        {state.routes.slice(0, 3).map((route, index) => { // Take only the first 3 routes
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabBarItem}
            >
              {typeof options.tabBarIcon === 'function' && options.tabBarIcon({ focused: isFocused, color: isFocused ? '#111827' : '#A0A0A0', size: 24 })}
              <Text style={{ color: isFocused ? '#111827' : '#A0A0A0', fontSize: 12, fontWeight: '500' }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const Sidebar = ({ isMinimized }) => {
  const { user, logout, hasModule } = useAuth();
  const { logoUrl, loading: brandingLoading } = useBranding();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/'); // Redirect is handled by AuthContext now, but good to have fallback.
  };

  return (
    <View style={[styles.sidebar, isMinimized && styles.sidebarMinimized]} className="sidebar">
       <View style={styles.sidebarHeader}>
        {brandingLoading ? (
          <View style={styles.logoPlaceholder} />
        ) : (
          <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" />
        )}
        {!isMinimized && <Text style={styles.sidebarTitle}>Fisherman</Text>}
      </View>
      {!isMinimized ? (
        <Scrollbars
          style={{ flex: 1 }} // Ensure it takes up available space
          autoHide
          // Render an invisible thumb
          renderThumbVertical={props => <div {...props} style={{ ...props.style, backgroundColor: 'transparent' }}/>}
        >
          {hasModule('dashboard') && <SidebarLink href="/collab/dashboard" text="Dashboard" iconName="grid" isMinimized={isMinimized} />}
          {hasModule('create-content') && <SidebarLink href="/collab/create-content" text="Create Content" iconName="plus-square" isMinimized={isMinimized} />}
          {hasModule('review-content') && <SidebarLink href="/collab/review-content" text="Review Content" iconName="eye" isMinimized={isMinimized} />}
          {hasModule('collaborate') && <SidebarLink href="/collab/collaborate" text="Collaborate" iconName="users" isMinimized={isMinimized} />}
          {hasModule('users') && <SidebarLink href="/collab/users" text="Users" iconName="user-check" isMinimized={isMinimized} />}
          {hasModule('branding') && <SidebarLink href="/collab/branding" text="Branding" iconName="image" isMinimized={isMinimized} />}
          {(user?.profile?.level === 2 || user?.profile?.level === 3) && (
              <SidebarLink href="/collab/manage-users" text="Manage Users" iconName="sliders" isMinimized={isMinimized} />
          )}
          {user?.profile?.level === 3 && (
              <SidebarLink href={`/collab/manage-modules/${user.id}`} text="My Modules" iconName="settings" isMinimized={isMinimized} />
          )}
        </Scrollbars>
      ) : (
        <View style={{ flex: 1, alignItems: 'center' }}>
          {(() => {
            // Collect all sidebar links in order
            const links = [];
            if (hasModule('dashboard')) links.push(<SidebarLink key="dashboard" href="/collab/dashboard" text="Dashboard" iconName="grid" isMinimized={isMinimized} />);
            if (hasModule('create-content')) links.push(<SidebarLink key="create-content" href="/collab/create-content" text="Create Content" iconName="plus-square" isMinimized={isMinimized} />);
            if (hasModule('review-content')) links.push(<SidebarLink key="review-content" href="/collab/review-content" text="Review Content" iconName="eye" isMinimized={isMinimized} />);
            if (hasModule('collaborate')) links.push(<SidebarLink key="collaborate" href="/collab/collaborate" text="Collaborate" iconName="users" isMinimized={isMinimized} />);
            if (hasModule('users')) links.push(<SidebarLink key="users" href="/collab/users" text="Users" iconName="user-check" isMinimized={isMinimized} />);
            if (hasModule('branding')) links.push(<SidebarLink key="branding" href="/collab/branding" text="Branding" iconName="image" isMinimized={isMinimized} />);
            if (user?.profile?.level === 2 || user?.profile?.level === 3) links.push(<SidebarLink key="manage-users" href="/collab/manage-users" text="Manage Users" iconName="sliders" isMinimized={isMinimized} />);
            if (user?.profile?.level === 3) links.push(<SidebarLink key="my-modules" href={`/collab/manage-modules/${user.id}`} text="My Modules" iconName="settings" isMinimized={isMinimized} />);
            // Only show first 7 when minimized
            return isMinimized ? links.slice(0, 7) : links;
          })()}
        </View>
      )}
      <View style={styles.sidebarFooter}>
        <SidebarLink text="Logout" iconName="log-out" isMinimized={isMinimized} onPress={handleLogout} />
      </View>
    </View>
  );
};

export default function CollaboratorLayout() {
  const [isMinimized, setIsMinimized] = useState(false);
  const { user, hasModule } = useAuth();

  // Web layout with sidebar
  if (Platform.OS === 'web') {
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
            <Scrollbars
              style={styles.contentScrollView} 
              autoHide
              renderThumbVertical={props => <div {...props} style={{ ...props.style, backgroundColor: 'transparent' }}/>}
              renderView={props => <div {...props} style={{ ...props.style, flex: 1, display: 'flex', flexDirection: 'column' }}/>}
            >
              <Slot />
            </Scrollbars>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Android-specific layout with scrollable tabs
  if (Platform.OS === 'android') {
    return (
      <Tabs tabBar={(props) => <CustomTabBar {...props} />}>
        {hasModule('dashboard') && (
          <Tabs.Screen
            name="dashboard"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} />,
            }}
          />
        )}
        {hasModule('create-content') && (
          <Tabs.Screen
            name="create-content"
            options={{
              title: 'Create',
              tabBarIcon: ({ color, size }) => <Feather name="plus-square" size={size} color={color} />,
            }}
          />
        )}
        {hasModule('review-content') && (
          <Tabs.Screen
            name="review-content"
            options={{
              title: 'Review',
              tabBarIcon: ({ color, size }) => <Feather name="eye" size={size} color={color} />,
            }}
          />
        )}
        {hasModule('collaborate') && (
          <Tabs.Screen
            name="collaborate"
            options={{
              title: 'Collaborate',
              tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={color} />,
            }}
          />
        )}
        {(user?.profile?.level === 2 || user?.profile?.level === 3) && (
          <Tabs.Screen
            name="more"
            options={{
              title: 'More',
              tabBarIcon: ({ color, size }) => <Feather name="more-horizontal" size={size} color={color} />,
            }}
          />
        )}
      </Tabs>
    );
  }

  // Mobile layout (iOS) with bottom tabs
  return (
    <Tabs
      tabBar={Platform.OS === 'android' ? (props) => <CustomTabBar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: isMobile ? (Platform.OS === 'android' ? 'none' : 'flex') : 'none',
          height: 70,
          paddingBottom: 10,
          paddingTop: 5,
          backgroundColor: '#FFFFFF', // White background for the tab bar
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB', // Light grey top border
        },
        tabBarActiveTintColor: '#111827', // Dark text for active tab
        tabBarInactiveTintColor: '#A0A0A0', // Grey text for inactive tab
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      {hasModule('dashboard') && (
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} />,
          }}
        />
      )}
      {hasModule('create-content') && (
        <Tabs.Screen
          name="create-content"
          options={{
            title: 'Create',
            tabBarIcon: ({ color, size }) => <Feather name="plus-square" size={size} color={color} />,
          }}
        />
      )}
      {hasModule('review-content') && (
        <Tabs.Screen
          name="review-content"
          options={{
            title: 'Review',
            tabBarIcon: ({ color, size }) => <Feather name="eye" size={size} color={color} />,
          }}
        />
      )}
       {hasModule('collaborate') && (
        <Tabs.Screen
          name="collaborate"
          options={{
            title: 'Collaborate',
            tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={color} />,
          }}
        />
      )}
      {(user?.profile?.level === 2 || user?.profile?.level === 3) && (
         <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: ({ color, size }) => <Feather name="more-horizontal" size={size} color={color} />,
          }}
        />
      )}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: 70,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 5, // Adjust as needed
    paddingTop: 5,
  },
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
    marginRight: 12, // Add gap between sidebar and content
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
    backgroundColor: '#374151',

  },
  sidebarLinkActiveMinimized: {
    backgroundColor: '#374151',

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
  sidebarIconMinimized: {
    position: 'relative',
    marginRight: 15,
   


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

  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  contentScrollView: {
    flex: 1,
    // Padding is now handled by the screen components themselves
  },
  toggleButton: {
    position: 'absolute',
    top: 20,
    left: -30, // Adjust position for dark theme
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
