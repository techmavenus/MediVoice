import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SystemPrompt from './pages/SystemPrompt';
import Knowledge from './pages/Knowledge';
import API_BASE_URL from './config/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [clinic, setClinic] = useState(JSON.parse(localStorage.getItem('clinic') || 'null'));

  // Debug logging
  console.log('Current token:', token);
  console.log('Current clinic:', clinic);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      // Validate token by making a test API call
      validateToken();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('clinic');
    }
  }, [token]);

  const validateToken = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/assistant/info`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        // Token is invalid, clear it
        console.log('Token invalid, clearing auth state');
        handleLogout();
      }
    } catch (error) {
      console.log('Token validation failed:', error);
      // If backend is down, don't clear token
    }
  };

  const handleLogin = (token, clinicData) => {
    setToken(token);
    setClinic(clinicData);
    localStorage.setItem('token', token);
    localStorage.setItem('clinic', JSON.stringify(clinicData));
  };

  const handleLogout = () => {
    setToken(null);
    setClinic(null);
    localStorage.removeItem('token');
    localStorage.removeItem('clinic');
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route
            path="/"
            element={
              token ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
            }
          />
          <Route
            path="/dashboard"
            element={
              token ? (
                <Dashboard clinic={clinic} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/prompt"
            element={
              token ? (
                <SystemPrompt clinic={clinic} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/knowledge"
            element={
              token ? (
                <Knowledge clinic={clinic} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;