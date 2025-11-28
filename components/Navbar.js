import React, { useState, useRef } from 'react';
// Import web-specific components
let WebDropdown;
if (typeof window !== 'undefined' && Platform.OS === 'web') {
  // eslint-disable-next-line global-require
  WebDropdown = require('./WebDropdown').default;
}
import { usePathname, useRouter } from 'expo-router';
import { View, Platform, StyleSheet, Text, TouchableOpacity, Modal, Image, useWindowDimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { FontAwesome } from '@expo/vector-icons'; // Using FontAwesome for icons

const NavLink = ({ href, text, iconName, pathname, closeMenu, isActive: isActiveProp }) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 1061;
  const [isHovered, setIsHovered] = useState(false);
  const [buttonWidth, setButtonWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  
  // Use the provided isActive prop if available, otherwise calculate it
  let isActive = isActiveProp !== undefined ? isActiveProp : 
                  (pathname === `/${href}` || pathname.startsWith(`/${href}/`));
  
  // Special case: News tab should be active for news-related routes
  if (href === 'news' && (pathname.startsWith('/news') || pathname === '/creative')) {
    isActive = true;
  }
  
  // Special case: Home tab should be active for home-related routes including submit
  if (href === 'home' && (pathname === '/home' || pathname === '/submit')) {
    isActive = true;
  }
  
  const linkStyle = isMobile ? [styles.mobileMenuItem, isActive && styles.mobileMenuItemActive] : [styles.navLink, isActive && styles.navLinkActive];
  const textStyle = isMobile ? [styles.mobileMenuText, isActive && styles.mobileMenuTextActive] : [styles.navLinkText, isActive && styles.navLinkTextActive];
  const iconStyle = isMobile ? [styles.mobileMenuIcon, isActive && styles.mobileMenuIconActive] : [styles.navIcon, isActive && styles.navIconActive];

  const handlePress = () => {
    router.push(href);
    if (closeMenu) {
      closeMenu();
    }
  };

  const leftPercent = buttonWidth && textWidth ? `${((buttonWidth - textWidth) / 2) / buttonWidth * 100}%` : '0%';
  const widthPercent = buttonWidth && textWidth ? `${textWidth / buttonWidth * 100}%` : '0%';

  return (
    <TouchableOpacity 
      style={[linkStyle, {position: 'relative'}]} 
      onPress={handlePress}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onLayout={(e) => setButtonWidth(e.nativeEvent.layout.width)}
    >
      {iconName && <FontAwesome name={iconName} style={iconStyle} />}
      <Text 
        style={textStyle} 
        onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
      >
        {text}
      </Text>
      {!isMobile && (
        <View style={[styles.underline, {left: leftPercent, width: widthPercent, transform: [{scaleX: (isActive || isHovered) ? 1 : 0}]}]} />
      )}
    </TouchableOpacity>
  );
};

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { logoUrl } = useBranding();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const buttonRef = useRef(null);
  const [buttonWidth, setButtonWidth] = useState(200);
  const { width } = useWindowDimensions();
  const isMobile = width < 1061;
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);

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
        
        {!isMobile && (
          <View style={styles.navLinksContainer}>
            <NavLink href="home" text="Home" pathname={pathname} />
            <NavLink href="news" text="News" pathname={pathname} />
            <NavLink href="about" text="About" pathname={pathname} />
            {user ? (
              <>
            <NavLink href="forum" text="Forum" pathname={pathname} />
            <NavLink href="contribute" text="Request" pathname={pathname} />
        <View style={styles.userMenuContainer}>
          <TouchableOpacity ref={buttonRef} style={styles.userMenuButton} onPress={() => setDropdownVisible(!dropdownVisible)} onLayout={(e) => setButtonWidth(e.nativeEvent.layout.width)}>
                        {user?.profile?.avatar ? (
              <Image source={{ uri: String(user.profile.avatar) }} style={styles.userAvatar} />
            ) : (
              <FontAwesome name="user-circle" size={18} color="#333" />
            )}
            <Text style={styles.userName}>{user?.name || 'Profile'}</Text>
            <FontAwesome name={dropdownVisible ? 'angle-up' : 'angle-down'} size={15} color="#333" />
          </TouchableOpacity>
          {/* Native (non-web) dropdown */}
          {dropdownVisible && Platform.OS !== 'web' && (
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
          )}
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
        )}
        {isMobile && (
          <TouchableOpacity style={styles.hamburger} onPress={() => setMobileMenuVisible(!mobileMenuVisible)}>
            <FontAwesome name="bars" size={24} color="#333" />
          </TouchableOpacity>
        )}
        {/* Web Dropdown */}
        {Platform.OS === 'web' && WebDropdown && (
          <WebDropdown
            isVisible={dropdownVisible}
            onClose={() => setDropdownVisible(false)}
            onLogout={handleLogout}
            isAdmin={user?.profile?.role === 'admin'}
            router={router}
            buttonRef={buttonRef}
            setButtonWidth={setButtonWidth}
            buttonWidth={buttonWidth}
          />
        )}
      </View>

      {/* Mobile Menu Overlay */}
      {isMobile && mobileMenuVisible && (
        <View style={styles.mobileMenuOverlay}>
          <View style={styles.mobileMenu}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setMobileMenuVisible(false)}>
              <FontAwesome name="times" size={24} color="#333" />
            </TouchableOpacity>
            <NavLink href="home" text="Home" pathname={pathname} closeMenu={() => setMobileMenuVisible(false)} />
            <NavLink href="news" text="News" pathname={pathname} closeMenu={() => setMobileMenuVisible(false)} />
            <NavLink href="about" text="About" pathname={pathname} closeMenu={() => setMobileMenuVisible(false)} />
            {user ? (
              <>
                <NavLink href="forum" text="Forum" pathname={pathname} closeMenu={() => setMobileMenuVisible(false)} />
                <NavLink href="contribute" text="Request" pathname={pathname} closeMenu={() => setMobileMenuVisible(false)} />
                <TouchableOpacity style={styles.mobileMenuItem} onPress={() => { router.push('/profile'); setMobileMenuVisible(false); }}>
                  <FontAwesome name="user" size={16} style={styles.mobileMenuIcon} />
                  <Text style={styles.mobileMenuText}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mobileMenuItem} onPress={() => { router.push('/my-requests'); setMobileMenuVisible(false); }}>
                  <FontAwesome name="list" size={16} style={styles.mobileMenuIcon} />
                  <Text style={styles.mobileMenuText}>My Requests</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mobileMenuItem} onPress={handleLogout}>
                  <FontAwesome name="sign-out" size={16} style={styles.mobileMenuIcon} />
                  <Text style={styles.mobileMenuText}>Logout</Text>
                </TouchableOpacity>
              </>
            ) : (
              <NavLink href="/signin" text="Sign In" iconName="sign-in" pathname={pathname} closeMenu={() => setMobileMenuVisible(false)} />
            )}
          </View>
        </View>
      )}

      {/* Links for mobile drawer */}
      {Platform.OS !== 'web' && (
        <View style={styles.mobileNavLinks}>
          <NavLink href="home" text="Home" pathname={pathname} />
          <NavLink href="forum" text="Forum" pathname={pathname} />
          <NavLink href="news" text="News" pathname={pathname} />
          <NavLink href="about" text="About" pathname={pathname} />
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
    padding: 24,
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
    position: 'relative',
    zIndex: 1000,
    ...Platform.select({
      web: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
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
    transition: 'all 0.2s ease-in-out',
    ...Platform.select({
      default: {
        marginBottom: 6,
      },
    }),
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: '#007BFF',
    transformOrigin: 'left',
    transition: 'transform 0.3s ease-in-out',
  },
  navLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    transition: 'all 0.2s ease-in-out',
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
  hamburger: {
    padding: 10,
  },
  mobileMenuOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  mobileMenu: {
    backgroundColor: '#fff',
    width: '85%',
    height: '100%',
    padding: 25,
    paddingTop: 60,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    overflowY: 'auto',
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderRadius: 8,
    marginVertical: 2,
    backgroundColor: '#fff',
    transition: 'all 0.2s ease-in-out',
  },
  mobileMenuItemActive: {
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    borderBottomColor: '#007BFF',
  },
  mobileMenuIcon: {
    marginRight: 15,
    color: '#555',
  },
  mobileMenuIconActive: {
    color: '#007BFF',
  },
  mobileMenuText: {
    fontSize: 16,
    color: '#333',
  },
  mobileMenuTextActive: {
    color: '#007BFF',
    fontWeight: '700',
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