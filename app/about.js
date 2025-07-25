import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, SafeAreaView, Platform, TouchableOpacity, Modal, ImageBackground } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Navbar from '../components/Navbar';
import { useBranding } from '../context/BrandingContext';

const Section = ({ title, underlineWidth, children }) => (
  <View style={styles.section}>
    <View style={styles.headingContainer}>
      <Text style={styles.heading}>{title}</Text>
      <View 
        style={[styles.headingUnderline, { width: underlineWidth }]} 
      />
    </View>
    {children}
  </View>
);

const CoreValue = ({ text }) => (
  <View style={styles.valueItem}>
    <Text style={styles.valueText}>• {text}</Text>
  </View>
);

export default function AboutScreen() {
  const [navVisible, setNavVisible] = useState(false);
  const { logoUrl } = useBranding();

  const coreValues1 = [
    { id: '1', text: 'Patriotism' },
    { id: '2', text: 'Service' },
    { id: '3', text: 'Integrity' },
  ];

  const coreValues2 = [
    { id: '4', text: 'Resilience' },
    { id: '5', text: 'Excellence' },
    { id: '6', text: 'Faith' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {Platform.OS === 'web' ? (
        <Navbar />
      ) : (
        <>
          <TouchableOpacity style={styles.menuButton} onPress={() => setNavVisible(true)}>
            <Feather name="menu" size={28} color="#fff" />
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
      <View style={styles.container}>
  <ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>About the Fisherman Community</Text>
    <Section title="VISION" underlineWidth="190%">
      <Text style={styles.paragraph}>
        A Premier National University that develops leaders in the global knowledge economy
      </Text>
    </Section>
    <Section title="MISSION" underlineWidth="150%">
      <Text style={styles.paragraph}>
        A University committed to producing leaders by providing a 21st century learning environment through innovations in education, multidisciplinary research, and community and industry partnerships in order to nurture the spirit of nationhood, propel the national economy, and engage the world for sustainable development.
      </Text>
    </Section>
    <Section title="CORE VALUES" underlineWidth="100%">
      <View style={styles.valuesGrid}>
        <View style={styles.valuesColumn}>
          {coreValues1.map(value => (
            <CoreValue key={value.id} text={value.text} />
          ))}
        </View>
        <View style={styles.valuesColumn}>
          {coreValues2.map(value => (
            <CoreValue key={value.id} text={value.text} />
          ))}
        </View>
      </View>
    </Section>
  </ScrollView>
</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
    textAlign: 'center',
    marginBottom: 18,
    marginTop: 10,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#fff', // Plain white background
  },
  container: {
    flex: 1,
    backgroundColor: '#fff', // Plain white background
  },
  // overlay removed for white background
  content: {
    paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
    paddingVertical: Platform.OS === 'web' ? 32 : 24,
    flexGrow: 1,
    maxWidth: 896,
    marginLeft: 'auto',
    marginRight: 'auto',
    backgroundColor: '#f4f6f8', // Soft bg
  },
  section: {
    marginBottom: 0,
  },
  headingContainer: {
    position: 'relative',
    alignSelf: 'flex-start', // Makes the container wrap the content
    marginBottom: 12, // Corresponds to mb-3
  },
  heading: {
    fontSize: 20, // Matches Fisherman title in navbar
    fontWeight: 'bold',
    color: '#222', // Dark text for white bg
    position: 'relative',
    zIndex: 10,
  },
  headingUnderline: {
    position: 'absolute',
    bottom: 8, // Reduce for smaller heading
    left: -8, // Corresponds to -ml-2
    height: 16, // Smaller underline for smaller heading
    backgroundColor: '#cbd5e1', // Lighter underline for white bg
    zIndex: 5,
  },
  paragraph: {
    fontSize: 13, // Smaller body text
    lineHeight: 20, // Adjust for smaller font
    color: '#333', // Darker text for white bg
  },
  valuesGrid: {
    flexDirection: 'row',
    paddingLeft: 16, // Corresponds to pl-4
  },
  valuesColumn: {
    flex: 1,
  },
  valueItem: {
    marginBottom: 4, // Corresponds to space-y-1
  },
  valueText: {
    fontSize: 13, // Smaller value text
    lineHeight: 20, // Adjust for smaller font
    color: '#444', // Darker text for white bg
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  menuButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 100,
    padding: 10,
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
