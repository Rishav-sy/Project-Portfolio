import React, { createContext, useState, useContext, useEffect } from 'react';
import { authUtils } from '../utils/authUtils';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = authUtils.getToken();
      const savedUser = authUtils.getUser();
      
      console.log('Init auth - Token:', token, 'User:', savedUser);
      
      if (token && savedUser) {
        setUser(savedUser);
      }
      setLoading(false);
    };
    
    initAuth();
  }, []);

  const login = (token, userData) => {
    console.log('Login called with:', token, userData);
    authUtils.setToken(token);
    authUtils.setUser(userData);
    setUser(userData);
  };

  const logout = () => {
    authUtils.logout();
    setUser(null);
    window.location.href = '/auth';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
