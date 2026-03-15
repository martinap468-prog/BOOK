import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const defaultSettings = {
  page_count: 50,
  chapter_count: 5,
  color_mode: 'color',
  format: '6x9',
  font_family: 'Crimson Pro',
  font_size: 12,
  line_height: 1.6
};

const useBookStore = create(
  persist(
    (set, get) => ({
      // Current book state
      currentBook: null,
      books: [],
      selectedChapterIndex: 0,
      isLoading: false,
      isSaving: false,
      error: null,

      // Actions
      setCurrentBook: (book) => set({ currentBook: book, selectedChapterIndex: 0 }),
      
      setBooks: (books) => set({ books }),
      
      addBook: (book) => set((state) => ({ 
        books: [...state.books, book] 
      })),
      
      updateBook: (bookId, updates) => set((state) => ({
        books: state.books.map(b => b.id === bookId ? { ...b, ...updates } : b),
        currentBook: state.currentBook?.id === bookId 
          ? { ...state.currentBook, ...updates } 
          : state.currentBook
      })),
      
      removeBook: (bookId) => set((state) => ({
        books: state.books.filter(b => b.id !== bookId),
        currentBook: state.currentBook?.id === bookId ? null : state.currentBook
      })),

      selectChapter: (index) => set({ selectedChapterIndex: index }),
      
      updateChapter: (chapterIndex, updates) => set((state) => {
        if (!state.currentBook) return state;
        const chapters = [...state.currentBook.chapters];
        chapters[chapterIndex] = { ...chapters[chapterIndex], ...updates };
        return {
          currentBook: { ...state.currentBook, chapters }
        };
      }),
      
      addChapter: (chapter) => set((state) => {
        if (!state.currentBook) return state;
        const newChapter = {
          id: crypto.randomUUID(),
          title: chapter.title || `Capitolo ${state.currentBook.chapters.length + 1}`,
          content: chapter.content || '',
          order: state.currentBook.chapters.length,
          images: []
        };
        return {
          currentBook: {
            ...state.currentBook,
            chapters: [...state.currentBook.chapters, newChapter]
          }
        };
      }),
      
      removeChapter: (chapterIndex) => set((state) => {
        if (!state.currentBook) return state;
        const chapters = state.currentBook.chapters.filter((_, i) => i !== chapterIndex);
        return {
          currentBook: { ...state.currentBook, chapters },
          selectedChapterIndex: Math.min(state.selectedChapterIndex, chapters.length - 1)
        };
      }),
      
      reorderChapters: (newOrder) => set((state) => {
        if (!state.currentBook) return state;
        return {
          currentBook: { ...state.currentBook, chapters: newOrder }
        };
      }),

      updateSettings: (settings) => set((state) => {
        if (!state.currentBook) return state;
        return {
          currentBook: {
            ...state.currentBook,
            settings: { ...state.currentBook.settings, ...settings }
          }
        };
      }),

      setCoverImage: (imageBase64) => set((state) => {
        if (!state.currentBook) return state;
        return {
          currentBook: { ...state.currentBook, cover_image: imageBase64 }
        };
      }),

      setLoading: (isLoading) => set({ isLoading }),
      setSaving: (isSaving) => set({ isSaving }),
      setError: (error) => set({ error }),

      // Get current chapter
      getCurrentChapter: () => {
        const state = get();
        if (!state.currentBook || !state.currentBook.chapters.length) return null;
        return state.currentBook.chapters[state.selectedChapterIndex];
      },

      // Reset store
      reset: () => set({
        currentBook: null,
        selectedChapterIndex: 0,
        isLoading: false,
        isSaving: false,
        error: null
      })
    }),
    {
      name: 'book-creator-storage',
      partialize: (state) => ({
        books: state.books,
        currentBook: state.currentBook
      })
    }
  )
);

export default useBookStore;
export { defaultSettings };
