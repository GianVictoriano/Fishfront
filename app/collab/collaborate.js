import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal, Linking, ScrollView } from 'react-native';
import apiClient, { sendMessage, getMessages } from '../../utils/api';
import modalStyles from './modalStyles.js';
import { useRouter } from 'expo-router';

export default function CollaborateScreen() {
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

  // Use a ref to hold the current selectedGroupId to avoid stale closures in the listener
  const selectedGroupIdRef = useRef(selectedGroupId);
  const isScanningRef = useRef(false); // Ref to track scanning state

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

  // NOTE: WebSocket logic has been removed in favor of a polling mechanism.

  // Effect for fetching messages when the selected group changes
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
      // Revert optimistic update on failure
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempId));
      // Optionally, restore the input text or show an error toast
      setInputText(optimisticMessage.message);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleChooseFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain',
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Directly call the plagiarism check with the selected file asset
        handlePlagiarismCheck('file', result.assets[0]);
        setUploadedFile(result.assets[0]);
      } else {
        setShowUploadMenu(false); // Hide menu if user cancels
      }
    } catch (err) { 
      console.error('Error picking document:', err);
      // Optionally, show an alert to the user
    }
  };

  const handlePlagiarismCheck = useCallback(async (type, data) => {
    if (type === 'file' && data) {
      setUploadedFile(data);
    }
    // Debounce: If a scan is already in progress, do nothing.
    if (isScanningRef.current) return;
    if (!data) return;

    isScanningRef.current = true; // Set scanning flag

    setShowUploadMenu(false);
    setIsPlagModalVisible(true);
    setIsScanning(true);
    setPlagiarismResult(null);
    setScanResult(null);
    setPlagiarismResult(null);

    let pollInterval;
    try {
      const formData = new FormData();
      if (type === 'file') {
        const uri = data.uri;
if (Platform.OS === 'web') {
  // On web, data is a File object
  formData.append('file', data);
} else {
  const uri = data.uri;
  if (!uri) {
    setScanResult('Invalid file: missing URI.');
    setIsScanning(false);
    isScanningRef.current = false;
    return;
  }
  const name = data.name || uri.split('/').pop();
  const mimeType = data.mimeType || 'application/octet-stream';
  formData.append('file', {
    uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
    name,
    type: mimeType,
  });
}
      } else {
        // Currently only supporting file uploads
        setScanResult('Unsupported upload type.');
        setIsScanning(false);
        return;
      }

      // 1. Submit the scan and get scan_id
      const initialResponse = await apiClient.post('/plagiarism-scans', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const scanId = initialResponse.data.scan_id;
      if (!scanId) {
        setScanResult('Failed to start plagiarism scan. No scan ID received.');
        setIsScanning(false);
        isScanningRef.current = false;
        return;
      }
      console.log('Checking status for scan ID:', scanId);
      // 2. Poll for the result
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
      console.error('Plagiarism check submission failed:', error.response?.data || error.message);
      setScanResult('Failed to submit for plagiarism check. Please try again.');
      setIsScanning(false);
      if (pollInterval) clearInterval(pollInterval);
    } finally {
      setTimeout(() => {
        isScanningRef.current = false;
      }, 1000);
    }
  }, []);

  const renderGroup = ({ item }) => (
    <TouchableOpacity
      style={[styles.groupItem, item.id === selectedGroupId && styles.groupItemSelected]}
      onPress={() => {
        setSelectedGroupId(item.id);
        // Clear unread status when a group is selected
        setUnreadMessages(prev => {
          const newUnread = { ...prev };
          delete newUnread[item.id];
          return newUnread;
        });
      }}
    >
      <Text style={styles.groupName}>{item.name}</Text>
      {unreadMessages[item.id] > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{unreadMessages[item.id]}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const getScoreStyle = (score) => {
    if (score > 0.5) return { color: 'red', fontWeight: 'bold' };
    if (score > 0.2) return { color: 'orange', fontWeight: 'bold' };
    return { color: 'green', fontWeight: 'bold' };
  };

  const handleSendReviewMessage = async () => {
    setIsPlagModalVisible(false); // Close the modal immediately

    try {
      // 1. Send system message
      const messageText = `${currentUser.name} has sent a draft for review.`;
      const response = await apiClient.post(`/group-chats/${selectedGroupId}/messages`, {
        message: messageText,
        system: true,
      });
    const savedMessage = response.data;
    setMessages(prevMessages => [savedMessage, ...prevMessages]);

    // 2. Create review_content row with FormData
    if (uploadedFile) {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        formData.append('file', uploadedFile);
      } else {
        formData.append('file', {
          uri: uploadedFile.uri,
          name: uploadedFile.name || uploadedFile.uri.split('/').pop(),
          type: uploadedFile.mimeType || 'text/plain',
        });
      }
      formData.append('group_id', selectedGroupId);
      formData.append('user_id', currentUser.id);
      formData.append('status', 'pending');
      formData.append('no_of_approval', '0');
      await apiClient.post('/review-content', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
  } catch (error) {
    console.error('Failed to send system review message or create review content:', error);
    alert('Failed to send review notification or create review content. Please try again.');
  }
};

  // Render a single chat message
  const renderMessage = ({ item }) => {
    // System message: centered, gray, italic
    if (item.system) {
      return (
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <View style={{
            backgroundColor: '#e0e0e0',
            paddingVertical: 6,
            paddingHorizontal: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#bdbdbd',
            maxWidth: '80%',
          }}>
            <Text style={{ color: '#616161', fontStyle: 'italic', fontSize: 13, textAlign: 'center' }}>
              {item.message}
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</Text>
        </View>
      );
    }
    // Determine if message is from current user
    const isMe = currentUser && item.user_id === currentUser.id;
    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: isMe ? 'flex-end' : 'flex-start',
        marginVertical: 4,
      }}>
        <View style={{
          backgroundColor: isMe ? '#1976d2' : '#f1f0f0',
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 18,
          maxWidth: '75%',
          alignSelf: isMe ? 'flex-end' : 'flex-start',
          borderTopRightRadius: isMe ? 4 : 18,
          borderTopLeftRadius: isMe ? 18 : 4,
        }}>
          <Text style={{ color: isMe ? '#fff' : '#222', fontSize: 16 }}>
            {item.message}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start', marginTop: 6 }}>
            {!isMe && (
              <Text style={{ color: '#888', fontSize: 12, marginRight: 8 }}>{item.user?.name}</Text>
            )}
            <Text style={{ color: '#bbb', fontSize: 10 }}>
              {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.panelContainer}>
      {/* Left Panel */}
      <View style={styles.leftPanel}>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, chatStatusFilter === 'pending' && styles.activeFilter]}
            onPress={() => setChatStatusFilter('pending')}
          >
            <Text style={[styles.filterButtonText, chatStatusFilter === 'pending' && styles.activeFilterText]}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, chatStatusFilter === 'finished' && styles.activeFilter]}
            onPress={() => setChatStatusFilter('finished')}
          >
            <Text style={[styles.filterButtonText, chatStatusFilter === 'finished' && styles.activeFilterText]}>Finished</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.searchBar}
          value={search}
          onChangeText={setSearch}
          placeholder="Search group chats..."
          placeholderTextColor="#aaa"
        />
        <FlatList
          data={filteredGroups}
          renderItem={renderGroup}
          keyExtractor={item => item.id}
          style={styles.groupsList}
        />
      </View>

      {/* Right Panel */}
      <View style={styles.rightPanel}>
        <Text style={styles.title}>{groupChats.find(g => g.id === selectedGroupId)?.name || 'Select a Chat'}</Text>
        {isMessagesLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#374151" />
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{ paddingVertical: 10 }}
              inverted
            />
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type a message..."
                placeholderTextColor="#aaa"
                editable={!!selectedGroupId}
              />
              <View style={{ position: 'relative' }}>
                <TouchableOpacity
  style={styles.uploadButton}
  onPress={() => setShowUploadMenu(v => !v)}
