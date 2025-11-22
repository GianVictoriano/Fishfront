import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Image, Pressable, ScrollView } from 'react-native';
import { Slot, useRouter, useSegments, Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useWindowDimensions } from 'react-native';
import { useAuth } from '~/context/AuthContext';
import { useBranding } from '~/context/BrandingContext';

// A single link in the sidebar with hover effects
const SidebarLink = ({ href, text, iconName, isMinimized, onPress, hoverColor, colors, textColor, iconColor }) => {
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
        isActive && !isMinimized && [styles.sidebarLinkActive, { backgroundColor: colors.secondary || '#374151' }],
        isActive && isMinimized && [styles.sidebarLinkActiveMinimized, { backgroundColor: colors.secondary || '#374151' }],
        hovered && Platform.OS === 'web' && (isLogout ? styles.logoutHover : { backgroundColor: hoverColor || '#1F2937' }),
      ]}
    >
      {({ hovered }) => (
        <>
          <Feather
            name={iconName}
            style={[
              styles.sidebarIcon,
              { color: iconColor || '#D1D5DB' },
              isMinimized && styles.sidebarIconMinimized,
              isActive && styles.sidebarIconActive,
              hovered && Platform.OS === 'web' && (isLogout ? styles.logoutIconHover : styles.sidebarIconHover),
            ]}
          />
          {!isMinimized && (
            <Text
              style={[
                styles.sidebarLinkText,
                { color: textColor || '#D1D5DB' },
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
        {state.routes.slice(0, 6).map((route, index) => { // Take only the first 6 routes
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
  const { logoUrl, loading: brandingLoading, colors } = useBranding();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/'); // Redirect is handled by AuthContext now, but good to have fallback.
  };

  return (
    <View style={[styles.sidebar, isMinimized && styles.sidebarMinimized, { backgroundColor: colors.primary || '#111827' }]} className="sidebar">
       <View style={styles.sidebarHeader}>
        {brandingLoading ? (
          <View style={styles.logoPlaceholder} />
        ) : (
          <Image source={typeof logoUrl === 'number' ? logoUrl : (logoUrl?.uri ? logoUrl : { uri: String(logoUrl || '') })} style={styles.logo} resizeMode="contain" />
        )}
        {!isMinimized && <Text style={[styles.sidebarTitle, { color: colors.text_primary || '#FFFFFF' }]}>Fisherman</Text>}
      </View>
      {!isMinimized ? (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {hasModule('dashboard') && <SidebarLink href="/collab/dashboard" text="Dashboard" iconName="grid" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />}
          {hasModule('create-content') && <SidebarLink href="/collab/create-content" text="Create Content" iconName="plus-square" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />}
          {hasModule('review-content') && <SidebarLink href="/collab/review-content" text="Review Content" iconName="eye" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />}
          {hasModule('collaborate') && <SidebarLink href="/collab/collaborate" text="Collaborate" iconName="users" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />}
          {hasModule('activity-monitor') && <SidebarLink href="/collab/activity-monitor" text="Activity Monitor" iconName="activity" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />}
          {hasModule('branding') && <SidebarLink href="/collab/branding" text="Branding" iconName="image" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />}
          {hasModule('forum') && <SidebarLink href="/collab/manage-forum" text="Manage Forum" iconName="message-square" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />}
          {hasModule('folio') && <SidebarLink href="/collab/manage-folio" text="Manage Folio" iconName="book" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />}
          {hasModule('applicants') && <SidebarLink href="/collab/manage-applicants" text="Manage Applicants" iconName="users" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />}
          {hasModule('requests') && <SidebarLink href="/collab/manage-requests" text="Manage Requests" iconName="file-text" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />}
          {hasModule('archives') && <SidebarLink href="/collab/archives" text="Archives" iconName="archive" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />}
          {hasModule('manage-media') && <SidebarLink href="/collab/manage-media" text="Manage Media" iconName="folder" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />}
          {(user?.profile?.level === 2 || user?.profile?.level === 3) && (
              <SidebarLink href="/collab/manage-users" text="Manage Users" iconName="sliders" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center' }}>
          {(() => {
            // Collect all sidebar links in order
            const links = [];
            if (hasModule('dashboard')) links.push(<SidebarLink key="dashboard" href="/collab/dashboard" text="Dashboard" iconName="grid" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />);
            if (hasModule('create-content')) links.push(<SidebarLink key="create-content" href="/collab/create-content" text="Create Content" iconName="plus-square" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />);
            if (hasModule('review-content')) links.push(<SidebarLink key="review-content" href="/collab/review-content" text="Review Content" iconName="eye" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />);
            if (hasModule('collaborate')) links.push(<SidebarLink key="collaborate" href="/collab/collaborate" text="Collaborate" iconName="users" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />);
            if (hasModule('activity-monitor')) links.push(<SidebarLink key="activity-monitor" href="/collab/activity-monitor" text="Activity Monitor" iconName="activity" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />);
            if (hasModule('branding')) links.push(<SidebarLink key="branding" href="/collab/branding" text="Branding" iconName="image" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />);
            if (hasModule('forum')) links.push(<SidebarLink key="manage-forum" href="/collab/manage-forum" text="Manage Forum" iconName="message-square" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />);
            if (hasModule('folio')) links.push(<SidebarLink key="manage-folio" href="/collab/manage-folio" text="Manage Folio" iconName="book" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />);
            if (hasModule('applicants')) links.push(<SidebarLink key="manage-applicants" href="/collab/manage-applicants" text="Manage Applicants" iconName="users" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />);
            if (hasModule('requests')) links.push(<SidebarLink key="manage-requests" href="/collab/manage-requests" text="Manage Requests" iconName="file-text" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />);
            if (hasModule('archives')) links.push(<SidebarLink key="archives" href="/collab/archives" text="Archives" iconName="archive" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />);
            if (hasModule('manage-media')) links.push(<SidebarLink key="manage-media" href="/collab/manage-media" text="Manage Media" iconName="folder" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />);
            if (user?.profile?.level === 2 || user?.profile?.level === 3) links.push(<SidebarLink key="manage-users" href="/collab/manage-users" text="Manage Users" iconName="sliders" isMinimized={isMinimized} hoverColor={colors.text_secondary} colors={colors} textColor={colors.text_primary} iconColor={colors.text_primary} />);
            // Only show first 7 when minimized
            return isMinimized ? links.slice(0, 7) : links;
          })()}
        </View>
      )}
      <View style={styles.sidebarFooter}>
        <SidebarLink text="Logout" iconName="log-out" isMinimized={isMinimized} onPress={handleLogout} textColor={colors.text_primary} iconColor={colors.text_primary} />
      </View>
    </View>
  );
};

export default function CollaboratorLayout() {
  const [isMinimized, setIsMinimized] = useState(false);
  const { user, hasModule } = useAuth();
  const { colors } = useBranding();

  // Web layout with sidebar
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.layout}>
          <Sidebar isMinimized={isMinimized} />
          <View style={styles.contentContainer}>
            <Pressable 
              style={[styles.toggleButton, { backgroundColor: colors.primary || '#111827', borderColor: colors.primary || '#111827' }]}
              onPress={() => setIsMinimized(!isMinimized)}
            >
              <Feather name={isMinimized ? 'chevron-right' : 'chevron-left'} size={24} color="#FFF" />
            </Pressable>
            <ScrollView
              style={styles.contentScrollView} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
            >
              <Slot />
            </ScrollView>
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
              tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={colors.text_primary} />,
            }}
          />
        )}
        {hasModule('create-content') && (
          <Tabs.Screen
            name="create-content"
            options={{
              title: 'Create',
              tabBarIcon: ({ color, size }) => <Feather name="plus-square" size={size} color={colors.text_primary} />,
            }}
          />
        )}
        {hasModule('review-content') && (
          <Tabs.Screen
            name="review-content"
            options={{
              title: 'Review',
              tabBarIcon: ({ color, size }) => <Feather name="eye" size={size} color={colors.text_primary} />,
            }}
          />
        )}
        {hasModule('collaborate') && (
          <Tabs.Screen
            name="collaborate"
            options={{
              title: 'Collaborate',
              tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={colors.text_primary} />,
            }}
          />
        )}
        {hasModule('activity-monitor') && (
          <Tabs.Screen
            name="activity-monitor"
            options={{
              title: 'Activity',
              tabBarIcon: ({ color, size }) => <Feather name="activity" size={size} color={colors.text_primary} />,
            }}
          />
        )}
        {hasModule('archives') && (
          <Tabs.Screen
            name="archives"
            options={{
              title: 'Archives',
              tabBarIcon: ({ color, size }) => <Feather name="archive" size={size} color={colors.text_primary} />,
            }}
          />
        )}
        {hasModule('manage-media') && (
          <Tabs.Screen
            name="manage-media"
            options={{
              title: 'Media',
              tabBarIcon: ({ color, size }) => <Feather name="folder" size={size} color={colors.text_primary} />,
            }}
          />
        )}
        {(user?.profile?.level === 2 || user?.profile?.level === 3) && (
          <Tabs.Screen
            name="more"
            options={{
              title: 'More',
              tabBarIcon: ({ color, size }) => <Feather name="more-horizontal" size={size} color={colors.text_primary} />,
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
        tabBarActiveTintColor: '#590d0f', // Dark text for active tab
        tabBarInactiveTintColor: '#9e3751', // Grey text for inactive tab
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
            tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={colors.text_primary} />,
          }}
        />
      )}
      {hasModule('create-content') && (
        <Tabs.Screen
          name="create-content"
          options={{
            title: 'Create',
            tabBarIcon: ({ color, size }) => <Feather name="plus-square" size={size} color={colors.text_primary} />,
          }}
        />
      )}
      {hasModule('review-content') && (
        <Tabs.Screen
          name="review-content"
          options={{
            title: 'Review',
            tabBarIcon: ({ color, size }) => <Feather name="eye" size={size} color={colors.text_primary} />,
          }}
        />
      )}
       {hasModule('collaborate') && (
        <Tabs.Screen
          name="collaborate"
          options={{
            title: 'Collaborate',
            tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={colors.text_primary} />,
          }}
        />
      )}
      {hasModule('activity-monitor') && (
        <Tabs.Screen
          name="activity-monitor"
          options={{
            title: 'Activity',
            tabBarIcon: ({ color, size }) => <Feather name="activity" size={size} color={colors.text_primary} />,
          }}
        />
      )}
      {hasModule('archives') && (
        <Tabs.Screen
          name="archives"
          options={{
            title: 'Archives',
            tabBarIcon: ({ color, size }) => <Feather name="archive" size={size} color={colors.text_primary} />,
          }}
        />
      )}
      {hasModule('manage-media') && (
        <Tabs.Screen
          name="manage-media"
          options={{
            title: 'Media',
            tabBarIcon: ({ color, size }) => <Feather name="folder" size={size} color={colors.text_primary} />,
          }}
        />
      )}
      {(user?.profile?.level === 2 || user?.profile?.level === 3) && (
         <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: ({ color, size }) => <Feather name="more-horizontal" size={size} color={colors.text_primary} />,
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
