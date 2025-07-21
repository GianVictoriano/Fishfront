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
      <ImageBackground 
        source={logoUrl} 
        style={styles.container} 
        resizeMode="cover"
        blurRadius={5}
      >
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.content}>
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
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#080C1D', // Dark navy background
  },
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 12, 29, 0.6)', // Semi-transparent overlay
  },
  content: {
    paddingHorizontal: Platform.OS === 'web' ? 64 : 32,
    paddingVertical: Platform.OS === 'web' ? 64 : 80,
    flexGrow: 1,
    maxWidth: 896, // Corresponds to max-w-2xl, but in a wider container
    marginLeft: 32, // Corresponds to ml-8
  },
  section: {
    marginBottom: 40, // Corresponds to mb-10
  },
  headingContainer: {
    position: 'relative',
    alignSelf: 'flex-start', // Makes the container wrap the content
    marginBottom: 12, // Corresponds to mb-3
  },
  heading: {
    fontSize: 30, // Corresponds to text-3xl
    fontWeight: 'bold',
    color: '#FFFFFF',
    position: 'relative',
    zIndex: 10,
  },
  headingUnderline: {
    position: 'absolute',
    bottom: 14, // Corresponds to bottom-3.5
    left: -8, // Corresponds to -ml-2
    height: 40, // Corresponds to h-10
    backgroundColor: '#164e63', // Tailwind's cyan-900
    zIndex: 5,
  },
  paragraph: {
    fontSize: 20, // Corresponds to text-xl
    lineHeight: 32, // Corresponds to leading-relaxed
    color: '#E5E7EB',
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
    fontSize: 18, // Corresponds to text-lg
    lineHeight: 28, // Corresponds to leading-relaxed
    color: '#D1D5DB',
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
