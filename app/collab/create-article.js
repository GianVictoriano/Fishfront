import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Alert, Platform, Modal, FlatList, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../utils/api';
import { useBranding } from '~/context/BrandingContext';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// --- Platform-Aware Rich Text Editor --- //

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

// --- Custom Web Rich Text Editor (Dependency-Free) --- //

const SimpleWebEditor = ({ value, onChange, onImageInsert, onEditorRef }) => {
  const editorRef = useRef(null);
  const [activeStyles, setActiveStyles] = useState(new Set());
  const {colors} = useBranding();
  const [isInternalUpdate, setIsInternalUpdate] = useState(false);
  
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
    if (editorRef.current && !isInternalUpdate) {
      const currentContent = editorRef.current.innerHTML;
      if (currentContent !== value) {
        editorRef.current.innerHTML = value;
        // Add delete handlers after content update
        setTimeout(() => addImageDeleteHandlers(editorRef.current), 100);
      }
    }
    setIsInternalUpdate(false);
  }, [value, isInternalUpdate]);
  
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

    // Apply H1 format on mount
    const applyH1 = () => {
      if (!node) return;
      
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

// --- Main Screen Component --- //

export default function CreateArticleScreen() {
  const router = useRouter();
  const { colors } = useBranding();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [genre, setGenre] = useState('');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [browseVisible, setBrowseVisible] = useState(false);
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [publishedArticleId, setPublishedArticleId] = useState(null);
  const [publishToFacebook, setPublishToFacebook] = useState(false);
  const [completeGroupChat, setCompleteGroupChat] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupChats, setGroupChats] = useState([]);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const richText = useRef(null);
  const scrollViewRef = useRef(null);
  
  // Image cropping states
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState({
    unit: '%',
    width: 50,
    height: 50,
    x: 25,
    y: 25
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [isForEditor, setIsForEditor] = useState(false);
  const imgRef = useRef(null);
  const editorRef = useRef(null); // Reference to the web editor

  const handleEditorRef = (ref) => {
    editorRef.current = ref;
  };

  const handleInsertContent = ({ title: groupTitle, content: draftText, image, group_id }) => {
    if (groupTitle) setTitle(groupTitle);
    if (draftText) {
      setContent(draftText);
      if (Platform.OS !== 'web' && richText.current) {
        richText.current.setContentHTML(draftText);
      }
    }
    if (image) {
      setImages(prev => [...prev, { uri: image, type: 'image', local: false }]);
    }
    if (group_id) {
      setSelectedGroupId(group_id);
    }
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 250, animated: true });
      }
    }, 100);
  };

  const getCroppedImg = (image, crop) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = crop.width;
    canvas.height = crop.height;
    
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Canvas is empty');
          return;
        }
        blob.name = 'cropped-image.jpg';
        resolve(blob);
      }, 'image/jpeg');
    });
  };

  const handleCropComplete = async (crop) => {
    setCompletedCrop(crop);
  };

  const handleCropConfirm = async () => {
    console.log('=== Crop Confirm Clicked ===');
    console.log('selectedImage:', selectedImage);
    console.log('completedCrop:', completedCrop);
    console.log('imgRef.current:', imgRef.current);
    console.log('isForEditor:', isForEditor);
    
    if (!selectedImage || !completedCrop || !imgRef.current) {
      console.error('Missing required data:', {
        hasImage: !!selectedImage,
        hasCrop: !!completedCrop,
        hasImgRef: !!imgRef.current
      });
      return;
    }
    
    try {
      console.log('Starting crop process...');
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      console.log('Cropped blob:', croppedBlob);
      const reader = new FileReader();
      
      reader.onload = (event) => {
        console.log('Reader onload triggered');
        const croppedImageUri = event.target.result;
        console.log('Cropped image URI length:', croppedImageUri?.length);
        
        if (isForEditor) {
          console.log('Inserting into editor');
          
          // For web platform, get image dimensions to preserve original size
          if (Platform.OS === 'web') {
            // Create an image element to get original dimensions
            const img = document.createElement('img');
            img.onload = () => {
              console.log('Original image dimensions:', img.width, 'x', img.height);
              
              // Use original dimensions but cap at editor width if too large
              const maxWidth = 600; // Reasonable max width for editor
              const width = img.width > maxWidth ? maxWidth : img.width;
              const height = img.width > maxWidth ? (img.height * maxWidth / img.width) : img.height;
              
              console.log('Final dimensions:', width, 'x', height);
              
              // Insert cropped image inline into the editor content with proper dimensions and center alignment
              const imageHtml = `<div style="text-align: center; margin: 10px 0; position: relative; display: inline-block;">
                <div style="position: relative; display: inline-block;">
                  <img src="${croppedImageUri}" style="width: ${width}px; height: ${height}px; max-width: 100%; height: auto; display: inline-block;" alt="Inserted image" />
                  <span class="image-delete-btn" style="position: absolute; top: 5px; right: 5px; background: #ff4444; color: white; border-radius: 50%; width: 24px; height: 24px; display: none; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; font-weight: bold; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">×</span>
                </div>
              </div><br>`;
              
              // Get the current content from state to preserve it
              const currentContent = content || '';
              console.log('Current content from state:', currentContent);
              
              // Create new content by appending the image
              const newContent = currentContent + imageHtml;
              console.log('New content length:', newContent.length);
              
              // Update the content state first
              setContent(newContent);
              
              // Then update the editor DOM to match
              setTimeout(() => {
                const editor = editorRef.current;
                console.log('Editor ref after timeout:', editor);
                if (editor) {
                  editor.innerHTML = newContent;
                  console.log('Editor innerHTML updated');
                }
              }, 50);
            };
            img.src = croppedImageUri;
          } else {
            // For native platforms, use responsive sizing with center alignment
            const imageHtml = `<div style="text-align: center; margin: 10px 0;">
              <img src="${croppedImageUri}" style="max-width: 100%; height: auto;" alt="Inserted image" />
            </div><br>`;
            
            // Get the current content from state to preserve it
            const currentContent = content || '';
            console.log('Current content from state:', currentContent);
            
            // Create new content by appending the image
            const newContent = currentContent + imageHtml;
            console.log('New content length:', newContent.length);
            
            // Update the content state first
            setContent(newContent);
          }
        } else {
          console.log('Adding as main image');
          // Add as main image
          setImages(prev => {
            console.log('Previous images:', prev);
            const newImages = [...prev, { uri: croppedImageUri, type: 'image', local: true }];
            console.log('New images:', newImages);
            return newImages;
          });
        }
        
        console.log('Closing crop modal');
        // Close crop modal
        setCropModalVisible(false);
        setSelectedImage(null);
        setCompletedCrop(null);
        setCrop({
          unit: '%',
          width: 50,
          height: 50,
          x: 25,
          y: 25
        });
      };
      
      reader.readAsDataURL(croppedBlob);
    } catch (error) {
      console.error('Error cropping image:', error);
      Alert.alert('Error', 'Failed to crop image.');
    }
  };

  const handleCropCancel = () => {
    setCropModalVisible(false);
    setSelectedImage(null);
    setCompletedCrop(null);
    setCrop({
      unit: '%',
      width: 50,
      height: 50,
      x: 25,
      y: 25
    });
  };

  const pickInlineImage = async (forEditor = false) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // We'll handle cropping ourselves
        aspect: undefined,
        quality: 1,
      });
      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        setIsForEditor(forEditor);
        setSelectedImage(imageUri);
        setCropModalVisible(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const pickDocument = async () => {
    try {
      console.log('Starting document picker...');
      const result = await DocumentPicker.getDocumentAsync({ 
        type: '*/*', 
        copyToCacheDirectory: Platform.OS !== 'web' // Only copy to cache on native
      });
      console.log('Document picker result:', result);
      
      const isSuccess = Platform.OS === 'web' ? (!result.canceled && result.assets && result.assets.length > 0) : result.type === 'success';
      if (isSuccess) {
        // Gather common file info
        let fileUri, fileName, fileAsset;
        if (Platform.OS === 'web') {
          fileAsset = result.assets[0];
          fileUri = fileAsset.uri;
          fileName = fileAsset.name;
        } else {
          fileUri = result.uri;
          fileName = result.name;
        }
        console.log('Selected file:', fileName, 'URI:', fileUri);
        // Keep a reference to the file (e.g., for upload)
        setImages(prev => [...prev, { uri: fileUri, name: fileName, type: 'file', local: true }]);
        
        try {
          let fileText = '';
          if (Platform.OS === 'web') {
            console.log('Web platform: using FileReader');
            // On web, access the File object from the first asset
            const webAsset = result.assets?.[0];
            if (!webAsset) {
              throw new Error('No file asset found');
            }
            const webFile = webAsset.file || webAsset;
            // Create a promise to handle FileReader async operation
            fileText = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.onerror = () => reject(new Error('Failed to read file'));
              reader.readAsText(webFile);
            });
            console.log('File read successfully, length:', fileText.length);
          } else {
            console.log('Native platform: using FileSystem');
            // First check if file exists and is readable
            const fileInfo = await FileSystem.getInfoAsync(result.uri);
            console.log('File info:', fileInfo);
            
            if (!fileInfo.exists) {
              throw new Error('File does not exist or is not accessible');
            }
            
            fileText = await FileSystem.readAsStringAsync(result.uri, {
              encoding: FileSystem.EncodingType.UTF8,
            });
            console.log('File read successfully, length:', fileText.length);
          }
          
          // Append to existing content, converting newlines to <br> on web
          console.log('Setting content...');
          const converted = Platform.OS === 'web' ? fileText.replace(/\n/g, '<br>') : fileText;
          setContent(prev => {
            const separator = prev ? (Platform.OS === 'web' ? '<br><br>' : '\n\n') : '';
            return prev + separator + converted;
          });
          console.log('Content set successfully');
          
        } catch (e) {
          console.error('Failed reading document content:', e);
          Alert.alert('Error', `Unable to read file content: ${e.message}`);
        }
      }
    } catch (error) {
      console.error('Error in document picker:', error);
      Alert.alert('Error', `Failed to pick document: ${error.message}`);
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  const extractAndUploadInlineImages = async (content) => {
    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    const images = tempDiv.querySelectorAll('img');
    const uploadedImages = [];
    
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const src = img.src;
      
      // Check if it's a local image (data URL or blob URL)
      if (src.startsWith('data:') || src.startsWith('blob:')) {
        try {
          console.log('Processing inline image:', src.substring(0, 50) + '...');
          
          let blob;
          if (src.startsWith('data:')) {
            // Convert data URL to blob
            const response = await fetch(src);
            blob = await response.blob();
          } else if (src.startsWith('blob:')) {
            // Convert blob URL to blob
            const response = await fetch(src);
            blob = await response.blob();
          }
          
          if (blob) {
            // Upload the image using same logic as main images
            const formData = new FormData();
            const fileExt = blob.type.split('/')[1] || 'jpg';
            formData.append('media[]', blob, `inline_image_${Date.now()}_${i}.${fileExt}`);
            
            const apiUrl = process.env.EXPO_PUBLIC_API_URL;
            const token = await AsyncStorage.getItem('auth_token');
            
            const uploadResponse = await fetch(`${apiUrl}/api/upload-media`, {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: formData,
            });
            
            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json();
              if (uploadResult.data && uploadResult.data.length > 0) {
                const serverUrl = `${apiUrl?.replace('/api', '')}/storage/${uploadResult.data[0].file_path.replace('public/', '')}`;
                uploadedImages.push({
                  originalSrc: src,
                  serverUrl: serverUrl
                });
                console.log('Inline image uploaded successfully:', serverUrl);
              }
            } else {
              console.error('Failed to upload inline image:', uploadResponse.status);
            }
          }
        } catch (error) {
          console.error('Error processing inline image:', error);
        }
      }
    }
    
    return uploadedImages;
  };

  const removeMedia = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    console.log('Publish button clicked'); // Debug log
    
    // Validate required fields
    if (!title.trim() || !content.trim()) {
      console.log('Validation failed - missing title or content');
      return Alert.alert('Error', 'Title and content are required fields');
    }

    setIsSubmitting(true);
    console.log('Submitting form...');

    try {
      // Get auth token
      const token = await AsyncStorage.getItem('auth_token');
      console.log('Auth token retrieved:', token ? 'present' : 'missing');
      
      if (!token) {
        console.log('No auth token found, redirecting to signin');
        Alert.alert('Authentication Required', 'Please sign in to create an article');
        router.push('/signin');
        return;
      }

      // Process inline images first (only on web platform)
      let processedContent = content;
      if (Platform.OS === 'web') {
        console.log('Processing inline images...');
        const uploadedImages = await extractAndUploadInlineImages(content);
        
        // Replace local image references with server URLs
        uploadedImages.forEach(({ originalSrc, serverUrl }) => {
          processedContent = processedContent.replace(originalSrc, serverUrl);
        });
        
        console.log(`Processed ${uploadedImages.length} inline images`);
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('content', processedContent.trim());
      formData.append('genre', genre || 'articles'); // Default to 'articles' if not selected
      formData.append('status', 'draft');
      formData.append('post_to_facebook', publishToFacebook ? '1' : '0');

      console.log('Form data prepared, processing main images...');
      
      // Process images if any
      for (let index = 0; index < images.length; index++) {
        const image = images[index];
        if (image.uri && image.type === 'image') {
          console.log(`Processing image ${index + 1}/${images.length}:`, image.uri);
          
          if (Platform.OS === 'web') {
            try {
              console.log('Fetching image for web upload...');
              const response = await fetch(image.uri);
              if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
              
              const blob = await response.blob();
              console.log('Image blob created, size:', blob.size);
              
              const uriParts = image.uri.split('.');
              const fileExt = uriParts[uriParts.length - 1].toLowerCase();
              formData.append('media[]', blob, `image_${Date.now()}_${index}.${fileExt}`);
            } catch (e) {
              console.error('Failed to process image for web upload:', e);
              Alert.alert('Warning', `Could not process image ${index + 1}: ${e.message}`);
            }
          } else {
            console.log('Processing image for native platform');
            const uriParts = image.uri.split('.');
            const fileExt = uriParts[uriParts.length - 1].toLowerCase();
            const mimeType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
            formData.append('media[]', { 
              uri: image.uri, 
              name: `image_${Date.now()}_${index}.${fileExt}`, 
              type: mimeType 
            });
          }
        }
      }

      // Get API URL and validate
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      console.log('API URL from environment:', apiUrl);
      
      if (!apiUrl) {
        const errorMsg = 'EXPO_PUBLIC_API_URL is not configured';
        console.error(errorMsg);
        throw new Error('Server configuration error. Please try again later.');
      }

      // Log request details (without sensitive data)
      console.log('Sending request to:', `${apiUrl}/api/articles`);
      console.log('Request method: POST');
      console.log('Headers:', { 'Accept': 'application/json', 'Authorization': 'Bearer [token]' });
      
      // Make the API request
      const response = await fetch(`${apiUrl}/api/articles`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json', 
          'Authorization': `Bearer ${token}`,
          // Note: Don't set Content-Type header - let the browser set it with the correct boundary
        },
        body: formData,
      });

      console.log('Response status:', response.status);
      
      let responseData;
      try {
        responseData = await response.json();
        console.log('Response data:', responseData);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        console.error('Server responded with error:', response.status, responseData);
        throw new Error(
          responseData?.message || 
          responseData?.error?.message || 
          `Server error: ${response.status} ${response.statusText || ''}`.trim()
        );
      }

      console.log('Article published successfully:', responseData);
      
      // If completeGroupChat is enabled and we have a group_id, mark the group chat as published
      if (completeGroupChat && selectedGroupId) {
        try {
          console.log('Marking group chat as published:', selectedGroupId);
          await apiClient.patch(`/group-chats/${selectedGroupId}/status`, {
            status: 'published'
          });
          console.log('Group chat marked as published');
          // Clear the selected group ID so it updates in Browse Works
          setSelectedGroupId(null);
        } catch (error) {
          console.error('Failed to mark group chat as published:', error);
          // Don't fail the whole operation if this fails
        }
      }
      
      // Show completion modal
      setPublishedArticleId(responseData.data?.id);
      setCompletionModalVisible(true);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      Alert.alert(
        'Publish Failed',
        error.message || 'An unexpected error occurred while publishing your article. Please try again.'
      );
    } finally {
      console.log('Submission process completed');
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a237e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Article</Text>
        <View style={styles.headerButtonsContainer}>

          <TouchableOpacity 
            style={[styles.actionButton, styles.publishButton, { backgroundColor: colors.primary || '#1a237e' }, isSubmitting && styles.publishButtonDisabled]} 
            onPress={() => setPublishModalVisible(true)} 
            disabled={isSubmitting}
          >
            <Text style={[styles.actionButtonText, styles.publishButtonText]}>
              Publish
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={browseVisible}
        animationType="slide"
        onRequestClose={() => setBrowseVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Browse Approved Works</Text>
            <TouchableOpacity onPress={() => setBrowseVisible(false)}>
              <Ionicons name="close" size={28} color="#1a237e" />
            </TouchableOpacity>
          </View>
          <ApprovedWorksList 
            onClose={() => setBrowseVisible(false)}
            onSelect={handleInsertContent}
          />
        </View>
      </Modal>

      <ScrollView style={styles.contentContainer} ref={scrollViewRef}>
        <TextInput
          style={[styles.titleInput, { borderColor: colors.primary || '#e0e0e0' }]}
          placeholder="Article Title"
          placeholderTextColor="#666"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
          multiline
        />

        <View style={styles.genreContainer}>
          <Text style={styles.genreLabel}>Genre: </Text>
          <View style={styles.genreOptions}>
            {['articles', 'opinions', 'sports', 'editorial', 'creative'].map((g) => (
              <TouchableOpacity key={g} style={[styles.genreButton, genre === g && { backgroundColor: colors.primary || '#1a237e' }]} onPress={() => setGenre(g)}>
                <Text style={[styles.genreButtonText, genre === g && styles.genreButtonTextSelected]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {Platform.OS === 'web' ? (
          <SimpleWebEditor 
            value={content} 
            onChange={setContent} 
            onImageInsert={() => pickInlineImage(true)} 
            onEditorRef={handleEditorRef}
          />
        ) : (
          <View style={styles.editorContainer}>
            <NativeRichEditor
              ref={richText}
              style={styles.richEditor}
              initialContentHTML={content}
              placeholder="Write your article here..."
              onChange={text => setContent(text)}
              editorStyle={{ backgroundColor: '#fff', color: '#333', placeholderColor: '#999' }}
            />
            <NativeRichToolbar editor={richText} onImageInsert={() => pickInlineImage(true)} />
          </View>
        )}

        <View style={styles.mediaContainer}>
          {images.length > 0 && (
            <Text style={styles.mediaLabel}>Main Images (displayed at bottom of article)</Text>
          )}
          {images.map((media, index) => (
            <View key={index} style={styles.mediaItem}>
              {media.type === 'image' ? (
                <Image source={{ uri: media.uri }} style={styles.mediaImage} />
              ) : (
                <View style={styles.documentItem}>
                  <MaterialIcons name="insert-drive-file" size={40} color="#1a237e" />
                  <Text style={styles.documentName} numberOfLines={1}>{media.name || 'Document'}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.removeMediaButton} onPress={() => removeMedia(index)}>
                <Ionicons name="close-circle" size={20} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={() => pickInlineImage(false)}>
          <Ionicons name="image" size={24} color={colors.primary || '#1a237e'} />
          <Text style={[styles.footerButtonText, {color: colors.primary || '#1a237e'}]}>Select Image</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerButton} onPress={() => setBrowseVisible(true)}>
          <Ionicons name="book" size={24} color={colors.primary || '#1a237e'} />
          <Text style={[styles.footerButtonText, {color: colors.primary || '#1a237e'}]}>Browse Works</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={browseVisible} animationType="slide" onRequestClose={() => setBrowseVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Approved Works</Text>
            <TouchableOpacity onPress={() => setBrowseVisible(false)}>
              <Ionicons name="close" size={28} color="#1a237e" />
            </TouchableOpacity>
          </View>
          <ApprovedWorksList onSelect={handleInsertContent} onClose={() => setBrowseVisible(false)} />
        </View>
      </Modal>

      {/* Publish Modal */}
      <Modal 
        animationType="fade" 
        transparent={true} 
        visible={publishModalVisible} 
        onRequestClose={() => setPublishModalVisible(false)}
      >
        <View style={styles.publishModalOverlay}>
          <View style={styles.publishModal}>
            <View style={styles.publishModalHeader}>
              <View style={styles.publishHeaderIcon}>
                <Ionicons name="send" size={24} color="#1a237e" />
              </View>
              <View style={styles.publishHeaderText}>
                <Text style={styles.publishModalTitle}>Publish Article</Text>
                <Text style={styles.publishModalSubtitle}>Choose your publishing options</Text>
              </View>
              <TouchableOpacity 
                style={styles.publishCloseButton} 
                onPress={() => setPublishModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <View style={styles.publishModalBody}>
              {/* Complete Group Chat Toggle */}
              <TouchableOpacity 
                style={styles.toggleOption}
                onPress={() => setCompleteGroupChat(!completeGroupChat)}
              >
                <View style={styles.toggleInfo}>
                  <Ionicons name="checkmark-circle" size={24} color="#1a237e" />
                  <View style={styles.toggleTextContainer}>
                    <Text style={styles.toggleTitle}>Complete Group Chat</Text>
                    <Text style={styles.toggleDescription}>Mark the group chat as finished and move to completed</Text>
                  </View>
                </View>
                <View style={[styles.toggleSwitch, completeGroupChat && styles.toggleSwitchActive]}>
                  <View style={[styles.toggleThumb, completeGroupChat && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>

              {/* Facebook Toggle */}
              <TouchableOpacity 
                style={styles.toggleOption}
                onPress={() => setPublishToFacebook(!publishToFacebook)}
              >
                <View style={styles.toggleInfo}>
                  <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                  <View style={styles.toggleTextContainer}>
                    <Text style={styles.toggleTitle}>Post to Facebook</Text>
                    <Text style={styles.toggleDescription}>Automatically share this article on your Facebook page</Text>
                  </View>
                </View>
                <View style={[styles.toggleSwitch, publishToFacebook && styles.toggleSwitchActive]}>
                  <View style={[styles.toggleThumb, publishToFacebook && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.publishModalFooter}>
              <TouchableOpacity 
                style={styles.publishCancelButton}
                onPress={() => setPublishModalVisible(false)}
              >
                <Text style={styles.publishCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.publishConfirmButton}
                onPress={() => {
                  setPublishModalVisible(false);
                  handleSubmit();
                }}
              >
                <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.publishConfirmButtonText}>Publish Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Completion Modal */}
      <Modal 
        animationType="fade" 
        transparent={true} 
        visible={completionModalVisible} 
        onRequestClose={() => setCompletionModalVisible(false)}
      >
        <View style={styles.publishModalOverlay}>
          <View style={styles.completionModal}>
            <View style={styles.completionIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>
            
            <Text style={styles.completionTitle}>Article Published Successfully!</Text>
            <Text style={styles.completionMessage}>
              Your article has been published and is now live.
            </Text>

            <View style={styles.completionActions}>
              <TouchableOpacity 
                style={styles.completionButton}
                onPress={() => {
                  setCompletionModalVisible(false);
                  if (publishedArticleId) {
                    router.push(`/news/article/${publishedArticleId}`);
                  }
                }}
              >
                <Ionicons name="eye" size={20} color="#1a237e" />
                <Text style={styles.completionButtonText}>View Article</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.completionButton}
                onPress={() => {
                  setCompletionModalVisible(false);
                  setTitle(''); 
                  setContent(''); 
                  setGenre(''); 
                  setImages([]);
                  setSelectedGroupId(null);
                  if (scrollViewRef.current) {
                    scrollViewRef.current.scrollTo({ y: 0, animated: true });
                  }
                }}
              >
                <Ionicons name="create" size={20} color="#1a237e" />
                <Text style={styles.completionButtonText}>Create New Article</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.completionButton, styles.completionButtonPrimary]}
                onPress={() => {
                  setCompletionModalVisible(false);
                  router.push('/collab');
                }}
              >
                <Ionicons name="home" size={20} color="#fff" />
                <Text style={[styles.completionButtonText, styles.completionButtonTextPrimary]}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Crop Modal */}
      <Modal
        visible={cropModalVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={handleCropCancel}
      >
        <View style={styles.cropModalContainer}>
          <View style={styles.cropModalHeader}>
            <Text style={styles.cropModalTitle}>Crop Image</Text>
            <TouchableOpacity onPress={handleCropCancel}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {selectedImage && (
            <View style={styles.cropImageContainer}>
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={handleCropComplete}
                aspect={undefined}
                minWidth={50}
                minHeight={50}
              >
                <img
                  ref={imgRef}
                  src={selectedImage}
                  alt="Crop me"
                  style={styles.cropImage}
                />
              </ReactCrop>
            </View>
          )}
          
          <View style={styles.cropModalFooter}>
            <TouchableOpacity 
              onPress={handleCropCancel}
              style={styles.cropCancelButton}
            >
              <Text style={styles.cropCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleCropConfirm}
              style={[styles.cropConfirmButton, { backgroundColor: colors.primary || '#1a237e' }]}
            >
              <Text style={styles.cropConfirmButtonText}>Confirm Crop</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ApprovedWorksList({ onClose, onSelect }) {
  const [content, setContent] = useState([]);
  const [filteredContent, setFilteredContent] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [publicationFilter, setPublicationFilter] = useState('pending'); // 'pending' or 'published'
  const router = useRouter();

  const filterContent = (items, search, pubFilter) => {
    let filtered = items;
    
    // Filter by publication status
    filtered = filtered.filter(item => {
      if (pubFilter === 'pending') {
        return !item.group?.status || item.group?.status === 'active';
      } else {
        return item.group?.status === 'published';
      }
    });
    
    // Filter by search term
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(item => 
        (item.group?.name && item.group.name.toLowerCase().includes(term)) ||
        (item.status && item.status.toLowerCase().includes(term)) ||
        (item._type === 'draft' && item.text && item.text.toLowerCase().includes(term))
      );
    }
    
    return filtered;
  };

  useEffect(() => {
    setFilteredContent(filterContent(content, searchTerm, publicationFilter));
  }, [content, searchTerm, publicationFilter]);

  useEffect(() => {
    const fetchApproved = async () => {
      try {
        // Only fetch items that have been approved by lead reviewer
        const params = new URLSearchParams({ 
          status: 'approved',
          review_stage: 'approved' // Only show items that passed lead review
        });
        const [draftsRes, imagesRes] = await Promise.all([
          apiClient.get(`/review-content?${params}`),
          apiClient.get(`/review-images?${params}`),
        ]);
        const drafts = draftsRes.data.map((d) => ({ ...d, _type: 'draft' }));
        const images = imagesRes.data.map((i) => ({ ...i, _type: 'image' }));
        const allContent = [...drafts, ...images];
        setContent(allContent);
        setFilteredContent(allContent);
      } catch (e) {
        console.error('Failed to load approved content', e);
      } finally {
        setLoading(false);
      }
    };
    fetchApproved();
  }, []);

  const handleSelect = async (item) => {
    setLoading(true);
    
    // Find all items with the same group_id
    const groupItems = content.filter(i => i.group_id === item.group_id);
    const hasDraft = groupItems.some(i => i._type === 'draft');
    const hasImage = groupItems.some(i => i._type === 'image');
    
    let selectedData = {
      title: item.group?.name || '',
      group_id: item.group_id
    };
    
    // If both draft and image exist in the same group, add both
    if (hasDraft && hasImage) {
      try {
        // Get draft content
        const draftItem = groupItems.find(i => i._type === 'draft');
        if (draftItem) {
          const res = await apiClient.get(`/review-content/preview/${draftItem.id}`);
          const plainText = res.data.text || '';
          const lines = plainText.split('\n');
          let htmlContent = '';
          if (lines.length > 0) {
            const firstLine = lines[0].trim();
            const rest = lines.slice(1).join('\n');
            htmlContent = `<h1>${firstLine}</h1>${rest.replace(/\n/g, '<br />')}`;
          }
          selectedData.content = htmlContent;
        }
        
        // Get image
        const imageItem = groupItems.find(i => i._type === 'image');
        if (imageItem) {
          selectedData.image = `${process.env.EXPO_PUBLIC_API_URL}/storage/${imageItem.file}`;
        }
        
        onSelect(selectedData);
      } catch (e) {
        console.error('Failed fetching group content', e);
      }
    } else {
      // If only one type exists, handle as before
      if (item._type === 'draft') {
        try {
          const res = await apiClient.get(`/review-content/preview/${item.id}`);
          const plainText = res.data.text || '';
          const lines = plainText.split('\n');
          let htmlContent = '';
          if (lines.length > 0) {
            const firstLine = lines[0].trim();
            const rest = lines.slice(1).join('\n');
            htmlContent = `<h1>${firstLine}</h1>${rest.replace(/\n/g, '<br />')}`;
          }
          selectedData.content = htmlContent;
          onSelect(selectedData);
        } catch (e) {
          console.error('Failed fetching draft content', e);
        }
      } else if (item._type === 'image') {
        selectedData.image = `${process.env.EXPO_PUBLIC_API_URL}/storage/${item.file}`;
        onSelect(selectedData);
      }
    }
    
    onClose();
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#303F9F" style={{ marginTop: 40 }} />;
  }

  if (content.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#666' }}>No approved content available.</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.approvedItem} onPress={() => handleSelect(item)}>
      {item._type === 'image' ? (
        <Image source={{ uri: `${process.env.EXPO_PUBLIC_API_URL}/storage/${item.file}` }} style={styles.approvedThumb} />
      ) : (
        <Ionicons name="document-text" size={48} color="#1a237e" />
      )}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text numberOfLines={2} style={styles.approvedTitle}>{item.group?.name || 'Unnamed Group'}</Text>
        <Text style={styles.approvedMeta}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Publication Status Filter */}
      <View style={styles.publicationFilterContainer}>
        <TouchableOpacity 
          style={[styles.publicationFilterButton, publicationFilter === 'pending' && styles.activePublicationFilter]}
          onPress={() => setPublicationFilter('pending')}
        >
          <Ionicons 
            name="time-outline" 
            size={18} 
            color={publicationFilter === 'pending' ? '#1a237e' : '#666'} 
          />
          <Text style={[styles.publicationFilterText, publicationFilter === 'pending' && styles.activePublicationFilterText]}>
            Pending for Publication
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.publicationFilterButton, publicationFilter === 'published' && styles.activePublicationFilter]}
          onPress={() => setPublicationFilter('published')}
        >
          <Ionicons 
            name="checkmark-circle-outline" 
            size={18} 
            color={publicationFilter === 'published' ? '#10B981' : '#666'} 
          />
          <Text style={[styles.publicationFilterText, publicationFilter === 'published' && styles.activePublicationFilterText]}>
            Published
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search works..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#999"
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearSearchButton}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      
      <FlatList
        data={filteredContent.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))}
        renderItem={renderItem}
        keyExtractor={(item) => `${item._type}-${item.id}`}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ color: '#666' }}>No matching works found.</Text>
          </View>
        }
      />
    </View>
  );
}

  /* DUPLICATE BLOCK START
const filterAndSortContent = (data, search) => {
    let result = [...data];
    
    // Apply search
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(item => 
        (item.title && item.title.toLowerCase().includes(term)) ||
        (item.content && item.content.toLowerCase().includes(term)) ||
        (item.genre && item.genre.toLowerCase().includes(term))
      );
    }
    
    // Always sort newest first
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return result;
  };

  useEffect(() => {
    const filtered = filterAndSortContent(content, searchTerm);
    setFilteredContent(filtered);
  }, [content, searchTerm]);

  useEffect(() => {
    const fetchApproved = async () => {
      try {
        const params = new URLSearchParams({ status: 'approved' });
        const [draftsRes, imagesRes] = await Promise.all([
          apiClient.get(`/review-content?${params}`),
          apiClient.get(`/review-images?${params}`),
        ]);
        const drafts = draftsRes.data.map((d) => ({ ...d, _type: 'draft' }));
        const images = imagesRes.data.map((i) => ({ ...i, _type: 'image' }));
        setContent([...drafts, ...images].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)));
      } catch (e) {
        console.error('Failed to load approved content', e);
      } finally {
        setLoading(false);
      }
    };
    fetchApproved();
  }, []);

  const handleSelect = async (item) => {
    if (item._type === 'draft') {
      try {
        const res = await apiClient.get(`/review-content/preview/${item.id}`);
        onSelect({ title: item.group?.name || '', content: res.data.text || '' });
      } catch (e) {
        console.error('Failed fetching draft content', e);
      }
    } else if (item._type === 'image') {
      onSelect({ title: item.group?.name || '', image: `${process.env.EXPO_PUBLIC_API_URL}/storage/${item.file}` });
    }
    onClose();
  };

  if (loading) return <ActivityIndicator size="large" color="#303F9F" style={{ marginTop: 40 }} />;
  if (content.length === 0) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#666' }}>No approved content available.</Text></View>;

  const workTypes = ['all', 'articles', 'opinions', 'sports', 'editorial', 'creative'];
  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'title', label: 'Title (A-Z)' },
  ];

  return (
    <View style={{ flex: 1 }}>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search works..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#999"
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearSearchButton}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>


      <FlatList
        data={filteredContent}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.workItem}
            onPress={() => {
              onSelect(item);
              onClose();
            }}
          >
            <View style={styles.workHeader}>
              <Text style={styles.workTitle}>{item.title}</Text>
              <Text style={styles.workMeta}>
                {item.genre && (
                  <Text style={styles.workGenre}>
                    {item.genre.charAt(0).toUpperCase() + item.genre.slice(1)}
                  </Text>
                )}
                {item.created_at && (
                  <Text style={styles.workDate}>
                    • {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                )}
              </Text>
            </View>
            <Text style={styles.workContent} numberOfLines={2}>
              {item.content?.replace(/<[^>]*>?/gm, '')}
            </Text>
            {item.media && item.media.length > 0 && (
              <Image 
                source={{ uri: item.media[0].original_url }} 
                style={styles.workImage}
                resizeMode="cover"
              />
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color="#ccc" />
              <Text style={styles.noResults}>No works found</Text>
              <Text style={styles.noResultsSubtext}>Try adjusting your search or filters</Text>
            </View>
          )
        }
      />
    </View>
  );
}

*/

