import { useEffect, useState } from 'react';
import { fetchAIInsights } from '../services/aiInsightsService';

const TYPE_CONFIG = {
  warning:  { icon: '⚠️', color: 'var(--accent)',  bg: 'rgba(220,53,69,0.08)'   },
  tip:      { icon: '💡', color: '#f59e0b',         bg: 'rgba(245,158,11,0.08)'  },
  pattern:  { icon: '📊', color: '#6366f1',         bg: 'rgba(99,102,241,0.08)'  },
  positive: { icon: '✅', color: 'var(--green)',    bg: 'rgba(34,197,94,0.08)'   },
};

const now = new Date();

export default function InsightsModal({ user, onClose }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    fetchAIInsights(user.user_id, user.username, now.getMonth() + 1, now.getFullYear())
      .then(setInsights)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user.user_id, user.username]);

  const visible = insights.filter((_, i) => !dismissed.includes(i));

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={s.aiTag}>✦ AI</span>
            <span style={s.title}>Spending Insights</span>
          </div>
          <button style={s.closeBtn} onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        <p style={s.sub}>
          {now.toLocaleString('default', { month: 'long' })} {now.getFullYear()} · Based on your transactions
        </p>

        {/* Loading */}
        {loading && (
          <div style={s.loadingWrap}>
            <div style={s.spinner} />
            <span style={{ color: 'var(--ink-muted)', fontSize: '0.82rem' }}>
              Analysing your spending patterns…
            </span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ ...s.card, background: 'rgba(220,53,69,0.08)', borderColor: 'rgba(220,53,69,0.2)' }}>
            <span>⚠️</span>
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>{error}</p>
          </div>
        )}

        {/* Insights */}
        {!loading && !error && (
          <div style={s.list}>
            {visible.length === 0 && (
              <p style={{ color: 'var(--ink-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>
                All insights dismissed.
              </p>
            )}
            {visible.map((insight) => {
              const cfg = TYPE_CONFIG[insight.type] || TYPE_CONFIG.tip;
              const originalIdx = insights.indexOf(insight);
              return (
                <div key={originalIdx} style={{ ...s.card, background: cfg.bg, borderColor: cfg.color + '33' }}>
                  <div style={s.cardLeft}>
                    <span style={{ fontSize: '1.2rem' }}>{cfg.icon}</span>
                    <div>
                      <p style={{ ...s.insightTitle, color: cfg.color }}>{insight.title}</p>
                      <p style={s.insightMsg}>{insight.message}</p>
                    </div>
                  </div>
                  <button style={s.dismissBtn} onClick={() => setDismissed((d) => [...d, originalIdx])} aria-label="Dismiss insight">✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '28px 28px 24px',
    width: '100%', maxWidth: 480, maxHeight: '80vh',
    overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    display: 'flex', flexDirection: 'column', gap: 14,
    animation: 'scaleUp 0.25s ease both',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  aiTag: {
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: '#fff', fontSize: '0.65rem', fontWeight: 700,
    padding: '2px 8px', borderRadius: 999, letterSpacing: '0.05em',
  },
  title: {
    fontFamily: "'Fraunces',serif", fontWeight: 700,
    fontSize: '1rem', color: 'var(--ink)',
  },
  sub: { fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: -8 },
  closeBtn: {
    background: 'transparent', border: 'none', color: 'var(--ink-muted)',
    fontSize: '1rem', cursor: 'pointer', padding: '2px 6px',
  },
  loadingWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 14, padding: '32px 0',
  },
  spinner: {
    width: 28, height: 28, borderRadius: '50%',
    border: '3px solid var(--border)',
    borderTopColor: '#6366f1',
    animation: 'spin 0.8s linear infinite',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    border: '1px solid', borderRadius: 12, padding: '14px 16px', gap: 10,
  },
  cardLeft: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  insightTitle: {
    fontSize: '0.84rem', fontWeight: 700,
    fontFamily: "'Fraunces',serif", marginBottom: 4,
  },
  insightMsg: { fontSize: '0.79rem', color: 'var(--ink-muted)', lineHeight: 1.55 },
  dismissBtn: {
    background: 'transparent', border: 'none', color: 'var(--ink-muted)',
    cursor: 'pointer', fontSize: '0.7rem', padding: '2px 4px', flexShrink: 0,
  },
};

