import { useRouter, usePathname } from 'expo-router';
import { useBranding } from '../context/BrandingContext';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';

import { Feather } from '@expo/vector-icons';

export default function GuestNavbar({ onLinkPress = () => {}, onClose }) {
  const { logoUrl } = useBranding();
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
        <Image source={logoUrl} style={styles.avatar} />
        <Text style={styles.brand}>Fisherman</Text>
      </View>
      {!isWeb && <View style={styles.sidebarDivider} />}
      <View style={isWeb ? styles.navLinks : styles.sidebarLinks}>
        <TouchableOpacity style={[styles.sidebarLinkRow, pathname === '/home2' && styles.activeSidebarLinkRow]} onPress={() => { router.push('/home2'); onLinkPress(); }}>
          <Text style={linkStyle('/home2')}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sidebarLinkRow, pathname === '/news2' && styles.activeSidebarLinkRow]} onPress={() => { router.push('/news2'); onLinkPress(); }}>
          <Text style={linkStyle('/news2')}>News</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sidebarLinkRow, pathname === '/about2' && styles.activeSidebarLinkRow]} onPress={() => { router.push('/about2'); onLinkPress(); }}>
          <Text style={linkStyle('/about2')}>About Us</Text>
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
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Platform.OS === 'web' ? 0 : 24,
  },
  avatar: {
    ...Platform.select({
      web: {
        width: 36,
        height: 36,
      },
      default: {
        width: 56,
        height: 56,
      },
    }),
    borderRadius: 28,
    marginRight: 6,
    borderWidth: 2,
    borderColor: '#1a237e',
    backgroundColor: '#fff',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      },
      native: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        elevation: 2,
      },
    }),
  },
  brand: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 150,
  },
  navLink: {
    fontWeight: '600',
    color: '#333',
    fontSize: 16,
    paddingVertical: 8,
  },
  sidebarLink: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  navLinkActive: {
    color: '#007BFF',
    borderBottomWidth: 2,
    borderBottomColor: '#007BFF',
  },
  navLinkRow: {
    paddingVertical: 8,
  },
  signInButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#007BFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  signInButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sidebarSignInButtonText: {
    color: '#1a237e',
    fontWeight: 'bold',
    fontSize: 20,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 10,
    padding: 4,
  },
});
