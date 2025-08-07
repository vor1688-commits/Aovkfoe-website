// src/pages/LoginPage.tsx

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

const API_URL = import.meta.env.VITE_API_URL_FRONTEND || 'http://localhost:3001';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  const from = location.state?.from?.pathname || "/";
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('กรุณากรอก Username และ Password');
      return;
    }

    setIsLoading(true);
    setError('');

        try {
        setIsLoading(true);
        setError('');
 
        const response = await api.post('/api/login', { username, password });
        
        console.log('Login successful, data from Backend:', response.data); 
        
        if (response.data.user && response.data.token) {
          auth.login(response.data.user, response.data.token); 
          navigate(from, { replace: true });
        } else { 
          throw new Error("ข้อมูลที่ได้รับจากเซิร์ฟเวอร์ไม่ถูกต้อง");
        }

    } catch (err: any) {
        console.error("Login failed:", err); 
        const errorMessage = err.response?.data?.error || "Username หรือ Password ไม่ถูกต้อง";
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
          เข้าสู่ระบบ
        </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="username" className="block text-gray-700 dark:text-gray-300 mb-2">
                ชื่อผู้ใช้งาน
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-6">
              <label htmlFor="password" className="block text-gray-700 dark:text-gray-300 mb-2">
                รหัสผ่าน
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:bg-gray-400"
            >
              {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }
            </button>
          </form>
      </div>
    </div>
  );
};

export default LoginPage;