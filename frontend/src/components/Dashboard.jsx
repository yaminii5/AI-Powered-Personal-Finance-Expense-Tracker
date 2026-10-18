import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ThemeToggle from './ThemeToggle';
import Toast, { useToast } from './Toast';
import InsightsModal from './InsightsModal';

const NAV = [
  { label: 'Analysis',     path: '.' },
  { label: 'Transactions', path: 'transactions' },
  { label: 'Budgets',      path: 'budgets' },
];

export default function Dashboard({ user, onLogout, onUserUpdate }) {
  const { toast, show, clear } = useToast();
  const navigate = useNavigate();
  const [showInsights, setShowInsights] = useState(false);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div style={s.shell}>
      {/* Top bar */}
      <header style={s.topbar}>
        <div style={s.brand}>
          <span className="label-micro" style={{ letterSpacing: '0.15em' }}>Expense Tracker</span>
          <h1 style={s.brandName}>{user.first_name || user.username}</h1>
        </div>

        {/* Pill nav */}
        <nav style={s.pillNav}>
          {NAV.map(({ label, path }) => (
            <NavLink
              key={label}
              to={path}
              end={path === '.'}
              style={({ isActive }) => ({ ...s.pill, ...(isActive ? s.pillActive : {}) })}
            >
              {label}
            </NavLink>
          ))}
          <button
            style={{ ...s.pill, ...s.pillAI }}
            onClick={() => setShowInsights(true)}
            aria-label="Open AI Spending Insights"
          >
            ✦ AI
          </button>
          <NavLink
            to="settings"
            style={({ isActive }) => ({ ...s.pill, ...(isActive ? s.pillActive : {}) })}
          >
            Settings
          </NavLink>
        </nav>

        <div style={s.topRight}>
          <ThemeToggle />
          <button style={s.btnGhost} onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      {/* Page content */}
      <main style={s.main}>
        <Outlet context={{ user, show, onLogout: handleLogout, onUserUpdate }} />
      </main>

      <Toast toast={toast} onDone={clear} />
      {showInsights && <InsightsModal user={user} onClose={() => setShowInsights(false)} />}
    </div>
  );
}

const s = {
  shell: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  topbar: {
    maxWidth: 1000, margin: '0 auto', width: '100%',
    padding: '18px 24px',
    display: 'flex', alignItems: 'center', gap: 20,
    flexWrap: 'wrap',
  },
  brand: { display: 'flex', flexDirection: 'column', gap: 2, marginRight: 'auto' },
  brandName: {
    fontFamily: "'Fraunces',serif", fontSize: '1.05rem', fontWeight: 700,
    letterSpacing: '-0.02em', color: 'var(--ink)',
  },
  pillNav: {
    display: 'flex', background: 'var(--inset)', borderRadius: 999,
    padding: 3, gap: 2,
  },
  pill: {
    padding: '7px 16px', borderRadius: 999, border: 'none', background: 'transparent',
    color: 'var(--ink-muted)', fontSize: '0.8rem', fontFamily: "'Fraunces',serif", fontWeight: 500,
    cursor: 'pointer', transition: 'background 0.25s, color 0.25s',
    textDecoration: 'none', display: 'inline-block',
  },
  pillActive: {
    background: 'var(--card)', color: 'var(--ink)',
    boxShadow: '0 1px 4px rgba(28,26,23,0.1)',
  },
  pillAI: {
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: '#fff', fontWeight: 700, letterSpacing: '0.03em',
  },
  topRight: { display: 'flex', gap: 10, alignItems: 'center' },
  main: { maxWidth: 1000, margin: '0 auto', width: '100%', padding: '8px 24px 48px', flex: 1 },
  btnGhost: {
    background: 'transparent', color: 'var(--ink-muted)', border: '1.5px solid var(--border)',
    borderRadius: 10, padding: '7px 14px', fontSize: '0.8rem',
    fontFamily: "'Fraunces',serif", cursor: 'pointer',
  },
};

