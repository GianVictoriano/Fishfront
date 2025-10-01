import { Link, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, SafeAreaView, Platform, TouchableOpacity, Modal, FlatList, Image, ScrollView } from 'react-native';
import Navbar from '../components/Navbar';
import NewsNavbar from '../components/newsnavbar';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 10 : 40,
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
    paddingTop: 36,
    alignItems: 'center',
    backgroundColor: '#f4f6f8',
  },
  newsMainRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    width: '100%',
    maxWidth: 1300,
    alignSelf: 'center',
    gap: 32,
    alignItems: 'flex-start',
  },
  leftColWrapper: {
    flex: 3,
    minWidth: 340,
    maxWidth: 900,
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
    marginBottom: 24,
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
    marginBottom: 12,
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
    marginBottom: 14,
    gap: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 28,
    boxShadow: '0 4px 24px 0 rgba(60,72,88,0.09)',
    border: '1.5px solid #e4e8ee',
    transition: 'box-shadow 0.25s cubic-bezier(.4,2,.6,1), transform 0.18s cubic-bezier(.4,2,.6,1)',
    cursor: 'pointer',
    minWidth: 250,
    maxWidth: 280,
    width: '100%',
  },
  cardHover: {
    boxShadow: '0 10px 32px 0 rgba(60,72,88,0.18)',
    transform: 'translateY(-4px) scale(1.025)',
    borderColor: '#d0d6e0',
  },
  cardImage: {
    width: '100%',
    minWidth: 350,
    maxWidth: 520,
    height: 150,
    objectFit: 'cover',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    transition: 'filter 0.2s',
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    minHeight: 92,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardCategory: {
    fontSize: 12,
    color: '#1769aa',
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactCategory: {
    fontSize: 11,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
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
    color: '#222',
    fontWeight: '500',
    marginBottom: 0,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    lineHeight: 28,
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
    fontWeight: 'bold',
    fontSize: 14,
  },
  rightCol: {
    flex: 1,
    minWidth: 220,
    maxWidth: 300,
    height: '100%',
  },
  freshStoriesSection: {
    marginTop: 32,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#ececec',
  },
  freshStoriesHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 1,
    color: '#111',
  },
  freshStoriesSubheader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
    marginTop: 1,
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
});

// --- COMPONENT CODE MUST BE BELOW STYLES ---

import apiClient from '../utils/api';

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

