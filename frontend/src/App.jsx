import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './components/theme-provider';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Auth from './pages/Auth/Auth';
import Home from './pages/Home/Home';
import Stocks from './pages/Stocks/Stocks';
import RealEstate from './pages/RealEstate/RealEstate';
import Navbar from './components/Navbar/Navbar';
import './index.css';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="min-h-screen">
                  <Navbar />
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/stocks" element={<Stocks />} />
                    <Route path="/real-estate" element={<RealEstate />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
