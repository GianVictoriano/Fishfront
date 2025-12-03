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
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import apiClient from '../../utils/api';
import ApprovalWorkflow from './ApprovalWorkflow';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ArchiveDocumentPreview() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [isWeb, setIsWeb] = useState(false);

  useEffect(() => {
    setIsWeb(typeof window !== 'undefined' && typeof window.document !== 'undefined');
  }, []);

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    try {
      const response = await apiClient.get(`/review-content/${id}`);
      setDocument(response.data);
      
      // Fetch document content
      const contentResponse = await apiClient.get(`/review-content/preview/${id}`);
      setContent(contentResponse.data.text || '');
    } catch (error) {
      console.error('Failed to fetch document:', error);
      Alert.alert('Error', 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (isWeb) {
        // Web platform - create and download RTF document (opens in Word)
        const wordContent = await createWordDocument(content || 'Document content not available');
        
        // Create download link for RTF document
        const link = window.document.createElement('a');
        const wordBlob = new Blob([wordContent], { 
          type: 'application/rtf' 
        });
        const url = URL.createObjectURL(wordBlob);
        
        // Generate filename based on group name
        const groupName = document.group?.name || 'document';
        const filename = `${groupName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.rtf`;
        
        link.href = url;
        link.download = filename;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        Alert.alert('Download Complete', `Document converted and downloaded as ${filename}`);
      } else {
        // Mobile platform - download original file
        const fileUrl = `${API_URL}/storage/${document.file}`;
        await Linking.openURL(fileUrl);
        Alert.alert('Download Started', 'Opening original file for download...');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', 'An error occurred while downloading the document.');
    }
  };

  const createWordDocument = async (text) => {
    // Create RTF (Rich Text Format) which opens in Word and is much simpler
    const escapeRtf = (str) => {
      return str
        .replace(/\\/g, '\\\\')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/\n/g, '\\par\n')
        .replace(/\r/g, '')
        .replace(/\t/g, '\\tab ');
    };

    const rtfContent = '{\\rtf1\\ansi\\deff0' +
      '{\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}}' +
      '{\\colortbl;\\red0\\green0\\blue0;}' +
      '\\viewkind4\\uc1\\pard\\cf1\\lang1033\\f0\\fs24 ' + escapeRtf(text) +
      '\\par}';

    return new TextEncoder().encode(rtfContent);
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
        <Text style={styles.loadingText}>Loading document...</Text>
      </View>
    );
  }

  if (!document) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="file-x" size={48} color="#6B7280" />
        <Text style={styles.errorText}>Document not found</Text>
      </View>
    );
  }

  const statusStyle = getStatusColor(document.status);

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
        <View style={styles.documentInfo}>
          <Text style={styles.title}>{document.group?.name || 'Untitled Document'}</Text>
          
          <View style={styles.metaRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Feather name={statusStyle.icon} size={14} color={statusStyle.text} />
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
              </Text>
            </View>
            
            <Text style={styles.uploadDate}>
              Uploaded {new Date(document.uploaded_at).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.authorRow}>
            <Feather name="user" size={16} color="#6B7280" />
            <Text style={styles.authorText}>
              by {document.user?.name || 'Unknown User'}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.workflowButton}
            onPress={() => setShowWorkflow(true)}
          >
            <Feather name="git-branch" size={16} color="#6366F1" />
            <Text style={styles.workflowButtonText}>View Approval Workflow</Text>
          </TouchableOpacity>
          
          {document.group && (
            <View style={styles.groupRow}>
              <Feather name="folder" size={16} color="#6B7280" />
              <Text style={styles.groupText}>{document.group.name}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.contentHeader}>
          <Text style={styles.contentTitle}>Document Content</Text>
        </View>
        
        <View style={styles.contentBox}>
          <Text style={styles.contentText}>{content || 'No content available'}</Text>
        </View>
        
        <View style={styles.fileInfo}>
          <Text style={styles.fileInfoTitle}>File Information</Text>
          <View style={styles.fileInfoRow}>
            <Text style={styles.fileInfoLabel}>File Name:</Text>
            <Text style={styles.fileInfoValue}>{document.file}</Text>
          </View>
          <View style={styles.fileInfoRow}>
            <Text style={styles.fileInfoLabel}>Review Stage:</Text>
            <Text style={styles.fileInfoValue}>{document.review_stage || 'N/A'}</Text>
          </View>
          <View style={styles.fileInfoRow}>
            <Text style={styles.fileInfoLabel}>Approvals:</Text>
            <Text style={styles.fileInfoValue}>{document.no_of_approval || 0}</Text>
          </View>
        </View>

        <View style={styles.downloadSection}>
          <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
            <Feather name="download" size={20} color="#fff" />
            <Text style={styles.downloadButtonText}>Download Document</Text>
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
            documentType="ReviewContent"
            groupId={document.group_id}
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
  contentContainer: {
    flex: 1,
  },
  documentInfo: {
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
  contentHeader: {
    padding: 20,
    paddingBottom: 0,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  contentBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    margin: 20,
    marginBottom: 0,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  fileInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    margin: 20,
    marginBottom: 0,
  },
  fileInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  fileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  fileInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  fileInfoValue: {
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
