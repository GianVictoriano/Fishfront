import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ImageBackground, Modal, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Navbar from '../components/Navbar';
import { useBranding } from '../context/BrandingContext';

export default function HomeScreen() {
  const [navVisible, setNavVisible] = useState(false);
  const router = useRouter();
  const { backgroundUrl } = useBranding();

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        router.replace('/');
      }
    };
    checkAuth();
  }, []);

  const handleLinkPress = () => {
    if (Platform.OS !== 'web') {
      setNavVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'web' ? (
        <Navbar />
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
                <Navbar onLinkPress={handleLinkPress} />
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}
      <ImageBackground
        source={backgroundUrl}
        style={styles.hero}
        resizeMode="cover"
      >
        {/* No content inside the hero for a clean background view */}
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  hero: {
    flex: 1, // Make the background take up the remaining space
  },
  menuButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  menuButtonText: {
    fontSize: 28,
    color: '#007BFF',
  },
nav: {
    ...Platform.select({
      web: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 15,
        backgroundColor: '#f8f8f8',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
      },
      native: {
        flexDirection: 'column',
        alignItems: 'stretch',
        paddingTop: 30,
      },
    }),
  },
  navLink: {
    fontWeight: 'bold',
    color: '#007BFF',
    ...Platform.select({
      web: {
        fontSize: 16,
      },
      native: {
        fontSize: 20,
        paddingVertical: 15,
        textAlign: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
      },
    }),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '75%',
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
