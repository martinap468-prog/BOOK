import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${API_URL}/api`;

// Book API
export const bookApi = {
  getAll: async () => {
    const response = await axios.get(`${API}/books`);
    return response.data;
  },

  getOne: async (bookId) => {
    const response = await axios.get(`${API}/books/${bookId}`);
    return response.data;
  },

  create: async (bookData) => {
    const response = await axios.post(`${API}/books`, bookData);
    return response.data;
  },

  update: async (bookId, updateData) => {
    const response = await axios.put(`${API}/books/${bookId}`, updateData);
    return response.data;
  },

  delete: async (bookId) => {
    const response = await axios.delete(`${API}/books/${bookId}`);
    return response.data;
  }
};

// Exercise Types
export const getExerciseTypes = async () => {
  const response = await axios.get(`${API}/exercise-types`);
  return response.data;
};

// Generation API
export const generateApi = {
  exercise: async (exerciseType, difficulty = 'medium', quantity = 1, colorMode = 'bw', topic = null) => {
    const response = await axios.post(`${API}/generate/exercise`, {
      exercise_type: exerciseType,
      difficulty,
      quantity,
      color_mode: colorMode,
      topic
    });
    return response.data;
  },

  chapter: async (chapterTitle, exerciseType, difficulty = 'medium', exerciseCount = 5, colorMode = 'bw') => {
    const response = await axios.post(`${API}/generate/chapter`, {
      chapter_title: chapterTitle,
      exercise_type: exerciseType,
      difficulty,
      exercise_count: exerciseCount,
      color_mode: colorMode
    });
    return response.data;
  },

  image: async (exerciseType, colorMode = 'bw', topic = null) => {
    const response = await axios.post(`${API}/generate/image`, {
      exercise_type: exerciseType,
      color_mode: colorMode,
      topic
    }, { timeout: 120000 }); // 2 minute timeout for image generation
    return response.data;
  },

  customImage: async (prompt, colorMode = 'bw') => {
    const response = await axios.post(`${API}/generate/custom-image`, {
      prompt,
      color_mode: colorMode
    }, { timeout: 120000 });
    return response.data;
  },

  cover: async (title, style = 'simple') => {
    const response = await axios.post(`${API}/generate/cover?title=${encodeURIComponent(title)}&style=${style}`);
    return response.data;
  }
};

export default { bookApi, generateApi, getExerciseTypes };