const NewsCard = ({ item, compact, bigTrending, isFirst }) => {
  const router = useRouter();
  // Default image if none is provided
  const defaultImage = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070';
  
  // Ensure the image URL is properly formatted
  const getImageUrl = (url) => {
    if (!url) return defaultImage;
    // If it's already a full URL, use it as is
    if (url.startsWith('http')) return url;
    // If it's a local path, prepend the API URL
    return `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}${url}`;
  };
  
  const [imageUri, setImageUri] = useState(getImageUrl(item?.image));
  
  // Update imageUri when item changes
  useEffect(() => {
    setImageUri(getImageUrl(item?.image));
  }, [item?.image]);
  
  const handleImageError = () => {
    // If image fails to load, use default image
    setImageUri(defaultImage);
  };
  
  const [isHovered, setIsHovered] = useState(false);

  if (isFirst) {
    return (
      <TouchableOpacity 
        style={styles.featuredCard} 
        activeOpacity={0.9}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onPress={() => router.push(`/news/article/${item.id}`)}
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
            <Text style={styles.featuredDate}>
              {item?.date || new Date().toLocaleDateString()}
            </Text>
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
              <Text style={[styles.readMore, isHovered && { letterSpacing: '1px' }]}>
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
      onPress={() => router.push(`/news/article/${item.id}`)}
      activeOpacity={0.9}
    >
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: imageUri }}
          style={[
            styles.cardImage,
            isHovered && styles.cardImageHover,
            bigTrending && styles.trendingImage,
          ]}
          onError={handleImageError}
          defaultSource={{ uri: defaultImage }}
          resizeMode="cover"
        />
        <View style={[
          styles.cardOverlay,
          isHovered && styles.cardOverlayHover
        ]}>
          <Text style={styles.cardReadMore}>Read Full Story</Text>
        </View>
      </View>
      <View style={[
        styles.cardContent,
        bigTrending && styles.trendingContent,
      ]}>
        <Text style={[
          styles.cardCategory,
          compact && styles.compactCategory,
          bigTrending && styles.trendingCategory,
        ]}>{item?.category || 'General'}</Text>
        <Text
          style={[
            styles.cardTitle,
            compact && styles.compactTitle,
            bigTrending && styles.trendingTitle,
          ]}
          numberOfLines={bigTrending ? 3 : 2}
        >
          {item?.title || 'Untitled Article'}
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

export default function NewsScreen() {
  const [navVisible, setNavVisible] = useState(false);
  const [newsData, setNewsData] = useState(fallbackNewsData);
  const [activeGenre, setActiveGenre] = useState('News');

  useEffect(() => {
    let isMounted = true;
    const url = activeGenre === 'News' ? '/public/articles' : `/public/articles?genre=${activeGenre.toLowerCase()}`;
    console.log(`Fetching articles from ${url}...`);
    apiClient.get(url)
      .then(res => {
        console.log('Articles API response:', res.data);
        if (Array.isArray(res.data?.data)) {
          // Map backend data to match UI expectations
          const mapped = res.data.data.map(article => ({
            id: article.id?.toString() || '',
            title: article.title,
            excerpt: article.content?.slice(0, 120) + (article.content?.length > 120 ? '...' : ''),
            image: article.media && article.media.length > 0 
              ? `${process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')}/storage/${article.media[0].file_path.replace('public/', '')}` 
              : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070',
            date: article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
            category: article.category || (article.user?.name ? 'By ' + article.user.name : 'General'),
          }));
          if (isMounted) setNewsData(mapped);
        }
      })
      .catch(() => {
        // fallback static data
        if (isMounted) setNewsData(fallbackNewsData);
      });
    return () => { isMounted = false; };
  }, [activeGenre]);

  const featuredStory = newsData[0];
  const gridStories = newsData.slice(1, 10);
  const headlineStories = newsData.slice(10);

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'web' ? (
        <>
          <Navbar />
          <NewsNavbar activeGenre={activeGenre} onGenreChange={setActiveGenre} />
        </>
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
                <Navbar onLinkPress={() => setNavVisible(false)} />
                <NewsNavbar activeGenre={activeGenre} onGenreChange={setActiveGenre} />
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}
      <ScrollView contentContainerStyle={styles.newsPageScroll}>
        <View style={styles.newsMainRow}>
          <View style={styles.leftColWrapper}>
            <Text style={styles.latestContentTitle}>Latest Content</Text>
            <View style={styles.trendingCardWrapper}>
              {featuredStory && (
                <TouchableOpacity style={styles.trendingContainer}>
                  <NewsCard item={featuredStory} isFirst={true} />
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={gridStories}
              renderItem={({ item }) => <NewsCard item={item} compact />}
              keyExtractor={item => item.id}
              numColumns={3}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.gridContainer}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          </View>
          <View style={styles.rightCol}>
            <ScrollView style={styles.rightColScroll} contentContainerStyle={{paddingBottom: 16}} showsVerticalScrollIndicator={true}>
            {headlineStories.map(item => (
              <HeadlineCard item={item} key={item.id} />
            ))}
            <View style={styles.freshStoriesSection}>
              <Text style={styles.freshStoriesHeader}>Fresh stories</Text>
              <Text style={styles.freshStoriesSubheader}>TODAY: BROWSE OUR EDITOR'S HAND PICKED ARTICLES!</Text>
              <View style={styles.freshStoryList}>
                <View style={styles.freshStoryItem}>
                  <Text style={styles.freshStoryTitle}><Text style={styles.freshStoryTitleBold}>LITERARY |</Text> gutom na rin ako, kaso pamasaha na lang ang meron ako</Text>
                  <View style={styles.freshStoryMetaRow}>
                    <Text style={styles.freshStoryCategory}>LITERARY</Text>
                    <Text style={styles.freshStoryDate}>  March 21, 2025</Text>
                  </View>
                </View>
                <View style={styles.freshStoryDivider} />
                <View style={styles.freshStoryItem}>
                  <Text style={styles.freshStoryTitle}><Text style={styles.freshStoryTitleBold}>NEWS |</Text> BatStateU, SP strengthen global ties; propose community solutions</Text>
                  <View style={styles.freshStoryMetaRow}>
                    <Text style={styles.freshStoryCategory}>NEWS</Text>
                    <Text style={styles.freshStoryDate}>  March 19, 2025</Text>
                  </View>
                </View>
                <View style={styles.freshStoryDivider} />
                <View style={styles.freshStoryItem}>
                  <Text style={styles.freshStoryTitle}><Text style={styles.freshStoryTitleBold}>EDITORIAL |</Text> Pulling Out the Thorns</Text>
                  <View style={styles.freshStoryMetaRow}>
                    <Text style={styles.freshStoryCategory}>EDITORIAL</Text>
                    <Text style={styles.freshStoryDate}>  March 11, 2025</Text>
                  </View>
                </View>
                <View style={styles.freshStoryDivider} />
                <View style={styles.freshStoryItem}>
                  <Text style={styles.freshStoryTitle}>People Power is not a relic of the past. It is a reminder, a warning, and a call to action.</Text>
                </View>
              </View>
            </View>
          </ScrollView>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
