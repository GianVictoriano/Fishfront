import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Dimensions, Modal, SafeAreaView, ImageBackground, Platform } from 'react-native';
import { useBranding } from '../context/BrandingContext';
import HeroCarousel from './components/HeroCarousel';
import Navbar from '../components/Navbar';
import SvgWave from './components/SvgWave';


const { width } = Dimensions.get('window');

const publications = {
  featured: {
    title: 'Building a Sustainable Community: The Fisherman Approach',
    image: 'https://via.placeholder.com/350x200?text=Featured+Publication',
    summary: 'Discover how our latest publication is helping organizations grow better, empower communities, and foster resilience through real-world stories and data-driven insights.',
    link: '#',
  },
  recent: [
    {
      id: 1,
      title: 'The Future of Coastal Fisheries',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=compress&w=600',
      summary: 'Insights into sustainable fishing practices and their global impact.',
      link: '#',
    },
    {
      id: 2,
      title: 'Community-Driven Marine Conservation',
      image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=compress&w=600',
      summary: 'How local communities are leading the way in marine protection.',
      link: '#',
    },
    {
      id: 3,
      title: 'Innovations in Aquaculture',
      image: 'https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&w=600',
      summary: 'Technological advances that are shaping the future of aquaculture.',
      link: '#',
    },
    {
      id: 4,
      title: 'Women in Fisheries',
      image: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?q=80&w=600',
      summary: 'Celebrating the vital role of women in the fishing industry.',
      link: '#',
    },
    {
      id: 5,
      title: 'Sustainable Seafood Trends',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=compress&w=600',
      summary: 'Exploring the latest trends in sustainable seafood and responsible sourcing.',
      link: '#',
    },
    {
      id: 6,
      title: 'Fisheries and Climate Change',
      image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=compress&w=600',
      summary: 'How climate change is impacting global fisheries and what can be done.',
      link: '#',
    },
    {
      id: 7,
      title: 'Youth in Marine Science',
      image: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&w=600',
      summary: 'The growing role of young scientists in marine research and innovation.',
      link: '#',
    },
    {
      id: 8,
      title: 'Traditional Fishing Practices',
      image: 'https://images.pexels.com/photos/356286/pexels-photo-356286.jpeg?auto=compress&w=600',
      summary: 'A look at time-honored fishing methods and their relevance today.',
      link: '#',
    },
  ],
};

