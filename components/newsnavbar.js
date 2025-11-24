import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput, FlatList, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import useNewsStore from '../store/newsStore';
import apiClient from '../utils/api';

// This NewsNavbar is exclusive to news.js and appears under the main Navbar
export default function NewsNavbar() {
  const router = useRouter();
  const { activeGenre, setActiveGenre } = useNewsStore();
  const sections = ['Featured', 'News', 'Articles', 'Opinion', 'Sports', 'Editorial', 'Creative', 'Literary Works'];
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;

  useEffect(() => {
    if (isSmallScreen) {
      setIsSearchVisible(true);
    }
  }, [isSmallScreen]);

  // Handle search input changes
  const handleSearchChange = (text) => {
    console.log('🔍 Text changed:', text);
    setSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      if (text.trim().length > 0) {
        console.log('🔍 Triggering search for:', text.trim());
        performSearch(text.trim());
      } else {
        console.log('🔍 Clearing results');
        setSearchResults([]);
      }
    }, 300); // 300ms debounce
  };

  // Perform search API call
  const performSearch = async (query) => {
    setIsSearching(true);
    console.log('🔍 Searching for:', query);
    try {
      // Use existing trending-articles endpoint and filter client-side
      const response = await apiClient.get('/public/trending-articles');
      console.log('🔍 Got articles:', response.data?.data?.length || 0);
      
      if (response.data?.data) {
        const allArticles = response.data.data;
        // Filter articles by title, excerpt, or category containing the query
        const filteredResults = allArticles.filter(article => {
          const searchText = query.toLowerCase();
          const title = (article.title || '').toLowerCase();
          const excerpt = (article.excerpt || '').toLowerCase();
          const category = (article.genre || article.category || '').toLowerCase();
          
          return title.includes(searchText) || 
                 excerpt.includes(searchText) || 
                 category.includes(searchText);
        }).slice(0, 8); // Limit to 8 results
        
        console.log('🔍 Filtered results:', filteredResults.length);
        setSearchResults(filteredResults);
      } else {
        console.log('🔍 No data in response');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('🔍 Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle result selection
  const handleResultPress = (article) => {
    setIsSearchVisible(false);
    setSearchQuery('');
    setSearchResults([]);
    router.push(`/news/article/${article.id}`);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSectionPress = (section) => {
    if (section === 'Creative') {
      setActiveGenre(section);
      router.push('/creative');
    } else if (section === 'Literary Works') {
      setActiveGenre(section);
      router.push('/news/literary-works');
    } else if (section === 'Featured') {
      // For Featured, redirect to dedicated page without setting activeGenre
      router.push('/news/featured');
    } else {
      setActiveGenre(section);
      router.push('/news');
    }
  };

  const renderSearchArea = () => (
    <View
      style={[
        styles.searchContainer,
        isSearchVisible && styles.searchContainerExpanded,
        isSmallScreen && styles.searchContainerSmall,
      ]}
    >
      {isSearchVisible ? (
        <View style={styles.searchWrapper}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoFocus={true}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setIsSearchVisible(false);
              setSearchQuery('');
              setSearchResults([]);
            }}
          >
            <MaterialIcons name="close" size={20} color="#6b7280" />
          </TouchableOpacity>
          {searchQuery.length > 0 && (
            <View style={styles.dropdown}>
              {console.log('🔍 Rendering dropdown, query:', searchQuery, 'results:', searchResults.length, 'searching:', isSearching)}
              {isSearching ? (
                <View style={styles.searchingIndicator}>
                  <Text style={styles.searchingText}>Searching...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => handleResultPress(item)}
                    >
                      <Text style={styles.dropdownTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.dropdownCategory}>
                        {item.genre || item.category || 'News'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                />
              ) : (
                <View style={styles.searchingIndicator}>
                  <Text style={styles.searchingText}>No results found</Text>
                </View>
              )}
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.searchIconButton}
          onPress={() => {
            setIsSearchVisible(true);
            setSearchQuery('');
            setSearchResults([]);
          }}
        >
          <MaterialIcons name="search" size={24} color="#6b7280" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
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
        {!isSmallScreen && renderSearchArea()}
      </View>
      {isSmallScreen && (
        <View style={styles.searchRow}>
          {renderSearchArea()}
        </View>
      )}
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
    flexDirection: 'column',
    paddingHorizontal: 16,
    position: 'relative',
    zIndex: 5,
    overflow: 'visible',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  searchRow: {
    width: '100%',
    marginTop: 8,
  },
  tabsScroll: {
    flex: 1,
  },
  tabsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
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
  searchContainer: {
    marginLeft: 'auto',
    paddingRight: 16,
  },
  searchContainerExpanded: {
    width: 400,
    marginLeft: 'auto',
  },
  searchContainerSmall: {
    marginLeft: 0,
    paddingRight: 0,
    width: '100%',
  },
  searchIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#f9fafb',
    flex: 1,
  },
  searchWrapper: {
    position: 'relative',
    width: '100%',
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    marginLeft: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: '100%', // Position right below the search input
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 300,
    zIndex: 1000,
    overflow: 'visible',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  dropdownCategory: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchingText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});
