// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';

// Pages
import Login from './pages/auth/Login';
import CheckIn from './pages/employee/CheckIn';
import TimeOffRequest from './pages/employee/TimeOffRequest';
import AdminDashboard from './pages/admin/Dashboard';
import AdminCheckIns from './pages/admin/CheckIns';
// import AdminReports from './pages/admin/Reports';
import AdminTimeOffRequests from './pages/admin/TimeOffRequests';
import AdminLocations from './pages/admin/Locations';
import AdminStatistics from './pages/admin/Statistics';
import AdminUsers from './pages/admin/Users';
import AdminConfiguration from './pages/admin/Configuration';

// Layouts
import EmployeeLayout from './components/layout/EmployeeLayout';
import AdminLayout from './components/layout/AdminLayout';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Employee routes */}
            <Route
              path="/employee"
              element={
                <ProtectedRoute>
                  <EmployeeLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/employee/checkin" replace />} />
              <Route path="checkin" element={<CheckIn />} />
              <Route path="time-off" element={<TimeOffRequest />} />
            </Route>

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="checkins" element={<AdminCheckIns />} />
              {/* <Route path="reports" element={<AdminReports />} /> */}
              <Route path="time-off" element={<AdminTimeOffRequests />} />
              <Route path="locations" element={<AdminLocations />} />
              <Route path="statistics" element={<AdminStatistics />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="configuration" element={<AdminConfiguration />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/employee/checkin" replace />} />
            
            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;