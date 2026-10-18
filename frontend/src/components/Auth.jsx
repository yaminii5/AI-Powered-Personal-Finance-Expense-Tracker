import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import userService from '../services/userService';
import Toast, { useToast } from './Toast';
import ThemeToggle from './ThemeToggle';
import './Auth.css';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast, show, clear } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return show('Username is required', 'error');
    if (!password) return show('Password is required', 'error');
    if (mode === 'register') {
      if (!firstName.trim()) return show('First name is required', 'error');
      if (password.length < 6) return show('Password must be at least 6 characters', 'error');
    }

    setLoading(true);
    try {
      const user =
        mode === 'login'
          ? await userService.login(username.trim(), password)
          : await userService.register(username.trim(), firstName.trim(), password);
      onAuth(user);
      navigate(`/${user.username}`);
    } catch (err) {
      show(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-toggle-wrap"><ThemeToggle /></div>

      <div className="auth-card fade-up">
        <span className="label-micro">Personal Finance</span>

        <h1 className="auth-heading">
          {mode === 'login' ? 'Welcome back.' : 'Get started.'}
        </h1>
        <p className="auth-sub">
          {mode === 'login' ? 'Enter your username to continue.' : 'Create your account in seconds.'}
        </p>

        <div className="auth-tabs">
          {['login', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`auth-tab ${mode === m ? 'active' : ''}`}
            >
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="label-micro auth-lbl">Username</label>
            <input
              className="auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. john0"
              autoFocus
              autoComplete="username"
              required
            />
          </div>
          {mode === 'register' && (
            <div className="auth-field fade-enter">
              <label className="label-micro auth-lbl">First Name</label>
              <input
                className="auth-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. John"
                autoComplete="given-name"
                required
              />
            </div>
          )}
          <div className="auth-field">
            <label className="label-micro auth-lbl">Password</label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Continue →' : 'Create Account →'}
          </button>
        </form>

        <p className="auth-switch-text">
          {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
          <button className="auth-switch-btn" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>

      <Toast toast={toast} onDone={clear} />
    </div>
  );
}
