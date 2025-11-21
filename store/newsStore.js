import { create } from 'zustand';

// Helper function to get initial activeGenre from storage
const getInitialActiveGenre = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('activeGenre');
      return stored || 'News';
    }
  } catch (error) {
    console.log('Error reading activeGenre from storage:', error);
  }
  return 'News';
};

// Create the store
const useNewsStore = create((set) => ({
  activeGenre: getInitialActiveGenre(), // Initialize with persisted value
  setActiveGenre: (genre) => {
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
