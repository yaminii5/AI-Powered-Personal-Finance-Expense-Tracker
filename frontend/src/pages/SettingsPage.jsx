import { useState } from 'react';
import userService from '../services/userService';

export default function SettingsPage({ user, show, onLogout, onUserUpdate }) {
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [loading, setLoading] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const updated = await userService.update(user.username, firstName);
      show('Profile updated');
      onUserUpdate(updated);
    } catch (e) { show(e.message, 'error'); }
    setLoading(false);
  };

  const del = async () => {
    if (!user) return;
    if (!window.confirm(`Delete account "${user.username}"? This cannot be undone.`)) return;
    try {
      await userService.remove(user.username);
      onLogout();
    } catch (e) { show(e.message, 'error'); }
  };

  return (
    <div style={s.page}>
      <h2 style={s.pageTitle}>Settings</h2>

      <div style={s.card}>
        <p className="label-micro" style={{ marginBottom: 18 }}>Profile</p>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={s.field}>
            <label className="label-micro" style={s.lbl}>Username</label>
            <input style={{ ...s.input, opacity: 0.55 }} value={user?.username || ''} disabled />
          </div>
          <div style={s.field}>
            <label className="label-micro" style={s.lbl}>First Name</label>
            <input style={s.input} value={firstName} onChange={e => setFirstName(e.target.value)} required />
          </div>
          <button type="submit" style={{ ...s.btnPrimary, alignSelf: 'flex-start' }} disabled={loading}>
            {loading ? 'Saving…' : 'Save Changes →'}
          </button>
        </form>
      </div>

      <div style={{ ...s.card, borderColor: 'var(--accent)' }}>
        <p className="label-micro" style={{ marginBottom: 8, color: 'var(--accent)' }}>Danger Zone</p>
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.8rem', marginBottom: 16 }}>
          Permanently deletes your account and all associated data.
        </p>
        <button
          style={{ ...s.btnPrimary, background: 'transparent', color: 'var(--accent)', border: '1.5px solid var(--accent)' }}
          onClick={del}
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}

const s = {
  page: { display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 520 },
  pageTitle: { fontFamily: "'Fraunces',serif", fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
  card: {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
    padding: '24px', boxShadow: 'var(--shadow)',
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  lbl: { display: 'block' },
  input: {
    background: 'var(--inset)', border: '1.5px solid var(--border)', borderRadius: 10,
    padding: '9px 13px', color: 'var(--ink)', fontSize: '0.875rem', outline: 'none',
    fontFamily: "'Spline Sans Mono',monospace", transition: 'border-color 0.2s, background 0.4s', width: '100%',
  },
  btnPrimary: {
    background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10,
    padding: '10px 20px', fontSize: '0.88rem', fontWeight: 600,
    fontFamily: "'Fraunces',serif", cursor: 'pointer', letterSpacing: '-0.01em',
    transition: 'opacity 0.2s, transform 0.2s',
  },
};

