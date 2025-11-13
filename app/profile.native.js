import { Link, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ActivityIndicator, Image, Modal, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Navbar from '~/components/Navbar';
import { useAuth } from '~/context/AuthContext';
import apiClient from '~/utils/api';

const InfoCard = ({ icon, label, value }) => (
  <View style={styles.infoCard}>
    <MaterialIcons name={icon} size={24} color="#374151" />
    <View style={styles.infoTextContainer}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'Not set'}</Text>
    </View>
  </View>
);

export default function ProfileScreen() {
  const [navVisible, setNavVisible] = useState(false);
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(true);
  const [activeTab, setActiveTab] = useState('details'); // 'details' or 'bookmarks'
  const [stats, setStats] = useState({ posts: 0, comments: 0 });

  const bottomNavItems = [
    { 
      title: 'Home', 
      icon: 'home', 
      onPress: () => router.push('/home'),
      active: false
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
      active: true
    },
  ];

  const handleLogout = async () => {
    await logout();
  };

  // Fetch bookmarks and stats
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoadingBookmarks(true);
        const [bookmarksRes, topicsRes, commentsRes] = await Promise.all([
          apiClient.get('/bookmarks'),
          apiClient.get('/topics').catch(() => ({ data: [] })),
          apiClient.get('/topics').catch(() => ({ data: [] })) // We'll count comments from topics
        ]);
        
        setBookmarks(bookmarksRes.data);
        
        // Calculate stats
        const userTopics = Array.isArray(topicsRes.data) ? topicsRes.data.filter(t => t.user_id === user.id) : [];
        setStats({
          posts: userTopics.length,
          comments: 0 // Will be updated when we have comments endpoint
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingBookmarks(false);
      }
    };
    
    fetchData();
  }, [user]);

  // Delete bookmark
  const handleDeleteBookmark = async (bookmarkId) => {
    try {
      await apiClient.delete(`/bookmarks/${bookmarkId}`);
      setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text>Could not load profile.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.menuButton} onPress={() => setNavVisible(true)}>
        <MaterialIcons name="menu" size={28} color="#fff" />
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
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Clean Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <Image 
              source={{ uri: user.profile?.avatar || `https://ui-avatars.com/api/?name=${user.name.replace(' ', '+')}&background=4F46E5&color=fff` }}
              style={styles.avatar} 
            />
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
            
            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{bookmarks.length}</Text>
                <Text style={styles.statLabel}>Bookmarks</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.posts}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.comments}</Text>
                <Text style={styles.statLabel}>Comments</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'details' && styles.activeTab]}
            onPress={() => setActiveTab('details')}
          >
            <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'bookmarks' && styles.activeTab]}
            onPress={() => setActiveTab('bookmarks')}
          >
            <Text style={[styles.tabText, activeTab === 'bookmarks' && styles.activeTabText]}>Bookmarks</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'details' ? (
            <>

              {/* Profile Information */}
              <View style={[styles.section, styles.infoSection]}>
                <Text style={[styles.sectionTitle, styles.infoTitle]}>Profile Information</Text>
                <InfoCard icon="book" label="Program" value={user.profile?.program} />
                <InfoCard icon="grid-on" label="Section" value={user.profile?.section} />
                <InfoCard icon="subject" label="Description" value={user.profile?.description} />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsSection}>
                <Link href="/edit-profile" asChild>
                  <TouchableOpacity style={styles.primaryButton}>
                    <MaterialIcons name="edit" size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>Edit Profile</Text>
                  </TouchableOpacity>
                </Link>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <MaterialIcons name="logout" size={18} color="#DC2626" />
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Bookmarks Section */}
              <View style={[styles.section, styles.bookmarksSection]}>
                <Text style={[styles.sectionTitle, styles.bookmarksTitle]}>My Bookmarks</Text>
                
                {loadingBookmarks ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1a237e" />
                    <Text style={styles.loadingText}>Loading bookmarks...</Text>
                  </View>
                ) : bookmarks.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="bookmark-border" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No Bookmarks Yet</Text>
                    <Text style={styles.emptyDescription}>
                      Start highlighting and saving your favorite quotes from articles!
                    </Text>
                  </View>
                ) : (
                  bookmarks.map((bookmark) => (
                    <View key={bookmark.id} style={styles.bookmarkCard}>
                      <View style={styles.bookmarkHeader}>
                        <View style={styles.bookmarkArticleInfo}>
                          <MaterialIcons name="description" size={16} color="#6B7280" />
                          <Text style={styles.bookmarkArticleTitle} numberOfLines={1}>
                            {bookmark.article?.title || 'Article'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteBookmark(bookmark.id)}
                          style={styles.deleteButton}
                        >
                          <MaterialIcons name="delete" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={styles.bookmarkText}>"{bookmark.highlighted_text}"</Text>
                      
                      {bookmark.notes && (
                        <View style={styles.bookmarkNotes}>
                          <MaterialIcons name="chat-bubble-outline" size={14} color="#6B7280" />
                          <Text style={styles.bookmarkNotesText}>{bookmark.notes}</Text>
                        </View>
                      )}
                      
                      <View style={styles.bookmarkFooter}>
                        <Text style={styles.bookmarkDate}>
                          {new Date(bookmark.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </Text>
                        {bookmark.article?.id && (
                          <TouchableOpacity
                            onPress={() => router.push(`/news/article/${bookmark.article.id}`)}
                            style={styles.viewArticleButton}
                          >
                            <Text style={styles.viewArticleText}>View Article</Text>
                            <MaterialIcons name="arrow-forward" size={14} color="#1a237e" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
          )}
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 80,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  infoSection: {
    gap: 12,
  },
  infoTitle: {
    marginBottom: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  actionsSection: {
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  bookmarkCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#111827',
  },
  bookmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookmarkArticleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  bookmarkArticleTitle: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  deleteButton: {
    padding: 6,
  },
  bookmarkText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  bookmarkNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  bookmarkNotesText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
    lineHeight: 18,
  },
  bookmarkFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookmarkDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  viewArticleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewArticleText: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '500',
  },
  menuButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  modalOverlayNav: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalViewNav: {
    width: '75%',
    height: '100%',
    backgroundColor: '#fff',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: Platform.OS === 'android' ? 40 : 8,
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
