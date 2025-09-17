import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal, 
  Linking, ScrollView, useWindowDimensions
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { pickImage } from './imageUtils';
import apiClient, { sendMessage, getMessages } from '../../utils/api';
import modalStyles from './modalStyles.js';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

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
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState({});

  const [isPlagModalVisible, setIsPlagModalVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [plagiarismResult, setPlagiarismResult] = useState(null);

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
  }, [selectedGroupId]);

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
    }, [fetchGroupChats])
  );

  const filteredGroups = groupChats.filter(g => 
    (g.scrum_board?.status || 'pending') === chatStatusFilter && g.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const currentGroupStillVisible = filteredGroups.some(g => g.id === selectedGroupId);
    if (!currentGroupStillVisible) {
      setSelectedGroupId(filteredGroups[0]?.id || null);
    }
  }, [search, chatStatusFilter]);

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

  const handleSend = async () => {
    if (!inputText.trim() || !selectedGroupId) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      message: inputText,
      user_id: currentUser.id,
      user: { name: 'Me' },
      created_at: new Date().toISOString(),
    };

    setMessages(prevMessages => [optimisticMessage, ...prevMessages]);
    setInputText('');

    try {
      const response = await sendMessage(selectedGroupId, inputText);
      const savedMessage = response.data;
      setMessages(prevMessages =>
        prevMessages.map(msg => (msg.id === tempId ? savedMessage : msg))
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempId));
      setInputText(optimisticMessage.message);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleChooseFile = async () => {
    try {
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
        handlePlagiarismCheck('file', result.assets[0]);
        setUploadedFile(result.assets[0]);
      } else {
        setShowUploadMenu(false);
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
        setShowUploadMenu(false);
      } else {
        setShowUploadMenu(false);
      }
    } catch (err) {
      console.error('Error picking/sending image:', err);
      setShowUploadMenu(false);
    }
  };

  const handlePlagiarismCheck = useCallback(async (type, data) => {
    if (isScanningRef.current) return;
    if (!data) return;

    isScanningRef.current = true;
    if (type === 'file') {
      setUploadedFile(data);
    }

    setShowUploadMenu(false);
    setIsPlagModalVisible(true);
    setIsScanning(true);
    setPlagiarismResult(null);
    setScanResult(null);

    let pollInterval;
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        formData.append('file', data);
      } else {
        const uri = data.uri;
        if (!uri) {
          throw new Error('Invalid file: missing URI.');
        }
        const name = data.name || uri.split('/').pop();
        const mimeType = data.mimeType || 'application/octet-stream';
        formData.append('file', { uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''), name, type: mimeType });
      }

      const initialResponse = await apiClient.post('/plagiarism-scans', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
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
          formData.append('file', uploadedFile);
        } else {
          formData.append('file', { uri: uploadedFile.uri, name: uploadedFile.name, type: uploadedFile.mimeType });
        }
        formData.append('group_id', selectedGroupId);
        formData.append('user_id', currentUser.id);
        formData.append('status', 'pending');
        formData.append('no_of_approval', '0');
        await apiClient.post('/review-content', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
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

  const renderMessage = ({ item, index, messages }) => {
  if (item.user_id === null) return null;
  const isMe = currentUser && item.user_id === currentUser.id;

  // Avatar: show on the chronologically first message of a block (bottom in UI)
  const prevMsg = messages[index - 1];
  const showAvatar = !isMe && (!prevMsg || prevMsg.user_id !== item.user_id);
  const avatarUri = showAvatar ? (item.user?.profile?.avatar || item.user?.avatar || null) : null;

  // Name: show on the chronologically last message of a block (top in UI)
  const nextMsg = messages[index + 1];
  const showName = !nextMsg || nextMsg.user_id !== item.user_id;
  const senderName = isMe ? 'you' : (item.user?.profile?.name || item.user?.name || '');

  return (
    <View style={[styles.messageContainer, isMe ? styles.myMessageContainer : styles.theirMessageContainer]}>
      {showAvatar && avatarUri ? (
        <Image
          source={{ uri: avatarUri }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.avatarPlaceholder} />
      )}
      <View style={{flex: 1}}>
        {showName && (
          <Text style={[styles.senderName, isMe ? styles.mySenderName : styles.theirSenderName]}>{senderName}</Text>
        )}
        <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
          <Text style={styles.messageText}>{item.message}</Text>
        </View>
      </View>
    </View>
  );
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

  const LeftPanel = () => (
    <View style={styles.leftPanel}>
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, chatStatusFilter === 'pending' && styles.activeFilter]}
          onPress={() => setChatStatusFilter('pending')}>
          <Text style={[styles.filterButtonText, chatStatusFilter === 'pending' && styles.activeFilterText]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, chatStatusFilter === 'approved' && styles.activeFilter]}
          onPress={() => setChatStatusFilter('approved')}>
          <Text style={[styles.filterButtonText, chatStatusFilter === 'approved' && styles.activeFilterText]}>Finished</Text>
        </TouchableOpacity>
      </View>
      <TextInput style={styles.searchBar} placeholder="Search chats..." value={search} onChangeText={setSearch} />
      <FlatList data={filteredGroups} renderItem={renderGroup} keyExtractor={(item) => item.id.toString()} style={styles.groupsList} />
    </View>
  );

  const RightPanel = () => {
  // Google Doc Creation Handler
  const handleCreateGoogleDoc = async () => {
    try {
      // Dynamically import AsyncStorage to avoid breaking web builds
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const accessToken = await AsyncStorage.getItem('google_access_token');
      if (!accessToken) {
        alert('Google sign-in required. Please sign in with Google to create a doc.');
        return;
      }
      const res = await apiClient.post('/google/create-doc', {
        access_token: accessToken,
        group_id: selectedGroupId,
      });
      const { docUrl } = res.data;
      if (docUrl) {
        // Post the link as a message in the chat
        await sendMessage(selectedGroupId, `Google Doc created: ${docUrl}`);
        fetchMessages();
      } else {
        alert('Google Doc creation failed: No URL returned.');
      }
    } catch (err) {
      console.error('Google Doc creation error:', err);
      let msg = err?.response?.data?.error || err?.message || 'Unknown error';
      alert('Failed to create Google Doc: ' + msg);
    }
  };

  return (
    <View style={styles.rightPanel}>
      {selectedGroupId ? (
        <>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16}}>
            <Text style={styles.title}>{groupChats.find(g => g.id === selectedGroupId)?.name}</Text>
            <TouchableOpacity onPress={handleCreateGoogleDoc} style={{backgroundColor: '#4285F4', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', marginLeft: 16}}>
              <Feather name="file-plus" size={18} color="#fff" />
              <Text style={{color: '#fff', fontWeight: 'bold', marginLeft: 8}}>Create Google Doc</Text>
            </TouchableOpacity>
          </View>
          {isMessagesLoading ? (
            <ActivityIndicator size="large" color="#0000ff" style={styles.loadingContainer} />
          ) : messages.length > 0 ? (
            <FlatList
              data={messages}
              renderItem={({ item, index }) => renderMessage({ item, index, messages })}
              keyExtractor={(item, index) => item.id?.toString() || `msg-${index}`}
              style={styles.messageList}
              inverted
            />
          ) : (
            <Text style={styles.emptyMessage}>No messages yet. Start the conversation!</Text>
          )}
          <View style={styles.inputContainer}>
            <TouchableOpacity onPress={() => setShowUploadMenu(v => !v)} style={styles.uploadButton}>
              <Feather name="paperclip" size={24} color="#333" />
            </TouchableOpacity>
            {showUploadMenu && (
              <View style={styles.uploadMenu}>
                <TouchableOpacity onPress={handleChooseFile} style={styles.uploadMenuItem}>
                  <Text style={styles.uploadMenuText}>Upload File</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleChooseImage} style={styles.uploadMenuItem}>
                  <Text style={styles.uploadMenuText}>Upload Image</Text>
                </TouchableOpacity>
              </View>
            )}
            <TextInput style={styles.input} value={inputText} onChangeText={setInputText} placeholder="Type a message..." onSubmitEditing={handleSend} />
            <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <Text>Select a chat to start messaging</Text>
        </View>
      )}
    </View>
  );
};

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loadingContainer} />
      ) : (
        <View style={[styles.container, { flexDirection: isMobile ? 'column' : 'row' }]}>
          {isMobile ? (
            selectedGroupId ? (
              <>
                <TouchableOpacity onPress={() => setSelectedGroupId(null)} style={styles.backButton}>
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
      )}
      <Modal animationType="slide" transparent={true} visible={isPlagModalVisible} onRequestClose={() => setIsPlagModalVisible(false)}>
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
                    <Text style={getScoreStyle(plagiarismResult.score)}>Plagiarism Score: {plagiarismResult.score.toFixed(2)}%</Text>
                    {plagiarismResult.url && 
                      <TouchableOpacity onPress={() => Linking.openURL(plagiarismResult.url)}>
                        <Text style={modalStyles.linkText}>View Report</Text>
                      </TouchableOpacity>}
                    <TouchableOpacity style={[modalStyles.button, modalStyles.buttonClose]} onPress={handleSendReviewMessage}>
                      <Text style={modalStyles.textStyle}>Send to Review</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={modalStyles.modalText}>{scanResult || 'No result yet.'}</Text>
                )}
              </ScrollView>
            )}
            <TouchableOpacity style={[modalStyles.button, modalStyles.buttonClose, {marginTop: 10}]} onPress={() => setIsPlagModalVisible(false)}>
              <Text style={modalStyles.textStyle}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  leftPanel: { width: 320, borderRightWidth: 1, borderRightColor: '#e0e0e0', backgroundColor: '#ffffff', padding: 10, display: 'flex', flexDirection: 'column' },
  rightPanel: { flex: 1, padding: 20, display: 'flex', flexDirection: 'column' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#333', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { flex: 1 },
  emptyMessage: { textAlign: 'center', marginTop: 50, color: '#aaa', fontSize: 16 },
  filterContainer: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 8, marginBottom: 16, marginLeft: 30 },
  filterButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f0f0f0' },
  activeFilter: { backgroundColor: '#374151' },
  filterButtonText: { color: '#333', fontWeight: '600' },
  activeFilterText: { color: '#FFFFFF' },
  searchBar: { height: 40, borderRadius: 8, backgroundColor: '#f0f0f0', paddingHorizontal: 12, marginBottom: 8, fontSize: 16, color: '#333' },
  groupsList: { flex: 1 },
  groupItem: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 6, marginBottom: 8, backgroundColor: '#f7f7f7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupItemSelected: { backgroundColor: '#d1eaff' },
  groupName: { fontSize: 16, flex: 1 },
  unreadBadge: { backgroundColor: '#3b82f6', borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, marginLeft: 10 },
  unreadCount: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  messageContainer: { paddingVertical: 5, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'flex-end' },
  myMessageContainer: { justifyContent: 'flex-end' },
  theirMessageContainer: { justifyContent: 'flex-start' },
  messageBubble: { padding: 10, borderRadius: 15, maxWidth: '80%' },
  myMessage: { backgroundColor: '#d1eaff', alignSelf: 'flex-end' },
  theirMessage: { backgroundColor: '#eee', alignSelf: 'flex-start' },
  messageText: { fontSize: 16, color: '#222' },
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
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#fff', borderRadius: 8, padding: 6, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2, gap: 8 },
  input: { flex: 1, height: 40, fontSize: 16, color: '#333' },
  sendButton: { backgroundColor: '#374151', borderRadius: 8, paddingHorizontal: 16, height: 36, justifyContent: 'center', alignItems: 'center' },
  sendButtonText: { color: 'white', fontWeight: 'bold' },
  uploadButton: { padding: 6 },
  uploadMenu: { position: 'absolute', bottom: 50, right: 10, backgroundColor: 'white', borderRadius: 8, padding: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 5, zIndex: 1000 },
  uploadMenuItem: { padding: 10 },
  uploadMenuText: { fontSize: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#f8f9fa' },
  backButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 10, color: '#333' },
});