>
  <Text style={{ fontSize: 24 }}>📎</Text>
</TouchableOpacity>
                {showUploadMenu && (
                  <View style={styles.uploadMenu}>
  {Platform.OS === 'web' ? (
    <label style={styles.uploadMenuItem}>
      <Text style={styles.uploadMenuText}>Upload .txt File</Text>
      <input
        type="file"
        accept=".txt"
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files && e.target.files[0]) {
            handlePlagiarismCheck('file', e.target.files[0]);
          }
        }}
      />
    </label>
  ) : (
    <TouchableOpacity style={styles.uploadMenuItem} onPress={handleChooseFile}>
      <Text style={styles.uploadMenuText}>Upload .txt File</Text>
    </TouchableOpacity>
  )}
</View>
                )}
              </View>
              <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>

      {/* Plagiarism Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isPlagModalVisible}
        onRequestClose={() => setIsPlagModalVisible(false)}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalViewLarge}>
            <TouchableOpacity
              style={modalStyles.closeButton}
              onPress={() => setIsPlagModalVisible(false)}
            >
              <Text style={modalStyles.closeButtonText}>&times;</Text>
            </TouchableOpacity>

            <Text style={modalStyles.modalTitle}>Plagiarism Scan Result</Text>

            {isScanning ? (
              <View style={modalStyles.loadingContainerModal}>
                <ActivityIndicator size="large" color="#374151" />
                <Text style={{ marginTop: 10 }}>Scanning... Please wait.</Text>
              </View>
            ) : plagiarismResult ? (
              <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={modalStyles.modalText}>
                  Similarity Score: <Text style={getScoreStyle(plagiarismResult.result?.score)}>{(plagiarismResult.result?.score).toFixed(2)}%</Text>
                </Text>

                {plagiarismResult.sources && plagiarismResult.sources.length > 0 && (
                  <View style={{ width: '100%', marginTop: 15 }}>
                    <Text style={modalStyles.modalSubtitle}>Internet Sources:</Text>
                    {plagiarismResult.sources.map((source, index) => (
                      <View key={index} style={modalStyles.sourceRowBox}>
                        <TouchableOpacity onPress={() => Linking.openURL(source.url)}>
                          <Text style={modalStyles.sourceUrl}>{source.url}</Text>
                        </TouchableOpacity>
                        <Text><Text style={modalStyles.sourceStatLabel}>Matched Words:</Text> <Text style={modalStyles.sourceStatValue}>{source.plagiarismWords}</Text></Text>
                        <Text><Text style={modalStyles.sourceStatLabel}>Similarity:</Text> <Text style={modalStyles.sourceStatValue}>{(source.score).toFixed(2)}%</Text></Text>
                      </View>
                    ))}
                  </View>
                )}

                {plagiarismResult.citations && plagiarismResult.citations.length > 0 && (
                  <View style={{ width: '100%', marginTop: 15 }}>
                    <Text style={modalStyles.modalSubtitle}>Citations:</Text>
                    {plagiarismResult.citations.map((citation, index) => (
                      <Text key={index} style={modalStyles.citationText}>- {citation}</Text>
                    ))}
                  </View>
                )}

                {plagiarismResult.detected_attacks && plagiarismResult.detected_attacks.length > 0 && (
                  <View style={{ width: '100%', marginTop: 15 }}>
                    <Text style={modalStyles.modalSubtitle}>Detected Attacks:</Text>
                    {plagiarismResult.detected_attacks.map((attack, index) => (
                      <Text key={index} style={modalStyles.attackText}>- {attack}</Text>
                    ))}
                    <Text style={modalStyles.rawJsonValue}>{JSON.stringify(plagiarismResult, null, 2)}</Text>
                  </View>
                )}

                {/* Modal Buttons */}
                <View style={modalStyles.modalButtonContainer}>
                  <TouchableOpacity
                    style={[modalStyles.modalButton, modalStyles.cancelButton]}
                    onPress={() => setIsPlagModalVisible(false)}
                  >
                    <Text style={modalStyles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modalStyles.modalButton, modalStyles.sendButtonModal]}
                    onPress={handleSendReviewMessage}
                  >
                    <Text style={modalStyles.modalButtonText}>Send</Text>
                  </TouchableOpacity>
                </View>

              </ScrollView>
            ) : (
              <Text style={modalStyles.modalText}>No plagiarism result available.</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Main Layout
  panelContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f6fa',
  },
  leftPanel: {
    width: 260,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    paddingTop: 24,
    paddingHorizontal: 12,
    display: 'flex',
    flexDirection: 'column',
    marginRight: 12,
  },
  rightPanel: {
    flex: 1,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    flex: 1,
  },
  emptyMessage: {
    textAlign: 'center',
    marginTop: 50,
    color: '#aaa',
    fontSize: 16,
  },

  // Group/Chat List
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    marginLeft: 30,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  activeFilter: {
    backgroundColor: '#374151',
  },
  filterButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  searchBar: {
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    marginBottom: 8,
    fontSize: 16,
    color: '#333',
  },
  groupsList: {
    flex: 1,
  },
  groupItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: '#f7f7f7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupItemSelected: {
    backgroundColor: '#d1eaff',
  },
  groupName: {
    fontSize: 16,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: 10,
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Message Area
  messageContainer: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 15,
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: '#d1eaff',
    alignSelf: 'flex-end',
  },
  theirMessage: {
    backgroundColor: '#eee',
    alignSelf: 'flex-start',
  },
  senderText: {
    fontWeight: 'bold',
    marginBottom: 2,
    fontSize: 13,
    color: '#555',
  },
  messageText: {
    fontSize: 16,
    color: '#222',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'flex-end',
    marginTop: 5,
  },

  // Input Bar
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  uploadButton: {
    padding: 6,
  },
  uploadMenu: {
    position: 'absolute',
    bottom: 50, // Position above the input bar
    right: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 1000,
  },
  uploadMenuItem: {
    padding: 10,
  },
  uploadMenuText: {
    fontSize: 16,
  },


});
