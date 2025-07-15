import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Button, Image, Modal, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import Navbar from '~/components/Navbar';
import { useAuth } from '~/context/AuthContext';

export default function ProfileScreen() {
  const [navVisible, setNavVisible] = useState(false);
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    // The redirection logic is now handled globally in _layout.js
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text>Could not load profile. Please try logging in again.</Text>
        <Button title="Go to Login" onPress={() => router.replace('/')} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Persistent Navbar */}
      {Platform.OS === 'web' ? (
        <Navbar />
      ) : (
        <>
          <TouchableOpacity style={styles.menuButton} onPress={() => setNavVisible(true)}>
            <Text style={styles.menuButtonText}>☰</Text>
          </TouchableOpacity>
          <Modal
            animationType="slide"
            transparent
            visible={navVisible}
            onRequestClose={() => setNavVisible(false)}
          >
            <TouchableOpacity style={styles.modalOverlayNav} activeOpacity={1} onPressOut={() => setNavVisible(false)}>
              <View style={styles.modalViewNav}>
                <Navbar onLinkPress={() => setNavVisible(false)} />
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}

      <ScrollView contentContainerStyle={styles.profileContainer} showsVerticalScrollIndicator={false}>
        {user.profile?.avatar && (
          <Image source={{ uri: user.profile.avatar }} style={styles.avatar} />
        )}
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Program:</Text>
          <Text style={styles.infoValue}>{user.profile?.program || 'Not set'}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Section:</Text>
          <Text style={styles.infoValue}>{user.profile?.section || 'Not set'}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Description:</Text>
          <Text style={styles.infoValue}>{user.profile?.description || 'Not set'}</Text>
        </View>

        <Link href="/edit-profile" asChild>
          <Button title="Edit Profile" />
        </Link>

        <View style={styles.logoutButtonContainer}>
          <Button title="Logout" onPress={handleLogout} color="#dc3545" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    padding: 10
  },
  menuButtonText: {
    fontSize: 28,
    color: '#007BFF',
  },
  modalOverlayNav: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalViewNav: {
    width: '75%',
    height: '100%',
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileContainer: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#007BFF',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 30,
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 14,
    color: 'gray',
  },
  infoValue: {
    fontSize: 16,
    marginTop: 5,
  },
  logoutButtonContainer: {
    marginTop: 20,
    width: '100%',
  },
});
