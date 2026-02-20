import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function ProtectedAdminRoute({ children }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if admin is authenticated
    const adminAuth = localStorage.getItem('adminAuth');
    console.log('🔐 Checking admin auth:', adminAuth);
    
    setIsAuthenticated(adminAuth === 'true');
    setIsChecking(false);
  }, []);

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('❌ Not authenticated, redirecting to /admin/login');
    return <Navigate to="/admin/login" replace />;
  }

  // Render children if authenticated
  console.log('✅ Authenticated, rendering admin page');
  return children;
}