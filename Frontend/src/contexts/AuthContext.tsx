import React, { createContext, useState, useContext, useEffect, useCallback, type ReactNode } from 'react';
import { setupAxiosInterceptors } from '../api/axiosConfig';

// --- Interfaces ---
interface User {
  id: number;
  username: string;
  role: 'user' | 'admin' | 'owner';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

// --- Context Definition ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- AuthProvider Component ---
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }, []);

    useEffect(() => { 
        setupAxiosInterceptors(logout);
    }, [logout]);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            const storedToken = localStorage.getItem('token');
            
            if (storedUser && storedToken) {
                setUser(JSON.parse(storedUser));
                setToken(storedToken);
            }
        } catch (error) {
            console.error("Failed to parse user from localStorage", error);
            logout(); // ถ้ามีปัญหา ให้ logout ทันที
        } finally {
            setIsLoading(false); 
        }
    }, [logout]);

    const login = (userData: User, tokenData: string) => {
        setUser(userData);
        setToken(tokenData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', tokenData);
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">กำลังโหลดแอปพลิเคชัน...</div>;
    }

    const value = { user, token, login, logout, isLoading };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// --- Custom Hook to use the AuthContext ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};