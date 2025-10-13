// app/screens/home/index.web.js
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity,
  useWindowDimensions,
  ImageBackground,
  ActivityIndicator,
  ScrollView,
  FlatList
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useBranding } from '../../../../context/BrandingContext';
import HeroCarousel from '../../../components/HeroCarousel';
import AppNavbar from '../../../../components/AppNavbar';
import SvgWave from '../../../components/SvgWave';
import { useRouter } from 'expo-router';
import apiClient from '../../../../utils/api';

// Default data in case API call fails
const fallbackPublications = {
  recent: [
    {
      id: '1',
      title: 'Loading latest articles...',
      image: 'https://via.placeholder.com/300x200?text=Loading...',
      summary: 'Fetching the latest content for you.',
      published_at: new Date().toISOString(),
      link: '#',
    },
  ],
};

const CATEGORIES = ['News', 'Articles', 'Opinion', 'Sports', 'Editorial', 'Artworks'];

const HomeScreen = () => {
  const { width } = useWindowDimensions();
  const { backgroundUrl } = useBranding();
  const router = useRouter();
  const isMobile = width < 768;
  const [publications, setPublications] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isViewAllHovered, setIsViewAllHovered] = useState(false);
  const [isReadFeaturedHovered, setIsReadFeaturedHovered] = useState(false);
  const [isJoinUsHovered, setIsJoinUsHovered] = useState(false);

  useEffect(() => {
    const fetchArticlesByCategory = async () => {
      try {
        setIsLoading(true);
        
        // First, fetch all articles with their genres
        const response = await apiClient.get('/public/articles?sort=published_at:desc');
        
        if (!response.data?.data) {
          setError('No articles found');
          return;
        }
        
        const allArticles = response.data.data;
        const categoryData = {};
        
        // Initialize each category with an empty array
        CATEGORIES.forEach(category => {
          categoryData[category] = [];
        });
        
        // Categorize articles by their genre
        allArticles.forEach(article => {
          const articleGenre = article.genre || 'General';
          const category = CATEGORIES.find(cat => cat.toLowerCase() === articleGenre.toLowerCase());
          
          if (category && categoryData[category]?.length < 4) {
            categoryData[category].push({
              id: article.id?.toString() || '',
              title: article.title || 'Untitled Article',
              summary: '', // Removed content display
              image: article.media && article.media.length > 0 
                ? `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}/storage/${article.media[0].file_path.replace('public/', '')}`
                : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070',
              link: `news/article/${article.slug || article.id}`,
              genre: article.genre
            });
          }
        });
        
        setPublications(categoryData);
      } catch (err) {
        console.error('Error fetching articles:', err);
        setError('Failed to load articles. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticlesByCategory();
  }, []);

  return (
    <div style={styles.container}>
      {/* Navbar with higher z-index */}
      <div style={styles.navbarContainer}>
        <AppNavbar isWeb={true} />
      </div>

      {/* Hero Section */}
      <div style={styles.hero}>
        <ImageBackground
          source={{ uri: backgroundUrl || "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?q=80&w=2070" }}
          style={styles.heroImage}
        >
          <div style={styles.heroOverlay}>
            <div style={styles.heroContent}>
              <div style={styles.heroText}>
                <h1 style={styles.heroTitle}>Building a Sustainable Community</h1>
                <p style={styles.heroSummary}>
                  Discover how our latest publication is helping organizations grow better and empower communities.
                </p>
                <button 
                  style={{
                    ...styles.ctaButton,
                    ...(isReadFeaturedHovered ? styles.ctaButtonHover : {})
                  }}
                  onMouseEnter={() => setIsReadFeaturedHovered(true)}
                  onMouseLeave={() => setIsReadFeaturedHovered(false)}
                  onClick={() => router.push('/news')}
                >
                  Read Featured
                </button>
              </div>
              <div style={styles.carouselContainer}>
                <HeroCarousel isWeb={true} />
              </div>
            </div>
          </div>
          <div style={styles.waveContainer}>
            <SvgWave color={'#f3f6fa'} height={120} />
          </div>
        </ImageBackground>
      </div>
      {/* Main Content */}
      <div style={styles.mainContent}>
        <h1 style={styles.mainTitle}>Recently Published</h1>
        
        {isLoading ? (
          <div style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a237e" />
            <p style={styles.loadingText}>Loading articles...</p>
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <p style={styles.errorText}>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              style={styles.retryButton}
            >
              Retry
            </button>
          </div>
        ) : (
          <div>
            {CATEGORIES.map((category) => (
              publications[category]?.length > 0 && (
                <section key={category} style={styles.categorySection}>
                  <div style={styles.categoryHeader}>
                    <h2 style={styles.categoryTitle}>{category}</h2>
                    <button 
                      style={styles.viewAllLink}
                      onClick={() => router.push(`/news?category=${category.toLowerCase()}`)}
                    >
                      View All
                    </button>
                  </div>
                  <div style={styles.scrollContainer}>
                    <div style={{...styles.horizontalScroll, overflowX: 'auto'}}>
                      {publications[category].map((article) => (
                        <div 
                          key={article.id}
                          style={styles.publicationCard}
                          onMouseEnter={(e) => {
                            const card = e.currentTarget;
                            const overlay = card.querySelector('[data-overlay]');
                            const image = card.querySelector('img');
                            if (overlay) overlay.style.opacity = '1';
                            if (image) image.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            const card = e.currentTarget;
                            const overlay = card.querySelector('[data-overlay]');
                            const image = card.querySelector('img');
                            if (overlay) overlay.style.opacity = '0';
                            if (image) image.style.transform = 'scale(1)';
                          }}
                          onClick={() => router.push(article.link)}
                          className="publication-card"
                        >
                          <div style={styles.imageContainer}>
                            <img 
                              src={article.image} 
                              alt={article.title}
                              style={styles.publicationImage}
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070';
                              }}
                            />
                            <div style={styles.cardOverlay} data-overlay>
                              <span style={styles.readMoreText}>Read More</span>
                            </div>
                          </div>
                          <div style={styles.publicationContent}>
                            <h3 style={styles.publicationTitle}>{article.title}</h3>
                            <p style={styles.publicationSummary}>{article.summary}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )
            ))}
          </div>
        )}
        
        {/* Recruitment Section */}
        <section style={{...styles.section, ...styles.recruitmentSection}}>
          <div style={styles.recruitmentContent}>
            <img
              src="https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=compress&w=400"
              alt="Join our team"
              style={styles.recruitmentImage}
            />
            <div style={styles.recruitmentText}>
              <h2 style={{...styles.sectionTitle, color: '#1e40af', textAlign: 'left' }}>Join Our Team!</h2>
              <p style={styles.aboutText}>
                We're looking for passionate writers, editors, and researchers to join our publication team. Help us share impactful stories, research, and news with the community.
              </p>
              <button 
                style={{
                  ...styles.ctaButton2,
                  ...(isJoinUsHovered ? styles.ctaButtonHover : {}),
                  alignSelf: 'flex-start'
                }}
                onMouseEnter={() => setIsJoinUsHovered(true)}
                onMouseLeave={() => setIsJoinUsHovered(false)}
                onClick={() => router.push('/registration')}
              >
                Join us Now
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerSection}>
            <h3 style={styles.footerHeading}>Contact Us</h3>
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
          </div>
        </div>
        <div style={styles.copyright}>
          &copy; {new Date().getFullYear()} Fisherman's Network. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

const styles = StyleSheet.create({
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden',
    position: 'relative',
  },
  navbarContainer: {
    position: 'relative',
    zIndex: 1000, // Ensure navbar is above other elements
  },
  hero: {
    minHeight: '80vh',
    position: 'relative',
    width: '100%',
    flexShrink: 0,
    zIndex: 1, // Ensure hero is below navbar
    marginTop: '0',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
  },
  heroOverlay: {
    backgroundColor: 'rgba(46, 46, 54, 0.65)',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 10%',
    position: 'relative',

  },
  heroContent: {
    maxWidth: '1200px',
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: '-200px',
    gap: '40px',
  },
  heroText: {
    flex: 1,
    color: 'white',
    maxWidth: '600px',
  },
  heroTitle: {
    fontSize: '2.8rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    lineHeight: 1.2,
    marginTop: '8rem',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    marginLeft: '70px',
  },
  heroSummary: {
    fontSize: '1.25rem',
    lineHeight: 1.6,
    marginBottom: '2rem',
    opacity: 0.9,
    marginLeft: '70px',
    maxWidth: '90%',
  },
  ctaButton: {
    backgroundColor: '#3b82f6',
    marginLeft: '70px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  ctaButtonHover: {
    backgroundColor: '#2563eb',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
  },
  ctaButton2: {
    backgroundColor: '#3b82f6',

    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  ctaButton2Hover: {
    backgroundColor: '#2563eb',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
  },
  carouselContainer: {
    flex: 1,
    maxWidth: '500px',
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
  
  },
  waveContainer: {
    position: 'absolute',
    bottom: '-1px',
    left: 0,
    right: 0,
    height: '120px',
    overflow: 'hidden',
  },
  mainContent: {
    width: '100%',
    flex: '1 0 auto',
    padding: '20px 5% 40px 40px',
    paddingLeft: '40px',
    paddingRight: '40px',
    boxSizing: 'border-box',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  mainTitle: {
    fontSize: '2.2rem',
    fontWeight: '700',
    color: '#1a237e',
    margin: '0 auto 30px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e5e7eb',
    textAlign: 'center',
    maxWidth: '1200px',
    paddingLeft: '20px',
  },
  section: {
    width: '100%',
    backgroundColor: 'white',
    padding: '32px',
    margin: '32px 24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    boxSizing: 'border-box',
  },
  sectionTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '32px',
    marginTop: '20px',
    textAlign: 'center',
  },
  categorySection: {
    margin: '30px 0',
    padding: '20px 0 20px 30px',
    borderBottom: '1px solid #e5e7eb',
    ':last-child': {
      borderBottom: 'none',
    },
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    padding: '0 8px',
  },
  categoryTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1a237e',
    margin: 0,
  },
  viewAllLink: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    padding: '4px 8px',
    borderRadius: '4px',
    ':hover': {
      textDecoration: 'underline',
    },
  },
  scrollContainer: {
    width: '100%',
    overflowX: 'auto',
    paddingBottom: '16px',
    '&::-webkit-scrollbar': {
      height: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: '#f1f1f1',
      borderRadius: '10px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: '#888',
      borderRadius: '10px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: '#555',
    },
  },
  horizontalScroll: {
    display: 'flex',
    gap: '20px',
    padding: '0 8px',
    width: 'max-content',
    minWidth: '100%',
  },
  publicationCard: {
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: '16px',
    boxShadow: '0 4px 24px 0 rgba(60,72,88,0.09)',
    border: '1.5px solid #e4e8ee',
    transition: 'box-shadow 0.25s cubic-bezier(.4,2,.6,1), transform 0.18s cubic-bezier(.4,2,.6,1)',
    cursor: 'pointer',
    width: '100%',
    maxWidth: '260px',
    minWidth: '250px',
    height: 'auto',
    flexShrink: 0,
    ':hover': {
      boxShadow: '0 10px 32px 0 rgba(60,72,88,0.18)',
      transform: 'translateY(-4px) scale(1.025)',
      borderColor: '#d0d6e0',
    },
  },
  imageContainer: {
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    height: '160px',
  },
  publicationImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s ease',
    ':hover': {
      transform: 'scale(1.05)',
    },
  },
  publicationContent: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    flex: 1,
  },
  publicationTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: '0 0 8px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '1.4',
    letterSpacing: '0.2px',
  },
  publicationSummary: {
    fontSize: '0.875rem',
    color: '#666',
    margin: '0 0 12px',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '1.5',
    flex: 1,
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease',
    display: 'flex',
    zIndex: 2,
  },
  readMoreText: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: '6px 12px',
    borderRadius: '4px',
    letterSpacing: '1px',
  },
  viewAllContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '24px',
  },
  viewAllButton: {
    backgroundColor: 'transparent',
    color: '#3b82f6',
    border: '1px solid #3b82f6',
    borderRadius: '6px',
    padding: '10px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  viewAllButtonHover: {
    backgroundColor: '#eff6ff',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 8px rgba(59, 130, 246, 0.15)',
    borderColor: '#2563eb',
  },
  recruitmentSection: {
    backgroundColor: '#f8f9fa',
    width: '100%',
    padding: '48px 24px',
    margin: '32px 0',
    boxSizing: 'border-box',
  },
  recruitmentContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  recruitmentContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    boxSizing: 'border-box',
  },
  recruitmentContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  recruitmentImage: {
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  recruitmentText: {
    flex: 1,
  },
  aboutText: {
    fontSize: '1.05rem',
    color: '#4b5563',
    lineHeight: 1.7,
    marginBottom: '24px',
  },
  footer: {
    backgroundColor: '#3a505b',
    color: 'white',
    padding: '40px 20px 20px',
    marginTop: '60px',
    flexShrink: 0,
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
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '20px',
    color: 'white',
  },
  footerText: {
    color: 'white',
    lineHeight: 1.6,
    marginBottom: '16px',
  },
  footerLinks: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
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
    fontSize: '0.9rem',
  },
  // Responsive styles
  '@media (max-width: 1024px)': {
    heroTitle: {
      fontSize: '2.4rem',
    },
    heroSummary: {
      fontSize: '1.1rem',
    },
    recruitmentContent: {
      flexDirection: 'column',
      textAlign: 'center',
      alignItems: 'center',
    },
    recruitmentImage: {
      marginBottom: '24px',
    },
  },
  '@media (max-width: 768px)': {
    hero: {
      height: 'auto',
      minHeight: '600px',
    },
    heroContent: {
      flexDirection: 'column',
      textAlign: 'center',
      padding: '40px 20px',
    },
    heroText: {
      maxWidth: '100%',
      marginBottom: '40px',
    },
    heroTitle: {
      fontSize: '2rem',
    },
    heroSummary: {
      maxWidth: '100%',
      fontSize: '1rem',
    },
    section: {
      padding: '24px 16px',
    },
    sectionTitle: {
      fontSize: '1.75rem',
    },
    publicationGrid: {
      gridTemplateColumns: '1fr',
    },
  },
  '@media (max-width: 480px)': {
    heroTitle: {
      fontSize: '1.8rem',
    },
    heroSummary: {
      fontSize: '1rem',
    },
    ctaButton: {
      width: '100%',
      padding: '12px 16px',
    },
  },
});

export default HomeScreen;