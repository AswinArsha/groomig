// src/components/SuperAdmin/SuperAdminProtectedRoute.jsx
import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SuperAdminProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const superAdminSession = localStorage.getItem('superAdminSession');
      if (superAdminSession) {
        const sessionData = JSON.parse(superAdminSession);
        setIsAuthenticated(sessionData.type === 'super_admin');
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-white/80 backdrop-blur-sm">
        <motion.div
          className="w-12 h-12 border-2 border-transparent border-t-pink-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/admin" replace />;
}