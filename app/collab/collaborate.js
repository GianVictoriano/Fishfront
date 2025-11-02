import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal, 
  Linking, ScrollView, useWindowDimensions, TouchableWithoutFeedback, Keyboard, Alert
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { pickImage } from './imageUtils';
import apiClient, { sendMessage, getMessages } from '../../utils/api';
import { useBranding } from '~/context/BrandingContext';

// Proper Word document text extraction for web using JSZip
const extractWordText = async (file) => {
  if (Platform.OS !== 'web') return null;
  
  try {
    // Import JSZip dynamically for web
    const JSZip = (await import('jszip')).default;
    
    const fileBlob = file.file || file;
    const arrayBuffer = await fileBlob.arrayBuffer();
    
    // DOCX files are ZIP archives
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // The main document content is in word/document.xml
    const documentXml = await zip.file('word/document.xml')?.async('string');
    
    if (!documentXml) {
      throw new Error('Could not find document.xml in DOCX file');
    }
    
    // Parse XML and extract text content with formatting
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(documentXml, 'text/xml');
    
    // Get all paragraphs (w:p elements contain paragraphs)
    const paragraphs = xmlDoc.getElementsByTagName('w:p');
    let extractedText = '';
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      let paragraphText = '';
      
      // Get all text nodes within this paragraph
      const textNodes = paragraph.getElementsByTagName('w:t');
      for (let j = 0; j < textNodes.length; j++) {
        const textContent = textNodes[j].textContent || '';
        paragraphText += textContent;
      }
      
      // Check for line breaks within the paragraph
      const lineBreaks = paragraph.getElementsByTagName('w:br');
      if (lineBreaks.length > 0) {
        // If there are line breaks, we need to handle them
        // For simplicity, we'll treat each line break as a new line
        paragraphText = paragraphText.replace(/\s+/g, ' ').trim();
        if (paragraphText) {
          extractedText += paragraphText + '\n';
        }
      } else {
        // Regular paragraph - add as a line with paragraph break
        paragraphText = paragraphText.replace(/\s+/g, ' ').trim();
        if (paragraphText) {
          extractedText += paragraphText + '\n\n'; // Double line break for paragraphs
        }
      }
    }
    
    // Final cleanup - remove excessive line breaks but preserve structure
    extractedText = extractedText
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive line breaks
      .trim();
    
    return extractedText.length > 10 ? extractedText : null;
    
  } catch (error) {
    console.error('Error extracting Word text:', error);
    return null;
  }
};
import modalStyles from './modalStyles.js';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

