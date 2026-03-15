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

// Chapter API
export const chapterApi = {
  add: async (bookId, chapter) => {
    const response = await axios.post(`${API}/books/${bookId}/chapters`, chapter);
    return response.data;
  },

  update: async (bookId, chapterId, updateData) => {
    const response = await axios.put(`${API}/books/${bookId}/chapters/${chapterId}`, updateData);
    return response.data;
  },

  delete: async (bookId, chapterId) => {
    const response = await axios.delete(`${API}/books/${bookId}/chapters/${chapterId}`);
    return response.data;
  }
};

// AI Generation API
export const generateApi = {
  outline: async (topic, chapterCount = 5, style = 'informativo') => {
    const response = await axios.post(`${API}/generate/outline`, {
      topic,
      chapter_count: chapterCount,
      style,
      language: 'italiano'
    });
    return response.data;
  },

  content: async (topic, chapterTitle, wordCount = 500, style = 'informativo') => {
    const response = await axios.post(`${API}/generate/content`, {
      topic,
      chapter_title: chapterTitle,
      word_count: wordCount,
      style,
      language: 'italiano'
    });
    return response.data;
  },

  image: async (prompt, style = 'realistic') => {
    const response = await axios.post(`${API}/generate/image`, {
      prompt,
      style,
      size: '1024x1024'
    });
    return response.data;
  },

  cover: async (title, author, topic, style = 'modern') => {
    const response = await axios.post(`${API}/generate/cover`, {
      title,
      author,
      topic,
      style
    });
    return response.data;
  }
};

export default { bookApi, chapterApi, generateApi };
