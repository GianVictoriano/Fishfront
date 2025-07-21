import React from 'react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView, Platform, StyleSheet, Text, TouchableOpacity, View, ImageBackground, Modal } from 'react-native';
import GuestNavbar from '../components/GuestNavbar';
import { useBranding } from '../context/BrandingContext';

export default function GuestHomeScreen() {
  const [navVisible, setNavVisible] = useState(false);
  const [hover, setHover] = useState(false); // <-- add hover state
  const router = useRouter();
  const { backgroundUrl } = useBranding();

  // Redirect to /news on entry (web and native), defer until after first render
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/news2');
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

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
        {/* The overlay is removed to show the full image brightness */}
        <View style={styles.heroContent}>
          <TouchableOpacity
            style={[
              styles.heroButton,
              styles.getStartedButton,
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
  container: {
    flex: 1,
    backgroundColor: '#fff', // A fallback background color
  },
  hero: {
    flex: 1, // Make the background take up the remaining space
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center', // Center the button vertically
    alignItems: 'center',
    width: '100%',
    ...Platform.select({
      web: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      },
    }),
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
  },
  getStartedButton: { // This style is now merged into heroContent and heroButton
    // No longer a separate style, but its properties are in heroContent and heroButton
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
  getStartedButton: {
    alignSelf: 'center',
  },
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
  },
});