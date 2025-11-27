import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DirectorDashboard from './pages/DirectorDashboard';
import SecretaryDashboard from './pages/SecretaryDashboard';
import PrivateRoute from './components/PrivateRoute';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/director-dashboard" 
          element={
            <PrivateRoute allowedRoles={['director']}>
              <DirectorDashboard />
            </PrivateRoute>
          } 
        />
        
        <Route 
          path="/secretary-dashboard" 
          element={
            <PrivateRoute allowedRoles={['secretary']}>
              <SecretaryDashboard />
            </PrivateRoute>
          } 
        />
        
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
