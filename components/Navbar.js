import React, { useState, useRef } from 'react';
// Only import createPortal on web
let createPortal;
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // eslint-disable-next-line global-require
  createPortal = require('react-dom').createPortal;
}
import { usePathname, useRouter } from 'expo-router';
import { View, Platform, StyleSheet, Text, TouchableOpacity, Modal, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { FontAwesome } from '@expo/vector-icons'; // Using FontAwesome for icons

const NavLink = ({ href, text, iconName, pathname, onLinkPress }) => {
  const router = useRouter();
  const isActive = pathname.startsWith(href);
  const linkStyle = [styles.navLink, isActive && styles.navLinkActive];
  const textStyle = [styles.navLinkText, isActive && styles.navLinkTextActive];
  const iconStyle = [styles.navIcon, isActive && styles.navIconActive];

  return (
    <TouchableOpacity style={linkStyle} onPress={() => { router.push(href); onLinkPress(); }}>
      <FontAwesome name={iconName} size={20} style={iconStyle} />
      <Text style={textStyle}>{text}</Text>
    </TouchableOpacity>
  );
};

const Navbar = ({ onLinkPress = () => {} }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { logoUrl } = useBranding();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
    onLinkPress();
  };

  return (
    <View style={styles.navContainer}>
      <View style={styles.nav}>
        <View style={styles.brandContainer}>
          <Image source={logoUrl} style={styles.avatar} />
          <Text style={styles.brand}>Fisherman</Text>
        </View>
        
        {/* Links for web view */}
        {Platform.OS === 'web' && (
          <View style={styles.navLinksContainer}>
            <NavLink href="/home" text="Home" iconName="home" pathname={pathname} onLinkPress={onLinkPress} />
            <NavLink href="/forum" text="Forum" iconName="comments" pathname={pathname} onLinkPress={onLinkPress} />
            <NavLink href="/news" text="News" iconName="newspaper-o" pathname={pathname} onLinkPress={onLinkPress} />
            <NavLink href="/about" text="About" iconName="info-circle" pathname={pathname} onLinkPress={onLinkPress} />
          </View>
        )}

        <View style={styles.userMenuContainer}>
          <TouchableOpacity style={styles.userMenuButton} onPress={() => setDropdownVisible(!dropdownVisible)}>
                        {user?.profile?.avatar ? (
              <Image source={{ uri: user.profile.avatar }} style={styles.userAvatar} />
            ) : (
              <FontAwesome name="user-circle" size={24} color="#333" />
            )}
            <Text style={styles.userName}>{user?.name || 'Profile'}</Text>
            <FontAwesome name={dropdownVisible ? 'angle-up' : 'angle-down'} size={20} color="#333" />
          </TouchableOpacity>
        </View>
        {/* Dropdown menu using React Portal on web */}
        {dropdownVisible && Platform.OS === 'web' && createPortal &&
          createPortal(
            <View style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9998, pointerEvents: 'box-none' }}>
              {/* Overlay that only closes dropdown when clicking outside */}
              <View
                style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9998, backgroundColor: 'transparent' }}
                pointerEvents="auto"
                onStartShouldSetResponder={() => { setDropdownVisible(false); return true; }}
              />
              <View style={styles.dropdownAbsolute} pointerEvents="auto">
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { router.push('/profile'); setDropdownVisible(false); onLinkPress(); }}>
                  <FontAwesome name="user" size={16} style={styles.dropdownIcon} />
                  <Text style={styles.dropdownText}>Profile</Text>
                </TouchableOpacity>
                {user?.profile?.role === 'admin' && (
                  <TouchableOpacity style={styles.dropdownItem} onPress={() => { router.push('/admin/branding'); setDropdownVisible(false); onLinkPress(); }}>
                    <FontAwesome name="desktop" size={16} style={styles.dropdownIcon} />
                    <Text style={styles.dropdownText}>Manage Website</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
                  <FontAwesome name="sign-out" size={16} style={styles.dropdownIcon} />
                  <Text style={styles.dropdownText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>,
            document.body
          )
        }
        {/* Native (non-web) dropdown fallback */}
        {dropdownVisible && Platform.OS !== 'web' && (
          <View style={{ position: 'absolute', right: 24, top: 60, zIndex: 9999 }}>
            <View style={styles.dropdownAbsolute}>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { router.push('/profile'); setDropdownVisible(false); onLinkPress(); }}>
                <FontAwesome name="user" size={16} style={styles.dropdownIcon} />
                <Text style={styles.dropdownText}>Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
                <FontAwesome name="sign-out" size={16} style={styles.dropdownIcon} />
                <Text style={styles.dropdownText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Links for mobile drawer */}
      {Platform.OS !== 'web' && (
        <View style={styles.mobileNavLinks}>
          <NavLink href="/home" text="Home" iconName="home" pathname={pathname} onLinkPress={onLinkPress} />
          <NavLink href="/forum" text="Forum" iconName="comments" pathname={pathname} onLinkPress={onLinkPress} />
          <NavLink href="/news" text="News" iconName="newspaper-o" pathname={pathname} onLinkPress={onLinkPress} />
          <NavLink href="/about" text="About" iconName="info-circle" pathname={pathname} onLinkPress={onLinkPress} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dropdownOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 9998,
  },
  dropdownAbsolute: {
    position: 'fixed',
    right: 40, // Adjust if needed to match the profile button
    top: 70,   // Adjust if needed to match the profile button
    backgroundColor: '#fff',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    paddingVertical: 8,
    minWidth: 160,
    zIndex: 9999,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 6,
    borderWidth: 2,
    borderColor: '#1a237e',
    backgroundColor: '#fff',
  },
  navContainer: {
    backgroundColor: '#fff',
    ...Platform.select({
      web: {
        paddingHorizontal: 40,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
      },
      default: {
        paddingTop: 40,
        paddingHorizontal: 20,
      },
    }),
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  navLinksContainer: {
    flexDirection: 'row',
    gap: 30,
  },
  mobileNavLinks: {
    marginTop: 30,
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    ...Platform.select({
      default: {
        marginBottom: 10,
      },
    }),
  },
  navLinkActive: {
    backgroundColor: '#eef2ff',
  },
  navIcon: {
    color: '#555',
    marginRight: 12,
  },
  navIconActive: {
    color: '#007BFF',
  },
  navLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  navLinkTextActive: {
    color: '#007BFF',
  },
  userMenuContainer: {
    position: 'relative',
  },
  userMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  dropdown: {
    position: 'absolute',
    top: '110%',
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    width: 150,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  dropdownIcon: {
    marginRight: 10,
    color: '#555',
  },
  dropdownText: {
    fontSize: 16,
  },
});

export default Navbar;
