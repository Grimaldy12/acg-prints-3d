import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { api, getToken, setToken, removeToken } from './utils/api.js';
import Layout from './components/Layout/Layout.jsx';
import Login from './components/Auth/Login.jsx';
import Register from './components/Auth/Register.jsx';
import Dashboard from './components/Dashboard/Dashboard.jsx';
import SalesPage from './components/Sales/SalesPage.jsx';
import ProductsPage from './components/Products/ProductsPage.jsx';
import CustomersPage from './components/Customers/CustomersPage.jsx';
import ExpensesPage from './components/Expenses/ExpensesPage.jsx';
import OrdersPage from './components/Orders/OrdersPage.jsx';
import ReportsPage from './components/Reports/ReportsPage.jsx';
import OrderForm from './components/Public/OrderForm.jsx';
import Toast from './components/UI/Toast.jsx';

// ── Auth Context ─────────────────────────────────────────────
const AuthContext = createContext(null);
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ── Toast Context ────────────────────────────────────────────
const ToastContext = createContext(null);
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ── Theme Context ────────────────────────────────────────────
const ThemeContext = createContext(null);
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

// ── Protected Route ──────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ── App ──────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // ── Tema: persiste en localStorage ──────────────────────────
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('acg_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('acg_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // ── Auth ─────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (token) {
      api.get('/api/auth/me')
        .then((data) => setUser(data.data || data))
        .catch(() => removeToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await api.post('/api/auth/login', { username, password });
    setToken(data.data?.token);
    setUser(data.data?.user);
    return data;
  }, []);

  const register = useCallback(async (name, username, password) => {
    const data = await api.post('/api/auth/register', { name, username, password });
    setToken(data.data?.token);
    setUser(data.data?.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
  }, []);

  // ── Toasts ───────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const authValue = { user, loading, login, register, logout };
  const toastValue = { addToast, success: (m) => addToast(m, 'success'), error: (m) => addToast(m, 'error'), info: (m) => addToast(m, 'info') };
  const themeValue = { theme, toggleTheme };

  return (
    <AuthContext.Provider value={authValue}>
      <ToastContext.Provider value={toastValue}>
        <ThemeContext.Provider value={themeValue}>
          <Routes>
            <Route path="/pedido" element={<OrderForm />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="ventas" element={<SalesPage />} />
              <Route path="productos" element={<ProductsPage />} />
              <Route path="clientes" element={<CustomersPage />} />
              <Route path="gastos" element={<ExpensesPage />} />
              <Route path="pedidos" element={<OrdersPage />} />
              <Route path="reportes" element={<ReportsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <div className="toast-container">
            {toasts.map((toast) => (
              <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
            ))}
          </div>
        </ThemeContext.Provider>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}
