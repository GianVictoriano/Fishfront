// app/screens/home/index.native.js
import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  Modal, 
  SafeAreaView, 
  ImageBackground 
} from 'react-native';
import { useBranding } from '../../../../context/BrandingContext';
import HeroCarousel from '../../../components/HeroCarousel';
import AppNavbar from '../../../../components/AppNavbar';
import SvgWave from '../../../components/SvgWave';
import { useRouter } from 'expo-router';

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
  const router = useRouter();

  const handleLinkPress = () => {
    setNavVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Mobile Menu Button */}
      <TouchableOpacity 
        style={styles.menuButton} 
        onPress={() => setNavVisible(true)}
      >
        <Text style={styles.menuButtonText}>☰</Text>
      </TouchableOpacity>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={navVisible}
        onRequestClose={() => setNavVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPressOut={() => setNavVisible(false)}
        >
          <View style={styles.modalView}>
            <AppNavbar onLinkPress={handleLinkPress} />
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView>
        {/* Hero Section */}
        <View style={{ height: 570, width: '100%', position: 'relative' }}>
          <ImageBackground
            source={{ uri: backgroundUrl || "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?q=80&w=2070" }}
            style={[styles.hero, { height: '100%' }]}
            resizeMode="cover"
          >
            <View style={styles.heroOverlay}>
              <View style={[styles.heroContentRow, { flexDirection: 'column' }]}>
                <View style={[styles.heroLeft, { alignItems: 'center', paddingRight: 0 }]}>
                  <Text style={[styles.heroTitle, { textAlign: 'center', marginLeft: 0 }]}>
                    Building a Sustainable Community
                  </Text>
                  <Text style={[styles.heroSummary, { textAlign: 'center', marginLeft: 0 }]}>
                    Discover how our latest publication is helping organizations grow better and empower communities.
                  </Text>
                  <TouchableOpacity 
                    style={styles.promoButton}
                    onPress={() => router.push('/publications/featured')}
                  >
                    <Text style={styles.promoButtonText}>Read Featured</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.heroRight, { 
                  flexDirection: 'row', 
                  justifyContent: 'center',
                  marginTop: 20,
                  marginRight: 0
                }]}> 
                  <HeroCarousel />
                </View>
              </View>
            </View>
          </ImageBackground>
          <View style={{ position: 'absolute', bottom: -20, left: 0, right: 0, height: 120 }}>
            <SvgWave color={'#f3f6fa'} height={120} />
          </View>
        </View>

        {/* Publications Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Published Articles</Text>
          <View style={styles.publicationGrid}>
            {publications.recent.slice(0, 4).map((article) => (
              <View key={article.id} style={styles.publicationItem}>
                <Image 
                  source={{ uri: article.image }} 
                  style={styles.publicationImage} 
                />
                <Text style={styles.publicationTitle}>{article.title}</Text>
                <Text style={styles.publicationSummary}>{article.summary}</Text>
                <TouchableOpacity 
                  style={styles.readButton}
                  onPress={() => router.push(`/publications/${article.id}`)}
                >
                  <Text style={styles.readButtonText}>Read More</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Recruitment Section */}
        <View style={[styles.section, styles.recruitmentSection]}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=compress&w=400' }}
            style={styles.recruitmentImage}
          />
          <Text style={styles.sectionTitle}>Join Our Team!</Text>
          <Text style={styles.aboutText}>
            We're looking for passionate writers, editors, and researchers to join our publication team.
          </Text>
          <TouchableOpacity 
            style={styles.readButton}
            onPress={() => router.push('/careers')}
          >
            <Text style={styles.readButtonText}>View Openings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f6fa',
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
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
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
    backgroundColor: 'rgba(20,28,38,0.68)',
    paddingHorizontal: 28,
    paddingVertical: 36,
  },
  heroContentRow: {
    flexDirection: 'column',
    width: '100%',
    gap: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLeft: {
    paddingRight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 340,
  },
  heroRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    minWidth: 250,
    marginTop: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroSummary: {
    fontSize: 16,
    color: '#f3f6fa',
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  promoButton: {
    backgroundColor: '#bfc8d9',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 12,
  },
  promoButtonText: {
    color: '#3b4465',
    fontWeight: 'bold',
    fontSize: 16,
  },
  section: {
    marginVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 24,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 22,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#3b4465',
    marginBottom: 20,
  },
  publicationGrid: {
    flexDirection: 'column',
    gap: 20,
  },
  publicationItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  publicationImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
  },
  publicationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b4465',
    marginBottom: 8,
  },
  publicationSummary: {
    fontSize: 14,
    color: '#6b7ca2',
    marginBottom: 16,
    lineHeight: 20,
  },
  readButton: {
    backgroundColor: '#e6eef7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  readButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  recruitmentSection: {
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    paddingVertical: 32,
  },
  recruitmentImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  aboutText: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
});

export default HomeScreen;