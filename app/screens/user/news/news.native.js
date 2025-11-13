// app/screens/news/index.web.js
import { Link, useRouter, usePathname } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image, ScrollView, ActivityIndicator, Platform } from 'react-native';
import Navbar from '../../../../components/Navbar';
import NewsNavbar from '../../../../components/newsnavbar';
import apiClient from '../../../../utils/api';
import useNewsStore from '../../../../store/newsStore';
import { MaterialIcons } from '@expo/vector-icons';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    // flex: 1, // Removed to allow bottom navigation to show
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  articlesContainer: {
    padding: 16,
  },
  articleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  articleImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e5e7eb',
  },
  articleContent: {
    padding: 16,
  },
  articleCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 24,
  },
  articleExcerpt: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: 40,
    marginBottom: 40,
    paddingTop: 12,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    fontWeight: '500',
  },
  bottomNavTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
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
    alignSelf: 'center',
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
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: 250,
    maxWidth: 280,
    width: '100%',
  },
  cardImage: {
    width: '100%',
    minWidth: 350,
    maxWidth: 520,
    height: 150,
    resizeMode: 'cover',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardContent: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    minHeight: 92,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  cardCategory: {
    fontSize: 12,
    color: '#1769aa',
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
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
  },
  featuredContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 25,
    paddingTop: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  featuredCategory: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  featuredTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
    lineHeight: 32,
    color: '#fff',
  },
  featuredExcerpt: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 24,
    marginBottom: 15,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 12,
    paddingHorizontal: 25,
    paddingLeft: 30,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    opacity: 0,
  },
  readMore: {
    color: '#fff',
    fontSize: 15,
    marginRight: 10,
  },
  readMoreIcon: {
    color: '#fff',
    fontSize: 16,
    marginTop: 2,
    marginLeft: 2,
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
});

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

export default function NewsScreen() {
  const [newsData, setNewsData] = useState(fallbackNewsData);
  const { activeGenre } = useNewsStore();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const bottomNavItems = [
    { 
      title: 'Home', 
      icon: 'home', 
      onPress: () => router.push('/home'),
      active: pathname === '/home'
    },
    { 
      title: 'News', 
      icon: 'article', 
      onPress: () => router.push('/news'),
      active: pathname === '/news'
    },
    { 
      title: 'Profile', 
      icon: 'person', 
      onPress: () => router.push('/profile'),
      active: pathname === '/profile'
    },
  ];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const url = activeGenre === 'News' ? '/public/articles' : `/public/articles?genre=${activeGenre.toLowerCase()}`;
    
    apiClient.get(url)
      .then(res => {
        if (isMounted && Array.isArray(res.data?.data)) {
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
          setNewsData(mapped);
        }
      })
      .catch(() => {
        if (isMounted) setNewsData(fallbackNewsData);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [activeGenre]);

  const featuredStory = newsData[0];
  const gridStories = newsData.slice(1, 10);
  const headlineStories = newsData.slice(10);

  return (
    <SafeAreaView style={styles.container}>
      {/* Genre Filter */}
      <NewsNavbar />
      
      <ScrollView style={styles.scrollView}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading articles...</Text>
          </View>
        ) : (
          <View style={styles.articlesContainer}>
            {newsData.map((article, index) => (
              <TouchableOpacity 
                key={article.id}
                style={styles.articleCard}
                onPress={() => router.push(`/news/article/native_article/${article.id}`)}
                activeOpacity={0.7}
              >
                <Image 
                  source={{ uri: article.image }}
                  style={styles.articleImage}
                  resizeMode="cover"
                />
                <View style={styles.articleContent}>
                  <Text style={styles.articleCategory}>{article.category}</Text>
                  <Text style={styles.articleTitle} numberOfLines={2}>{article.title}</Text>
                  <Text style={styles.articleExcerpt} numberOfLines={3}>{article.excerpt}</Text>
                  <View style={styles.articleFooter}>
                    <Text style={styles.articleDate}>{article.date}</Text>
                    <View style={styles.readMoreButton}>
                      <Text style={styles.readMoreText}>Read More</Text>
                      <MaterialIcons name="arrow-forward" size={16} color="#3b82f6" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {bottomNavItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.bottomNavItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={item.icon} 
              size={24} 
              color={item.active ? '#3b82f6' : '#9ca3af'} 
            />
            <Text style={[
              styles.bottomNavText,
              item.active && styles.bottomNavTextActive
            ]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// Add bottom navigation styles
const bottomNavStyles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: Platform.OS === 'android' ? 24 : 8, // Extra padding for Android system nav
    paddingTop: 12,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    fontWeight: '500',
  },
  bottomNavTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});

// Merge styles
Object.assign(styles, bottomNavStyles);