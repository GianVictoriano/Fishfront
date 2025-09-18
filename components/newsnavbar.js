import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity,TextInput } from 'react-native';

// This NewsNavbar is exclusive to news.js and appears under the main Navbar
export default function NewsNavbar({ onGenreChange, activeGenre }) {
  // Example sections: All, Latest, Trending, Editorial, Literary, Sports
  const sections = ['News', 'Articles', 'Opinion', 'Sports', 'Editorial', 'Artworks'];

  return (
    <View style={styles.container}>
      <View style={styles.tabsWrapper}>
        {sections.map(section => (
          <TouchableOpacity
            key={section}
            style={[styles.tab, activeGenre === section && styles.activeTab]}
            onPress={() => onGenreChange && onGenreChange(section)}
          >
            <Text style={[styles.tabText, activeGenre === section && styles.activeTabText]}>{section}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor="#888"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f7f7f7',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 10,
  },
  tabsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tab: {
    marginRight: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#e3e8ff',
  },
  tabText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  activeTabText: {
    color: '#2541b2',
    fontWeight: 'bold',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    minWidth: 120,
    maxWidth: 160,
    flexShrink: 0,
  },
  searchInput: {
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#222',
    borderWidth: 1,
    borderColor: '#d1d1d1',
    width: '100%',
  },
});
