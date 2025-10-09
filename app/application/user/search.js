import { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Modal, ScrollView, Animated, Easing, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { useArticles } from '../../../context/ArticleContext';
import { MaterialIcons } from '@expo/vector-icons';

const dummyArticles = [
  {
    id: 1,
    title: 'The Future of Coastal Fisheries',
    snippet: 'Insights into sustainable fishing practices and their global impact.',
    image: 'https://picsum.photos/400/200?random=1',
    content: `Sustainable fishing practices are becoming increasingly vital as global demand for seafood rises. 
    By focusing on responsible fishing techniques, we can help preserve marine biodiversity while still meeting 
    the needs of local communities. This article explores global initiatives, new policies, and modern technology 
    supporting sustainable fisheries.`,
  },
  {
    id: 2,
    title: 'Community-Driven Marine Conservation',
    snippet: 'How local communities are leading the way in marine protection.',
    image: 'https://picsum.photos/400/200?random=2',
    content: `Local communities have proven to be the backbone of marine conservation. 
    From coral reef monitoring to sustainable aquaculture practices, community-led efforts 
    are shaping the future of marine resource management.`,
  },
  {
    id: 3,
    title: 'Innovations in Aquaculture',
    snippet: 'Technological advances that are shaping the future of aquaculture.',
    image: 'https://picsum.photos/400/200?random=3',
    content: `Aquaculture technology has drastically improved production efficiency and sustainability. 
    New methods include automated feeding, AI-based monitoring, and eco-friendly farming systems.`,
  },
];

export default function SearchScreen() {
  const router = useRouter();
  const { markAsRead } = useArticles();
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // bookmarks: array of article ids
  const [bookmarks, setBookmarks] = useState([]);

  // Flip animation value: 0 = front, 1 = back
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);
  const webViewRef = useRef(null); // Add this ref

  // helper to escape user content when embedding into HTML for WebView
  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  useEffect(() => {
    if (!selectedArticle) return;
    setIsModalVisible(true);
    flipAnim.setValue(0);
    // make the back-side interactive immediately so the WebView Save button
    // can be used while the flip animation runs (prevents missed clicks)
    setIsFlipped(true);
    Animated.timing(flipAnim, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [selectedArticle]);

  // load bookmarks on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@bookmarks');
        const parsed = raw ? JSON.parse(raw) : [];
        if (mounted) setBookmarks(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.warn('Failed to load bookmarks', e);
      }
    })();
    return () => (mounted = false);
  }, []);

  const closeModal = () => {
    Animated.timing(flipAnim, { toValue: 0, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
      setIsFlipped(false);
      setIsModalVisible(false);
      setSelectedArticle(null);
    });
  };

  // Bookmark helpers
  const isBookmarked = (id) => bookmarks.includes(id);

  const toggleBookmark = async (article) => {
    try {
      const exists = bookmarks.includes(article.id);
      const next = exists ? bookmarks.filter((i) => i !== article.id) : [...bookmarks, article.id];
      setBookmarks(next);
      await AsyncStorage.setItem('@bookmarks', JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to toggle bookmark', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Recently Published Articles</Text>

      {/* Profile card removed per request; use the Profile tab to view highlights */}

      <FlatList
        data={dummyArticles}
        numColumns={2}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.snippet}>{item.snippet}</Text>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  markAsRead(item);
                  setSelectedArticle(item); // 👈 open popup
                }}
              >
                <Text style={styles.buttonText}>Read More</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Modal for Article Detail */}
      <Modal visible={isModalVisible} transparent animationType="none">
        <View style={styles.modalOverlay}>
          {selectedArticle && (
            <View style={styles.flipContainer}>
              {/* Front side */}
              <Animated.View
                style={[
                  styles.cardSide,
                  styles.frontSide,
                  {
                    transform: [
                      { perspective: 1200 },
                      { rotateY: flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
                    ],
                  },
                ]}
                pointerEvents={isFlipped ? 'none' : 'auto'}
              >
                <View style={styles.modalContainer}>
                  <Image source={{ uri: selectedArticle.image }} style={styles.modalImage} />
                  <Text style={styles.modalTitle}>{selectedArticle.title}</Text>
                  <Text style={styles.modalSnippet}>{selectedArticle.snippet}</Text>
                </View>
              </Animated.View>

              {/* Back side */}
              <Animated.View
                style={[
                  styles.cardSide,
                  styles.backSide,
                  {
                    transform: [
                      { perspective: 1200 },
                      { rotateY: flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) },
                    ],
                    opacity: flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.6, 1] }),
                  },
                ]}
                pointerEvents={isFlipped ? 'auto' : 'none'}
              >
                {/* Use a WebView to render article content so users can select text and save highlights */}
                <View style={[styles.modalContainer, { padding: 0 }]}>
                  <View style={styles.saveButtonContainer}>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={() => {
                        if (webViewRef.current) {
                          webViewRef.current.injectJavaScript(`
                            (function() {
                              function getSelectionText() {
                                try {
                                  const s = window.getSelection();
                                  return s ? String(s) : '';
                                } catch (e) {
                                  return '';
                                }
                              }
                              const sel = getSelectionText().trim();
                              window.ReactNativeWebView.postMessage(JSON.stringify({type:'save-selection', text:sel, articleId:${selectedArticle.id}, title:${JSON.stringify(selectedArticle.title)} }));
                            })();
                          `);
                        }
                      }}
                    >
                      <MaterialIcons name="bookmark-border" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                  <WebView
                    originWhitelist={["*"]}
                    source={{ html: `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{font-family: -apple-system, Roboto, Arial; padding:20px; line-height:1.6} img{max-width:100%;height:auto;border-radius:8px} .title{font-size:20px;font-weight:700;margin-bottom:8px} .snippet{color:#666;margin-bottom:12px} .content{white-space:pre-wrap}</style></head><body><img src="${selectedArticle.image}"/><div class="title">${escapeHtml(selectedArticle.title)}</div><div class="snippet">${escapeHtml(selectedArticle.snippet)}</div><div class="content" id="content">${escapeHtml(selectedArticle.content)}</div></body></html>` }}
                    onMessage={async (ev) => {
                      try {
                        const payload = JSON.parse(ev.nativeEvent.data);
                        if (payload && payload.type === 'save-selection') {
                          const text = (payload.text || '').trim();
                          if (!text) {
                            Alert.alert('No text selected', 'Please select some text to save.');
                            return;
                          }

                          // load existing highlights and dedupe by articleId + exact text
                          const raw = await AsyncStorage.getItem('@highlights');
                          const prev = raw ? JSON.parse(raw) : [];
                          const already = Array.isArray(prev) && prev.some((h) => h.articleId === payload.articleId && (h.text || '').trim() === text);
                          if (already) {
                            Alert.alert('Already saved', 'This selection is already in your highlights.');
                            return;
                          }

                          const newHighlight = {
                            id: Date.now(),
                            articleId: payload.articleId,
                            title: payload.title || selectedArticle.title,
                            text,
                            createdAt: new Date().toISOString(),
                          };

                          const next = [...prev, newHighlight];
                          await AsyncStorage.setItem('@highlights', JSON.stringify(next));
                          Alert.alert('Saved', 'Selection saved to your highlights in Profile.');
                        }
                      } catch (e) {
                        console.warn('Invalid message from webview', e);
                      }
                    }}
                    style={{ flex: 1 }}
                    ref={webViewRef}
                  />
                </View>

                <TouchableOpacity style={styles.closeButton} onPress={closeModal} accessible accessibilityRole="button">
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f9f9f9' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  profileCard: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 12, alignItems: 'flex-start' },
  profileCardTitle: { fontSize: 16, fontWeight: '700' },
  profileCardSubtitle: { color: '#666', marginTop: 4 },
  card: {
    flex: 1,
    backgroundColor: 'white',
    margin: 8,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  image: { width: '100%', height: 120, borderRadius: 10, marginBottom: 8 },
  title: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  snippet: { fontSize: 12, color: 'gray', marginBottom: 8 },
  button: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  // Modal styles
  modalContainer: { flex: 1, padding: 15, backgroundColor: 'white' },
  modalImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 15 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  modalSnippet: { fontSize: 14, color: 'gray', marginBottom: 20 },
  modalContent: { fontSize: 16, lineHeight: 24, textAlign: 'justify' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  animatedModal: { width: '100%', maxWidth: 820, height: '80%', borderRadius: 12, overflow: 'hidden', backgroundColor: 'white' },
  flipContainer: { width: '100%', maxWidth: 820, height: '80%', alignItems: 'center', justifyContent: 'center' },
  cardSide: { position: 'absolute', width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', backgroundColor: 'white', backfaceVisibility: 'hidden' },
  frontSide: { zIndex: 2 },
  backSide: { zIndex: 1 },
  closeButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  closeButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  saveButtonContainer: {
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'flex-end',
  },
  saveButton: {
    backgroundColor: '#0ea5e9',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
