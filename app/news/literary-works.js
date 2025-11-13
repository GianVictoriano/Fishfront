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

export default function LiteraryWorksScreen() {
  const router = useRouter();
  const { colors } = useBranding();
  const { setActiveGenre } = useNewsStore();
  const [literaryWorks, setLiteraryWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedWork, setSelectedWork] = useState(null);

  const fetchLiteraryWorks = async () => {
    try {
      const response = await apiClient.get('/literary-works');
      if (response.data.success) {
        setLiteraryWorks(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching literary works:', error);
      Alert.alert('Error', 'Failed to fetch literary works');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  const renderLiteraryWork = ({ item }) => (
    <TouchableOpacity 
      style={styles.workCard}
      onPress={() => {
        if (item.heyzine_url) {
          setSelectedWork(item);
          setPreviewModalVisible(true);
        }
      }}
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary || '#1a237e'} />
        <Text style={styles.loadingText}>Loading literary works...</Text>
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
          {/* Floating X Button */}
          <TouchableOpacity
            style={styles.floatingXButton}
            onPress={() => setPreviewModalVisible(false)}
          >
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.fullScreenContent}>
            {Platform.OS === 'web' ? (
              <View style={styles.iframeContainer}>
                <iframe
                  src={selectedWork?.heyzine_url}
                  style={styles.fullScreenIframe}
                  title="Literary Work Preview"
                  frameborder="0"
                  allowfullscreen
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
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
    backgroundColor: '#fff',
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
    backgroundColor: '#000',
  },
  floatingXButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
