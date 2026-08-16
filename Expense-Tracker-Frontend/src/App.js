import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useOutletContext } from 'react-router-dom';
import './App.css';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import TransactionsPage from './pages/TransactionsPage';
import BudgetsPage from './pages/BudgetsPage';
import AnalysisPage from './pages/AnalysisPage';
import SettingsPage from './pages/SettingsPage';

// Pages that consume outlet context
function TxnRoute()      { const ctx = useOutletContext(); return <TransactionsPage {...ctx} />; }
function BudgetRoute()   { const ctx = useOutletContext(); return <BudgetsPage {...ctx} />; }
function AnalysisRoute() { const ctx = useOutletContext(); return <AnalysisPage {...ctx} />; }
function SettingsRoute() {
  const ctx = useOutletContext();
  return <SettingsPage {...ctx} />;
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('et_user')); } catch { return null; }
  });

  useEffect(() => {
    const theme = localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const handleAuth = (u) => {
    localStorage.setItem('et_user', JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('et_user');
    setUser(null);
  };

  const handleUserUpdate = (updated) => {
    const merged = { ...user, ...updated };
    localStorage.setItem('et_user', JSON.stringify(merged));
    setUser(merged);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* /login */}
        <Route
          path="/login"
          element={user ? <Navigate to={`/${user.username}`} replace /> : <Auth onAuth={handleAuth} />}
        />

        {/* /:username — dashboard shell */}
        <Route
          path="/:username"
          element={
            user
              ? <Dashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
              : <Navigate to="/login" replace />
          }
        >
          <Route index element={<AnalysisRoute />} />
          <Route path="transactions" element={<TxnRoute />} />
          <Route path="budgets" element={<BudgetRoute />} />
          <Route path="settings" element={<SettingsRoute />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to={user ? `/${user.username}` : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
