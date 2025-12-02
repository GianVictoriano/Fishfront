import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../utils/api';
import { useBranding } from '~/context/BrandingContext';
import Navbar from '../../components/Navbar';
import NewsNavbar from '../../components/newsnavbar';
import useNewsStore from '../../store/newsStore';
import useInteractionTracking from '../../hooks/useInteractionTracking';

export default function LiteraryWorksScreen() {
  const router = useRouter();
  const { colors } = useBranding();
  const { setActiveGenre } = useNewsStore();
  const [literaryWorks, setLiteraryWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedWork, setSelectedWork] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [reactingType, setReactingType] = useState(null);
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [flipbookOpenTime, setFlipbookOpenTime] = useState(null);
  const { recordView } = useInteractionTracking(currentUser?.id);

  const fetchLiteraryWorks = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/literary-works');
      
      if (response.data.success && Array.isArray(response.data.data)) {
        const allWorks = response.data.data;
        const batchSize = 5;
        const initialBatch = allWorks.slice(0, batchSize);
        const remainingWorks = allWorks.slice(batchSize);
        
        // Display first batch immediately for fast loading
        setLiteraryWorks(initialBatch);
        
        // Load remaining works sequentially in background
        const loadRemainingBatches = async () => {
          const finalWorks = [...initialBatch];
          
          for (let i = 0; i < remainingWorks.length; i += batchSize) {
            const batch = remainingWorks.slice(i, i + batchSize);
            
            // Small delay between batches for smooth loading
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Append batch to existing data
            finalWorks.push(...batch);
            setLiteraryWorks([...finalWorks]);
          }
        };
        
        // Start loading remaining batches
        loadRemainingBatches();
      }
    } catch (error) {
      console.error('Error fetching literary works:', error);
      Alert.alert('Error', 'Failed to fetch literary works');
      setLiteraryWorks([]); // Set empty array on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Get current user for tracking
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          const userData = await AsyncStorage.getItem('user_data');
          if (userData) {
            const user = JSON.parse(userData);
            setCurrentUser(user);
          } else {
            // Fallback: fetch from API
            const response = await apiClient.get('/user');
            setCurrentUser(response.data);
          }
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    // Set the active genre to Literary Works when component mounts
    setActiveGenre('Literary Works');
    fetchLiteraryWorks();
  }, []);

  useEffect(() => {
    // Prevent zoom propagation when modal is open
    if (previewModalVisible && Platform.OS === 'web') {
      // Add CSS to prevent body zoom
      const style = document.createElement('style');
      style.textContent = `
        body {
          touch-action: none;
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
        * {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `;
      style.id = 'zoom-prevention';
      document.head.appendChild(style);

      // Prevent default zoom behavior
      const preventZoom = (e) => {
        if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '0')) {
          e.preventDefault();
        }
        if (e.ctrlKey && e.wheelDeltaY !== 0) {
          e.preventDefault();
        }
      };

      document.addEventListener('wheel', preventZoom, { passive: false });
      document.addEventListener('keydown', preventZoom);

      return () => {
        // Cleanup
        const existingStyle = document.getElementById('zoom-prevention');
        if (existingStyle) {
          document.head.removeChild(existingStyle);
        }
        document.removeEventListener('wheel', preventZoom);
        document.removeEventListener('keydown', preventZoom);
      };
    }
  }, [previewModalVisible]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLiteraryWorks();
  };

  const react = async (type) => {
    if (!selectedWork || reactingType) return; // Prevent multiple clicks
    
    try {
      setReactingType(type);
      console.log('Sending reaction:', type);
      const response = await apiClient.post(`/literary-works/${selectedWork.id}/react`, { type });
      
      // Update UI with server response
      if (response.data && response.data.metrics) {
        setSelectedWork(prev => ({
          ...prev,
          metrics: {
            ...prev.metrics,
            ...response.data.metrics,
            visits: prev.metrics?.visits || 0, // Preserve visits count
          },
          userReaction: response.data.metrics.userReaction || type,
        }));
      }
      
      // Close modals after reacting
      setTimeout(() => {
        setShowReactionModal(false);
        setPreviewModalVisible(false);
        setFlipbookOpenTime(null);
      }, 500);
    } catch (e) {
      console.error('Error reacting:', e);
    } finally {
      setReactingType(null);
    }
  };

  const trackTimeSpent = async () => {
    if (!selectedWork || !flipbookOpenTime) return;
    
    try {
      const timeSpent = Math.round((Date.now() - flipbookOpenTime) / 1000); // in seconds
      console.log('⏱️ Time spent on flipbook:', timeSpent, 'seconds');
      
      // Send time spent to backend
      const response = await apiClient.post(`/literary-works/${selectedWork.id}/interaction`, {
        interaction_type: 'time_spent',
        time_spent: timeSpent,
      });
      
      console.log('✅ Time spent tracked:', response.data);
    } catch (error) {
      console.error('Error tracking time spent:', error);
    }
  };

  const handleCloseFlipbook = async () => {
    // Track time spent before closing
    await trackTimeSpent();
    
    // Check if user has already reacted
    const hasReacted = selectedWork?.userReaction !== null && selectedWork?.userReaction !== undefined;
    
    if (hasReacted) {
      // User already reacted, just close without showing modal
      setPreviewModalVisible(false);
      setFlipbookOpenTime(null);
    } else {
      // User hasn't reacted yet, show reaction modal
      setShowReactionModal(true);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'published':
        return 'Published';
      default:
        return 'Draft';
    }
  };

  const handleOpenWork = async (item) => {
    if (item.heyzine_url) {
      let workWithMetrics = { ...item };
      
      // Track the visit and fetch updated metrics
      if (currentUser?.id) {
        try {
          const visitResponse = await apiClient.post(`/literary-works/${item.id}/visit`);
          console.log('✅ Literary work visit tracked:', visitResponse.data);
          console.log('📊 Full response:', JSON.stringify(visitResponse.data, null, 2));
          
          // Check if this is a new visit or repeat
          if (visitResponse.data?.is_new_visit) {
            console.log('🆕 New unique visitor - visit count incremented');
          } else {
            console.log('🔄 Repeat visitor today - visit count not incremented');
          }
          
          // Update work with metrics and user reaction from response
          if (visitResponse.data?.metrics) {
            workWithMetrics.metrics = visitResponse.data.metrics;
            console.log('📈 Metrics updated from visit response:', workWithMetrics.metrics);
          }
          if (visitResponse.data?.userReaction) {
            workWithMetrics.userReaction = visitResponse.data.userReaction;
            console.log('👤 User reaction:', workWithMetrics.userReaction);
          }
        } catch (error) {
          console.error('Error tracking visit:', error);
          console.error('Error details:', error.response?.data);
          
          // Fallback: try to fetch metrics separately
          try {
            const metricsResponse = await apiClient.get(`/literary-works/${item.id}/metrics`);
            console.log('📊 Metrics response:', metricsResponse.data);
            if (metricsResponse.data?.data) {
              workWithMetrics.metrics = metricsResponse.data.data;
              console.log('📈 Metrics updated from fallback:', workWithMetrics.metrics);
            }
          } catch (metricsError) {
            console.error('Error fetching metrics:', metricsError);
          }
        }
      }
      
      console.log('🎬 Opening work with metrics:', workWithMetrics);
      setSelectedWork(workWithMetrics);
      setFlipbookOpenTime(Date.now()); // Record when flipbook opened
      setPreviewModalVisible(true);
    }
  };

  const renderLiteraryWork = ({ item }) => (
    <TouchableOpacity 
      style={styles.workCard}
      onPress={() => handleOpenWork(item)}
    >
      <View style={styles.workHeader}>
        <View style={styles.workInfo}>
          <Text style={styles.workTitle}>{item.title}</Text>
          <Text style={styles.workAuthor}>by {item.user?.name || 'Unknown Author'}</Text>
          {item.description && (
            <Text style={styles.workDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <View style={styles.workFooter}>
        <View style={styles.workMeta}>
          <Text style={styles.workDate}>
            {new Date(item.published_at || item.created_at).toLocaleDateString()}
          </Text>
          {item.heyzine_url && (
            <View style={styles.urlIndicator}>
              <MaterialCommunityIcons name="link-variant" size={14} color="#3B82F6" />
              <Text style={styles.urlText}>Heyzine</Text>
            </View>
          )}
        </View>
        <Feather name="chevron-right" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Navbar />
        <NewsNavbar />
        
        <View style={styles.contentWrapper}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <MaterialCommunityIcons name="book-open-variant" size={28} color={colors.primary || '#1a237e'} />
                <View style={styles.headerText}>
                  <Text style={[styles.headerTitle, { color: colors.primary || '#1a237e' }]}>
                    Literary Works
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    Discover amazing flipbooks and literary pieces
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary || '#1a237e'} />
            <Text style={styles.loadingText}>Loading literary works...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Navbar />
      <NewsNavbar />
      
      {/* Main Content */}
      <View style={styles.contentWrapper}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="book-open-variant" size={28} color={colors.primary || '#1a237e'} />
              <View style={styles.headerText}>
                <Text style={[styles.headerTitle, { color: colors.primary || '#1a237e' }]}>
                  Literary Works
                </Text>
                <Text style={styles.headerSubtitle}>
                  Discover amazing flipbooks and literary pieces
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content */}
        {literaryWorks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="book-open-variant" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Literary Works Yet</Text>
            <Text style={styles.emptyDescription}>
              Literary works will appear here once they are published
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            <View style={styles.worksGrid}>
              {literaryWorks.map((item) => (
                <View key={item.id} style={styles.workItem}>
                  {renderLiteraryWork({ item })}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Preview Modal */}
      <Modal
        visible={previewModalVisible}
        animationType="slide"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={styles.fullScreenContainer}>
          {/* Header with Metrics and Close Button */}
          <View style={styles.modalHeader}>
            <View style={styles.metricsBar}>
              <View style={styles.metricItem}>
                <MaterialCommunityIcons name="eye" size={16} color="#6B7280" />
                <Text style={styles.metricText}>
                  {selectedWork?.metrics?.visits || 0} visitors
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.floatingXButton}
              onPress={handleCloseFlipbook}
            >
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.fullScreenContent}>
            {Platform.OS === 'web' ? (
              <View style={styles.iframeContainer}>
                <iframe
                  src={selectedWork?.heyzine_url}
                  style={styles.fullScreenIframe}
                  title="Literary Work Preview"
                  frameBorder="0"
                  allowFullScreen
                  allow="fullscreen; clipboard-write *"
                />
              </View>
            ) : (
              <View style={styles.nativePreviewContainer}>
                <MaterialCommunityIcons name="book-open-variant" size={64} color="#9CA3AF" />
                <Text style={styles.nativePreviewTitle}>Flipbook Preview</Text>
                <Text style={styles.nativePreviewDescription}>
                  To view the flipbook, please visit the link below in your browser:
                </Text>
                <TouchableOpacity
                  style={styles.urlButton}
                  onPress={() => {
                    if (selectedWork?.heyzine_url) {
                      Alert.alert(
                        'Flipbook URL',
                        selectedWork.heyzine_url,
                        [
                          {
                            text: 'Copy URL',
                            onPress: () => {
                              Alert.alert('Copied!', 'URL copied to clipboard');
                            }
                          },
                          {
                            text: 'Open in Browser',
                            onPress: () => {
                              Alert.alert('Opening Browser', 'Opening flipbook in your default browser...');
                            }
                          },
                          {
                            text: 'Cancel',
                            style: 'cancel'
                          }
                        ]
                      );
                    }
                  }}
                >
                  <Text style={styles.urlButtonText}>View Flipbook URL</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Reaction Modal - appears when user tries to close */}
      <Modal
        visible={showReactionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReactionModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
              What did you feel about "{selectedWork?.title}"?
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
              Share your reaction before leaving
            </Text>

            {/* Emoji Reaction Buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24, gap: 12 }}>
              {[
                { type: 'like', emoji: '👍', label: 'Like' },
                { type: 'heart', emoji: '❤️', label: 'Love' },
                { type: 'sad', emoji: '😢', label: 'Sad' },
                { type: 'wow', emoji: '😲', label: 'Wow' }
              ].map(({ type, emoji, label }) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => react(type)}
                  disabled={!!reactingType}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    opacity: reactingType === type ? 0.7 : 1,
                  }}
                >
                  {reactingType === type ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <>
                      <Text style={{ fontSize: 32, marginBottom: 4 }}>{emoji}</Text>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>{label}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Skip and Exit Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowReactionModal(false);
                  setPreviewModalVisible(false);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#374151', fontWeight: '600', fontSize: 15 }}>
                  Skip
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  worksGrid: {
    gap: 16,
  },
  workItem: {
    marginBottom: 16,
  },
  workCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  workHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workInfo: {
    flex: 1,
    marginRight: 12,
  },
  workTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  workAuthor: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  workDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  workFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  urlIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  urlText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 10,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flex: 1,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  reactionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  reactBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  reactLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  floatingXButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fullScreenContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  iframeContainer: {
    flex: 1,
    position: 'relative',
    touchAction: 'none',
    backgroundColor: '#fff', // White background
  },
  fullScreenIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  nativePreviewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  nativePreviewTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  nativePreviewDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  urlButton: {
    backgroundColor: '#1a237e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  urlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
