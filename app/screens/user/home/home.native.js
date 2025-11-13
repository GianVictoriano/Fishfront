import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  SafeAreaView, 
  ImageBackground,
  Platform
} from 'react-native';
import { useBranding } from '../../../../context/BrandingContext';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import apiClient from '../../../../utils/api';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const { backgroundUrl } = useBranding();
  const router = useRouter();
  
  console.log('[HomeScreen] backgroundUrl received:', backgroundUrl);
  console.log('[HomeScreen] backgroundUrl type:', typeof backgroundUrl);

  const bottomNavItems = [
    {
      title: 'Home',
      icon: 'home',
      onPress: () => router.push('/home'),
      active: true
    },
    {
      title: 'News',
      icon: 'article',
      onPress: () => router.push('/news'),
      active: false
    },
    {
      title: 'Profile',
      icon: 'person',
      onPress: () => router.push('/profile'),
      active: false
    },
  ];

  // trending state
  const [trending, setTrending] = React.useState([]);
  const [trendingLoading, setTrendingLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await apiClient.get('/public/trending-articles?limit=4');
        const data = res.data?.data || [];
        // map to id title image
        const items = data.map(a => ({
          id: a.id?.toString() || '',
          title: a.title,
          image: a.media && a.media.length ? `${process.env.EXPO_PUBLIC_API_URL?.replace('/api','')}/storage/${a.media[0].file_path.replace('public/','')}` : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070'
        }));
        setTrending(items);
      } catch(e){
        console.log('Failed trending', e);
      } finally {
        setTrendingLoading(false);
      }
    };
    fetchTrending();
  }, []);

  const menuItems = [
    { 
      title: 'News', 
      icon: 'article', 
      onPress: () => router.push('/news'),
      color: '#3b82f6'
    },
    { 
      title: 'Articles', 
      icon: 'description', 
      onPress: () => router.push('/articles'),
      color: '#10b981'
    },
    { 
      title: 'Contribute', 
      icon: 'edit', 
      onPress: () => router.push('/contribute'),
      color: '#f59e0b'
    },
    { 
      title: 'Profile', 
      icon: 'person', 
      onPress: () => router.push('/profile'),
      color: '#8b5cf6'
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Hero Section */}
        <ImageBackground
          source={
            !backgroundUrl || backgroundUrl === null
              ? { uri: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?q=80&w=2070" }
              : typeof backgroundUrl === 'number'
                ? backgroundUrl
                : typeof backgroundUrl === 'string'
                  ? { uri: backgroundUrl }
                  : backgroundUrl
          }
          style={styles.hero}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay}>
            <View style={styles.heroContent}>
              <Text style={styles.welcomeText}>Welcome to</Text>
              <Text style={styles.appName}>Fisherman</Text>
              <Text style={styles.tagline}>
                Building sustainable communities through impactful stories and research
              </Text>
            </View>
          </View>
        </ImageBackground>

        {/* Trending News */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending News</Text>
          {trendingLoading ? (
            <Text style={{ marginTop:8,fontSize:14}}>Loading...</Text>
          ) : (
            <View style={{marginTop:12}}>
              {trending.map(item => (
                <TouchableOpacity key={item.id} onPress={() => router.push(`/news/article/${item.id}`)} style={styles.trendingCard}>
                  <Image source={{ uri: item.image }} style={styles.trendingImage} />
                  <Text style={styles.trendingTitle} numberOfLines={2}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get Started</Text>
          <View style={styles.menuGrid}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.menuItem, { borderLeftColor: item.color }]}
                onPress={item.onPress}
              >
                <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                  <MaterialIcons name={item.icon} size={24} color="white" />
                </View>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemDescription}>
                  {item.title === 'News' && 'Stay updated with latest news and updates'}
                  {item.title === 'Articles' && 'Read in-depth articles and publications'}
                  {item.title === 'Contribute' && 'Share your stories and research'}
                  {item.title === 'Profile' && 'Manage your account and preferences'}
                </Text>
                <MaterialIcons name="arrow-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* About Section */}
        <View style={[styles.section, styles.aboutSection]}>
          <Text style={styles.sectionTitle}>About Fisherman</Text>
          <Text style={styles.aboutText}>
            We are a platform dedicated to fostering sustainable development through storytelling and research.
            Our mission is to connect communities, amplify voices, and drive positive change.
          </Text>

          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>500+</Text>
              <Text style={styles.statLabel}>Articles</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>1000+</Text>
              <Text style={styles.statLabel}>Community Members</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>50+</Text>
              <Text style={styles.statLabel}>Contributors</Text>
            </View>
          </View>
        </View>

        {/* Join Community */}
        <View style={[styles.section, styles.joinSection]}>
          <Text style={styles.sectionTitle}>Join Our Community</Text>
          <Text style={styles.joinText}>
            Become part of a growing community of writers, researchers, and readers passionate about making a difference.
          </Text>
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => router.push('/registration')}
          >
            <Text style={styles.joinButtonText}>Get Started Today</Text>
          </TouchableOpacity>
        </View>
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    // flex: 1, // Removed to allow bottom navigation to show
  },
  menuButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hero: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  welcomeText: {
    fontSize: 18,
    color: '#e2e8f0',
    marginBottom: 8,
    fontWeight: '500',
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 24,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 24,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
  },
  trendingCard:{
    width:'100%',
    marginBottom:16,
  },
  trendingImage:{
    width:'100%',
    height:120,
    borderRadius:12,
  },
  trendingTitle:{
    fontSize:14,
    fontWeight:'600',
    marginTop:8,
    color:'#1e293b',
  },
  menuGrid: {
    gap: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
    flex: 1,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    flex: 1,
  },
  aboutSection: {
    alignItems: 'center',
  },
  aboutText: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  joinSection: {
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
  },
  joinText: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  joinButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  joinButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: Platform.OS === 'android' ? 40 : 8, // Extra padding for Android system nav
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

export default HomeScreen;