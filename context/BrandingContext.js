import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { Platform } from 'react-native';
import apiClient, { API_URL } from '../utils/api';

// Define fallback assets using platform-specific paths
const FALLBACK_LOGO_URL = require('../assets/images/fish.jpg');
const FALLBACK_BACKGROUND_URL = "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?q=80&w=2070";

// 1. Create the context with a default shape
const BrandingContext = createContext({
  logoUrl: FALLBACK_LOGO_URL,
  backgroundUrl: FALLBACK_BACKGROUND_URL,
  colors: {},
  typography: {},
  pages: {},
  loading: true,
  refreshBranding: () => {},
});

// 2. Create a custom hook for easy consumption of the context
export const useBranding = () => useContext(BrandingContext);

// 3. Create the Provider component
export const BrandingProvider = ({ children }) => {
  const [logoUrl, setLogoUrl] = useState(FALLBACK_LOGO_URL);
  const [backgroundUrl, setBackgroundUrl] = useState(FALLBACK_BACKGROUND_URL);
  const [colors, setColors] = useState({
    primary: '#1a237e',
    secondary: '#303F9F',
    tertiary: '#3949ab',
    accent: '#10B981',
    background: '#FFFFFF',
    text_primary: '#111827',
    text_secondary: '#6B7280',
  });
  const [typography, setTypography] = useState({
    primary_font: 'Inter, sans-serif',
    secondary_font: 'Roboto, sans-serif',
    heading_font: 'Poppins, sans-serif',
  });
  const [pages, setPages] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchBranding = useCallback(async () => {
    setLoading(true);
    console.log('[BrandingContext] Fetching branding... Attempting to use API_URL:', process.env.EXPO_PUBLIC_API_URL);
    try {
      const response = await apiClient.get('/branding');
      const { logo_url, background_url, colors: brandColors, typography: brandTypography, pages: brandPages } = response.data;
      console.log('[BrandingContext] Branding data fetched successfully:', response.data);

      // If the fetched URL is valid, use it; otherwise, stick with the fallback.
      const finalLogoUrl = logo_url
        ? { uri: logo_url }
        : FALLBACK_LOGO_URL;
      const finalBackgroundUrl = background_url
        ? { uri: background_url }
        : { uri: FALLBACK_BACKGROUND_URL };

      console.log('[BrandingContext] Setting final image URLs:', { finalLogoUrl, finalBackgroundUrl });
      setLogoUrl(finalLogoUrl);
      setBackgroundUrl(finalBackgroundUrl);
      
      // Set colors, typography, and pages
      if (brandColors) setColors(brandColors);
      if (brandTypography) setTypography(brandTypography);
      if (brandPages) setPages(brandPages);
      
      console.log('[BrandingContext] Branding fully loaded:', { colors: brandColors, typography: brandTypography, pages: brandPages });
    } catch (error) {
      console.error('[BrandingContext] CRITICAL: Failed to fetch branding. Full error object:', error);
      if (error.response) {
        console.error('[BrandingContext] Error response from server:', error.response.data);
      } else if (error.request) {
        console.error('[BrandingContext] The request was made but no response was received. This could be a network error, CORS issue, or the backend is down.');
      } else {
        console.error('[BrandingContext] Error setting up the request:', error.message);
      }
      console.log('[BrandingContext] Reverting to local fallback assets.');
      setLogoUrl(FALLBACK_LOGO_URL);
      setBackgroundUrl({ uri: FALLBACK_BACKGROUND_URL });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const refreshBranding = useCallback(() => {
    fetchBranding().finally(() => setLoading(false));
  }, [fetchBranding]);

  return (
    <BrandingContext.Provider value={{ 
      logoUrl, 
      backgroundUrl, 
      colors, 
      typography, 
      pages, 
      fetchBranding, 
      loading, 
      refreshBranding 
    }}>
      {children}
    </BrandingContext.Provider>
  );
};