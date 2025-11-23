import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import apiClient from '../../utils/api';
import ApprovalWorkflow from './ApprovalWorkflow';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const { width, height } = Dimensions.get('window');

export default function ArchiveImagePreview() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [showWorkflow, setShowWorkflow] = useState(false);

  useEffect(() => {
    fetchImage();
  }, [id]);

  const fetchImage = async () => {
    try {
      const response = await apiClient.get(`/review-images/${id}`);
      setImage(response.data);
    } catch (error) {
      console.error('Failed to fetch image:', error);
      Alert.alert('Error', 'Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const fileUrl = `${API_URL}/storage/${image.file}`;
      const filename = image.file.split('/').pop() || 'downloaded_image.jpg';
      
      // Handle web platform differently
      if (Platform.OS === 'web') {
        // Create a temporary link element and trigger download
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Alert.alert('Download Started', 'Image download has been initiated in your browser.');
      } else {
        // Native mobile download using filesystem
        const downloadDir = FileSystem.documentDirectory + 'downloads/';
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
        
        const downloadUri = downloadDir + filename;
        
        // Download the file
        const downloadResult = await FileSystem.downloadAsync(fileUrl, downloadUri);
        
        if (downloadResult.status === 200) {
          Alert.alert(
            'Download Complete',
            `Image downloaded successfully to: ${downloadUri}`,
            [
              { text: 'OK' },
              { 
                text: 'Share', 
                onPress: () => Sharing.shareAsync(downloadUri)
              }
            ]
          );
        } else {
          Alert.alert('Download Failed', 'Failed to download the image. Please try again.');
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', 'An error occurred while downloading the image.');
    }
  };

  const onImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.nativeEvent;
    const maxWidth = width - 40; // Account for padding
    const maxHeight = height * 0.6; // Max 60% of screen height
    
    let calculatedWidth = naturalWidth;
    let calculatedHeight = naturalHeight;
    
    // Scale down if too wide
    if (naturalWidth > maxWidth) {
      calculatedWidth = maxWidth;
      calculatedHeight = (naturalHeight * maxWidth) / naturalWidth;
    }
    
    // Scale down if too tall
    if (calculatedHeight > maxHeight) {
      calculatedHeight = maxHeight;
      calculatedWidth = (naturalWidth * maxHeight) / naturalHeight;
    }
    
    setImageDimensions({
      width: calculatedWidth,
      height: calculatedHeight,
    });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return { bg: '#FEF3C7', text: '#92400E', icon: 'clock' };
      case 'approved': return { bg: '#D1FAE5', text: '#065F46', icon: 'check-circle' };
      case 'rejected': return { bg: '#FEE2E2', text: '#991B1B', icon: 'x-circle' };
      default: return { bg: '#F3F4F6', text: '#6B7280', icon: 'help-circle' };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#303F9F" />
        <Text style={styles.loadingText}>Loading image...</Text>
      </View>
    );
  }

  if (!image) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="image-x" size={48} color="#6B7280" />
        <Text style={styles.errorText}>Image not found</Text>
      </View>
    );
  }

  const statusStyle = getStatusColor(image.status);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push('/collab/archives')}
          >
            <Feather name="arrow-left" size={20} color="#374151" />
            <Text style={styles.backText}>Back to Archives</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.contentContainer}>
        <View style={styles.imageInfo}>
          <Text style={styles.title}>{image.group?.name || 'Untitled Image'}</Text>
          
          <View style={styles.metaRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Feather name={statusStyle.icon} size={14} color={statusStyle.text} />
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {image.status.charAt(0).toUpperCase() + image.status.slice(1)}
              </Text>
            </View>
            
            <Text style={styles.uploadDate}>
              Uploaded {new Date(image.uploaded_at).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.authorRow}>
            <Feather name="user" size={16} color="#6B7280" />
            <Text style={styles.authorText}>
              by {image.user?.name || 'Unknown User'}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.workflowButton}
            onPress={() => setShowWorkflow(true)}
          >
            <Feather name="git-branch" size={16} color="#6366F1" />
            <Text style={styles.workflowButtonText}>View Approval Workflow</Text>
          </TouchableOpacity>
          
          {image.group && (
            <View style={styles.groupRow}>
              <Feather name="folder" size={16} color="#6B7280" />
              <Text style={styles.groupText}>{image.group.name}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: `${API_URL}/storage/${image.file}` }}
            style={[
              styles.image,
              {
                width: imageDimensions.width || '100%',
                height: imageDimensions.height || 300,
              }
            ]}
            resizeMode="contain"
            onLoad={onImageLoad}
          />
        </View>
        
        <View style={styles.imageDetails}>
          <Text style={styles.detailsTitle}>Image Information</Text>
          <View style={styles.detailsRow}>
            <Text style={styles.detailsLabel}>File Name:</Text>
            <Text style={styles.detailsValue}>{image.file}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailsLabel}>Review Stage:</Text>
            <Text style={styles.detailsValue}>{image.review_stage || 'N/A'}</Text>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.detailsLabel}>Approvals:</Text>
            <Text style={styles.detailsValue}>{image.no_of_approval || 0}</Text>
          </View>
          {imageDimensions.width > 0 && (
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Dimensions:</Text>
              <Text style={styles.detailsValue}>
                {Math.round(imageDimensions.width)} × {Math.round(imageDimensions.height)}px
              </Text>
            </View>
          )}
        </View>

        <View style={styles.downloadSection}>
          <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
            <Feather name="download" size={20} color="#fff" />
            <Text style={styles.downloadButtonText}>Download Image</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showWorkflow}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWorkflow(false)}
      >
        <View style={styles.modalOverlay}>
          <ApprovalWorkflow
            visible={showWorkflow}
            documentType="ReviewImage"
            groupId={image.group_id}
            onClose={() => setShowWorkflow(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#374151',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  imageInfo: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    marginBottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  uploadDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  authorText: {
    fontSize: 14,
    color: '#374151',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupText: {
    fontSize: 14,
    color: '#6B7280',
  },
  imageContainer: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    maxWidth: '100%',
    borderRadius: 8,
  },
  imageDetails: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailsLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailsValue: {
    fontSize: 14,
    color: '#374151',
  },
  downloadSection: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#303F9F',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  workflowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  workflowButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
