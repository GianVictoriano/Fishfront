import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Image, Modal, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import apiClient from '../utils/api';

const Navbar = ({ onLinkPress }) => (
  <View style={styles.nav}>
    <Link href="/home" style={styles.navLink} onPress={onLinkPress}>Home</Link>
    <Link href="/forum" style={styles.navLink} onPress={onLinkPress}>Forum</Link>
    <Link href="/news" style={styles.navLink} onPress={onLinkPress}>News</Link>
    <Link href="/about" style={styles.navLink} onPress={onLinkPress}>About Us</Link>
    <Link href="/profile" style={styles.navLink} onPress={onLinkPress}>Profile</Link>
  </View>
);

export default function HomeScreen() {
  const [user, setUser] = useState(null);
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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // apiClient already has the token from the interceptor
        const response = await apiClient.get('/profile');
        setUser(response.data.user);
      } catch (error) {
        console.error('Failed to fetch user:', error.response?.data || error.message);
        // If the token is invalid (e.g., expired), the interceptor might not handle it.
        // We should redirect to login.
        if (error.response?.status === 401) {
          await AsyncStorage.removeItem('auth_token');
          router.replace('/');
        }
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('auth_token');
    router.replace('/');
  };

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
      <View style={styles.content}>
        {user ? (
          <>
            {user.profile?.avatar && (
              <Image source={{ uri: user.profile.avatar }} style={styles.avatar} />
            )}
            <Text>Welcome, {user.name}</Text>
          </>
        ) : (
          <Text>Loading...</Text>
        )}
        <Button title="Logout" onPress={handleLogout} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#007BFF',
  },
});
