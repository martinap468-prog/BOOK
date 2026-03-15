import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const defaultSettings = {
  format: '8.5x11',
  color_mode: 'bw',
  font_size: 18,
  exercises_per_page: 1,
  difficulty: 'medium',
  include_solutions: true
};

const useBookStore = create(
  persist(
    (set, get) => ({
      currentBook: null,
      books: [],
      selectedChapterIndex: 0,
      selectedExerciseIndex: 0,
      isLoading: false,
      isSaving: false,
      error: null,

      setCurrentBook: (book) => set({ currentBook: book, selectedChapterIndex: 0, selectedExerciseIndex: 0 }),
      
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

      // Chapter management
      selectChapter: (index) => set({ selectedChapterIndex: index, selectedExerciseIndex: 0 }),
      
      addChapter: (chapter) => set((state) => {
        if (!state.currentBook) return state;
        const newChapter = {
          id: crypto.randomUUID(),
          title: chapter.title || `Capitolo ${state.currentBook.chapters.length + 1}`,
          description: chapter.description || '',
          exercise_type: chapter.exercise_type || 'mixed',
          exercises: chapter.exercises || [],
          order: state.currentBook.chapters.length
        };
        return {
          currentBook: {
            ...state.currentBook,
            chapters: [...state.currentBook.chapters, newChapter]
          }
        };
      }),
      
      updateChapter: (chapterIndex, updates) => set((state) => {
        if (!state.currentBook) return state;
        const chapters = [...state.currentBook.chapters];
        chapters[chapterIndex] = { ...chapters[chapterIndex], ...updates };
        return {
          currentBook: { ...state.currentBook, chapters }
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

      // Exercise management
      selectExercise: (index) => set({ selectedExerciseIndex: index }),
      
      addExercise: (chapterIndex, exercise) => set((state) => {
        if (!state.currentBook) return state;
        const chapters = [...state.currentBook.chapters];
        chapters[chapterIndex].exercises = [...chapters[chapterIndex].exercises, exercise];
        return {
          currentBook: { ...state.currentBook, chapters }
        };
      }),

      addExercises: (chapterIndex, exercises) => set((state) => {
        if (!state.currentBook) return state;
        const chapters = [...state.currentBook.chapters];
        chapters[chapterIndex].exercises = [...chapters[chapterIndex].exercises, ...exercises];
        return {
          currentBook: { ...state.currentBook, chapters }
        };
      }),
      
      updateExercise: (chapterIndex, exerciseIndex, updates) => set((state) => {
        if (!state.currentBook) return state;
        const chapters = [...state.currentBook.chapters];
        chapters[chapterIndex].exercises[exerciseIndex] = {
          ...chapters[chapterIndex].exercises[exerciseIndex],
          ...updates
        };
        return {
          currentBook: { ...state.currentBook, chapters }
        };
      }),
      
      removeExercise: (chapterIndex, exerciseIndex) => set((state) => {
        if (!state.currentBook) return state;
        const chapters = [...state.currentBook.chapters];
        chapters[chapterIndex].exercises = chapters[chapterIndex].exercises.filter((_, i) => i !== exerciseIndex);
        return {
          currentBook: { ...state.currentBook, chapters },
          selectedExerciseIndex: Math.min(state.selectedExerciseIndex, chapters[chapterIndex].exercises.length - 1)
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

      getCurrentChapter: () => {
        const state = get();
        if (!state.currentBook || !state.currentBook.chapters.length) return null;
        return state.currentBook.chapters[state.selectedChapterIndex];
      },

      getCurrentExercise: () => {
        const state = get();
        const chapter = state.currentBook?.chapters?.[state.selectedChapterIndex];
        if (!chapter || !chapter.exercises.length) return null;
        return chapter.exercises[state.selectedExerciseIndex];
      },

      reset: () => set({
        currentBook: null,
        selectedChapterIndex: 0,
        selectedExerciseIndex: 0,
        isLoading: false,
        isSaving: false,
        error: null
      })
    }),
    {
      name: 'cognitive-exercises-storage',
      partialize: (state) => ({
        books: state.books,
        currentBook: state.currentBook
      })
    }
  )
);

export default useBookStore;
export { defaultSettings };
