import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function ProtectedAdminRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('adminAuth') === 'true'
  );

  // Re-check authentication on mount and when localStorage changes
  useEffect(() => {
    const checkAuth = () => {
      const authStatus = localStorage.getItem('adminAuth') === 'true';
      setIsAuthenticated(authStatus);
    };

    // Check immediately
    checkAuth();

    // Listen for storage changes (works across tabs)
    window.addEventListener('storage', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}