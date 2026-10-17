import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Income from './pages/Income';
import Expenses from './pages/Expenses';
import Budget from './pages/Budget';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';
import api from './api';

function AppLayout({ user, onLogout, isDarkMode, setIsDarkMode, isAccessibleMode, setIsAccessibleMode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  // Get active page title based on path
  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/':
        return 'Financial Dashboard';
      case '/income':
        return 'Income & Collections';
      case '/expenses':
        return 'Disbursements & Expenses';
      case '/budget':
        return 'Budget Allocations';
      case '/reports':
        return 'Financial Statements & Reports';
      case '/audit-log':
        return 'System Audit Trail';
      default:
        return 'CCA CashFlow System';
    }
  };

  // Fetch pending voucher count for notification bell & sidebar badge
  const fetchPendingCount = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      if (res.data?.pending_expenses !== undefined) {
        setPendingCount(res.data.pending_expenses);
      }
    } catch {
      // Quiet fail if network glitch
    }
  };

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
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
              <Route path="/" element={<Dashboard />} />
              <Route path="/income" element={<Income />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/audit-log" element={<AuditLog />} />
              <Route path="*" element={<Navigate to="/" replace />} />
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

  // Accessible Mode State (Larger text, higher contrast)
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
          <p className="text-xs font-semibold text-slate-400 font-cinzel">Initializing CCA CashFlow...</p>
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
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}
