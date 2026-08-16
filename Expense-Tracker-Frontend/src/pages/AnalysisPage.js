import { useState, useEffect, useCallback } from 'react';
import analysisService from '../services/analysisService';
import transactionService from '../services/transactionService';
import userService from '../services/userService';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now = new Date();

function fmt(n) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({ label, value, hero, color }) {
  return (
    <div style={{
      borderRadius: 16, padding: '20px 22px', display: 'flex', flexDirection: 'column',
      background: hero ? '#1c1a17' : 'var(--card)',
      border: hero ? 'none' : '1px solid var(--border)',
      boxShadow: 'var(--shadow)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}>
      <span className="label-micro" style={{ color: hero ? 'rgba(255,255,255,0.5)' : 'var(--ink-muted)' }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'Fraunces',serif", fontSize: '1.6rem', fontWeight: 700,
        letterSpacing: '-0.02em', marginTop: 8, display: 'block',
        color: hero ? '#fff' : (color || 'var(--ink)'),
      }}>
        ₹{fmt(value ?? 0)}
      </span>
    </div>
  );
}

export default function AnalysisPage({ user }) {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [balance, setBalance] = useState(user.current_balance ?? 0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, sm, u] = await Promise.all([
        analysisService.get(user.user_id, month, year),
        transactionService.summary(user.user_id, month, year),
        userService.login(user.username),
      ]);
      setData(a);
      setSummary(sm);
      setBalance(u.current_balance ?? 0);
    } catch (e) {
      setData(null);
      setSummary(null);
    }
    setLoading(false);
  }, [user.user_id, user.username, month, year]);

  useEffect(() => { load(); }, [load]);

  const pct = data?.budget_limit > 0
    ? Math.min(100, (data.budget_used / data.budget_limit) * 100)
    : 0;

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Analysis</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select style={{ ...s.input, width: 'auto' }} value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <input style={{ ...s.input, width: 88 }} type="number" value={year} onChange={e => setYear(+e.target.value)} />
          <button style={s.btnPrimary} onClick={load} disabled={loading}>
            {loading ? '…' : 'Load →'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={s.statsGrid}>
        <StatCard label="Current Balance" value={balance} hero />
        <StatCard label="Total Income" value={data?.total_income} color="var(--green)" />
        <StatCard label="Total Expenses" value={data?.total_expenses} color="var(--accent)" />
        {/* <StatCard label="Net This Month" value={(data?.total_income ?? 0) - (data?.total_expenses ?? 0)} color={(data?.total_income ?? 0) >= (data?.total_expenses ?? 0) ? 'var(--green)' : 'var(--accent)'} /> */}
      </div>

      {/* Budget bar */}
      {data?.budget_limit > 0 && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="label-micro">Budget Usage — {MONTHS[month - 1]} {year}</span>
            <span className="label-micro" style={{ color: data.within_budget ? 'var(--green)' : 'var(--accent)' }}>
              {data.within_budget ? '✓ Within budget' : '✗ Over budget'}
            </span>
          </div>
          <div style={s.barTrack}>
            <div style={{ ...s.barFill, width: `${pct}%`, background: data.within_budget ? 'var(--green)' : 'var(--accent)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ color: 'var(--ink-muted)', fontSize: '0.75rem' }}>₹{fmt(data.budget_used)} used</span>
            <span style={{ color: 'var(--ink-muted)', fontSize: '0.75rem' }}>₹{fmt(data.budget_limit)} limit</span>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {summary && (
        <div style={s.grid2}>
          {['income', 'expense'].map(type => (
            <div key={type} style={s.card}>
              <p className="label-micro" style={{ marginBottom: 14, color: type === 'income' ? 'var(--green)' : 'var(--accent)' }}>
                {type === 'income' ? 'Income' : 'Expenses'} by Category
              </p>
              {Object.entries(summary[type] || {}).length === 0
                ? <p style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>None this period</p>
                : Object.entries(summary[type] || {}).map(([cat, amt]) => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.82rem' }}>{cat}</span>
                    <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: '0.88rem' }}>₹{fmt(amt)}</span>
                  </div>
                ))
              }
            </div>
          ))}
        </div>
      )}

      {!data && !loading && (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <span className="label-micro">No data for this period</span>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { display: 'flex', flexDirection: 'column', gap: 20 },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  pageTitle: { fontFamily: "'Fraunces',serif", fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 },
  card: {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
    padding: '22px 24px', boxShadow: 'var(--shadow)',
  },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  barTrack: { height: 8, background: 'var(--inset)', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, transition: 'width 0.6s ease' },
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
