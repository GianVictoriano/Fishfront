import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { Modal } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import apiClient from '../../utils/api';
import { useBranding } from '~/context/BrandingContext';

// --- Platform-Aware Rich Text Editor ---

// Conditionally require the rich text editor only on native platforms
let RichEditor, RichToolbar, actions;
if (Platform.OS !== 'web') {
  try {
    const editorModule = require('react-native-pell-rich-editor');
    RichEditor = editorModule.RichEditor;
    RichToolbar = editorModule.RichToolbar;
    actions = editorModule.actions;
  } catch (e) {
    console.error('Failed to load react-native-pell-rich-editor:', e);
  }
}

const EditorPlaceholder = () => <View style={styles.editorPlaceholder} />;

const NativeRichEditor = forwardRef((props, ref) => {
  // This component will only be rendered on native, so direct use is safe.
  if (!RichEditor) return <EditorPlaceholder />;
  return <RichEditor ref={ref} {...props} />;
});

const NativeRichToolbar = ({ editor, onImageInsert }) => {
  if (!RichToolbar || !actions) return null;
  return (
    <RichToolbar
      editor={editor}
      actions={[...Object.values(actions), 'insertImage']}
      style={styles.richToolbar}
      iconTint="#1a237e"
      selectedIconTint="#3949ab"
      onPressAddImage={onImageInsert}
    />
  );
};

// --- Custom Web Rich Text Editor (Dependency-Free) ---

