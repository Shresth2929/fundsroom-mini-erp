import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Challans from './pages/Challans';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Portal Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard is visible to all logged-in roles */}
            <Route index element={<Dashboard />} />

            {/* Customers: ADMIN, SALES, ACCOUNTS */}
            <Route
              path="customers"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                  <Customers />
                </ProtectedRoute>
              }
            />

            {/* Products: ADMIN, SALES, WAREHOUSE, ACCOUNTS */}
            <Route
              path="products"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}>
                  <Products />
                </ProtectedRoute>
              }
            />

            {/* Inventory: ADMIN, WAREHOUSE */}
            <Route
              path="inventory"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE']}>
                  <Inventory />
                </ProtectedRoute>
              }
            />

            {/* Challans: ADMIN, SALES, ACCOUNTS */}
            <Route
              path="challans"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                  <Challans />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
