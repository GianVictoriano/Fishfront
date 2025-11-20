import React, { useState, useRef } from 'react';
// Import web-specific components
let WebDropdown;
if (typeof window !== 'undefined' && Platform.OS === 'web') {
  // eslint-disable-next-line global-require
  WebDropdown = require('./WebDropdown').default;
}
import { usePathname, useRouter } from 'expo-router';
import { View, Platform, StyleSheet, Text, TouchableOpacity, Modal, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { FontAwesome } from '@expo/vector-icons'; // Using FontAwesome for icons

const NavLink = ({ href, text, iconName, pathname, closeMenu, isActive: isActiveProp }) => {
  const router = useRouter();
  // Use the provided isActive prop if available, otherwise calculate it
  const isActive = isActiveProp !== undefined ? isActiveProp : 
                  (pathname === `/${href}` || pathname.startsWith(`/${href}/`));
  const linkStyle = [styles.navLink, isActive && styles.navLinkActive];
  const textStyle = [styles.navLinkText, isActive && styles.navLinkTextActive];
  const iconStyle = [styles.navIcon, isActive && styles.navIconActive];

  const handlePress = () => {
    router.push(href);
    if (closeMenu) {
      closeMenu();
    }
  };
  return (
    <TouchableOpacity style={linkStyle} onPress={handlePress}>
      {iconName && <FontAwesome name={iconName} style={iconStyle} />}
      <Text style={textStyle}>{text}</Text>
    </TouchableOpacity>
  );
};

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { logoUrl } = useBranding();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <View style={styles.navContainer}>
      <View style={styles.nav}>
        <View style={styles.brandContainer}>
          <Image 
            source={logoUrl?.uri ? { uri: logoUrl.uri } : require('../assets/images/fish.jpg')}
            style={styles.avatar} 
          />
          <Text style={styles.brand}>The FISHERMAN</Text>
        </View>
        
          <View style={styles.navLinksContainer}>
            <NavLink href="home" text="Home" iconName="home" pathname={pathname} />
            <NavLink href="news" text="News" iconName="newspaper-o" pathname={pathname} />
            <NavLink href="about" text="About" iconName="info-circle" pathname={pathname} />
            {user ? (
              <>
            <NavLink href="forum" text="Forum" iconName="comments" pathname={pathname} />
            <NavLink href="contribute" text="Request" iconName="plus-circle" pathname={pathname} />
            <View style={styles.userMenuContainer}>
          <TouchableOpacity style={styles.userMenuButton} onPress={() => setDropdownVisible(!dropdownVisible)}>
                        {user?.profile?.avatar ? (
              <Image source={{ uri: String(user.profile.avatar) }} style={styles.userAvatar} />
            ) : (
              <FontAwesome name="user-circle" size={18} color="#333" />
            )}
            <Text style={styles.userName}>{user?.name || 'Profile'}</Text>
            <FontAwesome name={dropdownVisible ? 'angle-up' : 'angle-down'} size={15} color="#333" />
          </TouchableOpacity>
        </View>
          
              </>
          ) : (
          // Show for guests
          <NavLink 
  href="/signin" 
  text="Sign In" 
  iconName="sign-in" 
  pathname={pathname} 
  isActive={pathname === '/signin'} 
/>
        )}


        </View>
        {/* Web Dropdown */}
        {Platform.OS === 'web' && WebDropdown && (
          <WebDropdown
            isVisible={dropdownVisible}
            onClose={() => setDropdownVisible(false)}
            onLogout={handleLogout}
            isAdmin={user?.profile?.role === 'admin'}
            router={router}
          />
        )}
        {/* Native (non-web) dropdown fallback */}
        {dropdownVisible && Platform.OS !== 'web' && (
          <View style={{ position: 'absolute', right: 24, top: 60, zIndex: 9999 }}>
            <View style={styles.dropdownAbsolute}>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { router.push('/profile'); setDropdownVisible(false); }}>
                <FontAwesome name="user" size={16} style={styles.dropdownIcon} />
                <Text style={styles.dropdownText}>Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { router.push('/my-requests'); setDropdownVisible(false); }}>
                <FontAwesome name="list" size={16} style={styles.dropdownIcon} />
                <Text style={styles.dropdownText}>My Requests</Text>
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
          <NavLink href="home" text="Home" iconName="home" pathname={pathname} />
          <NavLink href="forum" text="Forum" iconName="comments" pathname={pathname} />
          <NavLink href="news" text="News" iconName="newspaper-o" pathname={pathname} />
          <NavLink href="about" text="About" iconName="info-circle" pathname={pathname} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dropdownAbsolute: {
    position: 'absolute',
    right: 0,
    top: '110%',
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    padding: 8,
    minWidth: 200,
    zIndex: 9999,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
        paddingHorizontal: 60,
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
    gap: 20,
  },
  mobileNavLinks: {
    marginTop: 30,
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    transition: 'all 0.2s ease-in-out',
    ...Platform.select({
      default: {
        marginBottom: 6,
      },
    }),
  },
  navLinkActive: {
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    borderBottomWidth: 2,
    borderBottomColor: '#007BFF',
    transform: 'translateY(-1px)',
    ...Platform.select({
      web: {
        borderBottomColor: '#007BFF',
      },
      default: {
        borderBottomColor: '#007BFF',
      },
    }),
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
    transition: 'all 0.2s ease-in-out',
  },
  navLinkTextActive: {
    color: '#007BFF',
    fontWeight: '700',
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