const SimpleWebEditor = ({ value, onChange, onImageInsert, onEditorRef }) => {
  const editorRef = useRef(null);
  const [activeStyles, setActiveStyles] = useState(new Set());
  const {colors} = useBranding();
  const [isInternalUpdate, setIsInternalUpdate] = useState(false);
  
  console.log('🔧 SimpleWebEditor rendered with value:', value);
  console.log('📊 Value type:', typeof value);
  console.log('📏 Value length:', value?.length);
  
  // Pass editor ref to parent component
  useEffect(() => {
    if (onEditorRef) {
      onEditorRef(editorRef);
    }
  }, [editorRef, onEditorRef]);
  
  // Handle external value changes without overriding user input
  const handleContentChange = () => {
    if (editorRef.current) {
      setIsInternalUpdate(true);
      const newContent = editorRef.current.innerHTML;
      onChange(newContent);
    }
  };

  const addImageDeleteHandlers = (editor) => {
    // Add hover and click handlers for image delete buttons
    const imageContainers = editor.querySelectorAll('div[style*="text-align: center"]');
    
    imageContainers.forEach(container => {
      const imageWrapper = container.querySelector('div[style*="position: relative"]');
      const deleteBtn = container.querySelector('.image-delete-btn');
      
      if (deleteBtn && imageWrapper) {
        // Show delete button on hover over the image wrapper
        imageWrapper.addEventListener('mouseenter', () => {
          deleteBtn.style.display = 'flex';
        });
        
        imageWrapper.addEventListener('mouseleave', () => {
          deleteBtn.style.display = 'none';
        });
        
        // Delete image on click
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm('Delete this image?')) {
            container.remove();
            handleContentChange();
          }
        });
      }
    });
  };
  
  useEffect(() => {
    console.log('🔄 useEffect triggered with value:', value);
    if (editorRef.current && value !== undefined) {
      const currentContent = editorRef.current.innerHTML;
      console.log('📝 Current editor innerHTML:', currentContent);
      console.log('🔍 Comparing:', { currentContent, value, areEqual: currentContent === value });
      if (currentContent !== value) {
        console.log('✏️ Setting editor content to:', value);
        editorRef.current.innerHTML = value || '';
        // Add delete handlers after content update
        setTimeout(() => addImageDeleteHandlers(editorRef.current), 100);
      } else {
        console.log('⏭️ Content already matches, skipping update');
      }
    } else {
      console.log('❌ Editor ref not ready or value undefined:', { hasRef: !!editorRef.current, value });
    }
  }, [value]);
  
  const updateActiveStyles = () => {
    const styles = new Set();
    
    // Check inline styles
    const commands = ['bold', 'italic', 'underline', 'strikethrough', 'insertOrderedList', 'insertUnorderedList', 'justifyCenter'];
    commands.forEach(command => {
      if (document.queryCommandState(command)) {
        styles.add(command);
      }
    });

    // Check block format
    const block = document.queryCommandValue('formatBlock').toLowerCase();
    if (block === 'h1') styles.add('h1');
    else if (block === 'h2') styles.add('h2');
    
    // If no block styles or inline styles are active, consider it 'normal' text
    const hasNoStyles = styles.size === 0 || 
                       (block === 'p' && !['h1', 'h2', ...commands].some(style => styles.has(style)));

    setActiveStyles(styles);
  };

  useEffect(() => {
    const node = editorRef.current;
    if (!node) return;

    node.contentEditable = 'true';
    const handleInput = () => {
      if (onChange) onChange(node.innerHTML);
      updateActiveStyles();
    };

    node.addEventListener('input', handleInput);
    document.addEventListener('selectionchange', updateActiveStyles);

    // Apply H1 format on mount ONLY if there's no existing content
    const applyH1 = () => {
      if (!node) return;
      
      // Only apply default H1 if the node is empty or has default content
      const currentContent = node.innerHTML;
      if (!currentContent || currentContent === '<h1><br></h1>' || currentContent === '<br>' || currentContent === '') {
        // Set initial content with H1
        node.innerHTML = '<h1><br></h1>';
        
        // Focus and set cursor position
        node.focus();
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(node.firstChild);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        
        if (onChange) {
          onChange(node.innerHTML);
        }
      }
    };
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(applyH1);

    return () => {
      node.removeEventListener('input', handleInput);
      document.removeEventListener('selectionchange', updateActiveStyles);
    };
  }, [onChange]);

  useEffect(() => {
    const node = editorRef.current;
    if (node && value !== node.innerHTML) {
      node.innerHTML = value || '';
    }
  }, [value]);

  const applyStyle = (command, value = null) => {
    // Make sure the editor has focus
    editorRef.current.focus();
    
    // Save the current selection
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const isCollapsed = range.collapsed;
    
    try {
      // For the Normal button - clear all formatting
      if (command === 'formatBlock' && value === '<p>') {
        // First, apply paragraph format
        document.execCommand('formatBlock', false, '<p>');
        
        // Remove all inline styles
        const inlineStyles = ['bold', 'italic', 'underline', 'strikethrough', 'justifyCenter'];
        inlineStyles.forEach(style => {
          if (document.queryCommandState(style)) {
            document.execCommand(style, false, null);
          }
        });
        
        // Remove any list formatting
        if (document.queryCommandState('insertOrderedList') || document.queryCommandState('insertUnorderedList')) {
          document.execCommand('insertUnorderedList', false, null); // Toggle off list
        }
      } 
      // For block-level formatting (headings)
      else if (command === 'formatBlock') {
        // Check if we're clicking the same heading that's already active
        const currentBlock = document.queryCommandValue('formatBlock').toLowerCase();
        const targetBlock = value.toLowerCase();
        
        if (currentBlock === targetBlock) {
          // If clicking the same heading that's already active, convert to normal text
          document.execCommand('formatBlock', false, '<p>');
        } else {
          // Otherwise, apply the selected heading
          document.execCommand('formatBlock', false, value);
        }
      } 
      // For text alignment
      else if (command === 'justifyCenter') {
        const isCentered = document.queryCommandState('justifyCenter');
        document.execCommand(isCentered ? 'justifyLeft' : 'justifyCenter', false, null);
      } 
      // For inline styles (bold, italic, etc.)
      else {
        // If the selection is collapsed, we need to insert a temporary span
        if (isCollapsed) {
          const span = document.createElement('span');
          span.innerHTML = '\u200B'; // Zero-width space
          range.deleteContents();
          range.insertNode(span);
          
          // Select the new span
          const newRange = document.createRange();
          newRange.selectNodeContents(span);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
        
        // Toggle the style
        document.execCommand(command, false, null);
        
        // Clean up any temporary spans if we created one
        if (isCollapsed) {
          const container = range.startContainer;
          if (container.nodeType === Node.TEXT_NODE && container.textContent === '\u200B') {
            container.parentNode.removeChild(container);
          }
        }
      }
      
      // Trigger change event
      if (onChange) {
        onChange(editorRef.current.innerHTML);
      }
      
      // Update the active styles
      updateActiveStyles();
      
    } catch (error) {
      console.error('Error applying style:', error);
    }
    
    // Restore focus to the editor
    editorRef.current.focus();
  };

  return (
    <View style={styles.editorContainer}>
      <View style={styles.webToolbar}>
        {/* Normal text button - removes all formatting */}
        <TouchableOpacity 
          onPress={() => applyStyle('formatBlock', '<p>')} 
          style={[
            styles.toolbarButton, 
            (!activeStyles.has('h1') && 
             !activeStyles.has('h2') && 
             !['bold','italic','underline','strikethrough', 'insertOrderedList', 'insertUnorderedList', 'justifyCenter'].some(s => activeStyles.has(s))) && 
            styles.toolbarButtonActive
          ]}
        >
          <Text style={{ fontSize: 14 }}>Normal</Text>
        </TouchableOpacity>
        
        <View style={styles.separator} />
        
        {/* Inline styles */}
        <TouchableOpacity 
          onPress={() => applyStyle('bold')} 
          style={[styles.toolbarButton, activeStyles.has('bold') && styles.toolbarButtonActive]}
        >
          <Text style={{ fontWeight: 'bold' }}>B</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => applyStyle('italic')} 
          style={[styles.toolbarButton, activeStyles.has('italic') && styles.toolbarButtonActive]}
        >
          <Text style={{ fontStyle: 'italic' }}>I</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => applyStyle('underline')} 
          style={[styles.toolbarButton, activeStyles.has('underline') && styles.toolbarButtonActive]}
        >
          <Text style={{ textDecorationLine: 'underline' }}>U</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => applyStyle('strikethrough')} 
          style={[styles.toolbarButton, activeStyles.has('strikethrough') && styles.toolbarButtonActive]}
        >
          <Text style={{ textDecorationLine: 'line-through' }}>S</Text>
        </TouchableOpacity>
        
        <View style={styles.separator} />
        
        {/* Headings */}
        <TouchableOpacity 
          onPress={() => applyStyle('formatBlock', activeStyles.has('h1') ? '<p>' : '<h1>')} 
          style={[styles.toolbarButton, activeStyles.has('h1') && styles.toolbarButtonActive]}
        >
          <Text style={[styles.headingText, activeStyles.has('h1') && styles.headingTextActive]}>H1</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => applyStyle('formatBlock', activeStyles.has('h2') ? '<p>' : '<h2>')} 
          style={[styles.toolbarButton, activeStyles.has('h2') && styles.toolbarButtonActive]}
        >
          <Text style={[styles.headingText, activeStyles.has('h2') && styles.headingTextActive]}>H2</Text>
        </TouchableOpacity>
        
        <View style={styles.separator} />
        
        {/* Lists and alignment */}
        <TouchableOpacity 
          onPress={() => applyStyle('insertUnorderedList')} 
          style={[styles.toolbarButton, activeStyles.has('insertUnorderedList') && styles.toolbarButtonActive]}
        >
          <MaterialIcons name="format-list-bulleted" size={18} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => applyStyle('insertOrderedList')} 
          style={[styles.toolbarButton, activeStyles.has('insertOrderedList') && styles.toolbarButtonActive]}
        >
          <MaterialIcons name="format-list-numbered" size={18} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => applyStyle('justifyCenter')} 
          style={[styles.toolbarButton, activeStyles.has('justifyCenter') && styles.toolbarButtonActive]}
        >
          <MaterialIcons name="format-align-center" size={18} />
        </TouchableOpacity>

        <View style={styles.separator} />
        
        {/* Image insertion button */}
        <TouchableOpacity 
          onPress={() => {
            if (onImageInsert) {
              onImageInsert();
            }
          }}
          style={styles.toolbarButton}
        >
          <MaterialIcons name="image" size={18} />
        </TouchableOpacity>
      </View>
      
      <View
        ref={editorRef}
        style={styles.contentInput}
        accessibilityRole="textbox"
        aria-multiline="true"
        onMouseUp={updateActiveStyles}
        onKeyUp={updateActiveStyles}
      />
    </View>
  );
};

