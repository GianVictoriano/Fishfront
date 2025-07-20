import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, SafeAreaView, Platform, TouchableOpacity, Modal } from 'react-native';
import GuestNavbar from '../components/GuestNavbar';

export default function AboutScreen2() {
  const [navVisible, setNavVisible] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
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
            onRequestClose={() => {
              setNavVisible(!navVisible);
            }}>
            <TouchableOpacity
              style={styles.modalOverlayNav}
              onPress={() => setNavVisible(false)}>
              <View style={styles.modalViewNav}>
                <GuestNavbar onLinkPress={() => setNavVisible(false)} />
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Our Community & Mission</Text>

        <View style={styles.card}>
          <Text style={styles.heading}>Our Vision</Text>
          <Text style={styles.paragraph}>
            To be a leading and proactive fishing community, fostering a sustainable and technologically advanced fishing industry in the region, recognized for its innovation, collaboration, and commitment to environmental stewardship.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Our Mission</Text>
          <Text style={styles.paragraph}>
            To empower our local fishermen by providing access to modern technology, real-time data, and a collaborative platform that enhances safety, increases efficiency, and ensures the long-term viability of our marine resources for future generations.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Our Core Values</Text>
          <View style={styles.valueItem}>
            <Text style={styles.valueTitle}>Community:</Text>
            <Text style={styles.valueText}>We foster a spirit of collaboration, mutual support, and shared knowledge among all members.</Text>
          </View>
          <View style={styles.valueItem}>
            <Text style={styles.valueTitle}>Innovation:</Text>
            <Text style={styles.valueText}>We embrace technology and new ideas to solve challenges and create opportunities.</Text>
          </View>
          <View style={styles.valueItem}>
            <Text style={styles.valueTitle}>Sustainability:</Text>
            <Text style={styles.valueText}>We are committed to responsible fishing practices that protect our marine ecosystem for the future.</Text>
          </View>
          <View style={styles.valueItem}>
            <Text style={styles.valueTitle}>Integrity:</Text>
            <Text style={styles.valueText}>We operate with honesty, transparency, and respect for our members and the environment.</Text>
          </View>
          <View style={styles.valueItem}>
            <Text style={styles.valueTitle}>Safety:</Text>
            <Text style={styles.valueText}>We prioritize the well-being and safety of our fishermen above all else.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 24,
    backgroundColor: '#f4f6f8',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a237e',
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: '#666',
  },
  valueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  valueTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
    width: 110, // Align titles
  },
  valueText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
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