// Standalone Search Component with debounced filtering and reset button
const StandaloneSearchInput = React.memo(React.forwardRef(({ style, placeholder, onDebouncedSearch, onReset }, ref) => {
  const [text, setText] = useState('');
  const timeoutRef = useRef(null);
  
  // Expose reset function via ref
  React.useImperativeHandle(ref, () => ({
    reset: () => {
      setText('');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      onDebouncedSearch?.('');
    }
  }));
  
  const handleChange = (newText) => {
    setText(newText);
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new debounced timeout
    timeoutRef.current = setTimeout(() => {
      onDebouncedSearch?.(newText);
    }, 500); // 500ms delay to prevent focus issues
  };

  const handleReset = () => {
    setText('');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onDebouncedSearch?.('');
    onReset?.();
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return (
    <View style={style}>
      <TextInput 
        style={{
          flex: 1,
          height: '100%',
          paddingHorizontal: 12,
          paddingRight: 40, // Make room for reset button
          fontSize: 16,
          color: '#333',
        }}
        placeholder={placeholder}
        value={text}
        onChangeText={handleChange}
      />
      {text.length > 0 && (
        <TouchableOpacity 
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: [{ translateY: -12 }],
            padding: 4,
          }}
          onPress={handleReset}
        >
          <Feather name="x" size={16} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );
}));

// Standalone Chat Input Component (completely isolated)
const StandaloneChatInput = ({ onSend, onUpload, styles, brandColor, uploadButtonColor }) => {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  
  const handleSend = () => {
    if (text.trim()) {
      onSend(text);
      setText('');
    }
  };

  const handleKeyPress = (e) => {
    // For web: Check if Enter is pressed without Shift
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <View style={styles.inputContainer}>
      <TouchableOpacity onPress={onUpload} style={[styles.uploadButton, uploadButtonColor && { backgroundColor: uploadButtonColor }]}>
        <Feather name="paperclip" size={24} color="#fff" />
      </TouchableOpacity>
      <TextInput 
        ref={inputRef}
        style={styles.input} 
        value={text} 
        onChangeText={setText} 
        placeholder="Type a message" 
        blurOnSubmit={false}
        autoCorrect={true}
        autoCapitalize="sentences"
        multiline={true}
        textAlignVertical="top"
        onKeyPress={handleKeyPress}
        returnKeyType="default"
      />
      <TouchableOpacity onPress={handleSend} style={[styles.sendButton, brandColor && { backgroundColor: brandColor }]}>
        <Text style={styles.sendButtonText}>Send</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function CollaborateScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { colors } = useBranding();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [search, setSearch] = useState('');
  const [groupChats, setGroupChats] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupChatFilter, setGroupChatFilter] = useState('active'); // 'active' or 'finished'
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [chatStatusFilter, setChatStatusFilter] = useState('pending');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState({});

  const [isPlagModalVisible, setIsPlagModalVisible] = useState(false);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [plagiarismResult, setPlagiarismResult] = useState(null);
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [pendingDocument, setPendingDocument] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({ message: '', onConfirm: null, type: '' });
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackModalConfig, setFeedbackModalConfig] = useState({ message: '', type: 'success' });
  
  // Reviewer selection state
  const [reviewerModalVisible, setReviewerModalVisible] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedReviewer, setSelectedReviewer] = useState(null);
  const [pendingUpload, setPendingUpload] = useState(null); // {type: 'image'|'document', file: ...}
  
  // Folio submission confirmation state
  const [folioConfirmModalVisible, setFolioConfirmModalVisible] = useState(false);

  const selectedGroupIdRef = useRef(selectedGroupId);
  const isScanningRef = useRef(false);

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedGroupId]);

  const fetchGroupChats = useCallback(async () => {
    try {
      const response = await apiClient.get('/group-chats');
      setGroupChats(response.data);
      if (!selectedGroupId && response.data.length > 0) {
        setSelectedGroupId(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch group chats:', error);
    }
  }, []); // Remove selectedGroupId dependency

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          await Promise.all([
            fetchGroupChats(),
            apiClient.get('/user').then(response => {
              console.log('Current user loaded:', response.data);
              setCurrentUser(response.data);
            })
          ]);
        } catch (error) {
          console.error('Failed to fetch initial data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }, []) // Remove fetchGroupChats dependency to prevent frequent re-runs
  );

  const filteredGroups = groupChats.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = groupChatFilter === 'active' 
      ? (g.status === 'active' || !g.status) // Show active or groups without status
      : g.status === 'published'; // Show published groups
    return matchesSearch && matchesFilter;
  }); 

  useEffect(() => {
    const currentGroupStillVisible = filteredGroups.some(g => g.id === selectedGroupId);
    if (!currentGroupStillVisible && selectedGroupId) {
      // Only auto-select if the current selection is no longer visible
      // Don't auto-select when just searching
      setSelectedGroupId(null);
    }
  }, [chatStatusFilter]); // Remove 'search' dependency to prevent auto-selection while typing

  // Function to fetch group members for reviewer selection
  const fetchGroupMembers = useCallback(async () => {
    if (!selectedGroupId) {
      setGroupMembers([]);
      return;
    }
    
    try {
      console.log('Fetching members for group:', selectedGroupId);
      const response = await apiClient.get(`/group-chats/${selectedGroupId}/members`);
      console.log('Members response:', response.data);
      console.log('Current user:', currentUser);
      
      // Get all members including current user for lead reviewer display
      const allMembers = response.data;
      console.log('All members:', allMembers);
      setGroupMembers(allMembers);
    } catch (error) {
      console.error('Failed to fetch group members:', error);
      console.error('Error details:', error.response?.data);
      setGroupMembers([]);
    }
  }, [selectedGroupId, currentUser]);

  const fetchMessages = useCallback(async () => {
    if (!selectedGroupId) {
      setMessages([]);
      return;
    }

    setIsMessagesLoading(true);
    try {
      const response = await getMessages(selectedGroupId);
      setMessages(response.data);
      
      // Check for pending uploads
      await checkPendingUploads();
      
      // Fetch group members for reviewer selection
      await fetchGroupMembers();
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsMessagesLoading(false);
    }
  }, [selectedGroupId, fetchGroupMembers]);

  // Function to check for pending uploads assigned to current user for review
  const checkPendingUploads = async () => {
    if (!selectedGroupId || !currentUser) {
      console.log('checkPendingUploads: Missing selectedGroupId or currentUser');
      return;
    }
    
    console.log('checkPendingUploads: Checking for group', selectedGroupId, 'user', currentUser.id);
    
    try {
      // Check for pending documents assigned to current user as reviewer
      const documentsResponse = await apiClient.get(`/review-content?group_id=${selectedGroupId}&status=pending&current_reviewer_id=${currentUser.id}`);
      console.log('Pending documents response:', documentsResponse.data);
      const userPendingDoc = documentsResponse.data.length > 0 ? documentsResponse.data[0] : null;
      console.log('User pending document:', userPendingDoc);
      setPendingDocument(userPendingDoc);
      
      // Check for pending images assigned to current user as reviewer
      const imagesResponse = await apiClient.get(`/review-images?group_id=${selectedGroupId}&status=pending&current_reviewer_id=${currentUser.id}`);
      console.log('Pending images response:', imagesResponse.data);
      const userPendingImg = imagesResponse.data.length > 0 ? imagesResponse.data[0] : null;
      console.log('User pending image:', userPendingImg);
      setPendingImage(userPendingImg);
    } catch (error) {
      console.error('Failed to check pending uploads:', error);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [selectedGroupId]);

  // Check pending uploads when group or user changes
  useEffect(() => {
    if (selectedGroupId && currentUser) {
      checkPendingUploads();
    }
  }, [selectedGroupId, currentUser]);

  const inputRef = useRef(null);
  const searchInputRef = useRef(null);

  // Debounced search handler that won't interfere with focus
  const handleDebouncedSearch = useCallback((searchText) => {
    setSearch(searchText);
  }, []);

  const handleSend = useCallback(async (messageText) => {
    if (!messageText.trim() || !selectedGroupId) return;

    const tempId = `temp-${Date.now()}`;
    const messageToSend = messageText;
    
    const optimisticMessage = {
      id: tempId,
      message: messageToSend,
      user_id: currentUser?.id,
      user: { name: 'Me' },
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [optimisticMessage, ...prev]);

    try {
      const response = await sendMessage(selectedGroupId, messageToSend);
      const savedMessage = response.data;
      setMessages(prev => 
        prev.map(msg => (msg.id === tempId ? savedMessage : msg))
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      // Revert optimistic update
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      alert('Failed to send message. Please try again.');
    }
  }, [selectedGroupId, currentUser?.id]);

  // Focus the input when selectedGroupId changes (but not on every render)
  useEffect(() => {
    if (selectedGroupId && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedGroupId]);

  // Create stable references for the render function
  const messagesRef = useRef(messages);
  const currentUserRef = useRef(currentUser);
  
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const renderMessage = useCallback(({ item, index }) => {
    if (item.user_id === null) return null;
    
    const isMe = currentUserRef.current && item.user_id === currentUserRef.current.id;
    const nextMsg = messagesRef.current[index + 1];
    const showName = !nextMsg || nextMsg.user_id !== item.user_id;
    const senderName = isMe ? 'you' : (item.user?.profile?.name || item.user?.name || '');
    
    // Check if this is an upload notification message
    const isUploadNotification = item.message && (
      item.message.includes('has sent') || 
      item.message.includes('for review') ||
      item.message.includes('uploaded')
    );

    return (
      <View key={item.id || `msg-${index}`} style={[styles.messageContainer, isMe ? styles.myMessageContainer : styles.theirMessageContainer]}>
        <View style={{flex: 1}}>
          {showName && !isUploadNotification && (
            <Text style={[styles.senderName, isMe ? styles.mySenderName : styles.theirSenderName]}>
              {senderName}
            </Text>
          )}

        </View>
      </View>
    );
  }, []);


  // Function to extract text from document on frontend
  const extractTextFromDocument = async (file) => {
    try {
      // Handle plain text files first
      if (file.mimeType === 'text/plain' || file.name.endsWith('.txt')) {
        if (Platform.OS === 'web') {
          const fileBlob = file.file || file;
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(fileBlob);
          });
        } else {
          const content = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          return content;
        }
      }
      
      // Handle Word documents
      if (Platform.OS === 'web') {
        // For web platform Word documents
        if (file.name.endsWith('.docx')) {
          const extractedText = await extractWordText(file);
          if (extractedText) {
            return extractedText; // Successfully extracted text
          } else {
            return `Document content from ${file.name}\n\n[Could not extract text from Word document. Please save as .txt file or copy and paste the text content manually.]`;
          }
        } else if (file.name.endsWith('.doc')) {
          return `Document content from ${file.name}\n\n[Legacy .doc format not supported. Please save as .docx or .txt file, or copy and paste the text content manually.]`;
        }
      } else {
        // For mobile platforms, try to read as text
        try {
          const content = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          return content;
        } catch (error) {
          return `Document content from ${file.name}\n\n[Unable to extract text from this document format. Please save as .txt file or copy and paste the text content manually.]`;
        }
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      return `Document content from ${file.name}\n\n[Error extracting text. Please save as .txt file or copy and paste the text content manually.]`;
    }
  };

  // Function to convert document to text file and save to review_content
  const handleWordDocumentUpload = async (file) => {
    setIsProcessingDocument(true);
    try {
      console.log('handleWordDocumentUpload: Starting with file', file.name);
      
      // Extract text from the document
      console.log('handleWordDocumentUpload: Extracting text...');
      const extractedText = await extractTextFromDocument(file);
      console.log('handleWordDocumentUpload: Text extracted, length:', extractedText.length);
      
      // Create a text file from the extracted content
      const textFileName = file.name.replace(/\.(doc|docx)$/i, '.txt');
      console.log('handleWordDocumentUpload: Creating text file:', textFileName);
      let textFile;
      
      if (Platform.OS === 'web') {
        // Create a Blob for web
        const textBlob = new Blob([extractedText], { type: 'text/plain' });
        textFile = new File([textBlob], textFileName, { type: 'text/plain' });
        console.log('handleWordDocumentUpload: Created web file');
      } else {
        // Save to temporary file for mobile
        const tempUri = `${FileSystem.cacheDirectory}${textFileName}`;
        await FileSystem.writeAsStringAsync(tempUri, extractedText, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        textFile = {
          uri: tempUri,
          name: textFileName,
          type: 'text/plain'
        };
        console.log('handleWordDocumentUpload: Created mobile file');
      }
      
      // Send review message
      console.log('handleWordDocumentUpload: Sending message...');
      const messageText = `${currentUser.name} has sent a converted document for review: ${textFileName}`;
      const response = await apiClient.post(`/group-chats/${selectedGroupId}/messages`, { message: messageText });
      setMessages(prevMessages => [response.data, ...prevMessages]);
      console.log('handleWordDocumentUpload: Message sent');

      // Upload the text file to review_content
      console.log('handleWordDocumentUpload: Creating FormData...');
      const formData = new FormData();
      if (Platform.OS === 'web') {
        formData.append('file', textFile);
      } else {
        formData.append('file', {
          uri: textFile.uri,
          name: textFile.name,
          type: textFile.type
        });
      }
      formData.append('group_id', selectedGroupId);
      formData.append('user_id', currentUser.id);
      formData.append('status', 'pending');
      formData.append('no_of_approval', '0');
      
      // If replacing, delete the old document first
      if (pendingDocument) {
        console.log('handleWordDocumentUpload: Deleting old document', pendingDocument.id);
        try {
          await apiClient.delete(`/review-content/${pendingDocument.id}`);
          console.log('handleWordDocumentUpload: Old document deleted');
        } catch (deleteError) {
          // If 404, the document was already deleted/approved/rejected - that's fine
          if (deleteError.response?.status === 404) {
            console.log('handleWordDocumentUpload: Old document already deleted (404), continuing...');
          } else {
            throw deleteError; // Re-throw other errors
          }
        }
      }
      
      console.log('handleWordDocumentUpload: Uploading to review-content...');
      await apiClient.post('/review-content', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('handleWordDocumentUpload: Upload successful');
      
      // Refresh pending uploads
      await checkPendingUploads();
      
      setFeedbackModalConfig({
        message: 'Document converted to text and sent for review successfully!',
        type: 'success'
      });
      setFeedbackModalVisible(true);
    } catch (error) {
      console.error('Error processing Word document:', error);
      console.error('Error details:', error.response?.data || error.message);
      setFeedbackModalConfig({
        message: `Failed to process Word document: ${error.response?.data?.message || error.message || 'Unknown error'}`,
        type: 'error'
      });
      setFeedbackModalVisible(true);
    } finally {
      setIsProcessingDocument(false);
    }
  };

  const handleChooseFile = async () => {
    console.log('handleChooseFile called');
    console.log('pendingDocument:', pendingDocument);
    
    // Check if there's already a pending document
    if (pendingDocument) {
      console.log('Showing confirmation for pending document');
      setConfirmModalConfig({
        message: 'You already have a pending document submission. Do you want to replace your previous submission?',
        onConfirm: async () => {
          console.log('User confirmed replacement');
          setConfirmModalVisible(false);
          await proceedWithFileSelection();
        },
        type: 'document'
      });
      setConfirmModalVisible(true);
      return;
    }
    
    console.log('No pending document, proceeding with file selection');
    await proceedWithFileSelection();
  };

  // Helper function to check if current group chat is a folio chat
  const isFolioChat = () => {
    const currentChat = groupChats.find(g => g.id === selectedGroupId);
    return currentChat?.folio != null;
  };

  // Helper function to get folio lead organizer
  const getFolioLeadOrganizer = () => {
    const currentChat = groupChats.find(g => g.id === selectedGroupId);
    return currentChat?.folio?.lead_organizer_id;
  };

  const proceedWithFileSelection = async () => {
    // Close the upload modal first
    setIsUploadModalVisible(false);
    
    try {
      console.log('About to call DocumentPicker.getDocumentAsync');
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('File selected:', file.name, file.mimeType);
        
        // Store file and check if it's a folio chat
        setPendingUpload({ type: 'document', file });
        
        if (isFolioChat()) {
          // Show folio confirmation modal instead of reviewer selection
          setFolioConfirmModalVisible(true);
        } else {
          // Show reviewer selection modal for regular chats
          setReviewerModalVisible(true);
        }
      } else {
        console.log('File selection cancelled');
      }
    } catch (err) {
      console.error('Error picking document:', err);
      setFeedbackModalConfig({
        message: 'Failed to pick document. Please try again.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
    }
  };

  const handleChooseImage = async () => {
    console.log('handleChooseImage called');
    console.log('pendingImage:', pendingImage);
    
    // Check if there's already a pending image
    if (pendingImage) {
      console.log('Showing confirmation for pending image');
      setConfirmModalConfig({
        message: 'You already have a pending image submission. Do you want to replace your previous submission?',
        onConfirm: async () => {
          console.log('User confirmed replacement');
          setConfirmModalVisible(false);
          await proceedWithImageSelection();
        },
        type: 'image'
      });
      setConfirmModalVisible(true);
      return;
    }
    
    console.log('No pending image, proceeding with image selection');
    await proceedWithImageSelection();
  };

  const handleChooseScan = async () => {
    console.log('handleChooseScan called');
    
    // Close the upload modal first
    setIsUploadModalVisible(false);
    
    try {
      console.log('About to call DocumentPicker.getDocumentAsync for scanning');
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('File selected for scanning:', file.name, file.mimeType);
        
        // Directly call the plagiarism check handler
        await handlePlagiarismCheck('file', file);
      } else {
        console.log('File selection cancelled');
      }
    } catch (err) {
      console.error('Error picking document for scan:', err);
      setFeedbackModalConfig({
        message: 'Failed to pick document for scanning. Please try again.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
    }
  };

  const proceedWithImageSelection = async () => {
    // Close the upload modal first
    setIsUploadModalVisible(false);
    
    try {
      const image = await pickImage();
      if (image) {
        // Store image and check if it's a folio chat
        setPendingUpload({ type: 'image', file: image });
        
        if (isFolioChat()) {
          // Show folio confirmation modal instead of reviewer selection
          setFolioConfirmModalVisible(true);
        } else {
          // Show reviewer selection modal for regular chats
          setReviewerModalVisible(true);
        }
      }
    } catch (err) {
      console.error('Error picking image:', err);
      setFeedbackModalConfig({
        message: 'Failed to pick image. Please try again.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
    }
  };

  // Handle upload after reviewer is selected
  const handleUploadWithReviewer = async () => {
    if (!selectedReviewer || !pendingUpload) {
      setFeedbackModalConfig({
        message: 'Please select a reviewer before submitting.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
      return;
    }

    setReviewerModalVisible(false);

    try {
      if (pendingUpload.type === 'image') {
        await uploadImageWithReviewer(pendingUpload.file, selectedReviewer.id);
      } else if (pendingUpload.type === 'document') {
        await uploadDocumentWithReviewer(pendingUpload.file, selectedReviewer.id);
      }
      
      // Clear states
      setPendingUpload(null);
      setSelectedReviewer(null);
    } catch (error) {
      console.error('Error uploading with reviewer:', error);
      setFeedbackModalConfig({
        message: 'Failed to upload. Please try again.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
    }
  };

  // Upload image with selected reviewer
  const uploadImageWithReviewer = async (image, reviewerId) => {
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      const imageFile = image.file || image;
      formData.append('image', imageFile);
    } else {
      formData.append('image', {
        uri: Platform.OS === 'android' ? image.uri : image.uri.replace('file://', ''),
        name: image.fileName || image.uri.split('/').pop() || 'photo.jpg',
        type: image.mimeType || 'image/jpeg',
      });
    }
    
    formData.append('group_id', selectedGroupId);
    formData.append('user_id', currentUser.id);
    formData.append('current_reviewer_id', reviewerId);
    formData.append('review_stage', 'initial');
    
    // If replacing, delete the old image first
    if (pendingImage) {
      try {
        await apiClient.delete(`/review-images/${pendingImage.id}`);
        console.log('Old image deleted');
      } catch (deleteError) {
        if (deleteError.response?.status === 404) {
          console.log('Old image already deleted (404), continuing...');
        } else if (deleteError.response?.status === 405) {
          console.log('DELETE not supported for images (405), skipping deletion...');
        } else {
          throw deleteError;
        }
      }
    }
    
    await apiClient.post('/review-images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    // Send notification message
    const reviewer = groupMembers.find(m => m.id === reviewerId);
    const messageText = `${currentUser.name} has sent an image to ${reviewer?.name || 'a reviewer'} for review.`;
    await apiClient.post(`/group-chats/${selectedGroupId}/messages`, { message: messageText });
    
    // Refresh messages and pending uploads
    await checkPendingUploads();
    fetchMessages();
    
    setFeedbackModalConfig({
      message: `Image sent to ${reviewer?.name || 'reviewer'} for review!`,
      type: 'success'
    });
    setFeedbackModalVisible(true);
  };

  // Upload document with selected reviewer
  const uploadDocumentWithReviewer = async (file, reviewerId) => {
    // Check if it's a text-based document
    if (file.mimeType === 'application/msword' || 
        file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimeType === 'text/plain' ||
        file.name.endsWith('.doc') || file.name.endsWith('.docx') || file.name.endsWith('.txt')) {
      
      await handleWordDocumentUploadWithReviewer(file, reviewerId);
    } else {
      // For PDF, use plagiarism check flow
      handlePlagiarismCheck('file', file);
      setUploadedFile(file);
    }
  };

  // Handle Word document upload with reviewer
  const handleWordDocumentUploadWithReviewer = async (file, reviewerId) => {
    setIsProcessingDocument(true);
    try {
      console.log('handleWordDocumentUploadWithReviewer: Starting with file', file.name);
      
      const extractedText = await extractTextFromDocument(file);
      console.log('Text extracted, length:', extractedText.length);
      
      const textFileName = file.name.replace(/\.(doc|docx)$/i, '.txt');
      let textFile;
      
      if (Platform.OS === 'web') {
        const textBlob = new Blob([extractedText], { type: 'text/plain' });
        textFile = new File([textBlob], textFileName, { type: 'text/plain' });
      } else {
        const tempUri = `${FileSystem.cacheDirectory}${textFileName}`;
        await FileSystem.writeAsStringAsync(tempUri, extractedText, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        textFile = {
          uri: tempUri,
          name: textFileName,
          type: 'text/plain'
        };
      }
      
      // Send review message
      const reviewer = groupMembers.find(m => m.id === reviewerId);
      const messageText = `${currentUser.name} has sent a document to ${reviewer?.name || 'a reviewer'} for review: ${textFileName}`;
      const response = await apiClient.post(`/group-chats/${selectedGroupId}/messages`, { message: messageText });
      setMessages(prevMessages => [response.data, ...prevMessages]);

      // Upload the text file to review_content
      const formData = new FormData();
      if (Platform.OS === 'web') {
        formData.append('file', textFile);
      } else {
        formData.append('file', {
          uri: textFile.uri,
          name: textFile.name,
          type: textFile.type
        });
      }
      formData.append('group_id', selectedGroupId);
      formData.append('user_id', currentUser.id);
      formData.append('current_reviewer_id', reviewerId);
      formData.append('review_stage', 'initial');
      formData.append('status', 'pending');
      formData.append('no_of_approval', '0');
      
      // If replacing, delete the old document first
      if (pendingDocument) {
        try {
          await apiClient.delete(`/review-content/${pendingDocument.id}`);
        } catch (deleteError) {
          if (deleteError.response?.status === 404) {
            console.log('Old document already deleted (404), continuing...');
          } else if (deleteError.response?.status === 405) {
            console.log('DELETE not supported (405), continuing...');
          } else {
            throw deleteError;
          }
        }
      }
      
      await apiClient.post('/review-content', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      await checkPendingUploads();
      
      setFeedbackModalConfig({
        message: `Document sent to ${reviewer?.name || 'reviewer'} for review!`,
        type: 'success'
      });
      setFeedbackModalVisible(true);
    } catch (error) {
      console.error('Error processing Word document:', error);
      setFeedbackModalConfig({
        message: `Failed to process document: ${error.response?.data?.message || error.message || 'Unknown error'}`,
        type: 'error'
      });
      setFeedbackModalVisible(true);
    } finally {
      setIsProcessingDocument(false);
    }
  };

  // Handle folio submission (send directly to lead organizer)
  const handleFolioSubmission = async () => {
    if (!pendingUpload) {
      setFeedbackModalConfig({
        message: 'No file selected for submission.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
      return;
    }

    setFolioConfirmModalVisible(false);

    try {
      const leadOrganizerId = getFolioLeadOrganizer();
      const currentChat = groupChats.find(g => g.id === selectedGroupId);
      const folioId = currentChat?.folio?.id;

      if (!leadOrganizerId || !folioId) {
        throw new Error('Could not find folio lead organizer');
      }

      if (pendingUpload.type === 'image') {
        await uploadImageForFolio(pendingUpload.file, leadOrganizerId, folioId);
      } else if (pendingUpload.type === 'document') {
        await uploadDocumentForFolio(pendingUpload.file, leadOrganizerId, folioId);
      }
      
      // Clear states
      setPendingUpload(null);
    } catch (error) {
      console.error('Error submitting to folio:', error);
      setFeedbackModalConfig({
        message: 'Failed to submit. Please try again.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
    }
  };

  // Upload image for folio submission
  const uploadImageForFolio = async (image, leadOrganizerId, folioId) => {
    if (!currentUser || !currentUser.id) {
      console.error('Current user not loaded');
      setFeedbackModalConfig({
        message: 'Loading user data... Please try again in a moment.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
      return;
    }
    
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      const imageFile = image.file || image;
      formData.append('image', imageFile);
    } else {
      formData.append('image', {
        uri: Platform.OS === 'android' ? image.uri : image.uri.replace('file://', ''),
        name: image.fileName || image.uri.split('/').pop() || 'photo.jpg',
        type: image.mimeType || 'image/jpeg',
      });
    }
    
    formData.append('group_id', selectedGroupId);
    formData.append('user_id', currentUser.id);
    formData.append('current_reviewer_id', leadOrganizerId);
    formData.append('review_stage', 'initial');
    formData.append('is_folio_submission', '1');
    formData.append('folio_id', folioId);
    
    const imageResponse = await apiClient.post('/review-images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    // Also create a folio submission record
    const imageName = image.file?.name || image.fileName || image.uri?.split('/').pop() || 'image';
    await apiClient.post(`/folios/${folioId}/submit`, {
      title: imageName.replace(/\.(jpg|jpeg|png|gif|webp)$/i, ''),
      content: `Image submission: ${imageResponse.data.file_path || imageName}`,
      type: 'other' // You can make this selectable later
    });
    
    // Send notification message
    const currentChat = groupChats.find(g => g.id === selectedGroupId);
    const leadOrganizerName = currentChat?.folio?.lead_organizer?.name || 'the lead organizer';
    const userName = currentUser?.name || currentUser?.email || 'A user';
    const messageText = `${userName} has submitted an image to the folio for review by ${leadOrganizerName}.`;
    await apiClient.post(`/group-chats/${selectedGroupId}/messages`, { message: messageText });
    
    // Refresh messages
    fetchMessages();
    
    setFeedbackModalConfig({
      message: `Image submitted to folio lead organizer!`,
      type: 'success'
    });
    setFeedbackModalVisible(true);
  };

  // Upload document for folio submission
  const uploadDocumentForFolio = async (file, leadOrganizerId, folioId) => {
    // Check if it's a text-based document
    if (file.mimeType === 'application/msword' || 
        file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimeType === 'text/plain' ||
        file.name.endsWith('.doc') || file.name.endsWith('.docx') || file.name.endsWith('.txt')) {
      
      await handleWordDocumentUploadForFolio(file, leadOrganizerId, folioId);
    } else {
      // For PDF, show error (folio submissions should be text-based)
      setFeedbackModalConfig({
        message: 'Folio submissions must be text-based documents (.doc, .docx, .txt). PDF files are not supported for folio submissions.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
    }
  };

  // Handle Word document upload for folio
  const handleWordDocumentUploadForFolio = async (file, leadOrganizerId, folioId) => {
    if (!currentUser || !currentUser.id) {
      console.error('Current user not loaded');
      setFeedbackModalConfig({
        message: 'Loading user data... Please try again in a moment.',
        type: 'error'
      });
      setFeedbackModalVisible(true);
      return;
    }
    
    setIsProcessingDocument(true);
    try {
      const extractedText = await extractTextFromDocument(file);
      const textFileName = file.name.replace(/\.(doc|docx)$/i, '.txt');
      let textFile;
      
      if (Platform.OS === 'web') {
        const textBlob = new Blob([extractedText], { type: 'text/plain' });
        textFile = new File([textBlob], textFileName, { type: 'text/plain' });
      } else {
        const tempUri = `${FileSystem.cacheDirectory}${textFileName}`;
        await FileSystem.writeAsStringAsync(tempUri, extractedText, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        textFile = {
          uri: tempUri,
          name: textFileName,
          type: 'text/plain'
        };
      }
      
      // Send notification message
      const currentChat = groupChats.find(g => g.id === selectedGroupId);
      const leadOrganizerName = currentChat?.folio?.lead_organizer?.name || 'the lead organizer';
      const userName = currentUser?.name || currentUser?.email || 'A user';
      const messageText = `${userName} has submitted a document to the folio for review by ${leadOrganizerName}: ${textFileName}`;
      const response = await apiClient.post(`/group-chats/${selectedGroupId}/messages`, { message: messageText });
      setMessages(prevMessages => [response.data, ...prevMessages]);

      // Upload the text file to review_content
      const formData = new FormData();
      if (Platform.OS === 'web') {
        formData.append('file', textFile);
      } else {
        formData.append('file', {
          uri: textFile.uri,
          name: textFile.name,
          type: textFile.type
        });
      }
      formData.append('group_id', selectedGroupId);
      formData.append('user_id', currentUser.id);
      formData.append('current_reviewer_id', leadOrganizerId);
      formData.append('review_stage', 'initial');
      formData.append('status', 'pending');
      formData.append('no_of_approval', '0');
      formData.append('is_folio_submission', '1');
      formData.append('folio_id', folioId);
      
      await apiClient.post('/review-content', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Also create a folio submission record
      await apiClient.post(`/folios/${folioId}/submit`, {
        title: file.name.replace(/\.(doc|docx)$/i, ''),
        content: extractedText,
        type: 'other' // You can make this selectable later
      });
      
      setFeedbackModalConfig({
        message: `Document submitted to folio lead organizer!`,
        type: 'success'
      });
      setFeedbackModalVisible(true);
    } catch (error) {
      console.error('Error processing folio document:', error);
      setFeedbackModalConfig({
        message: `Failed to process document: ${error.response?.data?.message || error.message || 'Unknown error'}`,
        type: 'error'
      });
      setFeedbackModalVisible(true);
    } finally {
      setIsProcessingDocument(false);
    }
  };

  const handlePlagiarismCheck = useCallback(async (type, data) => {
    if (isScanningRef.current) return;
    if (!data) return;

    isScanningRef.current = true;
    if (type === 'file') {
      setUploadedFile(data);
    }

    setIsUploadModalVisible(false);
    setIsPlagModalVisible(true);
    setIsScanning(true);
    setPlagiarismResult(null);
    setScanResult(null);

    let pollInterval;
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const fileToUpload = data.file || data;
        formData.append('file', fileToUpload);
      } else {
        const uri = data.uri;
        if (!uri) {
          throw new Error('Invalid file: missing URI.');
        }
        const name = data.name || uri.split('/').pop();
        const mimeType = data.mimeType || 'application/octet-stream';
        formData.append('file', { 
          uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''), 
          name, 
          type: mimeType 
        });
      }

      const initialResponse = await apiClient.post('/plagiarism-scans', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      const scanId = initialResponse.data.scan_id;

      if (!scanId) {
        throw new Error('Failed to start plagiarism scan. No scan ID received.');
      }

      pollInterval = setInterval(async () => {
        try {
          const res = await apiClient.get(`/plagiarism-scans/${scanId}`);
          if (res.data.status === 'completed') {
            console.log('Plagiarism scan completed. Full response:', JSON.stringify(res.data, null, 2));
            console.log('Score from backend:', res.data.score);
            
            // Store the complete result with score at top level for easy access
            const resultWithScore = {
              ...res.data.result,
              score: res.data.score ? { aggregatedScore: res.data.score } : res.data.result?.score
            };
            
            setPlagiarismResult(resultWithScore);
            setIsScanning(false);
            clearInterval(pollInterval);
          } else if (res.data.status === 'failed') {
            setScanResult('Plagiarism scan failed.');
            setIsScanning(false);
            clearInterval(pollInterval);
          }
        } catch (err) {
          console.error('Error polling for scan result:', err);
          setScanResult('Error retrieving scan result.');
          setIsScanning(false);
          clearInterval(pollInterval);
        }
      }, 5000);
    } catch (error) {
      const backendMsg = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error('Plagiarism check submission failed:', backendMsg, error);
      setScanResult(`Failed to submit for plagiarism check: ${backendMsg}`);
      setIsScanning(false);
      if (pollInterval) clearInterval(pollInterval);
    } finally {
      setTimeout(() => { isScanningRef.current = false; }, 1000);
    }
  }, []);

  const handleSendReviewMessage = async () => {
    setIsPlagModalVisible(false);
    try {
      const messageText = `${currentUser.name} has sent a draft for review.`;
      const response = await apiClient.post(`/group-chats/${selectedGroupId}/messages`, { message: messageText });
      setMessages(prevMessages => [response.data, ...prevMessages]);

      if (uploadedFile) {
        const formData = new FormData();
        if (Platform.OS === 'web') {
          const fileToUpload = uploadedFile.file || uploadedFile;
          formData.append('file', fileToUpload);
        } else {
          formData.append('file', { 
            uri: uploadedFile.uri, 
            name: uploadedFile.name, 
            type: uploadedFile.mimeType 
          });
        }
        formData.append('group_id', selectedGroupId);
        formData.append('user_id', currentUser.id);
        formData.append('status', 'pending');
        formData.append('no_of_approval', '0');
        // If replacing, delete the old document first
        if (pendingDocument) {
          try {
            await apiClient.delete(`/review-content/${pendingDocument.id}`);
            console.log('Old document deleted');
          } catch (deleteError) {
            // If 404, the document was already deleted/approved/rejected - that's fine
            if (deleteError.response?.status === 404) {
              console.log('Old document already deleted (404), continuing...');
            } else {
              throw deleteError; // Re-throw other errors
            }
          }
        }
        
        await apiClient.post('/review-content', formData, { 
          headers: { 'Content-Type': 'multipart/form-data' } 
        });
        
        // Refresh pending uploads
        await checkPendingUploads();
      }
    } catch (error) {
      console.error('Failed to send review message:', error);
      alert('Failed to send review notification. Please try again.');
    }
  };

  const getScoreStyle = (score) => {
    if (score > 50) return { ...modalStyles.scoreText, color: 'red' };
    if (score > 20) return { ...modalStyles.scoreText, color: 'orange' };
    return { ...modalStyles.scoreText, color: 'green' };
  };

  const renderGroup = ({ item }) => (
    <TouchableOpacity
      style={[styles.groupItem, item.id === selectedGroupId && styles.groupItemSelected]}
      onPress={() => setSelectedGroupId(item.id)}
    >
      <Text style={styles.groupName}>{item.name}</Text>
      {unreadMessages[item.id] > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{unreadMessages[item.id]}</Text>
        </View>
      )}
    </TouchableOpacity>
  );


  // Create stable callbacks for filter buttons
  const handlePendingFilter = useCallback(() => {
    setChatStatusFilter('pending');
  }, []);

  const handleApprovedFilter = useCallback(() => {
    setChatStatusFilter('approved');
  }, []);

  // Separate search component with debounced filtering
  const SearchSection = React.memo(() => (
    <StandaloneSearchInput 
      ref={searchInputRef}
      style={styles.searchBar}
      placeholder="Search chats..."
      onDebouncedSearch={handleDebouncedSearch}
      onReset={() => setChatStatusFilter('pending')}
    />
  ));

  const LeftPanel = () => (
    <View style={styles.leftPanel}>
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, groupChatFilter === 'active' && { backgroundColor: colors.primary || '#374151' }]}
          onPress={() => setGroupChatFilter('active')}>
          <Text style={[styles.filterButtonText, groupChatFilter === 'active' && styles.activeFilterText]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, groupChatFilter === 'finished' && { backgroundColor: colors.primary || '#374151' }]}
          onPress={() => setGroupChatFilter('finished')}>
          <Text style={[styles.filterButtonText, groupChatFilter === 'finished' && styles.activeFilterText]}>Finished</Text>
        </TouchableOpacity>
      </View>
      <SearchSection />
      <FlatList 
        data={filteredGroups} 
        renderItem={renderGroup} 
        keyExtractor={(item) => item.id.toString()} 
        style={styles.groupsList} 
      />
    </View>
  );

  const RightPanel = () => {


    return (
      <View style={styles.rightPanel}>
        {selectedGroupId ? (
          <>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16}}>
              <View style={{flex: 1}}>
                <Text style={styles.title}>{groupChats.find(g => g.id === selectedGroupId)?.name}</Text>
                {(() => {
                  const selectedGroup = groupChats.find(g => g.id === selectedGroupId);
                  
                  // Check if this is a finished/published chat
                  if (selectedGroup?.status === 'published') {
                    return (
                      <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6}}>
                        <Feather name="check-circle" size={14} color="#10B981" />
                        <Text style={{fontSize: 13, color: '#6B7280', marginLeft: 4}}>
                          <Text style={{fontWeight: '600', color: '#10B981'}}>Already Published</Text>
                        </Text>
                      </View>
                    );
                  }
                  
                  // Check if this is a folio chat
                  const folioLeadOrganizerId = selectedGroup?.folio?.lead_organizer_id;
                  if (folioLeadOrganizerId) {
                    const leadOrganizer = groupMembers.find(m => m.id === folioLeadOrganizerId);
                    if (leadOrganizer) {
                      return (
                        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6}}>
                          <Feather name="star" size={14} color="#8B5CF6" />
                          <Text style={{fontSize: 13, color: '#6B7280', marginLeft: 4}}>
                            Lead Organizer: <Text style={{fontWeight: '600', color: '#8B5CF6'}}>{leadOrganizer.name || leadOrganizer.email || 'Unknown'}</Text>
                          </Text>
                        </View>
                      );
                    }
                  }
                  
                  // Show lead reviewer for scrum board chats
                  const leadReviewerId = selectedGroup?.scrum_board?.lead_reviewer_id;
                  if (leadReviewerId) {
                    const leadReviewer = groupMembers.find(m => m.id === leadReviewerId);
                    if (leadReviewer) {
                      return (
                        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6}}>
                          <Feather name="shield" size={14} color="#10B981" />
                          <Text style={{fontSize: 13, color: '#6B7280', marginLeft: 4}}>
                            Lead Reviewer: <Text style={{fontWeight: '600', color: '#10B981'}}>{leadReviewer.name || leadReviewer.email || 'Unknown'}</Text>
                          </Text>
                        </View>
                      );
                    }
                  }
                  
                  // No lead reviewer/organizer found
                  return (
                    <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6}}>
                      <Feather name="alert-circle" size={14} color="#F59E0B" />
                      <Text style={{fontSize: 13, color: '#6B7280', marginLeft: 4}}>
                        No lead assigned
                      </Text>
                    </View>
                  );
                })()}
              </View>
              <View style={{alignItems: 'flex-end'}}>
                <TouchableOpacity
                  onPress={async () => {
                    console.log('Header upload button pressed');
                    // Check for pending uploads before showing modal
                    await checkPendingUploads();
                    setIsUploadModalVisible(true);
                  }}
                  style={{
                    backgroundColor: '#4285F4',
                    borderRadius: 6,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    minHeight: 44, // Ensure adequate touch target
                    justifyContent: 'center',
                    marginTop: -47 ,
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="upload" size={18} color="#fff" />
                  <Text style={{color: '#fff', fontWeight: 'bold', marginLeft: 8}}>Upload File</Text>
                </TouchableOpacity>
              </View>
            </View>
            {isMessagesLoading ? (
              <ActivityIndicator size="large" color="#0000ff" style={styles.loadingContainer} />
            ) : messages.length > 0 ? (
              <FlatList
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item, index) => item.id?.toString() || `msg-${index}`}
                style={styles.messageList}
                inverted
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={true}
                windowSize={10}
                maxToRenderPerBatch={5}
                updateCellsBatchingPeriod={100}
                initialNumToRender={15}
                getItemLayout={null}
              />
            ) : (
              <Text style={styles.emptyMessage}>No messages yet. Start the conversation!</Text>
            )}
            <StandaloneChatInput 
              onSend={handleSend}
              onUpload={async () => {
                // Check for pending uploads before showing modal
                await checkPendingUploads();
                setIsUploadModalVisible(true);
              }}
              styles={styles}
              brandColor={colors.primary}
              uploadButtonColor={colors.tertiary}
            />
          </>
        ) : (
          <View style={styles.loadingContainer}>
            <Text>Select a chat to start messaging</Text>
          </View>
        )}
      </View>
    );
  };

  const MainContent = () => {
    return (
      <View style={[styles.container, { flexDirection: isMobile ? 'column' : 'row' }]}>
        {isMobile ? (
          selectedGroupId ? (
            <>
              <TouchableOpacity 
                onPress={() => setSelectedGroupId(null)} 
                style={styles.backButton}
              >
                <Feather name="arrow-left" size={24} color="#333" />
                <Text style={styles.backButtonText}>Back to Chats</Text>
              </TouchableOpacity>
              <RightPanel />
            </>
          ) : <LeftPanel />
        ) : (
          <>
            <LeftPanel />
            <RightPanel />
          </>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      enabled={Platform.OS === "ios"}
    >
        <View style={{flex: 1}}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#0000ff" style={styles.loadingContainer} />
          ) : (
            <MainContent />
          )}
          
          {/* Upload Selection Modal */}
          <Modal 
            animationType="slide" 
            transparent={true} 
            visible={isUploadModalVisible} 
            onRequestClose={() => setIsUploadModalVisible(false)}
          >
            <View style={modalStyles.centeredView}>
              <View style={[modalStyles.modalView, {minHeight: 200}]}>
                <Text style={modalStyles.modalTitle}>Choose Upload Type</Text>
                <Text style={modalStyles.modalText}>
                  {isProcessingDocument ? 'Processing document...' : 'What would you like to upload?'}
                </Text>
                
                {isProcessingDocument && (
                  <ActivityIndicator size="large" color="#4285F4" style={{marginVertical: 20}} />
                )}
                
                <View style={{flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, gap: 15}}>
                  <TouchableOpacity 
                    style={[modalStyles.button, {backgroundColor: '#4285F4', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15}]}
                    onPress={handleChooseFile}
                  >
                    <Feather name="file-text" size={20} color="white" style={{marginRight: 8}} />
                    <Text style={[modalStyles.textStyle, {fontSize: 14}]}>Document{'\n'}(Text/Word)</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[modalStyles.button, {backgroundColor: '#34A853', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15}]}
                    onPress={handleChooseImage}
                  >
                    <Feather name="image" size={20} color="white" style={{marginRight: 8}} />
                    <Text style={[modalStyles.textStyle, {fontSize: 16}]}>Image</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[modalStyles.button, {backgroundColor: '#8B5CF6', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15}]}
                    onPress={handleChooseScan}
                  >
                    <Feather name="search" size={20} color="white" style={{marginRight: 8}} />
                    <Text style={[modalStyles.textStyle, {fontSize: 16}]}>Scan</Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={[modalStyles.button, modalStyles.buttonClose, {marginTop: 20, backgroundColor: '#6c757d'}]} 
                  onPress={() => setIsUploadModalVisible(false)}
                >
                  <Text style={modalStyles.textStyle}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          
          {/* Plagiarism Scan Modal */}
          <Modal 
            animationType="slide" 
            transparent={true} 
            visible={isPlagModalVisible} 
            onRequestClose={() => setIsPlagModalVisible(false)}
          >
            <View style={modalStyles.centeredView}>
              <View style={modalStyles.modalView}>
                <Text style={modalStyles.modalTitle}>Plagiarism Scan</Text>
                {isScanning ? (
                  <View>
                    <ActivityIndicator size="large" color="#0000ff" />
                    <Text style={modalStyles.modalText}>Scanning... please wait.</Text>
                  </View>
                ) : (
                  <ScrollView style={{maxHeight: 400}}>
                    {plagiarismResult ? (
                      <View>
                        <Text style={[modalStyles.modalText, {fontWeight: 'bold', fontSize: 16, marginBottom: 10}]}>
                          File: {uploadedFile?.name}
                        </Text>
                        
                        {/* Plagiarism Score */}
                        {plagiarismResult?.score?.aggregatedScore !== undefined ? (
                          <Text style={[getScoreStyle(plagiarismResult.score.aggregatedScore), {fontSize: 18, fontWeight: 'bold', marginVertical: 8}]}>
                            Plagiarism Score: {plagiarismResult.score.aggregatedScore.toFixed(2)}%
                          </Text>
                        ) : plagiarismResult?.result?.score !== undefined ? (
                          <Text style={[getScoreStyle(plagiarismResult.result.score), {fontSize: 18, fontWeight: 'bold', marginVertical: 8}]}>
                            Plagiarism Score: {plagiarismResult.result.score.toFixed(2)}%
                          </Text>
                        ) : null}
                        
                        {/* AI Detection Score */}
                        {plagiarismResult?.ai_score !== undefined && plagiarismResult.ai_score !== null && (
                          <Text style={[getScoreStyle(plagiarismResult.ai_score), {fontSize: 18, fontWeight: 'bold', marginVertical: 8}]}>
                            AI Detection Score: {plagiarismResult.ai_score.toFixed(2)}%
                          </Text>
                        )}
                        
                        {/* Structure Analysis */}
                        {plagiarismResult?.analysis && (
                          <View style={{marginTop: 15, padding: 12, backgroundColor: '#F3F4F6', borderRadius: 8}}>
                            <Text style={[modalStyles.modalText, {fontWeight: 'bold', fontSize: 15, marginBottom: 8}]}>
                              📊 Structure Analysis
                            </Text>
                            {plagiarismResult.analysis.total_words !== null && (
                              <Text style={modalStyles.modalText}>
                                • Total Words: {plagiarismResult.analysis.total_words}
                              </Text>
                            )}
                            {plagiarismResult.analysis.plagiarized_words !== null && (
                              <Text style={[modalStyles.modalText, {color: plagiarismResult.analysis.plagiarized_words > 0 ? '#EF4444' : '#10B981'}]}>
                                • Plagiarized Words: {plagiarismResult.analysis.plagiarized_words}
                              </Text>
                            )}
                            {plagiarismResult.analysis.identical_words !== null && (
                              <Text style={modalStyles.modalText}>
                                • Identical Words: {plagiarismResult.analysis.identical_words}
                              </Text>
                            )}
                            {plagiarismResult.analysis.similar_words !== null && (
                              <Text style={modalStyles.modalText}>
                                • Similar Words: {plagiarismResult.analysis.similar_words}
                              </Text>
                            )}
                            {plagiarismResult.analysis.source_counts !== null && (
                              <Text style={modalStyles.modalText}>
                                • Sources Found: {plagiarismResult.analysis.source_counts}
                              </Text>
                            )}
                          </View>
                        )}
                        
                        {/* Legacy fallback for result structure */}
                        {!plagiarismResult?.analysis && plagiarismResult?.result?.totalPlagiarismWords !== undefined && (
                          <View style={{marginTop: 15, padding: 12, backgroundColor: '#F3F4F6', borderRadius: 8}}>
                            <Text style={[modalStyles.modalText, {fontWeight: 'bold', fontSize: 15, marginBottom: 8}]}>
                              📊 Structure Analysis
                            </Text>
                            <Text style={modalStyles.modalText}>
                              • Total Words: {plagiarismResult.result.textWordCounts}
                            </Text>
                            <Text style={[modalStyles.modalText, {color: plagiarismResult.result.totalPlagiarismWords > 0 ? '#EF4444' : '#10B981'}]}>
                              • Plagiarized Words: {plagiarismResult.result.totalPlagiarismWords}
                            </Text>
                            <Text style={modalStyles.modalText}>
                              • Identical Words: {plagiarismResult.result.identicalWordCounts}
                            </Text>
                            <Text style={modalStyles.modalText}>
                              • Similar Words: {plagiarismResult.result.similarWordCounts}
                            </Text>
                            <Text style={modalStyles.modalText}>
                              • Sources Found: {plagiarismResult.result.sourceCounts}
                            </Text>
                          </View>
                        )}
                        
                        {/* Sources */}
                        {plagiarismResult?.sources && plagiarismResult.sources.length > 0 && (
                          <View style={{marginTop: 15}}>
                            <Text style={[modalStyles.modalText, {fontWeight: 'bold', fontSize: 15, marginBottom: 8}]}>
                              🔗 Matching Sources:
                            </Text>
                            {plagiarismResult.sources.slice(0, 5).map((source, index) => (
                              <Text key={index} style={[modalStyles.modalText, {fontSize: 13, marginLeft: 8}]}>
                                {index + 1}. {source.url || source.title}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    ) : (
                      <Text style={modalStyles.modalText}>{scanResult || 'No result yet.'}</Text>
                    )}
                  </ScrollView>
                )}
                <TouchableOpacity 
                  style={[modalStyles.button, modalStyles.buttonClose, {marginTop: 10}]} 
                  onPress={() => setIsPlagModalVisible(false)}
                >
                  <Text style={modalStyles.textStyle}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Confirmation Modal */}
          <Modal 
            animationType="fade" 
            transparent={true} 
            visible={confirmModalVisible} 
            onRequestClose={() => {
              setConfirmModalVisible(false);
              setIsUploadModalVisible(false);
            }}
          >
            <View style={modalStyles.centeredView}>
              <View style={[modalStyles.modalView, {minHeight: 180, maxWidth: 400}]}>
                <View style={{alignItems: 'center', marginBottom: 20}}>
                  <Feather name="alert-circle" size={48} color="#F59E0B" />
                </View>
                <Text style={[modalStyles.modalTitle, {fontSize: 20}]}>Replace Submission?</Text>
                <Text style={[modalStyles.modalText, {textAlign: 'center', marginBottom: 30}]}>
                  {confirmModalConfig.message}
                </Text>
                
                <View style={{flexDirection: 'row', justifyContent: 'space-around', gap: 15}}>
                  <TouchableOpacity 
                    style={[modalStyles.button, {backgroundColor: '#6c757d', flex: 1, paddingVertical: 12}]}
                    onPress={() => {
                      console.log('User cancelled replacement');
                      setConfirmModalVisible(false);
                      setIsUploadModalVisible(false);
                    }}
                  >
                    <Text style={modalStyles.textStyle}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[modalStyles.button, {backgroundColor: '#DC2626', flex: 1, paddingVertical: 12}]}
                    onPress={() => {
                      if (confirmModalConfig.onConfirm) {
                        confirmModalConfig.onConfirm();
                      }
                    }}
                  >
                    <Text style={modalStyles.textStyle}>Replace</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Reviewer Selection Modal */}
          <Modal 
            animationType="fade" 
            transparent={true} 
            visible={reviewerModalVisible} 
            onRequestClose={() => {
              setReviewerModalVisible(false);
              setPendingUpload(null);
              setSelectedReviewer(null);
            }}
          >
            <View style={modalStyles.centeredView}>
              <View style={[modalStyles.modalView, {minHeight: 400, maxWidth: 500, width: '90%'}]}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 20}}>
                  <Feather name="user-check" size={28} color="#1a237e" />
                  <Text style={[modalStyles.modalTitle, {fontSize: 22, marginLeft: 12, marginBottom: 0}]}>
                    Select Reviewer
                  </Text>
                </View>
                <Text style={{fontSize: 14, color: '#6B7280', marginBottom: 20}}>
                  Choose a team member to review this {pendingUpload?.type === 'image' ? 'image' : 'document'}
                </Text>
                
                <ScrollView style={{maxHeight: 300, width: '100%'}}>
                  {groupMembers.length === 0 ? (
                    <View style={{alignItems: 'center', padding: 40}}>
                      <Feather name="users" size={48} color="#D1D5DB" />
                      <Text style={{color: '#9CA3AF', marginTop: 12}}>No team members available</Text>
                    </View>
                  ) : (
                    groupMembers
                      .filter(member => member.id !== currentUser?.id) // Filter out current user for reviewer selection
                      .map((member) => (
                      <TouchableOpacity
                        key={member.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 12,
                          borderRadius: 10,
                          marginBottom: 8,
                          backgroundColor: selectedReviewer?.id === member.id ? '#EEF2FF' : '#F9FAFB',
                          borderWidth: 2,
                          borderColor: selectedReviewer?.id === member.id ? '#1a237e' : '#E5E7EB',
                        }}
                        onPress={() => setSelectedReviewer(member)}
                      >
                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: selectedReviewer?.id === member.id ? '#1a237e' : '#D1D5DB',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 12,
                        }}>
                          <Text style={{
                            color: '#fff',
                            fontSize: 16,
                            fontWeight: '700',
                          }}>
                            {member.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{flex: 1}}>
                          <Text style={{
                            fontSize: 15,
                            fontWeight: '600',
                            color: '#111827',
                          }}>
                            {member.name}
                          </Text>
                          {member.profile?.position && (
                            <Text style={{
                              fontSize: 13,
                              color: '#6B7280',
                              marginTop: 2,
                            }}>
                              {member.profile.position}
                            </Text>
                          )}
                        </View>
                        {selectedReviewer?.id === member.id && (
                          <Feather name="check-circle" size={24} color="#10B981" />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
                
                <View style={{flexDirection: 'row', gap: 12, marginTop: 20, width: '100%'}}>
                  <TouchableOpacity 
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 10,
                      backgroundColor: '#F3F4F6',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      setReviewerModalVisible(false);
                      setPendingUpload(null);
                      setSelectedReviewer(null);
                    }}
                  >
                    <Text style={{color: '#374151', fontWeight: '600', fontSize: 15}}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 10,
                      backgroundColor: selectedReviewer ? '#1a237e' : '#D1D5DB',
                      alignItems: 'center',
                    }}
                    onPress={handleUploadWithReviewer}
                    disabled={!selectedReviewer}
                  >
                    <Feather name="send" size={18} color="#fff" />
                    <Text style={{color: '#fff', fontWeight: '700', fontSize: 15}}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Folio Submission Confirmation Modal */}
          <Modal 
            animationType="fade" 
            transparent={true} 
            visible={folioConfirmModalVisible} 
            onRequestClose={() => {
              setFolioConfirmModalVisible(false);
              setPendingUpload(null);
            }}
          >
            <View style={modalStyles.centeredView}>
              <View style={[modalStyles.modalView, {minHeight: 300, maxWidth: 500, width: '90%'}]}>
                <View style={{alignItems: 'center', marginBottom: 20}}>
                  <View style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: '#EEF2FF',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}>
                    <Feather name="folder" size={40} color="#1a237e" />
                  </View>
                  <Text style={[modalStyles.modalTitle, {fontSize: 22, marginBottom: 8}]}>
                    Submit to Folio
                  </Text>
                  <Text style={{fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22}}>
                    This {pendingUpload?.type === 'image' ? 'image' : 'document'} will be sent directly to the folio lead organizer for review.
                  </Text>
                </View>
                
                <View style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 24,
                  borderLeftWidth: 4,
                  borderLeftColor: '#1a237e',
                }}>
                  <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                    <Feather name="info" size={18} color="#1a237e" />
                    <Text style={{fontSize: 14, fontWeight: '600', color: '#111827', marginLeft: 8}}>
                      Submission Details
                    </Text>
                  </View>
                  <Text style={{fontSize: 13, color: '#6B7280', lineHeight: 20}}>
                    • Your {pendingUpload?.type === 'image' ? 'image' : 'document'} will be reviewed by the lead organizer{'\n'}
                    • You'll be notified once it's been reviewed{'\n'}
                    • Make sure your submission follows the folio theme
                  </Text>
                </View>

                <View style={{flexDirection: 'row', gap: 12}}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      minWidth: 120,
                      paddingVertical: 12,
                      borderRadius: 10,
                      backgroundColor: '#F3F4F6',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      setFolioConfirmModalVisible(false);
                      setPendingUpload(null);
                    }}
                  >
                    <Text style={{color: '#374151', fontWeight: '600', fontSize: 15}}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      minWidth: 120,
                      flexDirection: 'row',
                      paddingVertical: 12,
                      borderRadius: 10,
                      backgroundColor: '#1a237e',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                    onPress={handleFolioSubmission}
                  >
                    <Feather name="send" size={18} color="#fff" />
                    <Text style={{color: '#fff', fontWeight: '700', fontSize: 15}}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Feedback Modal */}
          <Modal 
            animationType="fade" 
            transparent={true} 
            visible={feedbackModalVisible} 
            onRequestClose={() => setFeedbackModalVisible(false)}
          >
            <View style={modalStyles.centeredView}>
              <View style={[modalStyles.modalView, {minHeight: 200, maxWidth: 400}]}>
                <View style={{alignItems: 'center', marginBottom: 20}}>
                  <Feather 
                    name={feedbackModalConfig.type === 'success' ? 'check-circle' : 'x-circle'} 
                    size={64} 
                    color={feedbackModalConfig.type === 'success' ? '#10B981' : '#EF4444'} 
                  />
                </View>
                <Text style={[modalStyles.modalTitle, {fontSize: 20, textAlign: 'center'}]}>
                  {feedbackModalConfig.type === 'success' ? 'Success!' : 'Error'}
                </Text>
                <Text style={[modalStyles.modalText, {textAlign: 'center', marginBottom: 30, fontSize: 15}]}>
                  {feedbackModalConfig.message}
                </Text>
                
                <TouchableOpacity 
                  style={[modalStyles.button, {
                    backgroundColor: feedbackModalConfig.type === 'success' ? '#10B981' : '#EF4444',
                    paddingVertical: 12,
                    width: '100%'
                  }]}
                  onPress={() => setFeedbackModalVisible(false)}
                >
                  <Text style={modalStyles.textStyle}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f6fa' 
  },
  leftPanel: { 
    width: 320, 
    borderRightWidth: 1, 
    borderRightColor: '#e0e0e0', 
    backgroundColor: '#ffffff', 
    padding: 10, 
    display: 'flex', 
    flexDirection: 'column' 
  },
  rightPanel: { 
    flex: 1, 
    padding: 20, 
    display: 'flex', 
    flexDirection: 'column',
    position: 'relative',
    backgroundColor: '#fff',
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 12, 
    color: '#333', 
    paddingBottom: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  messageList: { 
    flex: 1,
    marginBottom: 70,
  },
  emptyMessage: { 
    flex: 1,
    textAlign: 'center', 
    marginTop: 50, 
    color: '#aaa', 
    fontSize: 16 
  },
  filterContainer: { 
    flexDirection: 'row', 
    justifyContent: 'flex-start', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 16, 
    marginLeft: 30 
  },
  filterButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    backgroundColor: '#f0f0f0' 
  },
  activeFilter: { 
    backgroundColor: '#374151' 
  },
  filterButtonText: { 
    color: '#333', 
    fontWeight: '600' 
  },
  activeFilterText: { 
    color: '#FFFFFF' 
  },
  searchBar: { 
    height: 40, 
    borderRadius: 8, 
    backgroundColor: '#f0f0f0', 
    paddingHorizontal: 12, 
    marginBottom: 8, 
    fontSize: 16, 
    color: '#333' 
  },
  groupsList: { 
    flex: 1 
  },
  groupItem: { 
    paddingVertical: 10, 
    paddingHorizontal: 10, 
    borderRadius: 6, 
    marginBottom: 8, 
    backgroundColor: '#f7f7f7', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  groupItemSelected: { 
    backgroundColor: '#d1eaff' 
  },
  groupName: { 
    fontSize: 16, 
    flex: 1 
  },
  unreadBadge: { 
    backgroundColor: '#3b82f6', 
    borderRadius: 12, 
    minWidth: 24, 
    height: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 5, 
    marginLeft: 10 
  },
  unreadCount: { 
    color: 'white', 
    fontSize: 12, 
    fontWeight: 'bold' 
  },
  messageContainer: { 
    paddingVertical: 5, 
    paddingHorizontal: 10, 
    flexDirection: 'row', 
    alignItems: 'flex-end' 
  },
  myMessageContainer: { 
    justifyContent: 'flex-end' 
  },
  theirMessageContainer: { 
    justifyContent: 'flex-start' 
  },
  messageBubble: { 
    padding: 10, 
    borderRadius: 15, 
    maxWidth: '80%' 
  },
  myMessage: { 
    backgroundColor: '#d1eaff', 
    alignSelf: 'flex-end' 
  },
  theirMessage: { 
    backgroundColor: '#eee', 
    alignSelf: 'flex-start' 
  },
  uploadNotificationBubble: {
    backgroundColor: '#F3E8FF',
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
    alignSelf: 'center',
    maxWidth: '90%',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadNotificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD6FE',
  },
  uploadNotificationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  uploadNotificationText: {
    color: '#6B21A8',
    fontWeight: '500',
    fontSize: 14,
  },
  messageText: { 
    fontSize: 16, 
    color: '#222' 
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  avatarPlaceholder: {
    width: 36,
    marginRight: 8,
  },
  senderName: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 2,
  },
  mySenderName: {
    textAlign: 'right',
  },
  theirSenderName: {
    textAlign: 'left',
  },
  inputContainer: { 
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    backgroundColor: '#fff', 
    borderRadius: 25, 
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: '#000', 
    shadowOpacity: 0.15, 
    shadowRadius: 8, 
    shadowOffset: { width: 0, height: 4 }, 
    elevation: 8, 
    gap: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  input: { 
    flex: 1, 
    minHeight: 45,
    maxHeight: 47,
    fontSize: 16, 
    color: '#2c3e50',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 22,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sendButton: { 
    backgroundColor: '#007bff', 
    borderRadius: 22, 
    paddingHorizontal: 20, 
    height: 44, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#007bff',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sendButtonText: { 
    color: 'white', 
    fontWeight: '600',
    fontSize: 15
  },
  uploadButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  backButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee', 
    backgroundColor: '#f8f9fa' 
  },
  backButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginLeft: 10, 
    color: '#333' 
  },
});