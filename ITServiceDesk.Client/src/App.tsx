import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useRef } from 'react';
import { useSettings } from './contexts/SettingsContext';
import { authService } from './services/authService';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import Departments from './pages/Departments';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Inventory from './pages/Inventory';
import MyTasks from './pages/MyTasks';
import MyInventory from './pages/MyInventory';
import Help from './pages/Help';

// Knowledge Base
import { KbDashboard } from './pages/knowledgeBase/KbDashboard';
import { KbCategories } from './pages/knowledgeBase/KbCategories';
import { KbArticlesList } from './pages/knowledgeBase/KbArticlesList';
import { KbArticleEditor } from './pages/knowledgeBase/KbArticleEditor';

const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole: 'admin' | 'technician' }) => {
  const isAdmin = authService.isAdmin();
  const isTechnician = authService.isTechnician();
  
  if (requiredRole === 'admin' && !isAdmin) return <Navigate to="/" replace />;
  if (requiredRole === 'technician' && !isAdmin && !isTechnician) return <Navigate to="/" replace />;
  
  return <>{children}</>;
};

function App() {
  const { settings, isLoading } = useSettings();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const resetTimer = () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      if (settings && authService.isAuthenticated()) {
        timeoutRef.current = window.setTimeout(() => {
          authService.logout();
          window.location.href = '/login';
        }, settings.sessionTimeoutMinutes * 60 * 1000);
      }
    };

    if (!isLoading) {
      resetTimer();
      const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
      const handleActivity = () => resetTimer();
      
      events.forEach(e => window.addEventListener(e, handleActivity));
      return () => {
        events.forEach(e => window.removeEventListener(e, handleActivity));
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      };
    }
  }, [settings, isLoading]);

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <BrowserRouter>
        <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<div className="p-8 text-center bg-white rounded-xl shadow">Kayıt sayfası (Yakında)</div>} />
        </Route>

        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/my-tasks" element={
            <ProtectedRoute requiredRole="admin"><MyTasks /></ProtectedRoute>
          } />
          <Route path="/tickets" element={
            <ProtectedRoute requiredRole="technician"><Tickets /></ProtectedRoute>
          } />
          <Route path="/users" element={<Users />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/my-inventory" element={<MyInventory />} />
          <Route path="/help" element={<Help />} />
          
          {/* Knowledge Base Admin Routes */}
          <Route path="/kb-admin" element={
            <ProtectedRoute requiredRole="admin"><KbDashboard /></ProtectedRoute>
          } />
          <Route path="/kb-admin/categories" element={
            <ProtectedRoute requiredRole="admin"><KbCategories /></ProtectedRoute>
          } />
          <Route path="/kb-admin/articles" element={
            <ProtectedRoute requiredRole="admin"><KbArticlesList /></ProtectedRoute>
          } />
          <Route path="/kb-admin/articles/new" element={
            <ProtectedRoute requiredRole="admin"><KbArticleEditor /></ProtectedRoute>
          } />
          <Route path="/kb-admin/articles/edit/:id" element={
            <ProtectedRoute requiredRole="admin"><KbArticleEditor /></ProtectedRoute>
          } />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </>
  );
}

export default App;