const styles = StyleSheet.create({
  searchContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#333',
    fontSize: 16,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 4,
  },
  // Search and Filter Styles
  searchContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#333',
    fontSize: 16,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 4,
  },
  filterRow: {
    marginTop: 8,
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  filterButtons: {
    flexDirection: 'row',
    paddingBottom: 4,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#1a237e',
  },
  filterButtonText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  sortButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    margin: 4,
  },
  sortButtonActive: {
    backgroundColor: '#1a237e',
  },
  sortButtonText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResults: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  workItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  workHeader: {
    marginBottom: 8,
  },
  workTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  workMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  workGenre: {
    fontSize: 13,
    color: '#1a237e',
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  workDate: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
  },
  workContent: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12,
  },
  workImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1a237e' 
  },
  approvedItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  approvedThumb: { 
    width: 64, 
    height: 64, 
    borderRadius: 8, 
    backgroundColor: '#f0f0f0' 
  },
  approvedTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  approvedMeta: { fontSize: 12, color: '#666' },
  publicationFilterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  publicationFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  activePublicationFilter: {
    backgroundColor: '#EEF2FF',
    borderColor: '#1a237e',
  },
  publicationFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activePublicationFilterText: {
    color: '#1a237e',
  },
  // Main screen styles
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1a237e', flex: 1, textAlign: 'center', marginRight: 100 },
  headerButtonsContainer: { flexDirection: 'row', alignItems: 'center', position: 'absolute', right: 10, gap: 10 },
  publishButton: { backgroundColor: '#1a237e', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, marginLeft: 10 },
  publishButtonDisabled: { backgroundColor: '#a5a5a5' },
  publishButtonText: { color: '#fff', fontWeight: '600' },
  contentContainer: { flex: 1, padding: 16 },
  titleInput: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#000', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12 },
  contentInput: { 
    fontSize: 16, 
    lineHeight: 24, 
    color: '#333', 
    minHeight: 300, 
    borderWidth: 1, 
    borderColor: '#e0e0e0', 
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
  titleInput: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 0, 
    color: '#000', 
    borderWidth: 1, 
    borderColor: '#e0e0e0', 
    borderBottomWidth: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 12,
    position: 'relative',
    zIndex: 1, // Lower z-index to be behind the editor
    backgroundColor: '#f8f9fa' // Lighter background to indicate it's behind
  },
  genreContainer: { marginBottom: 20, flexDirection: 'row', alignItems: 'center' },
  genreLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginRight: 10 },
  genreOptions: { flexDirection: 'row', flexWrap: 'nowrap', flexShrink: 1, overflow: 'hidden' },
  genreButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 10 },
  genreButtonSelected: { backgroundColor: '#1a237e' },
  genreButtonText: { color: '#333' },
  genreButtonTextSelected: { color: '#fff' },
  mediaLabel: { fontSize: 14, color: '#666', marginBottom: 8, fontStyle: 'italic' },
  
  // Crop Modal Styles
  cropModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  cropModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  cropModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cropImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  cropImage: {
    maxWidth: '90%',
    maxHeight: '70vh',
    objectFit: 'contain',
  },
  cropModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    gap: 12,
  },
  cropCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropCancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  cropConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropConfirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  mediaItem: { width: '48%', marginRight: '4%', marginBottom: 16, position: 'relative' },
  mediaImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: 8, backgroundColor: '#f5f5f5' },
  documentItem: { width: '100%', height: 120, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: '#f9f9f9' },
  documentName: { marginTop: 8, fontSize: 12, color: '#666', textAlign: 'center' },
  removeMediaButton: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 15, padding: 2 },
  footer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' },
  footerButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12 },
  footerButtonText: { marginLeft: 8, color: '#1a237e', fontWeight: '500' },
  // Editor styles
  editorContainer: { 
    borderWidth: 1, 
    borderColor: '#e0e0e0', 
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
    borderTopColor: '#e0e0e0',
    position: 'relative',

  },
  editorPlaceholder: { 
    minHeight: 300, 
    borderWidth: 1, 
    borderColor: '#e0e0e0', 
    borderRadius: 8, 
    backgroundColor: '#f9f9f9' 
  },
  // Web Editor Toolbar Styles
  webToolbar: {
    position: 'relative',
    zIndex: 2,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
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
  publishModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  publishModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  publishHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  publishHeaderText: {
    flex: 1,
  },
  publishModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  publishModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  publishCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  publishModalBody: {
    padding: 24,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  toggleTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1D5DB',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#10B981',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  publishModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  publishCancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  publishCancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  publishConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1a237e',
    shadowColor: '#1a237e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  publishConfirmButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  completionModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '90%',
    maxWidth: 500,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  completionIconContainer: {
    marginBottom: 24,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  completionMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  completionActions: {
    width: '100%',
    gap: 12,
  },
  completionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  completionButtonPrimary: {
    backgroundColor: '#1a237e',
    borderColor: '#1a237e',
  },
  completionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a237e',
  },
  completionButtonTextPrimary: {
    color: '#fff',
  },
});