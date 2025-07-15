import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Navbar from '../components/Navbar';
import { useEffect, useState } from 'react';
import { ImageBackground, Modal, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';



export default function HomeScreen() {
  const [navVisible, setNavVisible] = useState(false);
  const router = useRouter();

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
        source={{ uri: 'https://images.unsplash.com/photo-1541580623-c11019a495d2?q=80&w=2070' }}
        style={styles.hero}
        resizeMode="cover"
      >
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>Welcome to Fisherman Publications</Text>
          <Text style={styles.heroText}>
            Your one-stop destination for the latest in fishing news, community forums, and expert articles. Dive in and explore the world of angling with us.
          </Text>
        </View>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
    width: '100%',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 26,
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
