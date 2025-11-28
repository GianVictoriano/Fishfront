import { create } from 'zustand';

// Create the store without localStorage persistence for initial load
// This allows URL parameters to take precedence
const useNewsStore = create((set) => ({
  activeGenre: 'News', // Default to 'News' without reading from cache
  setActiveGenre: (genre) => {
    console.log('🗂️ Store - Setting activeGenre to:', genre);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('activeGenre', genre);
      }
    } catch (error) {
      console.log('Error saving activeGenre to storage:', error);
    }
    set({ activeGenre: genre });
  },
}));

export default useNewsStore;
