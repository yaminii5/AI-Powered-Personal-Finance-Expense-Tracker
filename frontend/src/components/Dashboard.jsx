import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ThemeToggle from './ThemeToggle';
import Toast, { useToast } from './Toast';
import InsightsModal from './InsightsModal';
import './Dashboard.css';

const NAV = [
  { label: 'Analysis',     path: '.' },
  { label: 'Transactions', path: 'transactions' },
  { label: 'Budgets',      path: 'budgets' },
  { label: 'Planner',      path: 'planner' },
];

export default function Dashboard({ user, onLogout, onUserUpdate }) {
  const { toast, show, clear } = useToast();
  const navigate = useNavigate();
  const [showInsights, setShowInsights] = useState(false);
  const [insightsPeriod, setInsightsPeriod] = useState(() => {
    const d = new Date();
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  });

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="dashboard-shell">
      {/* Top bar */}
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <span className="label-micro dashboard-brand-sub">Expense Tracker</span>
          <h1 className="dashboard-brand-name">{user.first_name || user.username}</h1>
        </div>

        {/* Pill nav */}
        <nav className="dashboard-pill-nav">
          {NAV.map(({ label, path }) => (
            <NavLink
              key={label}
              to={path}
              end={path === '.'}
              className={({ isActive }) => `dashboard-pill ${isActive ? 'active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
          <button
            className="dashboard-pill pill-ai"
            onClick={() => setShowInsights(true)}
            aria-label="Open AI Spending Insights"
            title="AI Spending Insights"
          >
            ✦ AI Insights
          </button>
          <NavLink
            to="settings"
            className={({ isActive }) => `dashboard-pill ${isActive ? 'active' : ''}`}
          >
            Settings
          </NavLink>
        </nav>

        <div className="dashboard-top-right">
          <ThemeToggle />
          <button className="dashboard-btn-ghost" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      {/* Page content */}
      <main className="dashboard-main">
        <Outlet context={{ user, show, onLogout: handleLogout, onUserUpdate }} />
      </main>

      <Toast toast={toast} onDone={clear} />
      {showInsights && (
        <InsightsModal
          user={user}
          initialMonth={insightsPeriod.month}
          initialYear={insightsPeriod.year}
          onPeriodChange={(m, y) => setInsightsPeriod({ month: m, year: y })}
          onClose={() => setShowInsights(false)}
        />
      )}
    </div>
  );
}
