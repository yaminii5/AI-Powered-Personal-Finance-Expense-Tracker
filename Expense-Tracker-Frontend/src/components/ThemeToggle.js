import { useEffect, useState } from 'react';

const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || getSystemTheme();
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <button onClick={toggle} style={styles.btn} title="Toggle theme">
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}

const styles = {
  btn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '1.5px solid var(--border)',
    background: 'var(--card)',
    color: 'var(--ink-muted)',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.3s ease, background 0.4s ease',
    cursor: 'pointer',
    flexShrink: 0,
  },
};
