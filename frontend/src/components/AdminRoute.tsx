import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute: React.FC = () => {
  const { user, token } = useAuth();

  // Check if user is authenticated and is an admin
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.isAdmin) {
    return <Navigate to="/feed" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