const HomeScreen = () => {
  const [navVisible, setNavVisible] = useState(false);
  const { backgroundUrl } = useBranding();
  const [carouselIndex, setCarouselIndex] = useState(0);

  const renderCarouselItem = ({ item }) => (
    <Image
      source={{ uri: item.image }}
      style={styles.heroCarouselImg}
      resizeMode="cover"
    />
  );

  const handleLinkPress = () => {
    if (Platform.OS !== 'web') setNavVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
  {/* Navbar for web or hamburger for mobile */}
  {Platform.OS === 'web' ? (
    <Navbar onLinkPress={handleLinkPress} />
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

  <ScrollView>
    {/* Hero section INSIDE the ScrollView */}
    <View style={{ height: 570, width: '100%', position: 'relative' }}>
      <ImageBackground
        source={{ uri: backgroundUrl || "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?q=80&w=2070" }}
        style={[styles.hero, { height: '100%' }]}
        resizeMode="cover"
      >
        <View style={styles.heroOverlay}>
          <View style={styles.heroContentRow}>
            {/* Left: Text */}
            <View style={styles.heroLeft}>
              <Text style={styles.heroTitle}>Building a Sustainable Community: The Fisherman Approach</Text>
              <Text style={styles.heroSummary}>Discover how our latest publication is helping organizations grow better, empower communities, and foster resilience through real-world stories and data-driven insights.</Text>
              <TouchableOpacity style={styles.promoButton}>
                <Text style={styles.promoButtonText}>Read Featured</Text>
              </TouchableOpacity>
            </View>
            {/* Right: Recent Article Images */}
            <View style={[styles.heroRight, { paddingRight: 40, height: 200 }]}> 
              <HeroCarousel />
            </View>
          </View>
        </View>
      </ImageBackground>

      {/* SVG Overlay for the curve */}
      <View style={{ position: 'absolute', bottom: -20, left: 0, right: 0, height: 120 }}>
        <SvgWave color={'#f3f6fa'} height={120} />
      </View>
    </View>

    {/* Gap below hero */}
    <View style={{ height: 32 }} />

    {/* Recently Published Articles Section */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recently Published Articles</Text>
      <View style={styles.publicationGrid}>
        {/* First row */}
        <View style={{ flexDirection: 'row', flexWrap: 'nowrap', width: '100%', justifyContent: 'space-between' }}>
          {publications.recent.slice(0, 4).map((article) => (
            <View key={article.id} style={styles.publicationItem}>
              <Image source={{ uri: article.image }} style={styles.publicationImage} />
              <Text style={styles.publicationTitle}>{article.title}</Text>
              <Text style={styles.publicationSummary}>{article.summary}</Text>
              <TouchableOpacity style={styles.readButton}>
                <Text style={styles.readButtonText}>Read More</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        {/* Second row */}
        <View style={{ flexDirection: 'row', flexWrap: 'nowrap', width: '100%', justifyContent: 'space-between' }}>
          {publications.recent.slice(4, 8).map((article) => (
            <View key={article.id} style={styles.publicationItem}>
              <Image source={{ uri: article.image }} style={styles.publicationImage} />
              <Text style={styles.publicationTitle}>{article.title}</Text>
              <Text style={styles.publicationSummary}>{article.summary}</Text>
              <TouchableOpacity style={styles.readButton}>
                <Text style={styles.readButtonText}>Read More</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </View>

    {/* Recruitment Section */}
    <View style={[styles.section, { minHeight: 260, paddingVertical: 32, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e6f0fa', borderRadius: 18, shadowColor: '#bfc8d9', shadowOpacity: 0.10, shadowRadius: 10 }]}> 
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=compress&w=400' }}
        style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 16, alignSelf: 'center' }}
        resizeMode="cover"
      />
      <Text style={styles.sectionTitle}>Join Our Publications!</Text>
      <Text style={styles.aboutText}>
        We're looking for passionate writers, editors, and researchers to join our publication team. Help us share impactful stories, research, and news with the community.
      </Text>
      <Text style={styles.sectionSubtitle}>
        Interested? Apply now and become a part of our mission!
      </Text>
      <TouchableOpacity style={styles.readButton}>
        <Text style={styles.readButtonText}>Apply Now</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
</SafeAreaView>

  );
};

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    height: 520,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  heroOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(20,28,38,0.68)', // darker overlay for strong contrast
    paddingHorizontal: 28,
    paddingVertical: 36,
  },
  heroContentRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    width: '100%',
    // height: '100%', // Removed percent-based height for accessibility
    gap: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLeft: {
    flex: 1.5,
    paddingRight: Platform.OS === 'web' ? 24 : 0,
    alignItems: Platform.OS === 'web' ? 'flex-start' : 'center',
    justifyContent: 'center',
    minWidth: 340,
  },
  heroRight: {
    flex: 0.7,
    flexDirection: Platform.OS === 'web' ? 'row' : 'row',
    alignItems: 'center',
    justifyContent: Platform.OS === 'web' ? 'center' : 'center',
    gap: 16,
    flexWrap: 'wrap',
    minWidth: 250,
    marginTop: -150,
    marginRight: 0,
  },
  heroArticleImg: {
    width: 110,
    height: 190,
    borderRadius: 16,
    marginHorizontal: 8,
    marginVertical: 6,
    backgroundColor: '#e0e7ef',
    borderWidth: 1,
    borderColor: '#dbeafe',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  heroCarouselImg: {
    width: 170,
    height: 120,
    borderRadius: 18,
    backgroundColor: '#e0e7ef',
    borderWidth: 1,
    borderColor: '#dbeafe',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'left',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginLeft: 60,
  },
  heroSummary: {
    fontSize: 18,
    color: '#f3f6fa',
    textAlign: 'left',
    marginBottom: 22,
    lineHeight: 26,
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    marginLeft: 60,
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f6fa', // soft, light blue-gray
  },
  menuButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  menuButtonText: {
    fontSize: 28,
    color: '#374151',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '75%',
    height: '100%',
    backgroundColor: '#f3f6fa',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    backgroundColor: '#eaf1f1', // soft, pale blue
    padding: 28,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5eaf2',
  },
  headerText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#3b4465', // soft navy text
    marginTop: 10,
    marginBottom: 8,
    textAlign: 'center',
  },
  featuredSummary: {
    fontSize: 16,
    color: '#3b4465', // soft navy
    marginBottom: 12,
  },
  promoButton: {
    backgroundColor: '#bfc8d9', // soft blue-gray
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 12,
    alignSelf: 'left',
    marginLeft: 60,
  },
  promoButtonText: {
    color: '#3b4465',
    fontWeight: 'bold',
    fontSize: 16,
  },
  section: {
    marginVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#f3f6fa',
    borderRadius: 18,
    paddingVertical: 18,
    shadowColor: '#bfc8d9',
    shadowOpacity: 0.09,
    shadowRadius: 10,
    marginHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 22,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#3b4465', // soft navy
    marginBottom: 8,

  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#6b7ca2', // gentle blue-gray
    marginBottom: 12,
  },
  publicationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  publicationItem: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    margin: 10,
    alignItems: 'center',
    shadowColor: '#bfc8d9',
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  publicationImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
    marginBottom: 10,
  },
  publicationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b4465', // soft navy
    marginBottom: 4,
  },
  publicationSummary: {
    fontSize: 14,
    color: '#6b7ca2', // gentle blue-gray
    marginBottom: 8,
  },
  readButton: {
    backgroundColor: '#bfc8d9', // soft blue-gray
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
    minWidth: 110,
    alignSelf: 'center',
    marginTop: 10,
  },
  readButtonText: {
    color: '#3b4465',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
  aboutText: {
    fontSize: 16,
    color: '#6b7ca2', // gentle blue-gray
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#eaf1f1', // soft pale blue
    borderTopWidth: 1,
    borderTopColor: '#e5eaf2',
  },
  footerLogo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
    tintColor: '#3b4465', // soft navy logo
  },
  heroCurve: {
    width: '100%',
    height: 60,
    backgroundColor: '#bcd2e8', // match the next section or background
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    marginTop: -20,
    marginBottom: -10,
    zIndex: 1,
  },
});

export default HomeScreen;
