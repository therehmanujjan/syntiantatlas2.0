import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyToken: () => api.get('/auth/verify-token'),
  logout: () => api.post('/auth/logout'),
};

export const userApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  getWallet: () => api.get('/users/wallet'),
};

export const propertyApi = {
  getAll: (filters) => api.get('/properties', { params: filters }),
  getById: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  getSellerProperties: () => api.get('/properties/seller/my-properties'),
};

export const investmentApi = {
  invest: (data) => api.post('/investments', data),
  getPortfolio: () => api.get('/investments/portfolio'),
  getPropertyInvestors: (propertyId) => api.get(`/investments/${propertyId}/investors`),
};

export const transactionApi = {
  deposit: (data) => api.post('/transactions/deposit', data),
  withdraw: (data) => api.post('/transactions/withdraw', data),
  getHistory: () => api.get('/transactions/history'),
};

export default api;
