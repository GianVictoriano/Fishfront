// app/screens/news/index.web.js
import { Link, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image, ScrollView, ActivityIndicator, Dimensions, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AppNavbar from '../../../../components/AppNavbar';
import NewsNavbar from '../../../../components/newsnavbar';
import RecommendedContent from '../../../../components/RecommendedContent';
import useInteractionTracking from '../../../../hooks/useInteractionTracking';
import apiClient from '../../../../utils/api';
import useNewsStore from '../../../../store/newsStore';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  menuButton: {
    position: 'absolute',
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
  },
  modalViewNav: {
    width: '75%',
    height: '100%',
    backgroundColor: '#fff',
  },
  newsPageScroll: {
    padding: 24,
    paddingTop: 12,
    alignItems: 'center',
    backgroundColor: '#f4f6f8',
  },
  newsPageScrollTiny: {
    paddingHorizontal: 12,
  },
  newsMainRow: {
    width: '100%',
    maxWidth: 1300,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 32,
  },
  leftColWrapper: {
    flex: 7,
    minWidth: 340,
    maxWidth: '100%',
    width: '100%',
  },
  leftColWrapperTiny: {
    minWidth: 0,
  },
  rightCol: {
    flex: 3,
    minWidth: 300,
    maxWidth: '30%',
    position: 'sticky',
    top: 20,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  latestContentTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
    marginLeft: 2,
    letterSpacing: 0.2,
  },
  trendingCardWrapper: {
    width: '100%',
    maxWidth: 1050,
    alignSelf: 'left',
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  gridContainer: {
    width: '100%',
    maxWidth: 1050,
    alignSelf: 'center',
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0,
    backgroundColor: 'transparent',
  },
  gridRow: {
    flex: 1,
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 12,
  },
  trendingCard: {
    minHeight: 260,
    borderRadius: 0,
    elevation: 6,
    maxWidth: '100%',
    marginHorizontal: 'auto',
    marginBottom: 0,
  },
  trendingImage: {
    height: 220,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  trendingContent: {
    padding: 24,
  },
  trendingCategory: {
    fontSize: 14,
    marginBottom: 6,
  },
  trendingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 0,
    lineHeight: 36,
  },
  gridContainer: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0,
    backgroundColor: 'transparent',
  },
  gridRow: {
    flex: 1,
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 10,
  },
  card: {
    backgroundColor: '#f4f6f8',
    overflow: 'hidden',
    marginBottom: 0,
    position: 'relative',

    transition: 'box-shadow 0.25s cubic-bezier(.4,2,.6,1), transform 0.18s cubic-bezier(.4,2,.6,1), background-color 0.2s ease',
    cursor: 'pointer',
    flex: 1,
    minWidth: 0,
    borderRadius: 0,
    flexDirection: 'column',
    display: 'flex',
    paddingTop: 20,
    paddingBottom: 20,
  },
  cardHover: {
    backgroundColor: '#f4f6f8',
    boxShadow: '0 10px 32px 0 rgba(60,72,88,0.18)',
    transform: 'translateY(-4px) scale(1.02)',
  },
  cardImage: {
    width: '100%',
    height: 180,
    objectFit: 'cover',
    borderRadius: 0,
    transition: 'opacity 0.2s',
    marginBottom: 12,
  },
  cardImageWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  cardImageHover: {
    // No additional styles needed here
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
  },
  cardOverlayHover: {
    opacity: 1,
  },
  cardReadMore: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  compactCard: {
    flexDirection: 'row',
    height: 90,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  compactImage: {
    width: 120,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    backgroundColor: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  cardCategory: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  compactCategory: {
    fontSize: 11,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 22,
    marginBottom: 8,
    marginTop: 0,
    paddingTop: 0,
    paddingBottom: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    textAlign: 'left',
    textIndent: 0,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 0,
  },
  headlineCard: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headlineCategory: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: 'bold',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  headlineText: {
    fontSize: 14,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    lineHeight: 28,
    paddingVertical: 2,
    marginVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  cardExcerpt: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#007BFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  readMoreButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
    position: 'relative',
    zIndex: 1,
  },
  loadMoreButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
    position: 'relative',
    zIndex: 1,
  },
  rightCol: {
    flex: 3,
    minWidth: 300,
    maxWidth: '30%',
    backgroundColor: '#fff',
    padding: 20,

  },
  freshStoriesSection: {
    marginTop: 0,
    paddingTop: 0,
  },
  freshStoriesHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
    paddingBottom: 8,
    borderBottom: '2px solid #e0e0e0',
  },
  freshStoriesSubheader: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
    letterSpacing: 0.1,
  },
  freshStoryList: {
    marginTop: 2,
  },
  freshStoryItem: {
    marginBottom: 6,
    transition: 'background-color 0.3s ease',
  },
  freshStoryItemHover: {
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  freshStoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  freshStoryTitleBold: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#111',
  },
  freshStoryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  freshStoryCategory: {
    fontWeight: 'bold',
    color: '#e53935',
    fontSize: 10,
    marginRight: 4,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  freshStoryDate: {
    fontSize: 10,
    color: '#222',
    fontWeight: '400',
  },
  freshStoryDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#ececec',
    marginVertical: 4,
  },
  topTrendingItem: {
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
  },
  topTrendingItemHover: {
    boxShadow: '0 10px 32px 0 rgba(60,72,88,0.18)',
    transform: 'translateY(-2px)',
  },
  topTrendingImage: {
    width: '100%',
    height: 140,
    objectFit: 'cover',
  },
  topTrendingContent: {
    padding: 10,
  },
  topTrendingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
    lineHeight: 18,
  },
  topTrendingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topTrendingCategory: {
    fontWeight: 'bold',
    color: '#e53935',
    fontSize: 10,
    marginRight: 4,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  topTrendingDate: {
    fontSize: 10,
    color: '#666',
    fontWeight: '400',
  },
  featuredCard: {
    width: '100%',
    marginBottom: 25,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    position: 'relative',
  },
  featuredCardImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    transition: 'filter 0.3s ease',
  },
  featuredCardImageHover: {
    filter: 'brightness(0.85)',
  },
  featuredContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 25,
    paddingTop: 40,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.2), rgba(0,0,0,0.9))',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  featuredCategory: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
    textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 2px 10px rgba(0,0,0,0.6)',
  },
  featuredTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
    lineHeight: 32,
    color: '#fff',
    textShadow: '0 1px 1px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.8)',
  },
  featuredExcerpt: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 24,
    marginBottom: 15,
    textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 2px 6px rgba(0,0,0,0.7)',
    fontWeight: '500',
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  featuredDate: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 13,
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  readMoreContainer: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [
      { translateX: '100%' },
      { translateY: '-50%' },
      { perspective: 1000 },
      { rotateY: '90deg' },
      { rotateZ: '-2deg' },
    ],
    transformOrigin: 'left center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 12,
    paddingHorizontal: 25,
    paddingLeft: 30,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    opacity: 0,
    transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    boxShadow: '-5px 0 15px rgba(0,0,0,0.1)',
  },
  readMore: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    marginRight: 10,
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    letterSpacing: 0.5,
    transition: 'all 0.3s ease',
  },
  readMoreIcon: {
    color: '#fff',
    fontSize: 16,
    marginTop: 2,
    marginLeft: 2,
    transition: 'all 0.3s ease',
  },
  footer: {
    backgroundColor: '#3a505b',
    color: 'white',
    paddingTop: 40,
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 20,
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
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
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
    color: '#ffffff',
    fontSize: 14,
  },
    threeColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 14,
    width: '100%',
  },
  featuredCardWide: {
    gridColumn: '1 / -1',
    flexDirection: 'row',
    display: 'flex',
    backgroundColor: '#fff',
    borderRadius: 0,
    overflow: 'hidden',
    marginBottom: 32,
    boxShadow: 'none',
    border: 'none',
    minHeight: 280,
    '@media (max-width: 700px)': {
      flexDirection: 'column',
      minHeight: 'auto',
    },
  },
  featuredImageContainer: {
    width: '35%',
    minWidth: '280px',
    maxWidth: '400px',
    overflow: 'hidden',
    '@media (max-width: 700px)': {
      width: '100%',
      minWidth: '100%',
      maxWidth: '100%',
      height: '200px',
    },
  },
  featuredImageStyle: {
    width: '100%',
    height: '100%',
    minHeight: 280,
    objectFit: 'cover',
  },
  featuredContentContainer: {
    flex: 1,
    paddingLeft: 40,
    paddingRight: 40,
    paddingTop: 24,
    paddingBottom: 24,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: '#fff',
    '@media (max-width: 700px)': {
      paddingLeft: 20,
      paddingRight: 20,
      paddingTop: 16,
      paddingBottom: 16,
    },
  },
  featuredCategoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ff6b35',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  featuredTitleText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 36, // Changed from 1.3 to fixed pixel value
    marginBottom: 12,
    textAlign: 'left',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  featuredExcerptText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 1.5,
    marginBottom: 16,
  },
  featuredMetaInfo: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',

  },
  regularCardNarrow: {
    gridColumn: 'span 1',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardTimeStamp: {
    fontSize: 11,
    color: '#999',
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  viewTrendingButton: {
    position: 'absolute',
    marginTop: -13,

    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    zIndex: 10,
  },
  viewTrendingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  loadMoreButton: {
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 24,
    marginBottom: 16,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    ':hover': {
      backgroundColor: '#f9fafb',
      borderColor: '#9ca3af'
    }
  },
  loadMoreButtonText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'center',
  },
  skeletonCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 0,
    marginBottom: 16,
    padding: 16,
    minHeight: 120,
  },
  skeletonImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonText: {
    height: 16,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonTitle: {
    height: 20,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 8,
    width: '80%',
  },
});

