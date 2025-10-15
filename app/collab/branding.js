
import React, { useState, useEffect } from 'react';
import { View, Text, Button, Image, StyleSheet, ActivityIndicator, Alert, Platform, TouchableOpacity, TextInput, ScrollView, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useBranding } from '~/context/BrandingContext';
import { useAuth } from '~/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import ColorPicker from 'react-native-wheel-color-picker';
import apiClient from '../../utils/api';

export default function BrandingManagementScreen() {
  const { logoUrl, backgroundUrl, refreshBranding } = useBranding();
  const { token } = useAuth(); // Get auth token
  const [newLogo, setNewLogo] = useState(null);
  const [newBackground, setNewBackground] = useState(null);
  const [loading, setLoading] = useState(false);
  const [brandingData, setBrandingData] = useState(null);
  const [colors, setColors] = useState({});
  const [typography, setTypography] = useState({});
  const [selectedPage, setSelectedPage] = useState('home');
  const [pageSettings, setPageSettings] = useState({});
  const [activeTab, setActiveTab] = useState('images'); // 'images', 'colors', 'fonts', 'pages'
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [currentColorKey, setCurrentColorKey] = useState(null);
  const [currentColorValue, setCurrentColorValue] = useState('#000000');
  const [fontDropdownVisible, setFontDropdownVisible] = useState(false);
  const [currentFontKey, setCurrentFontKey] = useState(null);

  const fontOptions = [
    'System',
    'Inter, sans-serif',
    'Roboto, sans-serif',
    'Poppins, sans-serif',
    'Open Sans, sans-serif',
    'Lato, sans-serif',
    'Montserrat, sans-serif',
    'Raleway, sans-serif',
    'Playfair Display, serif',
    'Merriweather, serif',
    'Georgia, serif',
    'Times New Roman, serif',
  ];

  // Fetch branding data
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await apiClient.get('/branding');
        setBrandingData(response.data);
        setColors(response.data.colors || {});
        setTypography(response.data.typography || {});
        setPageSettings(response.data.pages?.[selectedPage] || {});
      } catch (error) {
        console.error('Failed to fetch branding:', error);
      }
    };
    fetchBranding();
  }, []);

  // Update page settings when selected page changes
  useEffect(() => {
    const defaultPageSettings = {
      home: {
        background_color: '#FFFFFF',
        hero_background: '#1a237e',
        button_color: '#1a237e',
      },
      news: {
        background_color: '#FFFFFF',
        header_background: '#1a237e',
        card_background: '#FFFFFF',
      },
      collaborate: {
        background_color: '#F9FAFB',
        sidebar_background: '#FFFFFF',
        message_bubble_sent: '#1a237e',
      },
      profile: {
        background_color: '#FFFFFF',
        header_background: '#1a237e',
        card_background: '#F9FAFB',
      },
      forum: {
        background_color: '#FFFFFF',
        header_background: '#1a237e',
        post_background: '#F9FAFB',
      },
    };

    if (brandingData?.pages?.[selectedPage]) {
      setPageSettings(brandingData.pages[selectedPage]);
    } else {
      // Use default settings if page data doesn't exist
      setPageSettings(defaultPageSettings[selectedPage] || {});
    }
  }, [selectedPage, brandingData]);

  // Request permissions on component mount for non-web platforms
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        }
      }
    })();
  }, []);

  const pickImage = async (type) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'Images',
      allowsEditing: true,
      aspect: type === 'logo' ? [1, 1] : [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      if (type === 'logo') {
        setNewLogo(result.assets[0]);
      } else {
        setNewBackground(result.assets[0]);
      }
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const payload = {};
      
      if (activeTab === 'colors') {
        payload.colors = colors;
      } else if (activeTab === 'fonts') {
        payload.typography = typography;
      } else if (activeTab === 'pages') {
        payload.pages = {
          [selectedPage]: pageSettings
        };
      }

      await apiClient.post('/branding', payload);
      Alert.alert('Success', 'Branding settings saved successfully!');
      
      // Refresh branding data
      const response = await apiClient.get('/branding');
      setBrandingData(response.data);
      setColors(response.data.colors || {});
      setTypography(response.data.typography || {});
      refreshBranding();
    } catch (error) {
      console.error('Save Error:', error);
      Alert.alert('Save Failed', 'Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefault = () => {
    Alert.alert(
      'Reset to Default',
      'Are you sure you want to reset all branding settings to default? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              console.log('Calling reset endpoint...');
              // Call backend reset endpoint
              const response = await apiClient.post('/branding/reset');
              console.log('Reset response:', response.data);
              const defaultBranding = response.data.branding;
              
              setColors(defaultBranding.colors);
              setTypography(defaultBranding.typography);
              setBrandingData(defaultBranding);
              setPageSettings(defaultBranding.pages[selectedPage] || {});
              
              Alert.alert('Success', 'Branding reset to default successfully!');
              
              // Refresh branding context
              refreshBranding();
              
              // Force reload branding data
              const freshData = await apiClient.get('/branding');
              console.log('Fresh branding data:', freshData.data);
              setBrandingData(freshData.data);
              setColors(freshData.data.colors || {});
              setTypography(freshData.data.typography || {});
            } catch (error) {
              console.error('Reset Error:', error);
              console.error('Error details:', error.response?.data);
              Alert.alert('Reset Failed', error.response?.data?.message || 'Failed to reset branding. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleUpload = async () => {
    if (!newLogo && !newBackground) {
      Alert.alert('No Image Selected', 'Please select a logo or background to upload.');
      return;
    }

    setLoading(true);

    const formData = new FormData();

    // Handle file uploads differently for web vs. native
    if (newLogo) {
      if (Platform.OS === 'web') {
        const response = await fetch(newLogo.uri);
        const blob = await response.blob();
        formData.append('logo', blob, `logo.${blob.type.split('/')[1]}`);
      } else {
        const uriParts = newLogo.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('logo', {
          uri: newLogo.uri,
          name: `logo.${fileType}`,
          type: `image/${fileType}`,
        });
      }
    }

    if (newBackground) {
      if (Platform.OS === 'web') {
        const response = await fetch(newBackground.uri);
        const blob = await response.blob();
        formData.append('background', blob, `background.${blob.type.split('/')[1]}`);
      } else {
        const uriParts = newBackground.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('background', {
          uri: newBackground.uri,
          name: `background.${fileType}`,
          type: `image/${fileType}`,
        });
      }
    }

    try {
      // By using apiClient, the base URL and Authorization header are already configured.
      await apiClient.post('/branding', formData, {
        headers: {
          // The Content-Type header is crucial for file uploads.
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'Branding has been updated successfully!');
      setNewLogo(null);
      setNewBackground(null);
      refreshBranding(); // Refresh context to show new images
    } catch (error) {
      console.error('Upload Error:', error.response ? error.response.data : error.message);
      Alert.alert('Upload Failed', 'There was an error uploading the images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderImagesTab = () => (
    <>
      <Text style={styles.subtitle}>Update your website's logo and background for a fresh look.</Text>

      <View style={styles.cardRow}>
        {/* Logo Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Logo</Text>
          <Image source={newLogo ? { uri: newLogo.uri } : logoUrl} style={styles.previewImage} />
          <Text style={styles.helperText}>Recommended: Square image, PNG/JPG, 150x150px+</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => pickImage('logo')}>
            <Text style={styles.selectButtonText}>{newLogo ? 'Change Logo' : 'Select Logo'}</Text>
          </TouchableOpacity>
        </View>

        {/* Background Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Background</Text>
          <Image source={newBackground ? { uri: newBackground.uri } : backgroundUrl} style={styles.previewImage} />
          <Text style={styles.helperText}>Recommended: 16:9 image, PNG/JPG, 1280x720px+</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => pickImage('background')}>
            <Text style={styles.selectButtonText}>{newBackground ? 'Change Background' : 'Select Background'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.uploadButtonContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#007BFF" />
        ) : (
          <TouchableOpacity
            style={[styles.uploadButton, (!newLogo && !newBackground) && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={!newLogo && !newBackground}
          >
            <Text style={styles.uploadButtonText}>Upload Images</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const openColorPicker = (key, value) => {
    setCurrentColorKey(key);
    setCurrentColorValue(value);
    setColorPickerVisible(true);
  };

  const handleColorChange = (color) => {
    setCurrentColorValue(color);
  };

  const saveColorFromPicker = () => {
    if (currentColorKey) {
      // Check if we're updating page settings or global colors
      if (activeTab === 'pages') {
        setPageSettings(prev => ({ ...prev, [currentColorKey]: currentColorValue }));
      } else {
        setColors(prev => ({ ...prev, [currentColorKey]: currentColorValue }));
      }
    }
    setColorPickerVisible(false);
  };

  const renderColorsTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.subtitle}>Customize your application's color palette</Text>
      <View style={styles.settingsGrid}>
        {Object.entries(colors).map(([key, value]) => (
          <View key={key} style={styles.settingItem}>
            <Text style={styles.settingLabel}>{key.replace(/_/g, ' ')}</Text>
            <TouchableOpacity 
              style={styles.colorInputContainer}
              onPress={() => openColorPicker(key, value)}
            >
              <View style={[styles.colorPreview, { backgroundColor: value }]} />
              <View style={styles.colorInputDisplay}>
                <Text style={styles.colorInputText}>{value}</Text>
                <Feather name="edit-2" size={16} color="#666" />
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings} disabled={loading}>
        <Feather name="save" size={18} color="#fff" />
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Colors'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const openFontDropdown = (key) => {
    setCurrentFontKey(key);
    setFontDropdownVisible(true);
  };

  const selectFont = (font) => {
    if (currentFontKey) {
      setTypography(prev => ({ ...prev, [currentFontKey]: font }));
    }
    setFontDropdownVisible(false);
  };

  const renderFontsTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.subtitle}>Customize your application's typography</Text>
      <View style={styles.settingsGrid}>
        {Object.entries(typography).map(([key, value]) => (
          <View key={key} style={styles.settingItem}>
            <Text style={styles.settingLabel}>{key.replace(/_/g, ' ')}</Text>
            <TouchableOpacity 
              style={styles.fontDropdownButton}
              onPress={() => openFontDropdown(key)}
            >
              <Text style={styles.fontDropdownText}>{value || 'Select font'}</Text>
              <Feather name="chevron-down" size={18} color="#666" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings} disabled={loading}>
        <Feather name="save" size={18} color="#fff" />
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Fonts'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderPagesTab = () => {
    const pages = ['home', 'news', 'collaborate', 'profile', 'forum'];
    
    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.subtitle}>Customize page-specific colors and settings</Text>
        
        <View style={styles.pageSelector}>
          {pages.map(page => (
            <TouchableOpacity
              key={page}
              style={[styles.pageTab, selectedPage === page && styles.pageTabActive]}
              onPress={() => setSelectedPage(page)}
            >
              <Text style={[styles.pageTabText, selectedPage === page && styles.pageTabTextActive]}>
                {page.charAt(0).toUpperCase() + page.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.settingsGrid}>
          {Object.entries(pageSettings).map(([key, value]) => (
            <View key={key} style={styles.settingItem}>
              <Text style={styles.settingLabel}>{key.replace(/_/g, ' ')}</Text>
              <TouchableOpacity 
                style={styles.colorInputContainer}
                onPress={() => {
                  setCurrentColorKey(key);
                  setCurrentColorValue(value);
                  setColorPickerVisible(true);
                }}
              >
                <View style={[styles.colorPreview, { backgroundColor: value }]} />
                <View style={styles.colorInputDisplay}>
                  <Text style={styles.colorInputText}>{value}</Text>
                  <Feather name="edit-2" size={16} color="#666" />
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings} disabled={loading}>
          <Feather name="save" size={18} color="#fff" />
          <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Page Settings'}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.title}>Branding Management</Text>
        </View>
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={handleResetToDefault}
        >
          <Feather name="rotate-ccw" size={18} color="#EF4444" />
          <Text style={styles.resetButtonText}>Reset to Default</Text>
        </TouchableOpacity>
      </View>
      
      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'images' && styles.tabActive]}
          onPress={() => setActiveTab('images')}
        >
          <Feather name="image" size={18} color={activeTab === 'images' ? '#3182ce' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'images' && styles.tabTextActive]}>Images</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'colors' && styles.tabActive]}
          onPress={() => setActiveTab('colors')}
        >
          <Feather name="droplet" size={18} color={activeTab === 'colors' ? '#3182ce' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'colors' && styles.tabTextActive]}>Colors</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'fonts' && styles.tabActive]}
          onPress={() => setActiveTab('fonts')}
        >
          <Feather name="type" size={18} color={activeTab === 'fonts' ? '#3182ce' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'fonts' && styles.tabTextActive]}>Fonts</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pages' && styles.tabActive]}
          onPress={() => setActiveTab('pages')}
        >
          <Feather name="file-text" size={18} color={activeTab === 'pages' ? '#3182ce' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'pages' && styles.tabTextActive]}>Pages</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'images' && renderImagesTab()}
      {activeTab === 'colors' && renderColorsTab()}
      {activeTab === 'fonts' && renderFontsTab()}
      {activeTab === 'pages' && renderPagesTab()}

      {/* Color Picker Modal - Available for all tabs */}
      <Modal
        visible={colorPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setColorPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.colorPickerModal}>
            <Text style={styles.modalTitle}>Select Color</Text>
            <Text style={styles.modalSubtitle}>{currentColorKey?.replace(/_/g, ' ')}</Text>
            
            <View style={styles.colorPickerContainer}>
              <ColorPicker
                color={currentColorValue}
                onColorChange={handleColorChange}
                thumbSize={30}
                sliderSize={30}
                noSnap={true}
                row={false}
              />
            </View>

            <View style={styles.colorPreviewLarge}>
              <View style={[styles.colorPreviewBox, { backgroundColor: currentColorValue }]} />
              <Text style={styles.colorValueText}>{currentColorValue}</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setColorPickerVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={saveColorFromPicker}
              >
                <Text style={styles.modalSaveText}>Apply Color</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Font Dropdown Modal - Available for all tabs */}
      <Modal
        visible={fontDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFontDropdownVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFontDropdownVisible(false)}
        >
          <View style={styles.fontDropdownModal}>
            <Text style={styles.modalTitle}>Select Font</Text>
            <ScrollView style={styles.fontList}>
              {fontOptions.map((font) => (
                <TouchableOpacity
                  key={font}
                  style={styles.fontOption}
                  onPress={() => {
                    if (currentFontKey) {
                      setTypography(prev => ({ ...prev, [currentFontKey]: font }));
                    }
                    setFontDropdownVisible(false);
                  }}
                >
                  <Text style={[styles.fontOptionText, { fontFamily: font.split(',')[0] }]}>
                    {font}
                  </Text>
                  {typography[currentFontKey] === font && (
                    <Feather name="check" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 28,
  },
  cardRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 32,
    marginBottom: 28,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: Platform.OS === 'web' ? 12 : 0,
    marginBottom: Platform.OS === 'web' ? 0 : 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    minWidth: 240,
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#f1f1f1',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#222',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    marginBottom: 12,
    backgroundColor: '#f8f8f8',
    resizeMode: 'cover',
  },
  helperText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
    textAlign: 'center',
  },
  selectButton: {
    backgroundColor: '#edf2fa',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginTop: 2,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#90cdf4',
  },
  selectButtonText: {
    color: '#2b6cb0',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  uploadButtonContainer: {
    marginTop: 18,
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: '#3182ce',
    paddingVertical: 13,
    paddingHorizontal: 32,
    borderRadius: 9,
    alignItems: 'center',
    width: 220,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  uploadButtonDisabled: {
    backgroundColor: '#b8c2cc',
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#edf2fa',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#3182ce',
  },
  tabContent: {
    flex: 1,
  },
  settingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  settingItem: {
    width: Platform.OS === 'web' ? '48%' : '100%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e2e2',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  colorInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#fff',
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e2e2',
  },
  colorInputDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  colorInputText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#2d3748',
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3182ce',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 16,
    marginBottom: 24,
    alignSelf: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  pageSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  pageTab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  pageTabActive: {
    backgroundColor: '#edf2fa',
    borderColor: '#3182ce',
  },
  pageTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  pageTabTextActive: {
    color: '#3182ce',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  colorPickerModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  colorPickerContainer: {
    height: 300,
    marginBottom: 20,
  },
  colorPreviewLarge: {
    alignItems: 'center',
    marginBottom: 20,
  },
  colorPreviewBox: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e2e2',
    marginBottom: 12,
  },
  colorValueText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#2d3748',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#3182ce',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Font dropdown styles
  fontDropdownModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  fontList: {
    maxHeight: 400,
  },
  fontOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  fontOptionSelected: {
    backgroundColor: '#edf2fa',
  },
  fontOptionText: {
    fontSize: 16,
    color: '#2d3748',
  },
  fontDropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  fontDropdownText: {
    fontSize: 14,
    color: '#2d3748',
    flex: 1,
  },
});
