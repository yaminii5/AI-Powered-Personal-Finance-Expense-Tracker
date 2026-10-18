import { useState } from 'react';

const TYPE_CONFIG = {
  warning:  { icon: '⚠️', color: 'var(--accent)', bg: 'rgba(220,53,69,0.08)' },
  tip:      { icon: '💡', color: '#f59e0b',        bg: 'rgba(245,158,11,0.08)' },
  pattern:  { icon: '📊', color: '#6366f1',        bg: 'rgba(99,102,241,0.08)' },
  positive: { icon: '✅', color: 'var(--green)',   bg: 'rgba(34,197,94,0.08)'  },
};

export default function InsightsPanel({ insights, loading, onRefresh }) {
  const [dismissed, setDismissed] = useState([]);

  const visible = (insights || []).filter((_, i) => !dismissed.includes(i));

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={s.aiTag}>✦ AI</span>
          <span className="label-micro">Spending Insights</span>
        </div>
        <button style={s.refreshBtn} onClick={onRefresh} disabled={loading}>
          {loading ? '…' : '↻ Refresh'}
        </button>
      </div>

      {loading && (
        <div style={s.loadingRow}>
          <span style={s.pulse} />
          <span style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>Analysing your spending patterns…</span>
        </div>
      )}

      {!loading && visible.length === 0 && (insights || []).length > 0 && (
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.8rem', padding: '8px 0' }}>
          All insights dismissed. Click Refresh for new ones.
        </p>
      )}

      {!loading && (!insights || insights.length === 0) && (
        <p style={{ color: 'var(--ink-muted)', fontSize: '0.8rem', padding: '8px 0' }}>
          Click Refresh to generate AI insights for this period.
        </p>
      )}

      <div style={s.list}>
        {visible.map((insight) => {
          const cfg = TYPE_CONFIG[insight.type] || TYPE_CONFIG.tip;
          const originalIdx = insights.indexOf(insight);
          return (
            <div key={originalIdx} style={{ ...s.card, background: cfg.bg, borderColor: cfg.color + '33' }}>
              <div style={s.cardLeft}>
                <span style={s.icon}>{cfg.icon}</span>
                <div>
                  <p style={{ ...s.title, color: cfg.color }}>{insight.title}</p>
                  <p style={s.msg}>{insight.message}</p>
                </div>
              </div>
              <button
                style={s.dismiss}
                onClick={() => setDismissed((d) => [...d, originalIdx])}
                title="Dismiss"
                aria-label="Dismiss insight"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  wrap: {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '20px 22px', boxShadow: 'var(--shadow)',
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  aiTag: {
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: '#fff', fontSize: '0.65rem', fontWeight: 700,
    padding: '2px 7px', borderRadius: 999, letterSpacing: '0.05em',
  },
  refreshBtn: {
    background: 'var(--inset)', border: '1.5px solid var(--border)', borderRadius: 8,
    color: 'var(--ink-muted)', fontSize: '0.75rem', padding: '5px 12px',
    fontFamily: "'Spline Sans Mono',monospace", cursor: 'pointer',
  },
  loadingRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' },
  pulse: {
    width: 8, height: 8, borderRadius: '50%',
    background: '#6366f1', display: 'inline-block',
    animation: 'pulse 1.2s ease-in-out infinite',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    border: '1px solid', borderRadius: 12, padding: '12px 14px',
    transition: 'opacity 0.3s',
  },
  cardLeft: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  icon: { fontSize: '1.1rem', marginTop: 1 },
  title: { fontSize: '0.82rem', fontWeight: 700, fontFamily: "'Fraunces',serif", marginBottom: 3 },
  msg: { fontSize: '0.78rem', color: 'var(--ink-muted)', lineHeight: 1.5 },
  dismiss: {
    background: 'transparent', border: 'none', color: 'var(--ink-muted)',
    cursor: 'pointer', fontSize: '0.7rem', padding: '2px 4px', flexShrink: 0,
  },
};

