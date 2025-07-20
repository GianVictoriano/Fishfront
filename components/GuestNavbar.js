import { useRouter, usePathname } from 'expo-router';
import { useBranding } from '../context/BrandingContext';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';

export default function GuestNavbar({ onLinkPress = () => {} }) {
  const { logoUrl } = useBranding();
  const router = useRouter();
  const pathname = usePathname();

  const linkStyle = (path) => [
    styles.navLink,
    pathname === path && styles.navLinkActive,
  ];

  return (
    <View style={styles.navbar}>
      <View style={styles.brandContainer}>
        {/* For the web version, ensure 'fish.jpg' is in a 'public' folder at your project root, e.g., 'public/assets/images/fish.jpg' */}
        <Image source={logoUrl} style={styles.avatar} />
        <Text style={styles.brand}>Fisherman</Text>
      </View>
      <View style={styles.navLinks}>
        <TouchableOpacity onPress={() => { router.push('/home2'); onLinkPress(); }}>
          <Text style={linkStyle('/home2')}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { router.push('/news2'); onLinkPress(); }}>
          <Text style={linkStyle('/news2')}>News</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { router.push('/about2'); onLinkPress(); }}>
          <Text style={linkStyle('/about2')}>About Us</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.signInButton} onPress={() => router.push('/signin')}>
        <Text style={styles.signInButtonText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  navLinkActive: {
    color: '#007BFF',
    borderBottomWidth: 2,
    borderBottomColor: '#007BFF',
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
});
