import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import useNewsStore from '../store/newsStore';

// This NewsNavbar is exclusive to news.js and appears under the main Navbar
export default function NewsNavbar() {
  const router = useRouter();
  const { activeGenre, setActiveGenre } = useNewsStore();
  const sections = ['News', 'Articles', 'Opinion', 'Sports', 'Editorial', 'Creative'];

  const handleSectionPress = (section) => {
    setActiveGenre(section);
    if (section === 'Creative') {
      router.push('/creative');
    } else {
      router.push('/news');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tabsWrapper}>
          {sections.map(section => (
            <TouchableOpacity
              key={section}
              style={[styles.tab, activeGenre === section && styles.activeTab]}
              onPress={() => handleSectionPress(section)}
            >
              <Text style={[styles.tabText, activeGenre === section && styles.activeTabText]}>{section}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
    marginTop: Platform.OS !== 'web' ? 40 : 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tab: {
    marginRight: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
