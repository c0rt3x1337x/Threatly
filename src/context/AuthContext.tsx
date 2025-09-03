import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { User, AuthContextType, LoginResponse, RegisterResponse } from '../types/User';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
axios.defaults.withCredentials = true;

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      console.log('Checking authentication...');
      const response = await axios.get('/auth/me');
      console.log('Auth check response:', response.data);
      setUser(response.data.user);
      setError(null);
    } catch (error) {
      console.log('Auth check failed:', error);
      setUser(null);
      setError(null); // Don't set error for failed auth check
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post<LoginResponse>('/auth/login', {
        email,
        password
      });
      
      setUser(response.data.user);
    } catch (error: any) {
      // Handle different error response formats
      let errorMessage = 'Login failed';
      
      if (error.response?.data) {
        // Backend returns { success: false, message: "..." }
        errorMessage = error.response.data.message || error.response.data.error || 'Login failed';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post<RegisterResponse>('/auth/register', {
        email,
        password,
        firstName,
        lastName
      });
      
      // Don't set user on registration since they need approval
      setUser(null);
    } catch (error: any) {
      // Handle different error response formats
      let errorMessage = 'Registration failed';
      
      if (error.response?.data) {
        // Backend returns { success: false, message: "..." }
        errorMessage = error.response.data.message || error.response.data.error || 'Registration failed';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors
    } finally {
      setUser(null);
      setError(null);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
