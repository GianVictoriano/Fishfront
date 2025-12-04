import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { ActivityIndicator, Image, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Navbar from '~/components/Navbar';
import apiClient from '~/utils/api';

export default function UserProfileScreen() {
  const router = useRouter();
  const { id: userId } = useLocalSearchParams();
  const [user, setUser] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [stats, setStats] = useState({ posts: 0, comments: 0, bookmarks: 0 });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        // Fetch user profile
        const userRes = await apiClient.get(`/users/${userId}`);
        setUser(userRes.data);
        
        // Fetch user's public bookmarks
        const bookmarksRes = await apiClient.get(`/users/${userId}/bookmarks`).catch(() => ({ data: [] }));
        setBookmarks(bookmarksRes.data || []);
        
        // Fetch user stats
        const postsCountRes = await apiClient.get(`/users/${userId}/posts-count`).catch(() => ({ data: { count: 0 } }));
        const commentsRes = await apiClient.get(`/users/${userId}/comments-count`).catch(() => ({ data: { count: 0 } }));
        const bookmarksCountRes = await apiClient.get(`/users/${userId}/bookmarks-count`).catch(() => ({ data: { count: 0 } }));
        
        setStats({
          posts: postsCountRes.data.count || 0,
          comments: commentsRes.data.count || 0,
          bookmarks: bookmarksCountRes.data.count || 0
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [userId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Navbar />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Navbar />
        <View style={styles.centered}>
          <Text style={styles.errorText}>User not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Check if user has anonymous mode enabled
  if (user.profile?.is_anonymous === 1 || user.profile?.is_anonymous === true) {
    return (
      <SafeAreaView style={styles.container}>
        <Navbar />
        <View style={styles.centered}>
          <Feather name="eye-off" size={64} color="#9CA3AF" />
          <Text style={styles.errorText}>Profile Hidden</Text>
          <Text style={styles.emptyDescription}>
            This user has enabled anonymous mode and their profile is not visible.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Navbar />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButtonTop} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#111827" />
            <Text style={styles.backButtonTopText}>Back</Text>
          </TouchableOpacity>
          
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
                <Text style={styles.statValue}>{stats.bookmarks}</Text>
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

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'details' && styles.activeTab]}
            onPress={() => setActiveTab('details')}
          >
            <Feather name="user" size={20} color={activeTab === 'details' ? '#111827' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'bookmarks' && styles.activeTab]}
            onPress={() => setActiveTab('bookmarks')}
          >
            <Feather name="bookmark" size={20} color={activeTab === 'bookmarks' ? '#111827' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'bookmarks' && styles.activeTabText]}>Bookmarks</Text>
            {bookmarks.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{bookmarks.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.profileContent}>
          {activeTab === 'details' ? (
            <>
              {/* Profile Information */}
              <View style={[styles.section, styles.infoSection]}>
                <Text style={[styles.sectionTitle, styles.infoTitle]}>Profile Information</Text>
                
                {user.profile?.program && (
                  <View style={styles.infoCard}>
                    <Feather name="book-open" size={24} color="#374151" />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Program</Text>
                      <Text style={styles.infoValue}>{user.profile.program}</Text>
                    </View>
                  </View>
                )}
                
                {user.profile?.section && (
                  <View style={styles.infoCard}>
                    <Feather name="grid" size={24} color="#374151" />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Section</Text>
                      <Text style={styles.infoValue}>{user.profile.section}</Text>
                    </View>
                  </View>
                )}
                
                {user.profile?.description && (
                  <View style={styles.infoCard}>
                    <Feather name="align-left" size={24} color="#374151" />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Description</Text>
                      <Text style={styles.infoValue}>{user.profile.description}</Text>
                    </View>
                  </View>
                )}
                
                {!user.profile?.program && !user.profile?.section && !user.profile?.description && (
                  <Text style={styles.noInfo}>No profile information available</Text>
                )}
              </View>
            </>
          ) : (
            <>
              {/* Bookmarks Section */}
              <View style={[styles.section, styles.bookmarksSection]}>
                <Text style={[styles.sectionTitle, styles.bookmarksTitle]}>Public Bookmarks</Text>
                
                {bookmarks.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Feather name="bookmark" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No Public Bookmarks</Text>
                    <Text style={styles.emptyDescription}>
                      This user hasn't shared any bookmarks yet.
                    </Text>
                  </View>
                ) : (
                  bookmarks.map((bookmark) => (
                    <View key={bookmark.id} style={styles.bookmarkCard}>
                      <View style={styles.bookmarkHeader}>
                        <View style={styles.bookmarkArticleInfo}>
                          <Feather name="file-text" size={16} color="#6B7280" />
                          <Text style={styles.bookmarkArticleTitle} numberOfLines={1}>
                            {bookmark.article?.title || 'Article'}
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={styles.bookmarkText}>"{bookmark.highlighted_text}"</Text>
                      
                      {bookmark.notes && (
                        <View style={styles.bookmarkNotes}>
                          <Feather name="message-circle" size={14} color="#6B7280" />
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
                            <Feather name="arrow-right" size={14} color="#111827" />
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 18,
    color: '#DC2626',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'web' ? 20 : 40,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: 20,
    gap: 6,
  },
  backButtonTopText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#d3d6db',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#111827',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  profileContent: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  infoSection: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  bookmarksSection: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FED7AA',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    paddingLeft: 4,
    borderLeftWidth: 3,
  },
  infoTitle: {
    borderLeftColor: '#10B981',
  },
  bookmarksTitle: {
    borderLeftColor: '#F59E0B',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  noInfo: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
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
});
