import React, { useState } from 'react';
import { Text, View, StyleSheet, SafeAreaView, Platform, TouchableOpacity, Modal, FlatList, Image } from 'react-native';
import GuestNavbar from '../components/GuestNavbar';

// Placeholder data for news articles
const newsData = [
  {
    id: '1',
    title: 'New Fishing Regulations Announced for the Summer Season',
    excerpt: 'Authorities have released new guidelines for recreational and commercial fishing to ensure sustainability...',
    image: 'https://images.unsplash.com/photo-1524704796725-9fc3044a58b2?q=80&w=2070',
    date: 'July 15, 2024',
  },
  {
    id: '2',
    title: 'The Annual Fishing Derby Breaks All Records',
    excerpt: 'This year\'s derby saw record participation and a new champion crowned in the heavyweight category...',
    image: 'https://images.unsplash.com/photo-1555815944-43f55a116503?q=80&w=2070',
    date: 'July 12, 2024',
  },
  {
    id: '3',
    title: 'Tech in Fishing: How GPS and Sonar are Changing the Game',
    excerpt: 'Modern technology is giving anglers an unprecedented edge, from finding the best spots to tracking fish...',
    image: 'https://images.unsplash.com/photo-1553697388-9955731b1c73?q=80&w=2070',
    date: 'July 10, 2024',
  },
];

const NewsCard = ({ item }) => (
  <View style={styles.card}>
    <Image source={{ uri: item.image }} style={styles.cardImage} />
    <View style={styles.cardContent}>
      <Text style={styles.cardDate}>{item.date}</Text>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardExcerpt}>{item.excerpt}</Text>
      <TouchableOpacity style={styles.readMoreButton}>
        <Text style={styles.readMoreButtonText}>Read More</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function NewsScreen2() {
  const [navVisible, setNavVisible] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'web' ? (
        <GuestNavbar />
      ) : (
        <>
          <TouchableOpacity style={styles.menuButton} onPress={() => setNavVisible(true)}>
            <Text style={styles.menuButtonText}>☰</Text>
          </TouchableOpacity>
          <Modal
            animationType="slide"
            transparent
            visible={navVisible}
            onRequestClose={() => setNavVisible(false)}
          >
            <TouchableOpacity style={styles.modalOverlayNav} activeOpacity={1} onPressOut={() => setNavVisible(false)}>
              <View style={styles.modalViewNav}>
                <GuestNavbar onLinkPress={() => setNavVisible(false)} />
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}

      <FlatList
        data={newsData}
        renderItem={({ item }) => <NewsCard item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={() => (
          <Text style={styles.title}>Latest News & Articles</Text>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8', // A light grey background
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingTop: Platform.OS === 'web' ? 24 : 56, // Extra top padding for mobile
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  cardContent: {
    padding: 20,
  },
  cardDate: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    lineHeight: 28,
  },
  cardExcerpt: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#007BFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  readMoreButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 10 : 40,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  menuButtonText: {
    fontSize: 28,
    color: '#0d47a1',
  },
  modalOverlayNav: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalViewNav: {
    width: '75%',
    height: '100%',
    backgroundColor: '#fff',
  },
});