// --- COMPONENT CODE ---

// Fallback static data
const fallbackNewsData = [
  {
    id: '1',
    title: 'Welcome to Fisherman News',
    excerpt: 'Stay tuned for the latest updates and articles...',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    category: 'News'
  }
];

const defaultImage = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070';

const getImageUrl = (url) => {
  if (!url) return defaultImage;
  // Convert to string if it's a number or other type
  const urlStr = String(url);
  if (urlStr.startsWith('http')) return urlStr;
  
  // Handle creatives paths - use /api/public/ prefix
  if (urlStr.includes('creatives/')) {
    return `${process.env.EXPO_PUBLIC_API_URL}/api/public/${urlStr}`;
  }
  
  // Handle articles paths - use /api/storage/app/public/ prefix
  if (urlStr.includes('articles/')) {
    return `${process.env.EXPO_PUBLIC_API_URL}/api/storage/app/public/${urlStr}`;
  }
  
  return `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}${urlStr}`;
};

const NewsCard = ({ item, compact, bigTrending, isFirst, onInteraction }) => {
  const router = useRouter();
  
  const [imageUri, setImageUri] = useState(getImageUrl(item?.image));
  const [isHovered, setIsHovered] = useState(false);
  
  const handlePress = () => {
    if (onInteraction) {
      onInteraction(item.id, 'view');
    }
    
    // Handle creative works differently
    if (item.category && item.category.includes('Creative')) {
      // For creative works, navigate to creative page
      router.push('/creative');
      return;
    }
    
    // Default navigation for articles
    router.push(`/news/article/${item.id}`);
  };
  
  useEffect(() => {
    setImageUri(getImageUrl(item?.image));
  }, [item?.image]);
  
  const handleImageError = () => {
    setImageUri(defaultImage);
  };

  if (isFirst) {
    return (
      <TouchableOpacity 
        style={styles.featuredCard} 
        activeOpacity={0.9}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onPress={handlePress}
      >
        <View style={{ position: 'relative' }}>
          <Image 
            source={{ uri: imageUri }} 
            style={[
              styles.featuredCardImage,
              isHovered && styles.featuredCardImageHover
            ]}
            onError={handleImageError}
            defaultSource={{ uri: defaultImage }}
            resizeMode="cover"
          />
        </View>
        <View style={styles.featuredContent}>
          <Text style={styles.featuredCategory}>{item?.category || 'Featured'}</Text>
          <Text style={styles.featuredTitle}>
            {item?.title || 'Untitled Article'}
          </Text>
          <Text style={styles.featuredExcerpt} numberOfLines={2}>
            {item?.excerpt || ''}
          </Text>
          <View style={styles.featuredMeta}>

            <View style={[styles.readMoreContainer, isHovered && { 
              opacity: 1, 
              transform: [
                { translateX: 0 },
                { translateY: '-50%' },
                { perspective: 1000 },
                { rotateY: '0deg' },
                { rotateZ: '0deg' },
              ],
              boxShadow: '-5px 0 15px rgba(0,0,0,0.3)',
              shadowColor: '#000',
              shadowOffset: { width: -5, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }]}>
              <Text style={[styles.readMore, isHovered && { letterSpacing: 1 }]}>
                Read Full Story
              </Text>
              <Text style={[styles.readMoreIcon, isHovered && { transform: [{ translateX: 3 }] }]}>
                →
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isHovered && styles.cardHover,
        bigTrending && styles.trendingCard,
      ]}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.cardImageWrapper}>
        <Image
          source={{ uri: imageUri }}
          style={styles.cardImage}
          onError={handleImageError}
          defaultSource={{ uri: defaultImage }}
          resizeMode="cover"
        />
        <View
          style={[
            styles.cardOverlay,
            isHovered && styles.cardOverlayHover
          ]}
        >
          <Text style={styles.cardReadMore}>Read Full Story</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardCategory}>
          {item?.category || 'General'}
        </Text>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item?.title || 'Untitled Article'}
        </Text>
        <Text style={styles.cardTimeStamp}>
          {item?.date || ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const HeadlineCard = ({ item }) => (
  <View style={styles.headlineCard}>
    <Text style={styles.headlineCategory}>{item?.category || 'News'}</Text>
    <Text style={styles.headlineText} numberOfLines={2}>{item?.title || 'No title available'}</Text>
  </View>
);

const SkeletonLoader = () => (
  <View style={styles.newsMainRow}>
    <View style={styles.leftColWrapper}>
      <Text style={styles.latestContentTitle}>Latest Content</Text>
      <View style={styles.trendingCardWrapper}>
        <View style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonText} />
          <View style={[styles.skeletonText, { width: '60%' }]} />
        </View>
      </View>
      <FlatList
        data={[1, 2, 3, 4, 5, 6]} // Show 6 skeleton cards
        renderItem={() => (
          <View style={styles.skeletonCard}>
            <View style={styles.skeletonImage} />
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonText} />
          </View>
        )}
        keyExtractor={(item, index) => `skeleton-${index}`}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContainer}
        scrollEnabled={false}
      />
    </View>
    <View style={styles.rightCol}>
      <ScrollView style={styles.rightColScroll} contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={styles.freshStoriesSection}>
          <Text style={styles.freshStoriesHeader}>Trending Stories</Text>
          <Text style={styles.freshStoriesSubheader}>Most visited in last 3 days</Text>
          <View style={styles.freshStoryList}>
            {[1, 2, 3].map((item, index) => (
              <View key={`skeleton-trending-${index}`} style={styles.freshStoryItem}>
                <View style={[styles.skeletonText, { height: 14, width: '90%' }]} />
                <View style={[styles.skeletonText, { height: 12, width: '60%', marginTop: 4 }]} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  </View>
);

const TrendingStoryItem = ({ item, index }) => {
  const router = useRouter();

  const [imageUri, setImageUri] = useState(getImageUrl(item?.image));
  const [isHovered, setIsHovered] = useState(false);

  const handlePress = () => {
    router.push(`/news/article/${item.id}`);
  };

  useEffect(() => {
    setImageUri(getImageUrl(item?.image));
  }, [item?.image]);

  const handleImageError = () => {
    setImageUri(defaultImage);
  };

  return (
    <TouchableOpacity
      key={item.id}
      onPress={handlePress}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      activeOpacity={0.9}
      style={[
        styles.topTrendingItem,
        isHovered && styles.topTrendingItemHover
      ]}
    >
      {index < 3 ? (
        <View>
          <Image
            source={{ uri: imageUri }}
            style={styles.topTrendingImage}
            onError={handleImageError}
            defaultSource={{ uri: defaultImage }}
            resizeMode="cover"
          />
          <View style={styles.topTrendingContent}>
            <Text style={styles.topTrendingTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.topTrendingMeta}>
              <Text style={styles.topTrendingCategory}>{item.category?.toUpperCase()}</Text>
              <Text style={styles.topTrendingDate}>{item.published_at ? new Date(item.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</Text>
            </View>
          </View>
        </View>
      ) : (
        <React.Fragment>
          <View
            style={[
              styles.freshStoryItem,
              isHovered && styles.freshStoryItemHover
            ]}
          >
            <Text style={styles.freshStoryTitle}>
              <Text style={styles.freshStoryTitleBold}>{item.category?.toUpperCase()} |</Text> {item.title}
            </Text>
            <View style={styles.freshStoryMetaRow}>
              <Text style={styles.freshStoryCategory}>{item.category?.toUpperCase()}</Text>
              <Text style={styles.freshStoryDate}>  {item.published_at ? new Date(item.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</Text>
            </View>
          </View>
          <View style={styles.freshStoryDivider} />
        </React.Fragment>
      )}
    </TouchableOpacity>
  );
};

const TrendingModal = ({ visible, onClose, trendingStories, displayedTrendingStories, handleLoadMore }) => {
  const hasMoreTrending = trendingStories.length > displayedTrendingStories;
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Trending Stories</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.8}
            >
              <MaterialIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={true} style={{ maxHeight: 400 }}>
            <Text style={{
              fontSize: 14,
              color: '#6b7280',
              marginBottom: 16,
              textAlign: 'center'
            }}>
              Most visited in last 3 days
            </Text>
            
            <View style={styles.freshStoryList}>
              {(Array.isArray(trendingStories) ? trendingStories.slice(0, displayedTrendingStories) : []).map((item, index) => (
                <TrendingStoryItem key={item.id} item={item} index={index} />
              ))}
            </View>
            
            {hasMoreTrending && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMore}
                activeOpacity={0.8}
              >
                <Text style={styles.loadMoreButtonText}>Load More Trending</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function NewsScreen() {
  const [newsData, setNewsData] = useState(fallbackNewsData);
  const [trendingStories, setTrendingStories] = useState([]);
  const { activeGenre, setActiveGenre } = useNewsStore();
  const [currentUser, setCurrentUser] = useState(null);
  const [displayedArticles, setDisplayedArticles] = useState(9); // For pagination on featured tabs
  const [displayedTrendingStories, setDisplayedTrendingStories] = useState(10); // For pagination of trending stories
  const [displayedNewsItems, setDisplayedNewsItems] = useState(6); // For pagination of news items on News tab
  const [loading, setLoading] = useState(false);
  const [activeRequests, setActiveRequests] = useState(new Set()); // Track active requests to prevent duplicates
  const [screenWidth, setScreenWidth] = useState(1000); // Default width for SSR
  const router = useRouter();
  const { recordView, recordReaction, recordTimeSpent } = useInteractionTracking(currentUser?.id);

  // Modal state for trending stories on mobile
  const [showTrendingModal, setShowTrendingModal] = useState(false);

  // State for featured image with error handling
  const [featuredImageUri, setFeaturedImageUri] = useState(defaultImage);

  // Listen for screen size changes
  useEffect(() => {
    // Set actual screen width on mount
    setScreenWidth(Dimensions.get('window').width);
    
    const onChange = (result) => {
      setScreenWidth(result.window.width);
    };
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  // Determine if we should use mobile layout
  const isMobile = screenWidth <= 700;
  const isTinyScreen = screenWidth < 380;

  // Read genre from URL query parameters and set active genre
  useEffect(() => {
    console.log('🔍 News page - router.query:', router.query);
    console.log('🔍 News page - current activeGenre:', activeGenre);
    
    // Debug: Show the actual URL
    if (typeof window !== 'undefined' && window.location) {
      console.log('🔍 Current URL:', window.location.href);
      console.log('🔍 URL search:', window.location.search);
    }
    
    // Clear any existing localStorage cache that might interfere
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('activeGenre');
        console.log('🔍 Cleared activeGenre from localStorage');
      }
    } catch (error) {
      console.log('Error clearing localStorage:', error);
    }
    
    let genreFromQuery = null;
    
    // Try to get genre from router.query first
    if (router.query?.genre) {
      genreFromQuery = router.query.genre;
      console.log('🔍 Found genre from router.query:', genreFromQuery);
    } else {
      // Fallback to window.location for web
      if (typeof window !== 'undefined' && window.location) {
        const urlParams = new URLSearchParams(window.location.search);
        genreFromQuery = urlParams.get('genre');
        console.log('🔍 Found genre from window.location:', genreFromQuery);
      }
    }
    
    if (genreFromQuery) {
      console.log('🔍 Final genre from URL:', genreFromQuery);
      
      // Map home page genres to NewsNavbar sections
      const genreMapping = {
        'articles': 'Articles',
        'sports': 'Sports', 
        'opinions': 'Opinion',
        'opinion': 'Opinion', // Keep for backward compatibility
        'editorial': 'Editorial',
        'creative': 'Creative',
        'literary': 'Literary Works',
        'featured': 'Featured',
        'news': 'News'
      };
      
      const mappedGenre = genreMapping[genreFromQuery.toLowerCase()];
      console.log('🔍 Mapped genre:', mappedGenre);
      
      // Only set if it's a valid genre that exists in NewsNavbar
      const validGenres = ['Featured', 'News', 'Articles', 'Opinion', 'Sports', 'Editorial', 'Creative', 'Literary Works'];
      
      if (mappedGenre && validGenres.includes(mappedGenre)) {
        // Force set the genre from URL parameter with a delay
        setTimeout(() => {
          console.log('🔍 Force setting activeGenre to:', mappedGenre);
          setActiveGenre(mappedGenre);
        }, 100);
      }
    } else {
      console.log('🔍 No genre parameter found in URL');
    }
  }, [router.query?.genre, setActiveGenre, activeGenre]);

  // Fetch News/genre data whenever the active genre changes
  useEffect(() => {
    const fetchInitialNewsData = async () => {
      // Track requests per-genre so switching tabs still triggers a fetch
      const requestId = `initial-news-${activeGenre}`;
      if (activeRequests.has(requestId)) return;

      // No cache check - always fetch fresh data

      setActiveRequests(prev => new Set(prev).add(requestId));
      setLoading(true);

      try {
        let url;
        let isCreativeFetch = activeGenre === 'Creative';
        
        // Map frontend genre names to database genre values
        const genreToDatabase = {
          'Articles': 'articles',
          'Opinion': 'opinions',
          'Sports': 'sports',
          'Editorial': 'editorial',
          'Creative': 'creative',
          'Literary Works': 'literary'
        };
        
        if (isCreativeFetch) {
          // Fetch creative works
          url = '/creatives-published';
        } else if (activeGenre !== 'News') {
          // For featured tabs: fetch latest articles by genre (Articles, Opinion, Sports, Editorial)
          const dbGenre = genreToDatabase[activeGenre] || activeGenre.toLowerCase();
          url = `/public/latest-articles?genre=${dbGenre}`;
        } else {
          // For News tab: fetch latest articles across all genres for main content
          url = '/public/latest-articles';
        }

        const res = await apiClient.get(url);
        console.log('API Response for', activeGenre, ':', res);
        
        if (Array.isArray(res.data?.data)) {
          console.log('API returned', res.data.data.length, 'items for', activeGenre);
          
          // Sequential loading: Load first 5 immediately, then load rest in batches
          const allItems = res.data.data;
          const batchSize = 5;
          const initialBatch = allItems.slice(0, batchSize);
          const remainingItems = allItems.slice(batchSize);
          
          // Map and display first batch immediately
          const initialMapped = initialBatch.map(item => {
            if (isCreativeFetch) {
              return {
                id: item.id?.toString() || '',
                title: item.title,
                excerpt: item.caption,
                image: item.media && item.media.length > 0 
                  ? `${process.env.EXPO_PUBLIC_API_URL}/api/storage/app/public/${item.media[0].file_path.replace('public/', '')}`
                  : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070',
                date: item.published_at ? new Date(item.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
                category: `${item.genre.charAt(0).toUpperCase() + item.genre.slice(1)} Creative`,
              };
            } else {
              return {
                id: item.id?.toString() || '',
                title: item.title,
                excerpt: '',
                image: item.media && item.media.length > 0 
                  ? `${process.env.EXPO_PUBLIC_API_URL}/api/storage/app/public/${item.media[0].file_path.replace('public/', '')}`
                  : (item.image || item.image_path || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070'),
                date: item.published_at ? new Date(item.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
                category: item.genre || 'News',
              };
            }
          });
          
          // Set initial data immediately for fast loading
          setNewsData(initialMapped);
          
          // Load remaining items sequentially in background
          const loadRemainingBatches = async () => {
            const finalMapped = [...initialMapped];
            
            for (let i = 0; i < remainingItems.length; i += batchSize) {
              const batch = remainingItems.slice(i, i + batchSize);
              
              // Small delay between batches for smooth loading
              await new Promise(resolve => setTimeout(resolve, 100));
              
              const batchMapped = batch.map(item => {
                if (isCreativeFetch) {
                  return {
                    id: item.id?.toString() || '',
                    title: item.title,
                    excerpt: item.caption,
                    image: item.media && item.media.length > 0 
                      ? `${process.env.EXPO_PUBLIC_API_URL}/api/storage/app/public/${item.media[0].file_path.replace('public/', '')}`
                      : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070',
                    date: item.published_at ? new Date(item.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
                    category: `${item.genre.charAt(0).toUpperCase() + item.genre.slice(1)} Creative`,
                  };
                } else {
                  return {
                    id: item.id?.toString() || '',
                    title: item.title,
                    excerpt: '',
                    image: item.media && item.media.length > 0 
                      ? `${process.env.EXPO_PUBLIC_API_URL}/api/storage/app/public/${item.media[0].file_path.replace('public/', '')}`
                      : (item.image || item.image_path || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070'),
                    date: item.published_at ? new Date(item.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
                    category: item.genre || 'News',
                  };
                }
              });
              
              // Update state with new batch to existing data
              finalMapped.push(...batchMapped);
              setNewsData([...finalMapped]);
            }
          };
          
          // Start loading remaining batches
          loadRemainingBatches();
          
          // Cache the full data when done
          const fullMapped = allItems.slice(0, 25).map(item => {
            if (isCreativeFetch) {
              return {
                id: item.id?.toString() || '',
                title: item.title,
                excerpt: item.caption,
                image: item.media && item.media.length > 0 
                  ? `${process.env.EXPO_PUBLIC_API_URL}/api/storage/app/public/${item.media[0].file_path.replace('public/', '')}`
                  : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070',
                date: item.published_at ? new Date(item.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
                category: `${item.genre.charAt(0).toUpperCase() + item.genre.slice(1)} Creative`,
              };
            } else {
              return {
                id: item.id?.toString() || '',
                title: item.title,
                excerpt: '',
                image: item.media && item.media.length > 0 
                  ? `${process.env.EXPO_PUBLIC_API_URL}/api/storage/app/public/${item.media[0].file_path.replace('public/', '')}`
                  : (item.image || item.image_path || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070'),
                date: item.published_at ? new Date(item.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
                category: item.genre || 'News',
              };
            }
          });
          
          // No caching for Creative tab
        } else {
          console.log('No data array found in response:', res.data);
        }
      } catch (error) {
        console.error('Error fetching data for', activeGenre, ':', error);
        console.error('Error response:', error.response);
        console.log('Falling back to dummy data for', activeGenre);
        setNewsData(fallbackNewsData);
      } finally {
        setLoading(false);
        setActiveRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(requestId);
          return newSet;
        });
      }
    };

    fetchInitialNewsData();
  }, [activeGenre]);

  // Cache management functions removed

  // fetch trending stories (most visited in last 3 days) - only once on mount
  useEffect(() => {
    const fetchTrendingStories = async () => {
      const requestId = 'trending-stories';
      if (activeRequests.has(requestId)) return;

      // No cache for trending stories

      setActiveRequests(prev => new Set(prev).add(requestId));

      try {
        const res = await apiClient.get('/public/trending-articles');
        if (Array.isArray(res.data?.data)) {
          const mapped = res.data.data.slice(0, 25).map(a => ({ // Increased to 25 items for more trending stories
            id: a.id?.toString() || '',
            title: a.title,
            category: a.genre || 'News',
            published_at: a.published_at,
            image: getImageUrl(a.image), // Process image URL
          }));
          setTrendingStories(mapped);
          // No caching
        }
      } catch (error) {
        console.log('Error fetching trending stories:', error);
        setTrendingStories([]);
      } finally {
        setActiveRequests(prev => {
          const newSet = new Set(prev);
          newSet.delete(requestId);
          return newSet;
        });
      }
    };

    fetchTrendingStories();
  }, []); // Empty dependency array - only run once on mount

  // Determine if we're on a featured tab (Articles, Opinion, Sports, Editorial, Creative)
  const isFeaturedTab = activeGenre !== 'News';
  
  const featuredStory = Array.isArray(newsData) && newsData.length > 0 ? newsData[0] : null;
  const gridStories = Array.isArray(newsData) ? (isFeaturedTab 
    ? newsData.slice(1, displayedArticles) // For featured tabs: show limited articles
    : newsData.slice(1, displayedNewsItems + 1)) : []; // For News tab: show up to displayedNewsItems + 1 (including the featured story)
  const headlineStories = Array.isArray(newsData) ? newsData.slice(9) : [];
  
  const hasMoreArticles = isFeaturedTab && newsData.length > displayedArticles;
  const hasMoreNewsItems = !isFeaturedTab && newsData.length > displayedNewsItems + 1; // +1 because we exclude the featured story
  const hasMoreTrendingStories = activeGenre === 'News' && trendingStories.length > displayedTrendingStories;
  const hasMoreContent = hasMoreArticles || hasMoreNewsItems || hasMoreTrendingStories;

  const handleLoadMore = () => {
    if (isFeaturedTab) {
      setDisplayedArticles(prev => prev + 6); // Load 6 more news for featured tabs
    } else {
      setDisplayedNewsItems(prev => prev + 6); // Load 6 more news for News tab
    }
    // Only load trending stories when on News tab
    if (activeGenre === 'News') {
      setDisplayedTrendingStories(prev => prev + 8); // Load 8 more trending stories only on News tab
    }
  };

  // Update featured image URI when featured story changes
  useEffect(() => {
    if (featuredStory) {
      setFeaturedImageUri(getImageUrl(featuredStory.image));
    }
  }, [newsData]);

  // Handle navigation for genres that have dedicated pages
  useEffect(() => {
    // Small delay to ensure router is ready
    const timer = setTimeout(() => {
      if (router && activeGenre === 'Featured') {
        router.push('/news/featured');
      } else if (router && activeGenre === 'Literary Works') {
        router.push('/news/literary-works');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [activeGenre, router]);

  return (
    <>
      <View style={styles.container}>
        <AppNavbar />
        <NewsNavbar />
        
        <ScrollView contentContainerStyle={[styles.newsPageScroll, isTinyScreen && styles.newsPageScrollTiny]}>
          {loading ? (
            <SkeletonLoader />
          ) : (
            <>
              <View style={styles.newsMainRow}>
                {/* Full width layout for featured tabs (Articles, Opinion, Sports, Editorial, Creative) */}
                {activeGenre !== 'News' ? (
                  <View style={{ width: '100%', maxWidth: 1300 }}>
                    <Text style={styles.latestContentTitle}>Latest {activeGenre}</Text>
                    <View style={styles.threeColumnGrid}>
                      {featuredStory && (
                        <TouchableOpacity
                          style={[
                            styles.featuredCardWide,
                            isMobile && { flexDirection: 'column', marginBottom: 16 }
                          ]}
                          onPress={() => {
                            if (recordView) recordView(featuredStory.id, 'view');
                            router.push(`/news/article/${featuredStory.id}`);
                          }}
                        >
                          <View style={[
                            styles.featuredImageContainer,
                            isMobile && { 
                              width: '100%', 
                              minWidth: '100%', 
                              maxWidth: '100%', 
                              height: '200px' 
                            }
                          ]}>
                            <Image
                              source={{ uri: featuredImageUri }}
                              style={styles.featuredImageStyle}
                              onError={() => setFeaturedImageUri(defaultImage)}
                              resizeMode="cover"
                            />
                          </View>
                          <View style={[
                            styles.featuredContentContainer,
                            isMobile && { 
                              paddingLeft: 20, 
                              paddingRight: 20, 
                              paddingTop: 16, 
                              paddingBottom: 16 
                            }
                          ]}>
                            <Text style={styles.featuredCategoryLabel}>{activeGenre.toUpperCase()}</Text>
                            <Text style={styles.featuredTitleText}>{featuredStory.title}</Text>
                            <Text style={styles.featuredExcerptText} numberOfLines={3}>
                              {featuredStory.excerpt}
                            </Text>
                            <Text style={styles.featuredMetaInfo}>{featuredStory.date}</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                      {gridStories.map((item) => (
                        <View
                          key={item.id}
                          style={styles.regularCardNarrow}
                        >
                          <NewsCard
                            item={item}
                            compact
                            onInteraction={recordView}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  // Original two-column layout for News tab
                  <>
                    <View style={[styles.leftColWrapper, isTinyScreen && styles.leftColWrapperTiny, { position: 'relative' }]}>
                      {isMobile && (
                        <TouchableOpacity
                          style={[styles.viewTrendingButton, { position: 'absolute', top: 10, right: 10, zIndex: 10 }]}
                          onPress={() => setShowTrendingModal(true)}
                          activeOpacity={0.8}
                        >
                          
                          <Text style={styles.viewTrendingButtonText}>View Trending</Text>
                        </TouchableOpacity>
                      )}
                      <Text style={styles.latestContentTitle}>Latest Content</Text>
                      <View style={styles.trendingCardWrapper}>
                        {featuredStory && (
                          <TouchableOpacity style={styles.trendingContainer}>
                            <NewsCard
                              item={featuredStory}
                              isFirst={true}
                              onInteraction={recordView}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                      {/* Show recommendations only for News tab */}
                      {activeGenre === 'News' && (
                        <RecommendedContent
                          userId={currentUser?.id}
                          onInteraction={recordView}
                        />
                      )}
                      <FlatList
                        data={gridStories}
                        renderItem={({ item }) => (
                          <NewsCard
                            item={item}
                            compact
                            onInteraction={recordView}
                          />
                        )}
                        keyExtractor={item => item.id}
                        key={isMobile ? 'mobile' : 'desktop'}
                        numColumns={isMobile ? 1 : 3}
                        columnWrapperStyle={isMobile ? null : styles.gridRow}
                        contentContainerStyle={isMobile ? null : styles.gridContainer}
                        scrollEnabled={false}
                      />
                    </View>
                    {/* Show right column only on desktop for News tab */}
                    {activeGenre === 'News' && !isMobile && (
                      <View style={styles.rightCol}>
                        <ScrollView style={styles.rightColScroll} contentContainerStyle={{ paddingBottom: 16 }}>
                          <View style={styles.freshStoriesSection}>
                            <Text style={styles.freshStoriesHeader}>Trending Now</Text>
                            <Text style={styles.freshStoriesSubheader}>Most visited in the last 3 days</Text>
                            <View style={styles.freshStoryList}>
                              {(Array.isArray(trendingStories) ? trendingStories.slice(0, displayedTrendingStories) : []).map((item, index) => (
                                <TrendingStoryItem key={item.id} item={item} index={index} />
                              ))}
                            </View>
                          </View>
                        </ScrollView>
                      </View>
                    )}
                  </>
                )}
              </View>
              {hasMoreContent && (
                <TouchableOpacity onPress={handleLoadMore} style={styles.loadMoreButton}>
                  <Text style={styles.loadMoreButtonText}>Load More Content</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Footer Section */}
          <View style={styles.footer}>
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
              <View style={styles.footerSection}>
                <Text style={styles.footerHeading}>Performance</Text>
              </View>
            </View>
            <View style={styles.copyright}>
              <Text>&copy; {new Date().getFullYear()} Fisherman's Network. All rights reserved.</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Trending Stories Modal */}
      <TrendingModal
        visible={showTrendingModal}
        onClose={() => setShowTrendingModal(false)}
        trendingStories={trendingStories}
        displayedTrendingStories={displayedTrendingStories}
        handleLoadMore={() => {
          if (activeGenre === 'News') {
            setDisplayedTrendingStories(prev => prev + 8);
          }
        }}
      />
    </>
  );
}
