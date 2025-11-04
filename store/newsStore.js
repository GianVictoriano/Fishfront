import { create } from 'zustand';

const useNewsStore = create((set) => ({
  activeGenre: 'News',
  setActiveGenre: (genre) => set({ activeGenre: genre }),
}));

export default useNewsStore;
