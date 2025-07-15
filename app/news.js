import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Text, View, StyleSheet, SafeAreaView, Platform, TouchableOpacity, Modal } from 'react-native';
import Navbar from '../components/Navbar';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 10 : 40,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  menuButtonText: {
    fontSize: 28,
    color: '#0d47a1',
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
});

export default function NewsScreen() {
  const [navVisible, setNavVisible] = useState(false);

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

      <View style={styles.content}>
        <Text style={{ fontSize: 24, marginBottom: 20 }}>News Page</Text>
        <Link href="/home" style={{ color: 'blue' }}>Go to Home</Link>
      </View>
    </SafeAreaView>
  );
}
