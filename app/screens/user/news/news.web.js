// app/screens/news/index.web.js
import { Link, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AppNavbar from '../../../../components/AppNavbar';
import NewsNavbar from '../../../../components/newsnavbar';
import RecommendedContent from '../../../../components/RecommendedContent';
import useInteractionTracking from '../../../../hooks/useInteractionTracking';
import apiClient from '../../../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    color: '#94a3b8',
    fontSize: 14,
  },
  threeColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
    width: '100%',
  },
  featuredCardWide: {
    gridColumn: 'span 4',
    flexDirection: 'row',
    display: 'flex',
    backgroundColor: '#fff',
    borderRadius: 0,
    overflow: 'hidden',
    marginBottom: 32,
    boxShadow: 'none',
    border: 'none',
    minHeight: 280,
  },
  featuredImageContainer: {
    width: '35%',
    minWidth: '35%',
    maxWidth: '35%',
    overflow: 'hidden',
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

const NewsCard = ({ item, compact, bigTrending, isFirst, onInteraction }) => {
  const router = useRouter();
  const defaultImage = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070';
  
  const getImageUrl = (url) => {
    if (!url) return defaultImage;
    // Convert to string if it's a number or other type
    const urlStr = String(url);
    if (urlStr.startsWith('http')) return urlStr;
    return `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}${urlStr}`;
  };
  
  const [imageUri, setImageUri] = useState(getImageUrl(item?.image));
  const [isHovered, setIsHovered] = useState(false);
  
  const handlePress = () => {
    if (onInteraction) {
      onInteraction(item.id, 'view');
    }
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

export default function NewsScreen() {
  const [newsData, setNewsData] = useState(fallbackNewsData);
  const [trendingStories, setTrendingStories] = useState([]);
  const { activeGenre, setActiveGenre } = useNewsStore();
  const [currentUser, setCurrentUser] = useState(null);
  const [displayedArticles, setDisplayedArticles] = useState(9); // For pagination on featured tabs
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { recordView, recordReaction, recordTimeSpent } = useInteractionTracking(currentUser?.id);

  // State for request management
  const [activeRequests, setActiveRequests] = useState(new Set());

  // Get current user for personalization
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token'); 
        if (token) {
          const userData = await AsyncStorage.getItem('user_data');
          if (userData) {
            setCurrentUser(JSON.parse(userData));
          } else {
            // Fallback: fetch from API
            const response = await apiClient.get('/user');
            setCurrentUser(response.data);
          }
        }
      } catch (error) {
        console.log('User not authenticated');
      }
    };
    getCurrentUser();
  }, []);

  // Cache management functions
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  const getCachedData = async (key) => {
    try {
      const cached = await AsyncStorage.getItem(`news_cache_${key}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const { data, timestamp } = parsed || {};
        if (data && typeof timestamp === 'number' && Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    } catch (error) {
      console.log('Cache read error:', error);
    }
    return null;
  };

  const setCachedData = async (key, data) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(`news_cache_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.log('Cache write error:', error);
    }
  };

  // fetch trending stories (most visited in last 3 days) - only once on mount
  useEffect(() => {
    const fetchTrendingStories = async () => {
      const requestId = 'trending-stories';
      if (activeRequests.has(requestId)) return;

      // Check cache first
      const cachedData = await getCachedData('trending-stories');
      if (cachedData) {
        setTrendingStories(cachedData);
        return;
      }

      setActiveRequests(prev => new Set(prev).add(requestId));

      try {
        const res = await apiClient.get('/public/trending-articles');
        if (Array.isArray(res.data?.data)) {
          const mapped = res.data.data.slice(0, 10).map(a => ({ // Limit to 10 items
            id: a.id?.toString() || '',
            title: a.title,
            category: a.genre || 'News',
            published_at: a.published_at,
            image: a.media && a.media.length > 0
              ? `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}/storage/${a.media[0].file_path.replace('public/', '')}`
              : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070',
          }));
          setTrendingStories(mapped);
          // Cache the result
          await setCachedData('trending-stories', mapped);
        }
      } catch (error) {
        console.log('Failed to fetch trending stories:', error);
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
  }, []);

  useEffect(() => {
    const fetchNewsData = async () => {
      const requestId = `news-${activeGenre}`;
      if (activeRequests.has(requestId)) return;

      // Check cache first
      const cacheKey = `news-${activeGenre}`;
      const cachedData = await getCachedData(cacheKey);
      if (cachedData) {
        setNewsData(cachedData);
        setLoading(false);
        return;
      }

      setActiveRequests(prev => new Set(prev).add(requestId));
      let isMounted = true;

      setLoading(true);
      // Reset displayed articles count when changing tabs
      setDisplayedArticles(9);

      try {
        // For tabs other than News and Creative, fetch featured (trending) content
        const shouldUseFeatured = activeGenre !== 'News' && activeGenre !== 'Creative';
        const url = shouldUseFeatured
          ? `/public/trending-articles?genre=${activeGenre.toLowerCase()}`
          : (activeGenre === 'News' ? '/public/articles' : `/public/articles?genre=${activeGenre.toLowerCase()}`);

        const res = await apiClient.get(url);

        if (isMounted && Array.isArray(res.data?.data)) {
          // Limit initial load to improve performance
          const limit = shouldUseFeatured ? 20 : 15;
          const mapped = res.data.data.slice(0, limit).map(article => ({
            id: article.id?.toString() || '',
            title: article.title,
            excerpt: '', // Removed content display to reduce payload
            image: article.media && article.media.length > 0
              ? `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}/storage/${article.media[0].file_path.replace('public/', '')}`
              : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070',
            date: article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
            category: article.genre || 'News',
          }));
          setNewsData(mapped);
          // Cache the result
          await setCachedData(cacheKey, mapped);
        }
      } catch (error) {
        console.log(`Failed to fetch ${activeGenre} data:`, error);
        if (isMounted) setNewsData(fallbackNewsData);
      } finally {
        if (isMounted) {
          setLoading(false);
          setActiveRequests(prev => {
            const newSet = new Set(prev);
            newSet.delete(requestId);
            return newSet;
          });
        }
      }

      return () => { isMounted = false; };
    };

    fetchNewsData();
  }, [activeGenre]);

  // Determine if we're on a featured tab (Articles, Opinion, Sports, Editorial)
  const isFeaturedTab = activeGenre !== 'News' && activeGenre !== 'Creative';
  
  const featuredStory = newsData[0];
  const gridStories = isFeaturedTab 
    ? newsData.slice(1, displayedArticles) // For featured tabs: show limited articles
    : newsData.slice(1, 7); // For News tab: show up to 8 articles
  const headlineStories = newsData.slice(9);
  
  const hasMoreArticles = isFeaturedTab && newsData.length > displayedArticles;
  
  const handleLoadMore = () => {
    setDisplayedArticles(prev => prev + 8);
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppNavbar />
      <NewsNavbar />
      
      <ScrollView contentContainerStyle={styles.newsPageScroll}>
        {loading ? (
          <SkeletonLoader />
        ) : (
          <>
            <View style={styles.newsMainRow}>
              {/* Full width layout for featured tabs (Articles, Opinion, Sports, Editorial) */}
              {activeGenre !== 'News' && activeGenre !== 'Creative' ? (
                <View style={{ width: '100%', maxWidth: 1300 }}>
                  <Text style={styles.latestContentTitle}>Featured Content</Text>
                  <View style={styles.threeColumnGrid}>
                    {featuredStory && (
                      <TouchableOpacity
                        style={styles.featuredCardWide}
                        onPress={() => {
                          if (recordView) recordView(featuredStory.id, 'view');
                          router.push(`/news/article/${featuredStory.id}`);
                        }}
                      >
                        <View style={styles.featuredImageContainer}>
                          <Image
                            source={{ uri: featuredStory.image || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070' }}
                            style={styles.featuredImageStyle}
                            resizeMode="cover"
                          />
                        </View>
                        <View style={styles.featuredContentContainer}>
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
                  {hasMoreArticles && (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={handleLoadMore}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.loadMoreButtonText}>Load More Articles</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                // Original two-column layout for News tab
                <>
                  <View style={styles.leftColWrapper}>
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
                      numColumns={3}
                      columnWrapperStyle={styles.gridRow}
                      contentContainerStyle={styles.gridContainer}
                      scrollEnabled={false}
                    />
                  </View>
                  {activeGenre === 'News' && (
                    <View style={styles.rightCol}>
                      <ScrollView style={styles.rightColScroll} contentContainerStyle={{ paddingBottom: 16 }}>
                        <View style={styles.freshStoriesSection}>
                          <Text style={styles.freshStoriesHeader}>Trending Stories</Text>
                          <Text style={styles.freshStoriesSubheader}>Most visited in last 3 days</Text>
                          <View style={styles.freshStoryList}>
                            {trendingStories.map((item, index) => (
                              <TouchableOpacity key={item.id} onPress={() => router.push(`/news/article/${item.id}`)}>
                                {index < 3 ? (
                                  <View style={styles.topTrendingItem}>
                                    <Image
                                      source={{ uri: item.image }}
                                      style={styles.topTrendingImage}
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
                                  <>
                                    <View style={styles.freshStoryItem}>
                                      <Text style={styles.freshStoryTitle}>
                                        <Text style={styles.freshStoryTitleBold}>{item.category?.toUpperCase()} |</Text> {item.title}
                                      </Text>
                                      <View style={styles.freshStoryMetaRow}>
                                        <Text style={styles.freshStoryCategory}>{item.category?.toUpperCase()}</Text>
                                        <Text style={styles.freshStoryDate}>  {item.published_at ? new Date(item.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</Text>
                                      </View>
                                    </View>
                                    <View style={styles.freshStoryDivider} />
                                  </>
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
            </View>

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
              </View>
              <View style={styles.copyright}>
                <Text>&copy; {new Date().getFullYear()} Fisherman's Network. All rights reserved.</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}