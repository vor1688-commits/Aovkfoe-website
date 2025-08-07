// src/api/axiosConfig.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL_FRONTEND || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
});
 
export const setupAxiosInterceptors = (logoutUser: () => void) => {
   
  api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
 
  api.interceptors.response.use(
    (response) => response,  
    (error) => { 
      if (error.response && (error.response.status === 401 || error.response.status === 403)) { 
        console.log('Session expired or invalid, logging out...');
        logoutUser();

        window.location.href = '/login'; 
      }
      return Promise.reject(error);
    }
  );
};

export default api;