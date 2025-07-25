import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal } from 'react-native';
import apiClient, { sendMessage, getMessages } from '../../utils/api';

export default function CollaborateScreen() {
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

  const renderMessage = ({ item }) => {
    const isMyMessage = item.user_id === currentUser?.id;

    let avatarUrl = null;
    if (item.user?.profile?.avatar) {
      const avatarPath = item.user.profile.avatar;
      if (avatarPath.startsWith('http')) {
        avatarUrl = avatarPath; // It's a full URL
      } else {
        avatarUrl = `http://192.168.1.3:8000/storage/${avatarPath}`; // It's a relative path
      }
    }

    const messageBubbleStyle = [
      styles.messageBubble,
      isMyMessage ? styles.myMessage : styles.theirMessage,
      item.message.length < 8 && { minWidth: 100 },
    ];

    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer]}>
        {!isMyMessage && (
          <Image
            source={avatarUrl ? { uri: avatarUrl } : require('../../assets/g-logo.png')}
            style={styles.avatar}
          />
        )}
        <View style={messageBubbleStyle}>
          <Text style={styles.senderText}>{isMyMessage ? 'Me' : item.user.name}</Text>
          <Text style={styles.messageText}>{item.message}</Text>
          <Text style={styles.timeText}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      </View>
    );
  };

  const handlePlagiarismCheck = useCallback(async (type, data) => {
    // Debounce: If a scan is already in progress, do nothing.
    if (isScanningRef.current) return;
    if (!data) return;

    isScanningRef.current = true; // Set scanning flag

    setShowUploadMenu(false);
    setIsPlagModalVisible(true);
    setIsScanning(true);
    setPlagiarismResult(null);
    setScanResult(null);

    let pollInterval;
    try {
      const formData = new FormData();
      if (type === 'text') {
        formData.append('text', data);
      } else if (type === 'file') {
        formData.append('file', data, data.name);
      } else if (type === 'url') {
        formData.append('url', data);
      }
      // 1. Submit the scan and get the scanId
      const response = await apiClient.post('/plagiarism-scans', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const scanId = response.data.scanId;
      if (!scanId) {
        setScanResult('Failed to start plagiarism scan.');
        setIsScanning(false);
        return;
      }
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

  if (isLoading) {
    return (
      <View style={[styles.panelContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#374151" />
      </View>
    );
  }


  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
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
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              style={styles.messageList}
              inverted
              ListEmptyComponent={<Text style={styles.emptyMessage}>No messages yet.</Text>}
            />
          )}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor="#aaa"
              editable={!!selectedGroupId}
            />
            {/* File Upload Fly-up Menu (Web only) */}
            {Platform.OS === 'web' && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  style={styles.uploadLabel}
                  onClick={e => {
                    e.preventDefault();
                    setShowUploadMenu(v => !v);
                  }}
                  tabIndex={0}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05a5.5 5.5 0 0 0-7.78 0l-7.07 7.07a4 4 0 0 0 5.66 5.66l8.49-8.48a2.5 2.5 0 0 0-3.54-3.54l-8.49 8.48"/></svg>
                </button>
                {showUploadMenu && (
                  <div style={{
                    position: 'absolute',
                    bottom: 44,
                    right: 0,
                    background: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    zIndex: 100,
                    minWidth: 170,
                    padding: 8,
                  }}>
                    <button
                      style={{
                        display: 'block',
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        padding: '8px 12px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 15,
                        color: '#333',
                        marginBottom: 4,
                        transition: 'background 0.2s',
                      }}
                      onClick={() => {
                        const url = prompt('Enter file URL:');
                        if (url) {
                          handlePlagiarismCheck('url', url);
                        }
                      }}
                    >
                      Enter URL
                    </button>
                    <label htmlFor="file-upload" style={{
                      display: 'block',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 15,
                      color: '#333',
                    }}>
                      Upload File
                      <input
                        id="file-upload"
                        type="file"
                        style={{ display: 'none' }}
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            handlePlagiarismCheck('file', e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
            <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={!selectedGroupId}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>



        <Modal
          animationType="fade"
          transparent={true}
          visible={isPlagModalVisible}
          onRequestClose={() => {
            setIsPlagModalVisible(false);
            setIsScanning(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalViewLarge, { width: '90%', height: '80%', padding: 40 }]}>
              <Text style={styles.modalTitle}>Plagiarism Result</Text>
              {plagiarismResult && (
                <Text style={styles.modalText}>Aggregated Score: <Text style={styles.aggScore}>{plagiarismResult.results.score.aggregatedScore.toFixed(2)}%</Text></Text>
              )}
              {isScanning ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#374151" />
                  <Text style={styles.loadingText}>Scanning for plagiarism...</Text>
                </View>
              ) : plagiarismResult ? (
                <View>
                  <Text style={styles.modalSubtitle}>Detected Internet Sources:</Text>
                  {plagiarismResult.results.internet.length > 0 ? (
                    <FlatList
                      data={plagiarismResult.results.internet}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item, index }) => (
                        <View style={[styles.sourceCard, index > 0 && styles.sourceCardDivider]}>
                          <Text style={styles.sourceUrl} onPress={() => { if (Platform.OS === 'web') window.open(item.url, '_blank'); }}>{item.url}</Text>
                          <View style={styles.sourceStatsRow}>
                            <Text style={styles.sourceStatLabel}>Matched Words: <Text style={styles.sourceStatValue}>{item.matchedWords}</Text></Text>
                            <Text style={styles.sourceStatLabel}>Identical: <Text style={styles.sourceStatValue}>{item.identicalWords}</Text></Text>
                            <Text style={styles.sourceStatLabel}>Similar: <Text style={styles.sourceStatValue}>{item.similarWords}</Text></Text>
                          </View>
                          <View style={styles.sourceStatsRow}>
                            <Text style={styles.sourceStatLabel}>Paraphrased: <Text style={styles.sourceStatValue}>{item.paraphrasedWords}</Text></Text>
                            <Text style={styles.sourceStatLabel}>Total: <Text style={styles.sourceStatValue}>{item.totalWords}</Text></Text>
                          </View>
                        </View>
                      )}
                      style={{marginTop: 8}}
                    />
                  ) : (
                    <Text>No internet sources detected.</Text>
                  )}
                </View>
              ) : null}
              <View style={styles.buttonRowBottom}>
                <TouchableOpacity
                  style={[styles.buttonWide, styles.buttonCancel]}
                  onPress={() => {
                    setIsPlagModalVisible(false);
                    setIsScanning(false);
                  }}
                >
                  <Text style={styles.textStyle}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.buttonWide, styles.buttonSend, { backgroundColor: '#374151' }]}
                  onPress={() => {
                    setIsPlagModalVisible(false);
                    setIsScanning(false);
                  }} // TODO: Hook up real send handler
                >
                  <Text style={styles.textStyle}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 220,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#374151',
    fontWeight: 'bold',
  },
  buttonRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    position: 'absolute',
    left: 0,
    bottom: 0,
    padding: 24,
    backgroundColor: 'white',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 24,
  },
  buttonWide: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 18,
    marginHorizontal: 16,
    alignItems: 'center',
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  modalViewLarge: {
    margin: 40,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',

    width: '95%',
    maxWidth: 700,
    minHeight: 380,
    justifyContent: 'flex-start',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    gap: 16,
  },
  button: {
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 32,
    elevation: 2,
    marginHorizontal: 8,
  },
  buttonCancel: {
    backgroundColor: '#aaa',
  },
  buttonSend: {
    backgroundColor: '#374151', // Sidebar color
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  modalText: {
    marginBottom: 5,
    textAlign: 'center',
    fontSize: 18,
  },
  sourceItem: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  sourceUrl: {
    fontWeight: 'bold',
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonClose: {
    backgroundColor: '#2196F3',
    marginTop: 15,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
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
  messageList: {
    flex: 1,
  },
  emptyMessage: {
    textAlign: 'center',
    marginTop: 50,
    color: '#aaa',
    fontSize: 16,
  },
  messageContainer: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
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
  uploadLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    width: 36,
    height: 36,
    border: 'none',
    cursor: 'pointer',
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
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
