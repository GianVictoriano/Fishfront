import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ImageBackground, Modal, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GuestNavbar from '../components/GuestNavbar';
import { useBranding } from '../context/BrandingContext';

export default function GuestHomeScreen() {
  const [navVisible, setNavVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const router = useRouter();
  const { backgroundUrl } = useBranding();

  const handleLinkPress = () => {
    if (Platform.OS !== 'web') {
      setNavVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* On web, the navbar is always visible. On mobile, it's in a modal. */}
      {Platform.OS === 'web' ? (
        <GuestNavbar />
      ) : (
        <>
          <TouchableOpacity style={styles.menuButton} onPress={() => setNavVisible(true)}>
            <Text style={styles.menuButtonText}>☰</Text>
          </TouchableOpacity>
          <Modal
            animationType="slide"
            transparent={true}
            visible={navVisible}
            onRequestClose={() => setNavVisible(false)}
          >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setNavVisible(false)}>
              <View style={styles.modalView}>
                <GuestNavbar onLinkPress={handleLinkPress} />
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}
      {/* The main content with the background image */}
      <ImageBackground
        source={backgroundUrl}
        style={styles.hero}
        resizeMode="cover"
      >
        <View style={styles.heroContent}>
          <TouchableOpacity
            style={[
              styles.heroButton,
              Platform.OS === 'web' && hover ? styles.heroButtonHover : null
            ]}
            onPress={() => router.push('/signin')}
            activeOpacity={0.85}
            {...(Platform.OS === 'web' ? {
              onMouseEnter: () => setHover(true),
              onMouseLeave: () => setHover(false)
            } : {})}
          >
            <Text style={[styles.heroButtonText, Platform.OS === 'web' && hover ? styles.heroButtonTextHover : null]}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff', // A fallback background color
  },
  hero: {
    flex: 1, // Make the background take up the remaining space
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dark overlay for text readability
    padding: 24,
    width: '100%',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 2,
  },
  heroText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
  },
  heroButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginBottom: -250,
    ...Platform.select({
      web: {
        transition: 'background 0.2s, color 0.2s, border 0.2s',
        cursor: 'pointer',
        border: '2px solid transparent',
      },
    }),
  },
  heroButtonHover: Platform.OS === 'web' ? {
    backgroundColor: '#fff',
    color: '#000',
    border: '2px solid #000',
  } : {},
  heroButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    ...Platform.select({
      web: {
        transition: 'color 0.2s',
      },
    }),
  },
  heroButtonTextHover: Platform.OS === 'web' ? {
    color: '#000',
    fontWeight: 'bold',
  } : {},

  // Mobile navigation styles
  menuButton: {
    position: 'absolute',
    top: 10, // Adjust if it overlaps with status bar
    left: 10,
    zIndex: 10, // Ensure it's above other content
    padding: 10,
  },
  menuButtonText: {
    fontSize: 28,
    color: '#000', // Black for visibility on a white background
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '80%',
    height: '100%',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
