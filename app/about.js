import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, SafeAreaView, Platform, TouchableOpacity, Modal, ImageBackground, Image } from 'react-native';
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
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Top Section: About Us */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>About Us</Text>
            <Text style={styles.heroDesc}>
              The Fisherman company and community are a lot like our product. We're crafted, not cobbled, for a delightful experience.
            </Text>
          </View>

          {/* Section 1 */}
          <View style={styles.rowSection}>
            <View style={styles.imageCol}>
              <Image source={{ uri: 'https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=600' }} style={styles.sectionImage} />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.missionTitle}>Our Mission: Helping Millions of Organizations Grow Better</Text>
              <Text style={styles.missionText}>
                We believe not just in growing bigger, but in growing better. And growing better means aligning the success of your own business with the success of your customers. Win-win!
              </Text>
            </View>
          </View>

          {/* Section 2 */}
          <View style={styles.rowSection}>
            <View style={styles.textCol}>
              <Text style={styles.missionTitle}>Our Vision: Empowering Communities</Text>
              <Text style={styles.missionText}>
                Our vision is to empower communities through innovation, collaboration, and sustainable growth. We strive for a future where everyone can thrive.
              </Text>
            </View>
            <View style={styles.imageCol}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?q=80&w=2070' }} style={styles.sectionImage} />
            </View>
          </View>

          {/* Section 3 */}
          <View style={styles.rowSection}>
            <View style={styles.imageCol}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?q=80&w=2070' }} style={styles.sectionImage} />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.missionTitle}>Our Values: Integrity & Excellence</Text>
              <Text style={styles.missionText}>
                We are committed to integrity, service, and excellence in all that we do, building a culture of trust and achievement for everyone involved.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    backgroundColor: '#f6f9fb',
    paddingVertical: 38,
    paddingHorizontal: 26,
    borderRadius: 16,
    marginBottom: 32,
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#22344c',
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 17,
    color: '#22344c',
    maxWidth: 600,
    lineHeight: 26,
    opacity: 0.9,
  },
  rowSection: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  imageCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 220,
  },
  sectionImage: {
    width: 260,
    height: 170,
    borderRadius: 12,
    backgroundColor: '#e0e7ef',
    marginBottom: 0,
    marginTop: 0,
  },
  imagePlaceholder: {
    width: 260,
    height: 170,
    borderRadius: 12,
    backgroundColor: '#e0e7ef',
    marginBottom: 0,
    marginTop: 0,
  },
  textCol: {
    flex: 2,
    paddingLeft: Platform.OS === 'web' ? 32 : 0,
    paddingTop: Platform.OS !== 'web' ? 24 : 0,
    alignItems: Platform.OS === 'web' ? 'flex-start' : 'center',
    justifyContent: 'center',
  },
  missionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#22344c',
    marginBottom: 12,
    lineHeight: 34,
  },
  missionText: {
    fontSize: 16,
    color: '#22344c',
    opacity: 0.9,
    maxWidth: 480,
    lineHeight: 25,
  },
  card: {
    backgroundColor: '#f8faff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e7ef',
    padding: 20,
    marginVertical: 12,
    shadowColor: '#007BFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007BFF',
    marginLeft: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionIcon: {
    marginRight: 5,
  },
  sectionText: {
    fontSize: 15,
    color: '#222',
    marginBottom: 2,
    marginTop: 2,
    lineHeight: 22,
  },
  coreValuesCard: {
    backgroundColor: '#f0f7ff',
    borderColor: '#b6d4fe',
  },
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
