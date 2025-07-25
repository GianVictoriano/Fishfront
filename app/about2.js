import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, SafeAreaView, Platform, TouchableOpacity, Modal } from 'react-native';
import GuestNavbar from '../components/GuestNavbar';

const Section = ({ title, underlineWidth, children }) => (
  <View style={styles.section}>
    <View style={styles.headingContainer}>
      <Text style={styles.heading}>{title}</Text>
      <View style={[styles.headingUnderline, { width: underlineWidth }]} />
    </View>
    {children}
  </View>
);

const CoreValue = ({ text }) => (
  <View style={styles.valueItem}>
    <Text style={styles.valueText}>• {text}</Text>
  </View>
);

export default function AboutScreen2() {
  const [navVisible, setNavVisible] = useState(false);

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
        <GuestNavbar />
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
                <GuestNavbar onLinkPress={() => setNavVisible(false)} />
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
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
    paddingVertical: Platform.OS === 'web' ? 32 : 24,
    flexGrow: 1,
    maxWidth: 896,
    marginLeft: 'auto',
    marginRight: 'auto',
    backgroundColor: '#f4f6f8',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
    textAlign: 'center',
    marginBottom: 18,
    marginTop: 10,
  },
  section: {
    marginBottom: 0,
  },
  headingContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    position: 'relative',
    zIndex: 10,
  },
  headingUnderline: {
    position: 'absolute',
    bottom: 8,
    left: -8,
    height: 16,
    backgroundColor: '#cbd5e1',
    zIndex: 5,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
    color: '#333',
  },
  valuesGrid: {
    flexDirection: 'row',
    paddingLeft: 16,
  },
  valuesColumn: {
    flex: 1,
  },
  valueItem: {
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  valueTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
    width: 90,
  },
  valueText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#444',
  },
  menuButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 100,
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
