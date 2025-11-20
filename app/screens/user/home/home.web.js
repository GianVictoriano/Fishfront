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

const CATEGORIES = ['News'];

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
  const [applicationPeriod, setApplicationPeriod] = useState(null);
  const [isCheckingPeriod, setIsCheckingPeriod] = useState(true);
  const [featuredData, setFeaturedData] = useState([]);

  useEffect(() => {
    fetchArticlesByCategory();
    fetchApplicationPeriod();
    fetchFeaturedArticles();
  }, []);

  const fetchApplicationPeriod = async () => {
    try {
      const response = await apiClient.get('/api/application-period');
      if (response.data) {
        setApplicationPeriod(response.data);
      }
    } catch (error) {
      console.log('No application period set or error fetching:', error);
      // If no period is set, keep applicationPeriod as null
    } finally {
      setIsCheckingPeriod(false);
    }
  };

  const handleFeaturedCardMouseEnter = (articleId, event) => {
    const card = event.currentTarget;
    const overlay = card.querySelector('[data-overlay]');
    const titleOverlay = card.querySelector('[data-title-overlay]');
    const image = card.querySelector('img');
    if (overlay) overlay.style.opacity = '1';
    if (titleOverlay) titleOverlay.style.opacity = '0';
    if (image) image.style.transform = 'scale(1.08)';
  };

  const handleFeaturedCardMouseLeave = (articleId, event) => {
    const card = event.currentTarget;
    const overlay = card.querySelector('[data-overlay]');
    const titleOverlay = card.querySelector('[data-title-overlay]');
    const image = card.querySelector('img');
    if (overlay) overlay.style.opacity = '0';
    if (titleOverlay) titleOverlay.style.opacity = '1';
    if (image) image.style.transform = 'scale(1)';
  };

  const fetchFeaturedArticles = async () => {
    try {
      const response = await apiClient.get('/public/featured-articles');
      if (response.data?.data) {
        const mapped = response.data.data.slice(0, 6).map(article => ({
          id: article.id?.toString() || '',
          title: article.title,
          excerpt: article.content ? article.content.substring(0, 150) + '...' : '',
          image: article.media && article.media.length > 0
            ? `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}/storage/${article.media[0].file_path.replace('public/', '')}`
            : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070',
          published_at: article.published_at,
          genre: article.genre || 'Featured',
        }));
        setFeaturedData(mapped);
      }
    } catch (error) {
      console.log('Error fetching featured articles:', error);
    }
  };

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
        const category = 'News'; // Always put in News category
        
        if (categoryData[category]?.length < 8) { // Changed from 4 to 8
          categoryData[category].push({
            id: article.id?.toString() || '',
            title: article.title || 'Untitled Article',
            summary: '', // Removed content display
            image: article.media && article.media.length > 0 
              ? `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}/storage/${article.media[0].file_path.replace('public/', '')}`
              : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070',
            link: `news/article/${article.slug || article.id}`,
            genre: article.genre,
            published_at: article.published_at
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

  return (
    <div style={styles.container}>
      {/* Navbar with higher z-index */}
      <div style={styles.navbarContainer}>
        <AppNavbar isWeb={true} />
      </div>

      {/* Hero Section */}
      <div style={styles.hero}>
        <ImageBackground
          source={{ uri: backgroundUrl?.uri || backgroundUrl || "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?q=80&w=2070" }}
          style={styles.heroImage}
        >
          <div style={styles.heroOverlay}>
            <div style={styles.heroContent}>
              <div style={styles.heroText}>
                <h1 style={styles.heroTitle}>Welcome to the Fisherman Publication</h1>
                <p style={styles.heroSummary}>
                  The Student Publication Body of Batangas State University-ARASOF dedicated on providing the latest news and inspiring works of the students of Batangas State University-ARASOF.
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
            </div>
          </div>
          <div style={styles.waveContainer}>
            <SvgWave color={'#f3f6fa'} height={130} />
          </div>
        </ImageBackground>
      </div>
      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Decorative Background Elements */}
        <div style={styles.sectionBackground}>
          <div style={styles.bgShape1}></div>
          <div style={styles.bgShape2}></div>
          <div style={styles.bgShape3}></div>
        </div>
        
        {featuredData.length > 0 && (
          <React.Fragment>
            <div style={styles.featuredSection}>
              <div style={styles.featuredTitleContainer}>
                <h1 style={styles.featuredTitle}>Featured Content</h1>
                <div style={styles.titleUnderline}></div>
                <p style={styles.featuredSubtitle}>Highlighted stories and creative works</p>
              </div>
              <div style={styles.featuredGrid}>
                {featuredData.map((article) => (
                  <div 
                    key={article.id}
                    style={styles.featurecard}
                    onMouseEnter={(e) => handleFeaturedCardMouseEnter(article.id, e)}
                    onMouseLeave={(e) => handleFeaturedCardMouseLeave(article.id, e)}
                    onClick={() => router.push(`news/article/${article.id}`)}
                  >
                    <div style={styles.imageContainer2}>
                      <img 
                        src={article.image} 
                        alt={article.title}
                        style={styles.publicationImage}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070';
                        }}
                      />
                      {/* Always visible title overlay */}
                      <div style={styles.titleOverlay} data-title-overlay>
                        <h3 style={styles.overlayTitle}>{article.title}</h3>
                      </div>
                      
                      {/* Hover-only additional details overlay */}
                      <div style={styles.cardOverlay} data-overlay>
                        <div style={styles.overlayContent}>
                          <span style={styles.overlayGenre}>
                            {article.genre || 'FEATURED'}
                          </span>
                          <span style={styles.overlayDate}>
                            {article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'Recent'}
                          </span>
                          <span style={styles.readMoreText}>Click to Read Full Article</span>
                        </div>
                      </div>
                      
                      <div style={styles.categoryBadge}>
                        <MaterialIcons name="star" size={14} color="#fff" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </React.Fragment>
        )}

        <div style={styles.mainTitleContainer}>
          <h1 style={styles.mainTitle}>Recently Published</h1>
          <div style={styles.titleUnderline}></div>
          <p style={styles.mainSubtitle}>Discover the latest stories, insights, and creative works from our community</p>
        </div>
        
        {isLoading ? (
          <React.Fragment>
            <div style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1a237e" />
              <p style={styles.loadingText}>Loading articles...</p>
            </div>
          </React.Fragment>
        ) : error ? (
          <React.Fragment>
            <div style={styles.errorContainer}>
              <p style={styles.errorText}>{error}</p>
              <button 
                onClick={() => window.location.reload()}
                style={styles.retryButton}
              >
                Retry
              </button>
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            {CATEGORIES.map((category) => (
              publications[category]?.length > 0 && (
                <React.Fragment>
                  <div key={category} style={styles.categorySection}>
                    <div style={styles.categoryHeader}>
                      <div style={styles.categoryTitleContainer}>
                        <h2 style={styles.categoryTitle}>{category}</h2>
                        <div style={styles.categoryAccent}></div>
                      </div>
                      <button 
                        style={{
                          ...styles.viewAllLink,
                          ...(isViewAllHovered ? styles.viewAllLinkHover : {})
                        }}
                        onMouseEnter={() => setIsViewAllHovered(true)}
                        onMouseLeave={() => setIsViewAllHovered(false)}
                        onClick={() => {
                          console.log('View All clicked for category:', category);
                          router.push(`/news?category=${category.toLowerCase()}`);
                        }}
                        onPress={() => {
                          console.log('View All pressed for category:', category);
                          router.push(`/news?category=${category.toLowerCase()}`);
                        }}
                      >
                        View All <MaterialIcons name="arrow-forward" size={16} />
                      </button>
                    </div>
                    <div style={styles.newsGrid}>
                        {publications[category].map((article, index) => (
                          <div 
                            key={article.id}
                            style={styles.publicationCard}
                            onMouseEnter={(e) => {
                              const card = e.currentTarget;
                              const overlay = card.querySelector('[data-overlay]');
                              const image = card.querySelector('img');
                              const title = card.querySelector('[data-title]');
                              if (overlay) overlay.style.opacity = '1';
                              if (image) image.style.transform = 'scale(1.08)';
                              if (title) title.style.color = '#3b82f6';
                            }}
                            onMouseLeave={(e) => {
                              const card = e.currentTarget;
                              const overlay = card.querySelector('[data-overlay]');
                              const image = card.querySelector('img');
                              const title = card.querySelector('[data-title]');
                              if (overlay) overlay.style.opacity = '0';
                              if (image) image.style.transform = 'scale(1)';
                              if (title) title.style.color = '#1a237e';
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
                                <div style={styles.overlayContent}>
                                  <MaterialIcons name="visibility" size={24} color="#fff" />
                                  <span style={styles.readMoreText}>Read Article</span>
                                </div>
                              </div>
                              <div style={styles.categoryBadge}>
                                <MaterialIcons name="article" size={14} color="#fff" />
                              </div>
                            </div>
                            <div style={styles.publicationContent}>
                              <h3 style={styles.publicationTitle} data-title>{article.title}</h3>
                              <div style={styles.articleMeta}>
                                <div style={styles.metaItem}>
                                  <MaterialIcons name="schedule" size={14} color="#64748b" />
                                  <span style={{...styles.metaText, fontSize: '11px', marginBottom: '2px', paddingLeft: '2px'}}>
                                    {article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    }) : 'Recent'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </React.Fragment>
                )
              ))}
          </React.Fragment>
        )}
        
        {/* Recruitment Section - Only show if application period is set */}
        {applicationPeriod && (
          <React.Fragment>
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
                    onClick={() => {
                      console.log('Join Us Now clicked');
                      router.push('/registration');
                    }}
                    onPress={() => {
                      console.log('Join Us Now pressed');
                      router.push('/registration');
                    }}
                  >
                    Join us Now
                  </button>
                </div>
              </div>
            </section>
          </React.Fragment>
        )}
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
    minHeight: '85vh',
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
    height: '105%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: '10%',
    paddingRight: '10%',
    paddingTop: 0,
    paddingBottom: 0,
    position: 'relative',

  },
  heroContent: {
    maxWidth: '1200px',
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '-200px',
    gap: '40px',
  },
  heroText: {
    flex: 1,
    color: 'white',
    maxWidth: '600px',
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: 45,
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    lineHeight: 1.2,
    marginTop: '8rem',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  heroSummary: {
    fontSize: 20,
    lineHeight: 1.6,
    marginBottom: '2rem',
    opacity: 0.9,
    maxWidth: '90%',
    marginLeft: '30px',
  },
  ctaButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    paddingTop: '10px',
    paddingBottom: '10px',
    borderRadius: '25px',
    padding: '16px 40px',
    fontSize: 16,
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    minWidth: '200px',
  },
  ctaButtonHover: {
    backgroundColor: '#1d4ed8',
    transform: 'translateY(-3px) scale(1.02)',
    boxShadow: '0 12px 35px rgba(59, 130, 246, 0.4)',
  },
  ctaButton2: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px',
    fontSize: 18,
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    position: 'relative',
    zIndex: 20,
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
    padding: '20px',
    paddingLeft: '40px',
    paddingRight: '40px',
    paddingBottom: '40px',
    boxSizing: 'border-box',
    maxWidth: '1400px',
    marginTop: '60px',
    marginRight: 'auto',
    marginBottom: 0,
    marginLeft: 'auto',
    position: 'relative',
    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #f1f5f9 100%)',
  },
  sectionBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  bgShape1: {
    position: 'absolute',
    top: '10%',
    right: '5%',
    width: '120px',
    height: '120px',
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    borderRadius: '50%',
    opacity: 0.1,
    transform: 'rotate(45deg)',
  },
  bgShape2: {
    position: 'absolute',
    bottom: '20%',
    left: '8%',
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    borderRadius: '20px',
    opacity: 0.08,
    transform: 'rotate(-30deg)',
  },
  bgShape3: {
    position: 'absolute',
    top: '60%',
    left: '70%',
    width: '60px',
    height: '60px',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    borderRadius: '50%',
    opacity: 0.1,
    transform: 'rotate(60deg)',
  },
  mainTitleContainer: {
    marginTop: 0,
    marginRight: 'auto',
    marginBottom: 0,
    marginLeft: 'auto',
    paddingBottom: '15px',
    borderBottom: '2px solid #e5e7eb',
    textAlign: 'center',
    maxWidth: '1200px',
    paddingLeft: '0px',
    position: 'relative',
    zIndex: 1,
  },
  section: {
    width: '100%',
    backgroundColor: 'white',
    padding: 32,
    marginTop: 32,
    marginRight: 24,
    marginBottom: 32,
    marginLeft: 24,
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    boxSizing: 'border-box',
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 32,
    marginTop: 20,
    textAlign: 'center',
  },
  categorySection: {
    marginTop: 30,
    marginRight: 0,
    marginBottom: 30,
    marginLeft: 0,
    paddingTop: 20,
    paddingRight: 0,
    paddingBottom: 20,

    borderBottom: '1px solid #e5e7eb',
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 0,
    paddingRight: 8,
    paddingBottom: 0,
    paddingLeft: 8,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a237e',
    margin: 0,
  },
  viewAllLink: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    padding: '10px 20px',

    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    position: 'relative',
    zIndex: 10,
  },
  viewAllLinkHover: {
    backgroundColor: '#3b82f6',
    color: 'white',
    transform: 'translateY(-4px) scale(1.05)',
    boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)',
  },
  newsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gridTemplateRows: 'repeat(2, auto)',
    gap: '20px',
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  horizontalScroll: {
    display: 'flex',
    gap: '20px',
    padding: '0 8px',
    width: 'max-content',
    minWidth: '100%',
  },
  featurecard: {
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: '12px',
    boxShadow: '0 4px 20px 0 rgba(60,72,88,0.08)',
    border: '1px solid #e4e8ee',
    transition: 'box-shadow 0.25s cubic-bezier(.4,2,.6,1), transform 0.18s cubic-bezier(.4,2,.6,1)',
    cursor: 'pointer',
    width: '100%',
    height: 'auto',
    ':hover': {
      boxShadow: '0 10px 28px 0 rgba(60,72,88,0.16)',
      transform: 'translateY(-3px) scale(1.02)',
      borderColor: '#d0d6e0',
    },
  },
  publicationCard: {
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: '12px',
    boxShadow: '0 4px 20px 0 rgba(60,72,88,0.08)',
    border: '1px solid #e4e8ee',
    transition: 'box-shadow 0.25s cubic-bezier(.4,2,.6,1), transform 0.18s cubic-bezier(.4,2,.6,1)',
    cursor: 'pointer',
    width: '100%',
    maxWidth: 'none',
    minWidth: '200px',
    height: 'auto',
    flex: 1,
    flexShrink: 0,
    ':hover': {
      boxShadow: '0 10px 28px 0 rgba(60,72,88,0.16)',
      transform: 'translateY(-3px) scale(1.02)',
      borderColor: '#d0d6e0',
    },
  },
  imageContainer: {
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    height: '120px',
  },
    imageContainer2: {
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    height: '230px',
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
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    flex: 1,
  },
  publicationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    margin: '0 0 6px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '1.3',
    letterSpacing: '0.2px',
  },
  publicationSummary: {
    fontSize: 13,
    color: '#666',
    margin: '0 0 8px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '1.4',
    flex: 1,
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  metaText: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  overlayContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  overlayTitle: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: '700',
    textAlign: 'left',
    margin: '0 0 8px 8px',
    textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.8)',
    lineHeight: '24px',
    maxWidth: '90%',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    textOverflow: 'ellipsis',
  },
  overlayExcerpt: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: '14px',
    textAlign: 'center',
    margin: '8px 0',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    lineHeight: '20px',
    maxWidth: '90%',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 15,
    right: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.6), rgba(0,0,0,0.3), transparent)',
    padding: '25px 15px 20px',
    zIndex: 1,
    transition: 'opacity 0.2s ease',

  },
  overlayGenre: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',

    padding: '4px 8px',
    borderRadius: '12px',
    marginBottom: '8px',
    display: 'inline-block',
    letterSpacing: '0.5px',
  },
  overlayDate: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '12px',
    fontWeight: '500',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',

    padding: '4px 8px',
    borderRadius: '4px',
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
    fontSize: 16,
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
    width: '96%',
    padding: '48px 24px',
    marginTop: 32,
    marginBottom: 32,
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
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
    fontSize: 17,
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
    fontSize: 20,
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
    fontSize: 14,
  },
  featuredSection: {
    marginTop: 30,
    marginBottom: 30,
  },
  featuredTitleContainer: {
    textAlign: 'center',
    marginBottom: 30,
  },
  featuredTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 10,
  },
  featuredSubtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  featuredGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 20,
    width: '100%',
    margin: '0 auto',
  },
  featuredCardsContainer: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
  },
  featuredCard: {
    flexDirection: 'column',
    display: 'flex',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 24,
    boxShadow: '0 4px 20px 0 rgba(60,72,88,0.08)',
    border: '1px solid #e4e8ee',
    height: 120,
    cursor: 'pointer',
    width: '400px',
    flexShrink: 0,
  },
  featuredImageContainer: {
    width: '100%',
    height: '60px',
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  featuredTextBlock: {
    flex: 1,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
    minWidth: 0,
    flexShrink: 1,
  },
  featuredLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ff6b35',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  featuredCardTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 32,
    marginBottom: 16,
    textAlign: 'left',
    flexWrap: 'wrap',
    includeFontPadding: false,
    width: '100%',
    maxWidth: '100%',
  },
  featuredMeta: {
    fontSize: 13,
    color: '#999',
    fontWeight: '400',
  },
  // Responsive styles
  '@media (max-width: 1024px)': {
    heroTitle: {
      fontSize: 38,
    },
    heroSummary: {
      fontSize: 18,
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
      fontSize: 32,
    },
    heroSummary: {
      maxWidth: '100%',
      fontSize: 16,
    },
    section: {
      padding: '24px 16px',
    },
    sectionTitle: {
      fontSize: 28,
    },
    publicationGrid: {
      gridTemplateColumns: '1fr',
    },
    // Enhanced Recently Published responsive styles
    mainTitle: {
      fontSize: 32,
    },
    mainSubtitle: {
      fontSize: '16px',
    },
    categorySection: {
      padding: '20px',
      marginBottom: '30px',
    },
    categoryTitle: {
      fontSize: 24,
    },
    categoryAccent: {
      height: '24px',
    },
    viewAllLink: {
      padding: '8px 16px',
      fontSize: '12px',
    },
    horizontalScroll: {
      gap: '16px',
    },
    publicationCard: {
      width: '260px',
    },
    publicationTitle: {
      fontSize: '16px',
    },
    imageContainer: {
      height: '160px',
    },
  },
  '@media (max-width: 480px)': {
    heroTitle: {
      fontSize: 29,
    },
    heroSummary: {
      fontSize: 16,
    },
    ctaButton: {
      width: '100%',
      padding: '12px 16px',
    },
    // Enhanced Recently Published mobile styles
    mainTitle: {
      fontSize: 28,
    },
    mainSubtitle: {
      fontSize: '15px',
    },
    titleUnderline: {
      width: '100px',
      height: '5px',
    },
    categorySection: {
      padding: '16px',
      marginBottom: '20px',
    },
    categoryHeader: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '12px',
    },
    categoryTitle: {
      fontSize: 20,
    },
    categoryAccent: {
      height: '20px',
    },
    viewAllLink: {
      alignSelf: 'flex-end',
      padding: '6px 12px',
      fontSize: '11px',
    },
    horizontalScroll: {
      gap: '12px',
    },
    publicationCard: {
      width: '240px',
    },
    publicationTitle: {
      fontSize: '15px',
    },
    publicationContent: {
      padding: '16px',
    },
    imageContainer: {
      height: '140px',
    },
  },
});

export default HomeScreen;