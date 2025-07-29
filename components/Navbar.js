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
          <Text style={styles.brand}>The FISHERMAN</Text>
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
              <FontAwesome name="user-circle" size={18} color="#333" />
            )}
            <Text style={styles.userName}>{user?.name || 'Profile'}</Text>
            <FontAwesome name={dropdownVisible ? 'angle-up' : 'angle-down'} size={15} color="#333" />
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
                  <FontAwesome name="user" size={13} style={styles.dropdownIcon} />
                  <Text style={styles.dropdownText}>Profile</Text>
                </TouchableOpacity>
                {user?.profile?.role === 'admin' && (
                  <TouchableOpacity style={styles.dropdownItem} onPress={() => { router.push('/admin/branding'); setDropdownVisible(false); onLinkPress(); }}>
                    <FontAwesome name="desktop" size={13} style={styles.dropdownIcon} />
                    <Text style={styles.dropdownText}>Manage Website</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
                  <FontAwesome name="sign-out" size={13} style={styles.dropdownIcon} />
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
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed',
          right: 20, // adjust as needed for perfect alignment
          top: 45,   // adjust as needed for perfect alignment
        }
      : {
          position: 'absolute',
          right: 0,
          top: '110%',
        }),
    backgroundColor: '#fff',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    paddingVertical: 8,
    minWidth: 215,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#1a237e',
    backgroundColor: '#fff',
  },
  navContainer: {
    backgroundColor: '#fff',
    ...Platform.select({
      web: {
        paddingHorizontal: 20,
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
      },
      default: {
        paddingTop: 24,
        paddingHorizontal: 12,
      },
    }),
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  navLinksContainer: {
    flexDirection: 'row',
    gap: 60,
  },
  mobileNavLinks: {
    marginTop: 30,
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    ...Platform.select({
      default: {
        marginBottom: 6,
      },
    }),
  },
  navLinkActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007BFF',
  },
  navIcon: {
    color: '#555',
    marginRight: 7,
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
    display: 'flex',
    alignItems: 'flex-end',
  },
  userMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 5,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  dropdown: {
    position: 'absolute',
    top: '50%',
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    width: 250,
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
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  dropdownIcon: {
    marginRight: 10,
    color: '#555',
  },
  dropdownText: {
    fontSize: 13,
  },
});

export default Navbar;
