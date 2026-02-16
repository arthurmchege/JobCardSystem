// PROTECTED ROUTE COMPONENT
// Wraps routes that require authentication.
// Redirects to login if not authenticated.
// Redirects to correct dashboard if wrong role.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  // While checking authentication, show loading indicator
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // No user or token - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!localStorage.getItem('token')){
    return <Navigate to="/login" replace/>
  }
  // If a specific role is required, check if user has it
  if (requiredRole && user.role !== requiredRole) {
    // User doesn't have the required role
    // Redirect them to their appropriate dashboard
    const redirectPath = user.role === 'supervisor' ? '/supervisor' : '/technician';
    return <Navigate to={redirectPath} replace />;
  }

  
  // User is authenticated and has correct role (if required)
  // Render the protected content
  return children;
};

export default ProtectedRoute;
