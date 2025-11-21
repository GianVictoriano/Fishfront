// app/screens/user/creative/creative.web.js
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image, ScrollView, Modal, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AppNavbar from '../../../../components/AppNavbar';
import NewsNavbar from '../../../../components/newsnavbar';
import apiClient from '../../../../utils/api';
import newsStore from '../../../../store/newsStore';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  creativePageScroll: {
    padding: 24,
    paddingTop: 36,
    alignItems: 'center',
    backgroundColor: '#f4f6f8',
  },
  mainContent: {
    width: '100%',
    maxWidth: 1300,
    alignSelf: 'center',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  galleryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 24,
    marginBottom: 40,
  },
  creativeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: 'pointer',
  },
  creativeCardHover: {
    transform: 'translateY(-8px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  },
  creativeImage: {
    width: '100%',
    height: 250,
    objectFit: 'cover',
  },
  creativeContent: {
    padding: 20,
  },
  creativeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  creativeExcerpt: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  creativeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creativeAuthor: {
    fontSize: 12,
    color: '#888',
  },
  creativeDate: {
    fontSize: 12,
    color: '#888',
  },
  emptyState: {
    textAlign: 'center',
    padding: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#bbb',
  },
  footer: {
    backgroundColor: '#3a505b',
    color: 'white',
    padding: '40px 20px 20px',
    marginTop: '40px',
    marginLeft: -24,
    marginRight: -24,
    marginBottom: -24,
    flexShrink: 0,
    width: 'calc(100% + 48px)',
    alignSelf: 'stretch',
  },
  footerContent: {
    marginLeft: '30px',
    maxWidth: '1200px',
    margin: '0 auto',
    flexWrap: 'wrap',
    gap: '40px',
    marginBottom: '0px',
  },
  footerSection: {
    flex: 1,
    minWidth: '250px',
  },
  footerHeading: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: '20px',
    color: 'white',
    paddingTop: '20px',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactIcon: {
    marginRight: 10,
    color: '#93c5fd',
  },
  contactText: {
    color: 'white',
    fontSize: 14,
  },
  footerLink: {
    color: 'white',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
    ':hover': {
      color: '#ffffff',
      textDecoration: 'underline',
    },
  },
  copyright: {
    textAlign: 'center',
    padding: '20px',
    borderTop: '1px solid #334155',
    color: '#94a3b8',
    fontSize: 14,
  },
  // Modal styles for full-screen artwork view
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '90%',
    maxWidth: 1200,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '75%',
    resizeMode: 'contain',
  },
  modalCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  modalExcerpt: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 22,
    marginBottom: 12,
  },
  modalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalAuthor: {
    fontSize: 14,
    color: '#aaa',
  },
  modalDate: {
    fontSize: 14,
    color: '#aaa',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

const CreativeCard = ({ item, onImageClick }) => {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  
  const defaultImage = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070';
  
  const getImageUrl = (url) => {
    if (!url) return defaultImage;
    if (url.startsWith('http')) return url;
    return `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}${url}`;
  };

  const [imageUri, setImageUri] = useState(getImageUrl(item.image));

  useEffect(() => {
    setImageUri(getImageUrl(item.image));
  }, [item.image]);

  const handleImageError = () => {
    setImageUri(defaultImage);
  };

  const handlePress = () => {
    if (onImageClick) {
      onImageClick(item);
    } else {
      router.push(`/news/article/${item.id}`);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.creativeCard, isHovered && styles.creativeCardHover]}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: imageUri }}
        style={styles.creativeImage}
        resizeMode="cover"
        onError={handleImageError}
        defaultSource={{ uri: defaultImage }}
      />
      <View style={styles.creativeContent}>
        <Text style={styles.creativeTitle} numberOfLines={2}>
          {item.title || 'Untitled'}
        </Text>
        <Text style={styles.creativeExcerpt} numberOfLines={3}>
          {item.excerpt || ''}
        </Text>
        <View style={styles.creativeMeta}>
          <Text style={styles.creativeAuthor}>
            By {item.author || 'Anonymous'}
          </Text>
          <Text style={styles.creativeDate}>
            {item.date || ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Dummy artworks for Creative section
const dummyArtworks = [
  {
    id: 'dummy-1',
    title: 'Abstract Waves',
    excerpt: 'A mesmerizing piece exploring the fluidity of colors and forms in modern abstract art.',
    image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800',
    author: 'Maria Santos',
    date: 'October 10, 2025',
  },
  {
    id: 'dummy-2',
    title: 'Urban Landscapes',
    excerpt: 'Capturing the essence of city life through vibrant photography and digital manipulation.',
    image: 'https://images.unsplash.com/photo-1549887534-1541e9326642?w=800',
    author: 'Juan dela Cruz',
    date: 'October 8, 2025',
  },
  {
    id: 'dummy-3',
    title: 'Nature\'s Symphony',
    excerpt: 'An exploration of natural patterns and textures found in the Philippine wilderness.',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800',
    author: 'Ana Reyes',
    date: 'October 5, 2025',
  },
  {
    id: 'dummy-4',
    title: 'Digital Dreams',
    excerpt: 'A collection of surreal digital artworks blending reality with imagination.',
    image: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800',
    author: 'Carlos Mendoza',
    date: 'October 3, 2025',
  },
  {
    id: 'dummy-5',
    title: 'Cultural Tapestry',
    excerpt: 'Traditional Filipino patterns reimagined through contemporary artistic techniques.',
    image: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800',
    author: 'Isabella Cruz',
    date: 'September 28, 2025',
  },
  {
    id: 'dummy-6',
    title: 'Minimalist Expressions',
    excerpt: 'Finding beauty in simplicity through clean lines and subtle color palettes.',
    image: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800',
    author: 'Miguel Torres',
    date: 'September 25, 2025',
  },
];

export default function CreativeScreen() {
  const [creativeWorks, setCreativeWorks] = useState(dummyArtworks);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const { setActiveGenre } = newsStore();

  // Set active genre to Creative when component mounts
  useEffect(() => {
    setActiveGenre('Creative');
  }, [setActiveGenre]);

  const defaultImage = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070';

  const handleImageClick = (artwork) => {
    setSelectedArtwork(artwork);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedArtwork(null);
  };

  const getImageUrl = (url) => {
    if (!url) return defaultImage;
    if (url.startsWith('http')) return url;
    return `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}${url}`;
  };

  useEffect(() => {
    const fetchCreativeContent = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/public/articles?genre=creative');
        
        if (Array.isArray(response.data?.data) && response.data.data.length > 0) {
          const mapped = response.data.data.map(article => ({
            id: article.id?.toString() || '',
            title: article.title,
            excerpt: article.content ? article.content.substring(0, 150) + '...' : '',
            image: article.media && article.media.length > 0 
              ? `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}/storage/${article.media[0].file_path.replace('public/', '')}`
              : null,
            author: article.user?.name || 'Anonymous',
            date: article.published_at 
              ? new Date(article.published_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })
              : '',
          }));
          // Combine real articles with dummy artworks
          setCreativeWorks([...mapped, ...dummyArtworks]);
        } else {
          // If no real articles, use dummy artworks
          setCreativeWorks(dummyArtworks);
        }
      } catch (error) {
        console.error('Error fetching creative content:', error);
        // On error, fallback to dummy artworks
        setCreativeWorks(dummyArtworks);
      } finally {
        setLoading(false);
      }
    };

    fetchCreativeContent();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <AppNavbar />
      <NewsNavbar activeGenre="Creative" onGenreChange={(genre) => {
        if (genre !== 'Creative') {
          // Navigate to appropriate page
          const router = useRouter();
          if (genre === 'News') router.push('/news');
          else router.push(`/news?genre=${genre.toLowerCase()}`);
        }
      }} />
      
      <ScrollView contentContainerStyle={styles.creativePageScroll}>
        <View style={styles.mainContent}>
          <Text style={styles.pageTitle}>Creative Works</Text>
          <Text style={styles.pageSubtitle}>
            Explore our collection of creative content, artworks, and multimedia pieces
          </Text>

          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading creative works...</Text>
            </View>
          ) : creativeWorks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No creative works yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Check back soon for new creative content!
              </Text>
            </View>
          ) : (
            <div style={styles.galleryGrid}>
              {creativeWorks.map(item => (
                <CreativeCard key={item.id} item={item} onImageClick={handleImageClick} />
              ))}
            </div>
          )}
        </View>

        {/* Footer Section */}
        <footer style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.footerSection}>
              <Text style={styles.footerHeading}>Contact Us</Text>
              <View style={styles.contactItem}>
                <MaterialIcons name="facebook" size={20} color="#93c5fd" style={styles.contactIcon} />
                <Text
                  style={styles.footerLink}
                  onPress={() => window.open('https://facebook.com/fishermannetwork', '_blank')}
                >
                  fishermannetwork
                </Text>
              </View>
              <View style={styles.contactItem}>
                <MaterialIcons name="email" size={20} color="#93c5fd" style={styles.contactIcon} />
                <Text
                  style={styles.footerLink}
                  onPress={() => window.open('mailto:info@fisherman.network')}
                >
                  info@fisherman.network
                </Text>
              </View>
              <View style={styles.contactItem}>
                <MaterialIcons name="phone" size={20} color="#93c5fd" style={styles.contactIcon} />
                <Text style={styles.contactText}>+63 2 8123 4567</Text>
              </View>
              <View style={styles.contactItem}>
                <MaterialIcons name="smartphone" size={20} color="#93c5fd" style={styles.contactIcon} />
                <Text style={styles.contactText}>+63 912 345 6789</Text>
              </View>
            </View>
          </View>
          <View style={styles.copyright}>
            &copy; {new Date().getFullYear()} Fisherman's Network. All rights reserved.
          </View>
        </footer>
      </ScrollView>

      {/* Full-Screen Artwork Modal */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
            
            <Image
              source={{ uri: getImageUrl(selectedArtwork?.image) }}
              style={styles.modalImage}
              resizeMode="contain"
            />
            
            <View style={styles.modalCaption}>
              <Text style={styles.modalTitle}>
                {selectedArtwork?.title || 'Untitled'}
              </Text>
              <Text style={styles.modalExcerpt} numberOfLines={3}>
                {selectedArtwork?.excerpt || 'No description available.'}
              </Text>
              <View style={styles.modalMeta}>
                <Text style={styles.modalAuthor}>
                  By {selectedArtwork?.author || 'Anonymous'}
                </Text>
                <Text style={styles.modalDate}>
                  {selectedArtwork?.date || ''}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
