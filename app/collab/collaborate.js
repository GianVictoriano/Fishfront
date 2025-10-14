import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal, 
  Linking, ScrollView, useWindowDimensions, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { pickImage } from './imageUtils';
import apiClient, { sendMessage, getMessages } from '../../utils/api';

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
const StandaloneChatInput = ({ onSend, onUpload, styles }) => {
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
      <TouchableOpacity onPress={onUpload} style={styles.uploadButton}>
        <Feather name="paperclip" size={24} color="#333" />
      </TouchableOpacity>
      <TextInput 
        ref={inputRef}
        style={styles.input} 
        value={text} 
        onChangeText={setText} 
        placeholder="Type a message (Shift+Enter for new line)..." 
        blurOnSubmit={false}
        autoCorrect={true}
        autoCapitalize="sentences"
        multiline={true}
        textAlignVertical="top"
        onKeyPress={handleKeyPress}
        returnKeyType="default"
      />
      <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
        <Text style={styles.sendButtonText}>Send</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function CollaborateScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [uploadedFile, setUploadedFile] = useState(null);
  const [search, setSearch] = useState('');
  const [groupChats, setGroupChats] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
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
            apiClient.get('/users/me').then(response => setCurrentUser(response.data))
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

  const filteredGroups = useMemo(() => 
    groupChats.filter(g => 
      (g.scrum_board?.status || 'pending') === chatStatusFilter && 
      g.name.toLowerCase().includes(search.toLowerCase())
    ), [groupChats, chatStatusFilter, search]
  );

  useEffect(() => {
    const currentGroupStillVisible = filteredGroups.some(g => g.id === selectedGroupId);
    if (!currentGroupStillVisible && selectedGroupId) {
      // Only auto-select if the current selection is no longer visible
      // Don't auto-select when just searching
      setSelectedGroupId(null);
    }
  }, [chatStatusFilter]); // Remove 'search' dependency to prevent auto-selection while typing

  const fetchMessages = useCallback(async () => {
    if (!selectedGroupId) {
      setMessages([]);
      return;
    }

    setIsMessagesLoading(true);
    try {
      const response = await getMessages(selectedGroupId);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsMessagesLoading(false);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [selectedGroupId]);

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

    return (
      <View key={item.id || `msg-${index}`} style={[styles.messageContainer, isMe ? styles.myMessageContainer : styles.theirMessageContainer]}>
        <View style={{flex: 1}}>
          {showName && (
            <Text style={[styles.senderName, isMe ? styles.mySenderName : styles.theirSenderName]}>
              {senderName}
            </Text>
          )}
          <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
            <Text style={styles.messageText}>{item.message}</Text>
          </View>
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
      // Extract text from the document
      const extractedText = await extractTextFromDocument(file);
      
      // Create a text file from the extracted content
      const textFileName = file.name.replace(/\.(doc|docx)$/i, '.txt');
      let textFile;
      
      if (Platform.OS === 'web') {
        // Create a Blob for web
        const textBlob = new Blob([extractedText], { type: 'text/plain' });
        textFile = new File([textBlob], textFileName, { type: 'text/plain' });
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
      }
      
      // Send review message
      const messageText = `${currentUser.name} has sent a converted document for review: ${textFileName}`;
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
      formData.append('status', 'pending');
      formData.append('no_of_approval', '0');
      
      await apiClient.post('/review-content', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      alert('Document converted to text and sent for review successfully!');
    } catch (error) {
      console.error('Error processing Word document:', error);
      alert('Failed to process Word document. Please try again.');
    } finally {
      setIsProcessingDocument(false);
    }
  };

  const handleChooseFile = async () => {
    console.log('handleChooseFile called');
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
        
        // Check if it's a text-based document that we can convert to message
        if (file.mimeType === 'application/msword' || 
            file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.mimeType === 'text/plain' ||
            file.name.endsWith('.doc') || file.name.endsWith('.docx') || file.name.endsWith('.txt')) {
          
          setIsUploadModalVisible(false);
          await handleWordDocumentUpload(file);
        } else {
          // For other file types (PDF, etc.), use the existing plagiarism check flow
          handlePlagiarismCheck('file', file);
          setUploadedFile(file);
        }
      } else {
        setIsUploadModalVisible(false);
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  const handleChooseImage = async () => {
    try {
      const image = await pickImage();
      if (image) {
        const formData = new FormData();
        formData.append('image', {
          uri: Platform.OS === 'android' ? image.uri : image.uri.replace('file://', ''),
          name: image.fileName || image.uri.split('/').pop() || 'photo.jpg',
          type: image.mimeType || 'image/jpeg',
        });
        formData.append('group_id', selectedGroupId);
        formData.append('user_id', currentUser.id);
        await apiClient.post('/review-images', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setIsUploadModalVisible(false);
      } else {
        setIsUploadModalVisible(false);
      }
    } catch (err) {
      console.error('Error picking/sending image:', err);
      setIsUploadModalVisible(false);
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
            setPlagiarismResult(res.data.result);
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
        await apiClient.post('/review-content', formData, { 
          headers: { 'Content-Type': 'multipart/form-data' } 
        });
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
          style={[styles.filterButton, chatStatusFilter === 'pending' && styles.activeFilter]}
          onPress={handlePendingFilter}>
          <Text style={[styles.filterButtonText, chatStatusFilter === 'pending' && styles.activeFilterText]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, chatStatusFilter === 'approved' && styles.activeFilter]}
          onPress={handleApprovedFilter}>
          <Text style={[styles.filterButtonText, chatStatusFilter === 'approved' && styles.activeFilterText]}>Finished</Text>
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
              <Text style={styles.title}>{groupChats.find(g => g.id === selectedGroupId)?.name}</Text>
              <View style={{alignItems: 'flex-end'}}>
                <TouchableOpacity
                  onPress={() => {
                    console.log('Header upload button pressed');
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
              onUpload={() => setIsUploadModalVisible(true)}
              styles={styles}
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
                    onPress={() => {
                      setIsUploadModalVisible(false);
                      handleChooseFile();
                    }}
                  >
                    <Feather name="file-text" size={20} color="white" style={{marginRight: 8}} />
                    <Text style={[modalStyles.textStyle, {fontSize: 14}]}>Document{'\n'}(Text/Word)</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[modalStyles.button, {backgroundColor: '#34A853', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15}]}
                    onPress={() => {
                      setIsUploadModalVisible(false);
                      handleChooseImage();
                    }}
                  >
                    <Feather name="image" size={20} color="white" style={{marginRight: 8}} />
                    <Text style={[modalStyles.textStyle, {fontSize: 16}]}>Image</Text>
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
                  <ScrollView>
                    {plagiarismResult ? (
                      <View>
                        <Text style={modalStyles.modalText}>File: {uploadedFile?.name}</Text>
                        <Text style={getScoreStyle(plagiarismResult?.score || 0)}>
                          Plagiarism Score: {plagiarismResult?.score ? plagiarismResult.score.toFixed(2) : 'N/A'}%
                        </Text>
                        {plagiarismResult.url && (
                          <TouchableOpacity onPress={() => Linking.openURL(plagiarismResult.url)}>
                            <Text style={modalStyles.linkText}>View Report</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                          style={[modalStyles.button, modalStyles.buttonClose]} 
                          onPress={handleSendReviewMessage}
                        >
                          <Text style={modalStyles.textStyle}>Send to Review</Text>
                        </TouchableOpacity>
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
    minHeight: 44,
    maxHeight: 120,
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