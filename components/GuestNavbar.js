import { useRouter, usePathname } from 'expo-router';
import { useBranding } from '../context/BrandingContext';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';

import { Feather } from '@expo/vector-icons';

export default function GuestNavbar({ onLinkPress = () => {}, onClose }) {
  // const { logoUrl } = useBranding(); // Bypassed to avoid casting issues
  const router = useRouter();
  const pathname = usePathname();

  const isWeb = Platform.OS === 'web';

  const linkStyle = (path) => [
    styles.navLink,
    pathname === path && styles.navLinkActive,
    !isWeb && styles.sidebarLink, // sidebar style on mobile
  ];

  return (
    <View style={isWeb ? styles.navbar : styles.sidebar}>
      {/* Close button for sidebar on mobile */}
      {!isWeb && onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Feather name="x" size={28} color="#1a237e" />
        </TouchableOpacity>
      )}
      <View style={styles.brandContainer}>
        <Image 
          source={require('../assets/images/fish.jpg')}
          style={styles.avatar} 
        />
        <Text style={styles.brand}>Fisherman</Text>
      </View>
      {!isWeb && <View style={styles.sidebarDivider} />}
      <View style={isWeb ? styles.navLinks : styles.sidebarLinks}>
        <TouchableOpacity style={[styles.sidebarLinkRow, pathname === '/home2' && styles.activeSidebarLinkRow]} onPress={() => { router.push('/home'); onLinkPress(); }}>
          <Text style={linkStyle('/home')}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sidebarLinkRow, pathname === '/news2' && styles.activeSidebarLinkRow]} onPress={() => { router.push('/news'); onLinkPress(); }}>
          <Text style={linkStyle('/news')}>News</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sidebarLinkRow, pathname === '/about2' && styles.activeSidebarLinkRow]} onPress={() => { router.push('/about'); onLinkPress(); }}>
          <Text style={linkStyle('/about')}>About Us</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={isWeb ? styles.signInButton : styles.sidebarSignInButton}
        onPress={() => {
          try {
            if (Platform.OS === 'android') {
              router.push('/signin_cp');
            } else {
              router.push('/signin');
            }
          } finally {
            onLinkPress();
          }
        }}>

        <Text style={isWeb ? styles.signInButtonText : styles.sidebarSignInButtonText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // --- Shared Styles ---
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: Platform.OS === 'web' ? 0 : 32,
  },
  avatar: {
    width: Platform.OS === 'web' ? 44 : 64,
    height: Platform.OS === 'web' ? 44 : 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#1a237e',
    backgroundColor: '#fff',
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a237e',
  },

  // --- Web-Specific Styles (Navbar) ---
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
    backgroundColor: '#f8f9fa',
    ...Platform.select({
      web: { boxShadow: '0 4px 8px rgba(0,0,0,0.06)' },
    }),
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 100,
  },
  navLink: {
    fontWeight: '500',
    fontSize: 18,
    color: '#37474f',
    paddingVertical: 12,
  },
  navLinkActive: {
    color: '#1976d2',
    borderBottomWidth: 3,
    borderBottomColor: '#1976d2',
  },
  signInButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  signInButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 18,
  },

  // --- Mobile-Specific Styles (Sidebar) ---
  sidebar: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
    paddingTop: 56,
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 24,
  },
  sidebarLinks: {
    marginBottom: 16,
  },
  linkRow: {
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeLinkRow: {
    backgroundColor: '#eef4ff',
  },
  sidebarLink: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a237e',
  },
  sidebarSignInButton: {
    marginTop: 'auto',
    backgroundColor: '#007BFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  sidebarSignInButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 10,
    padding: 4,
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a237e',
  },
});
