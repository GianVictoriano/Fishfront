import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, Image, ScrollView } from 'react-native';
import { useArticles } from '../../../context/ArticleContext';

export default function ReadScreen() {
  const { readArticles } = useArticles();
  const [selectedArticle, setSelectedArticle] = useState(null);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Read Articles</Text>

      {readArticles.length === 0 ? (
        <Text style={{ fontSize: 16, color: 'gray' }}>No articles read yet.</Text>
      ) : (
        <FlatList
          data={readArticles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={{ uri: item.image }} style={styles.image} />
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.snippet}>{item.snippet}</Text>
              <Text style={styles.timestamp}>
                Read on: {new Date(item.readAt).toLocaleString()}
              </Text>

              <TouchableOpacity
                style={styles.button}
                onPress={() => setSelectedArticle(item)}
              >
                <Text style={styles.buttonText}>Open Again</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Modal for re-opening articles */}
      <Modal visible={!!selectedArticle} animationType="slide">
        <ScrollView style={styles.modalContainer}>
          {selectedArticle && (
            <>
              <Image source={{ uri: selectedArticle.image }} style={styles.modalImage} />
              <Text style={styles.modalTitle}>{selectedArticle.title}</Text>
              <Text style={styles.modalSnippet}>{selectedArticle.snippet}</Text>
              <Text style={styles.modalContent}>{selectedArticle.content}</Text>
              <Text style={styles.readInfo}>
                Originally read on: {new Date(selectedArticle.readAt).toLocaleString()}
              </Text>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedArticle(null)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  image: { width: '100%', height: 120, borderRadius: 10, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  snippet: { fontSize: 14, color: 'gray', marginBottom: 5 },
  timestamp: { fontSize: 12, color: '#666', marginBottom: 10 },
  button: {
    backgroundColor: '#34C759',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: 'bold' },

  // Modal styles
  modalContainer: { flex: 1, padding: 15, backgroundColor: 'white' },
  modalImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 15 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  modalSnippet: { fontSize: 14, color: 'gray', marginBottom: 20 },
  modalContent: { fontSize: 16, lineHeight: 24, textAlign: 'justify', marginBottom: 20 },
  readInfo: { fontSize: 12, color: '#555', fontStyle: 'italic', marginBottom: 20 },
  closeButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  closeButtonText: { color: 'white', fontWeight: 'bold' },
});