const ManageMedia = ({ navigation }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editArticle, setEditArticle] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [genres, setGenres] = useState(['articles', 'opinions', 'sports', 'editorial', 'creative']);
  
  const richText = useRef(null);
  const editorRef = useRef(null); // Reference to the web editor

  const handleEditorRef = (ref) => {
    editorRef.current = ref;
  };

  useEffect(() => {
    fetchArticles();
  }, [selectedGenre, showFeaturedOnly]);

  useEffect(() => {
    filterArticles();
  }, [articles, search]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = {
        genre: selectedGenre !== 'all' ? selectedGenre : undefined,
        featured: showFeaturedOnly ? 'true' : undefined,
        search: search.trim() || undefined,
      };
      
      const response = await apiClient.get('/media/articles', { params });
      setArticles(response.data.data || []);
      setFilteredArticles(response.data.data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      Alert.alert('Error', 'Failed to fetch articles');
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    if (!search.trim()) {
      setFilteredArticles(articles);
      return;
    }

    const filtered = articles.filter(article =>
      article.title.toLowerCase().includes(search.toLowerCase()) ||
      article.content.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredArticles(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchArticles();
    setRefreshing(false);
  };

  const toggleArchive = async (article) => {
    const action = article.status === 'archived' ? 'unarchive' : 'archive';
    
    try {
      const response = await apiClient.patch(`/articles/${article.id}/archive`);
      console.log('Archive API response:', response.data);
      
      Alert.alert('Success', `Article ${action}d successfully`);
      fetchArticles();
    } catch (error) {
      console.error('Error toggling archive:', error.response?.data || error.message);
      Alert.alert('Error', `Failed to ${action} article: ${error.response?.data?.message || error.message}`);
    }
  };

  const toggleFeatured = async (article) => {
    console.log('Toggle featured called for article:', article.id, 'Current status:', article.is_featured);
    const action = article.is_featured ? 'unfeature' : 'feature';
    
    console.log('Making API call to:', `/articles/${article.id}/feature`);
    try {
      const response = await apiClient.patch(`/articles/${article.id}/feature`);
      console.log('API response:', response.data);
      
      Alert.alert('Success', `Article ${action}d successfully`);
      fetchArticles();
    } catch (error) {
      console.error('Error toggling featured:', error.response?.data || error.message);
      Alert.alert('Error', `Failed to ${action} article: ${error.response?.data?.message || error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return '#10b981';
      case 'draft': return '#6b7280';
      case 'archived': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published': return 'checkmark-circle';
      case 'draft': return 'document-text';
      case 'archived': return 'archive';
      default: return 'document-text';
    }
  };

  const openEdit = (article) => {
    console.log('🎯 openEdit called with article:', article);
    console.log('📝 Article content:', article.content);
    console.log('📏 Content length:', article.content?.length);
    console.log('🔢 Article ID:', article.id);
    setEditArticle(article);
    setEditTitle(article.title);
    setEditContent(article.content || '');
    console.log('✅ setEditContent called with:', article.content || '');
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (!editArticle) return;
    const dataToSend = {
      title: editTitle,
      content: editContent,
      genre: editArticle.genre,
      status: editArticle.status,
    };
    console.log('📤 Sending data to backend:', dataToSend);
    try {
      await apiClient.patch(`/articles/${editArticle.id}`, dataToSend);
      Alert.alert('Success', 'Article updated');
      setShowEditModal(false);
      fetchArticles();
    } catch (err) {
      console.error('❌ Failed to update article', err);
      console.error('❌ Response data:', err.response?.data);
      console.error('❌ Response status:', err.response?.status);
      Alert.alert('Error', 'Update failed');
    }
  };

  const renderArticleItem = (article) => (
    <View key={article.id} style={styles.articleCard}>
      <View style={styles.articleHeader}>
        <View style={styles.articleInfo}>
          <Text style={styles.articleTitle} numberOfLines={2}>
            {article.title}
          </Text>
          <View style={styles.articleMeta}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(article.status) }]}>
              <Ionicons 
                name={getStatusIcon(article.status)} 
                size={12} 
                color="white" 
                style={styles.statusIcon}
              />
              <Text style={styles.statusText}>{article.status}</Text>
            </View>
            {article.is_featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={12} color="#fbbf24" />
                <Text style={styles.featuredText}>Featured</Text>
                {article.featured_at && (
                  <Text style={styles.featuredDate}>
                    {new Date(article.featured_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
            )}
            <Text style={styles.genreText}>{article.genre}</Text>
          </View>
          <Text style={styles.articleDate}>
            {new Date(article.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.articleContent} numberOfLines={3}>
        {article.content.replace(/<[^>]*>/g, '')}
      </Text>

      <View style={styles.articleActions}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openEdit(article)}
          >
            <Ionicons name="create-outline" size={16} color="#2563eb" />
            <Text style={[styles.actionText, { color: '#2563eb' }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.featureButton]}
            onPress={() => {
              console.log('Feature button clicked for article:', article.id, 'is_featured:', article.is_featured);
              toggleFeatured(article);
            }}
          >
            <Ionicons 
              name={article.is_featured ? "star" : "star-outline"} 
              size={16} 
              color={article.is_featured ? "#fbbf24" : "#6b7280"} 
            />
            <Text style={[styles.actionText, { color: article.is_featured ? "#fbbf24" : "#6b7280" }]}>
              {article.is_featured ? 'Featured' : 'Feature'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.actionButton, styles.archiveButton]}
          onPress={() => toggleArchive(article)}
        >
          <Ionicons 
            name={article.status === 'archived' ? "archive" : "archive-outline"} 
            size={16} 
            color={article.status === 'archived' ? "#f97316" : "#6b7280"} 
          />
          <Text style={[styles.actionText, { color: article.status === 'archived' ? "#f97316" : "#6b7280" }]}>
            {article.status === 'archived' ? 'Archived' : 'Archive'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading your articles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Article</Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowEditModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Title</Text>
              <TextInput
                style={styles.formInput}
                value={editTitle}
                onChangeText={setEditTitle}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Content</Text>
              {console.log('🎨 Rendering editor with editContent:', editContent)}
              {Platform.OS === 'web' ? (
                <SimpleWebEditor 
                  key={`web-editor-${editArticle?.id || 'new'}`}
                  value={editContent} 
                  onChange={setEditContent} 
                  onImageInsert={() => {}} 
                  onEditorRef={handleEditorRef}
                />
              ) : (
                <View style={styles.editorContainer}>
                  <NativeRichEditor
                    key={`native-editor-${editArticle?.id || 'new'}`}
                    ref={richText}
                    style={styles.richEditor}
                    initialContentHTML={editContent}
                    placeholder="Write your article here..."
                    onChange={text => setEditContent(text)}
                    editorStyle={{ backgroundColor: '#fff', color: '#333', placeholderColor: '#999' }}
                  />
                  <NativeRichToolbar editor={richText} onImageInsert={() => {}} />
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.modalSaveButton} onPress={saveEdit}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Manage Media</Text>
          <Text style={styles.subtitle}>
            View, edit, archive, and feature your published articles
          </Text>
        </View>
        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.genreFilters}>
              {['all', ...genres].map((genre) => (
                <TouchableOpacity
                  key={genre}
                  style={[
                    styles.genreFilterChip,
                    selectedGenre === genre && styles.genreFilterChipActive,
                  ]}
                  onPress={() => setSelectedGenre(genre)}
                >
                  <Text
                    style={[
                      styles.genreFilterChipText,
                      selectedGenre === genre && styles.genreFilterChipTextActive,
                    ]}
                  >
                    {genre.charAt(0).toUpperCase() + genre.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity
            style={[
              styles.featuredToggle,
              showFeaturedOnly && styles.featuredToggleActive,
            ]}
            onPress={() => setShowFeaturedOnly(!showFeaturedOnly)}
          >
            <Ionicons 
              name="star" 
              size={16} 
              color={showFeaturedOnly ? "#fbbf24" : "#6b7280"} 
            />
            <Text
              style={[
                styles.featuredToggleText,
                showFeaturedOnly && styles.featuredToggleTextActive,
              ]}
            >
              Featured
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search articles..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <ScrollView
        style={styles.articlesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredArticles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>
              {search ? 'No articles found matching your search' : 'No articles found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {search ? 'Try adjusting your search terms' : 'Start by creating your first article'}
            </Text>
          </View>
        ) : (
          filteredArticles.map(renderArticleItem)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 16,
  },
  titleSection: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  filtersSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genreFilters: {
    flexDirection: 'row',
    marginRight: 16,
  },
  genreFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  genreFilterChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  genreFilterChipText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  genreFilterChipTextActive: {
    color: 'white',
  },
  featuredToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  featuredToggleActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
  },
  featuredToggleText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  featuredToggleTextActive: {
    color: '#92400e',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#111827',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterScrollView: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: 'white',
  },
  articlesList: {
    flex: 1,
    padding: 16,
  },
  articleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  articleHeader: {
    marginBottom: 12,
  },
  articleInfo: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 24,
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    marginRight: 8,
  },
  featuredText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400e',
    marginLeft: 4,
  },
  featuredDate: {
    fontSize: 10,
    color: '#92400e',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  genreText: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  articleDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  articleContent: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  articleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    minWidth: 60,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  editButton: {
    backgroundColor: '#eff6ff',
  },
  featureButton: {
    backgroundColor: '#fef3c7',
  },
  archiveButton: {
    backgroundColor: '#f0fdf4',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalSaveButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  modalSaveText: {
    color: 'white',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  formTextarea: {
    height: 200,
    textAlignVertical: 'top',
  },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  genreChipActive: {
    backgroundColor: '#3b82f6',
  },
  genreChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  genreChipTextActive: {
    color: 'white',
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  statusChipActive: {
    backgroundColor: '#10b981',
  },
  statusChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusChipTextActive: {
    color: 'white',
  },
  // Editor styles
  editorContainer: { 
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    borderRadius: 8, 
    marginBottom: 20, 
    overflow: 'hidden',
    position: 'relative',

  },
  richEditor: { 
    minHeight: 300, 
    backgroundColor: '#fff',
    position: 'relative',

  },
  richToolbar: { 
    backgroundColor: '#f8f9fa', 
    borderTopWidth: 1, 
    borderTopColor: '#d1d5db',
    position: 'relative',

  },
  editorPlaceholder: { 
    minHeight: 300, 
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    borderRadius: 8, 
    backgroundColor: '#f9f9f9' 
  },
  // Web Editor Toolbar Styles
  webToolbar: {
    position: 'relative',
    zIndex: 2,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#d1d5db',
    padding: 8,
    backgroundColor: '#f8f9fa',
    
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  toolbarButtonActive: {
    backgroundColor: '#e0e0e0',
    borderColor: '#1a237e',
  },
  separator: {
    width: 1,
    height: '100%',
    backgroundColor: '#ddd',
    marginHorizontal: 6,
  },
  headingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  headingTextActive: {
    color: '#1a237e',
  },
  contentInput: { 
    fontSize: 16, 
    lineHeight: 24, 
    color: '#333', 
    minHeight: 300, 
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    borderRadius: 8, 
    paddingTop: 0, 
    padding: 12, 
    marginTop: -10, // Negative margin to pull content up
    marginBottom: 20,
    position: 'relative',
    backgroundColor: '#fff', // Ensure solid background
    borderTopLeftRadius: 0, // Match border radius with title
    borderTopRightRadius: 0
  },
});

export default ManageMedia;
