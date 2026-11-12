import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Income from './pages/Income';
import StudentProfile from './pages/StudentProfile';
import Notifications from './pages/Notifications';
import ParentPortal from './pages/ParentPortal';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';
import AnomalyDetection from './pages/AnomalyDetection';
import api from './api';

function AppLayout({ user, onLogout, isDarkMode, setIsDarkMode, isAccessibleMode, setIsAccessibleMode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  const isParent = user?.role === 'Parent';

  // Get active page title based on path
  const getPageTitle = (pathname) => {
    if (pathname.startsWith('/collections/')) return 'Student Profile & Payment Records';
    switch (pathname) {
      case '/':
        return isParent ? 'Child Payment Account' : 'Collections & Financial Overview';
      case '/income':
      case '/collections':
        return 'Student Collections & Profiles';
      case '/notifications':
        return 'Payment Notices & Fee Announcements';
      case '/parent':
        return 'Child Payment Account & Receipts';
      case '/anomaly':
        return 'ML Anomaly Detection (Feature #6)';
      case '/reports':
        return 'Financial Statements & Reports';
      case '/audit-log':
        return 'System Audit Trail';
      default:
        return 'CCA CashFlow System';
    }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await api.get('/notifications/');
      if (Array.isArray(res.data)) {
        setPendingCount(res.data.length);
      }
    } catch {
      // Quiet fail if offline
    }
  };

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 45000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const activeTitle = getPageTitle(location.pathname);

  return (
    <div className="flex h-screen print:h-auto print:block bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-300 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        user={user}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingCount={pendingCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible print:h-auto">
        <Header
          activeTitle={activeTitle}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          isAccessibleMode={isAccessibleMode}
          setIsAccessibleMode={setIsAccessibleMode}
          onMenuToggle={() => setSidebarOpen((p) => !p)}
          user={user}
          pendingCount={pendingCount}
        />

        <main className="flex-1 overflow-x-hidden overflow-y-auto print:overflow-visible print:h-auto bg-slate-50 dark:bg-slate-900 p-4 md:p-8 transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
            <Routes>
              {isParent ? (
                <>
                  <Route path="/" element={<ParentPortal user={user} />} />
                  <Route path="/parent" element={<ParentPortal user={user} />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="*" element={<Navigate to="/parent" replace />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/income" element={<Income />} />
                  <Route path="/collections" element={<Income />} />
                  <Route path="/collections/:id" element={<StudentProfile />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/parent" element={<ParentPortal user={user} />} />
                  <Route path="/anomaly" element={<AnomalyDetection />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/audit-log" element={<AuditLog />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              )}
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('cca_cf_dark');
    return saved !== null ? saved === 'true' : false;
  });

  // Accessible Mode State
  const [isAccessibleMode, setIsAccessibleMode] = useState(() => {
    const saved = localStorage.getItem('cca_cf_accessible');
    return saved !== null ? saved === 'true' : false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('cca_cf_dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    document.documentElement.classList.toggle('accessible-mode', isAccessibleMode);
    localStorage.setItem('cca_cf_accessible', isAccessibleMode);
  }, [isAccessibleMode]);

  useEffect(() => {
    const savedUser = localStorage.getItem('cca_cf_user');
    const token = localStorage.getItem('cca_cf_token');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('cca_cf_user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('cca_cf_token');
    localStorage.removeItem('cca_cf_user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400 font-cinzel">Initializing CCA FlowSys...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <Login
              onLogin={handleLogin}
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
            />
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppLayout
      user={user}
      onLogout={handleLogout}
      isDarkMode={isDarkMode}
      setIsDarkMode={setIsDarkMode}
      isAccessibleMode={isAccessibleMode}
      setIsAccessibleMode={setIsAccessibleMode}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
