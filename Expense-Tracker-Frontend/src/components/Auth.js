import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import userService from '../services/userService';
import Toast, { useToast } from './Toast';
import ThemeToggle from './ThemeToggle';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast, show, clear } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return show('Username is required', 'error');
    if (mode === 'register' && !firstName.trim()) return show('First name is required', 'error');

    setLoading(true);
    try {
      const user = mode === 'login'
        ? await userService.login(username.trim())
        : await userService.register(username.trim(), firstName.trim());
      onAuth(user);
      navigate(`/${user.username}`);
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.toggleWrap}><ThemeToggle /></div>

      <div style={s.card} className="fade-up">
        <span className="label-micro">Personal Finance</span>

        <h1 style={s.heading}>
          {mode === 'login' ? 'Welcome back.' : 'Get started.'}
        </h1>
        <p style={s.sub}>
          {mode === 'login' ? 'Enter your username to continue.' : 'Create your account in seconds.'}
        </p>

        <div style={s.tabs}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ ...s.tab, ...(mode === m ? s.tabActive : {}) }}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label className="label-micro" style={s.lbl}>Username</label>
            <input style={s.input} value={username} onChange={e => setUsername(e.target.value)}
              placeholder="e.g. john0" autoFocus autoComplete="username" />
          </div>
          {mode === 'register' && (
            <div style={{ ...s.field, animation: 'fadeUp 0.3s ease' }}>
              <label className="label-micro" style={s.lbl}>First Name</label>
              <input style={s.input} value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="e.g. John" autoComplete="given-name" />
            </div>
          )}
          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Continue →' : 'Create Account →'}
          </button>
        </form>

        <p style={s.switchText}>
          {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
          <button style={s.switchBtn} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>

      <Toast toast={toast} onDone={clear} />
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' },
  toggleWrap: { position: 'fixed', top: 20, right: 20 },
  card: {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
    padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: 'var(--shadow)',
    display: 'flex', flexDirection: 'column', gap: 0,
  },
  heading: { fontFamily: "'Fraunces',serif", fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', margin: '12px 0 6px' },
  sub: { color: 'var(--ink-muted)', fontSize: '0.82rem', marginBottom: 24 },
  tabs: { display: 'flex', background: 'var(--inset)', borderRadius: 999, padding: 3, marginBottom: 28, gap: 2 },
  tab: {
    flex: 1, padding: '7px 0', borderRadius: 999, border: 'none', background: 'transparent',
    color: 'var(--ink-muted)', fontSize: '0.78rem', fontFamily: "'Fraunces',serif", fontWeight: 500,
    cursor: 'pointer', transition: 'background 0.25s, color 0.25s',
  },
  tabActive: { background: 'var(--card)', color: 'var(--ink)', boxShadow: '0 1px 4px rgba(28,26,23,0.1)' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  lbl: { display: 'block' },
  input: {
    background: 'var(--inset)', border: '1.5px solid var(--border)', borderRadius: 10,
    padding: '10px 14px', color: 'var(--ink)', fontSize: '0.875rem', outline: 'none',
    fontFamily: "'Spline Sans Mono',monospace", transition: 'border-color 0.2s, background 0.4s', width: '100%',
  },
  btn: {
    marginTop: 4, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10,
    padding: '12px 0', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '-0.01em',
    fontFamily: "'Fraunces',serif", cursor: 'pointer', transition: 'opacity 0.2s, transform 0.2s',
  },
  switchText: { marginTop: 20, textAlign: 'center', color: 'var(--ink-muted)', fontSize: '0.78rem' },
  switchBtn: {
    background: 'none', border: 'none', color: 'var(--accent)', fontFamily: "'Fraunces',serif",
    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', padding: 0,
    textDecoration: 'underline', textUnderlineOffset: 3,
  },
};
