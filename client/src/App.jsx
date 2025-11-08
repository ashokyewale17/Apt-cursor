import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AttendanceReport from './pages/AttendanceReport';
import LeaveManagement from './pages/LeaveManagement';
import Profile from './pages/Profile';
import AddEmployee from './pages/AddEmployee';
import EmployeeAttendance from './pages/EmployeeAttendance';
import AttendanceEditRequests from './pages/AttendanceEditRequests';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import { Bell, X } from 'lucide-react';
import './App.css';

// Auth Context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
    
    // Load notifications from localStorage
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      ...notification,
      timestamp: new Date()
    };
    
    const updatedNotifications = [newNotification, ...notifications];
    setNotifications(updatedNotifications);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    
    // Auto-remove notification after 10 seconds
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 10000);
  };

  const removeNotification = (id) => {
    const updatedNotifications = notifications.filter(n => n.id !== id);
    setNotifications(updatedNotifications);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  };

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('notifications');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout,
      updateUser,
      isAuthenticated: !!user,
      notifications,
      addNotification,
      removeNotification,
      clearNotifications
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Notification Component
const NotificationPanel = () => {
  const { notifications, removeNotification, clearNotifications } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notifications.length > 0) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '1rem',
      right: '1rem',
      zIndex: 9999,
      width: '350px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        border: '1px solid var(--border-color)',
        maxHeight: '500px',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} />
            <span style={{ fontWeight: '600' }}>Notifications</span>
            <span style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '1rem',
              padding: '0.125rem 0.5rem',
              fontSize: '0.75rem'
            }}>
              {notifications.length}
            </span>
          </div>
          <button 
            onClick={clearNotifications}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            Clear All
          </button>
        </div>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {notifications.map((notification) => (
            <div 
              key={notification.id}
              style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border-color)',
                background: notification.type === 'success' ? '#f0fdf4' :
                          notification.type === 'error' ? '#fef2f2' :
                          notification.type === 'warning' ? '#fffbeb' : 'white',
                borderLeft: `4px solid ${
                  notification.type === 'success' ? '#10b981' :
                  notification.type === 'error' ? '#ef4444' :
                  notification.type === 'warning' ? '#f59e0b' : '#3b82f6'
                }`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                    {notification.title}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {notification.message}
                  </div>
                </div>
                <button 
                  onClick={() => removeNotification(notification.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '0.25rem'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: 'var(--text-secondary)', 
                marginTop: '0.5rem',
                textAlign: 'right'
              }}>
                {new Date(notification.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/employee-dashboard" replace />;
  }

  return children;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={user.role === 'admin' ? '/admin-dashboard' : '/employee-dashboard'} replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppContent />
          <NotificationPanel />
        </div>
      </Router>
    </AuthProvider>
  );
}

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      {isAuthenticated && <Header />}
      <main className={isAuthenticated ? "main-content" : ""} style={{ backgroundColor: '#f9fafb' }}>
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />

          {/* Protected Routes */}
          <Route 
            path="/admin-dashboard" 
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/employee-dashboard" 
            element={
              <ProtectedRoute>
                <EmployeeDashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/attendance-report" 
            element={
              <ProtectedRoute adminOnly={true}>
                <AttendanceReport />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/leave-management" 
            element={
              <ProtectedRoute>
                <LeaveManagement />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/attendance" 
            element={
              <ProtectedRoute>
                <EmployeeAttendance />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/attendance-edit-requests" 
            element={
              <ProtectedRoute adminOnly={true}>
                <AttendanceEditRequests />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/add-employee" 
            element={
              <ProtectedRoute adminOnly={true}>
                <AddEmployee />
              </ProtectedRoute>
            } 
          />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </>
  );
};

export default App;