import { useState, useEffect, useCallback } from 'react';
import analysisService from '../services/analysisService';
import transactionService from '../services/transactionService';
import userService from '../services/userService';
import DonutChart from '../components/DonutChart';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now = new Date();

function fmt(n) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({ label, value, hero, color, subtext }) {
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
      {subtext && (
        <span style={{ fontSize: '0.72rem', color: hero ? 'rgba(255,255,255,0.5)' : 'var(--ink-muted)', marginTop: 4 }}>
          {subtext}
        </span>
      )}
    </div>
  );
}

export default function AnalysisPage({ user }) {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [balance, setBalance] = useState(user?.current_balance ?? 0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [a, sm, u] = await Promise.all([
        analysisService.get(user.user_id, month, year),
        transactionService.summary(user.user_id, month, year),
        userService.login(user.username),
      ]);
      setData(a);
      setSummary(sm);
      setBalance(u?.current_balance ?? 0);
    } catch {
      setData(null);
      setSummary(null);
    }
    setLoading(false);
  }, [user?.user_id, user?.username, month, year]);

  useEffect(() => { load(); }, [load]);

  const totalIncome = data?.total_income || 0;
  const totalExpense = data?.total_expenses || 0;
  const netSavings = totalIncome - totalExpense;
  const cashflowTotal = totalIncome + totalExpense;
  const incomeShare = cashflowTotal > 0 ? (totalIncome / cashflowTotal) * 100 : 50;

  const budgetPct = data?.budget_limit > 0
    ? Math.min(100, (data.budget_used / data.budget_limit) * 100)
    : 0;

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Financial Analysis</h2>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.8rem', marginTop: 2 }}>
            Performance and category distribution for {MONTHS[month - 1]} {year}
          </p>
        </div>
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
        <StatCard label="Current Balance" value={balance} hero subtext="Live account balance" />
        <StatCard label="Monthly Income" value={totalIncome} color="var(--green)" subtext={`${MONTHS[month - 1]} ${year}`} />
        <StatCard label="Monthly Expenses" value={totalExpense} color="var(--accent)" subtext={`${MONTHS[month - 1]} ${year}`} />
        <StatCard
          label="Net Savings"
          value={netSavings}
          color={netSavings >= 0 ? 'var(--green)' : 'var(--accent)'}
          subtext={netSavings >= 0 ? 'Positive cashflow' : 'Negative cashflow'}
        />
      </div>

      {/* Cashflow Ratio Bar */}
      {cashflowTotal > 0 && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="label-micro">Cashflow Ratio</span>
            <span className="label-micro" style={{ color: 'var(--ink-muted)' }}>
              {Math.round(incomeShare)}% Income · {Math.round(100 - incomeShare)}% Expenses
            </span>
          </div>
          <div style={s.dualBarTrack}>
            <div style={{ ...s.dualBarFill, width: `${incomeShare}%`, background: 'var(--green)' }} title="Income" />
            <div style={{ ...s.dualBarFill, width: `${100 - incomeShare}%`, background: 'var(--accent)' }} title="Expenses" />
          </div>
        </div>
      )}

      {/* Budget bar */}
      {data?.budget_limit > 0 && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="label-micro">Budget Usage — {MONTHS[month - 1]} {year}</span>
            <span className="label-micro" style={{ color: data.within_budget ? 'var(--green)' : 'var(--accent)' }}>
              {data.within_budget ? '✓ Within budget' : '✗ Over budget'} ({Math.round(budgetPct)}%)
            </span>
          </div>
          <div style={s.barTrack}>
            <div style={{ ...s.barFill, width: `${budgetPct}%`, background: data.within_budget ? 'var(--green)' : 'var(--accent)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ color: 'var(--ink-muted)', fontSize: '0.75rem' }}>₹{fmt(data.budget_used)} used</span>
            <span style={{ color: 'var(--ink-muted)', fontSize: '0.75rem' }}>₹{fmt(data.budget_limit)} limit</span>
          </div>
        </div>
      )}

      {/* Interactive SVG Chart for Expense Breakdown */}
      <DonutChart data={summary?.expense || {}} title={`Expenses by Category — ${MONTHS[month - 1]} ${year}`} />

      {/* Category breakdown with progress bars */}
      {summary && (
        <div style={s.grid2}>
          {['income', 'expense'].map(type => {
            const catMap = summary[type] || {};
            const catEntries = Object.entries(catMap);
            const typeTotal = type === 'income' ? totalIncome : totalExpense;

            return (
              <div key={type} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p className="label-micro" style={{ color: type === 'income' ? 'var(--green)' : 'var(--accent)' }}>
                    {type === 'income' ? 'Income' : 'Expenses'} Breakdown
                  </p>
                  <span className="label-micro">₹{fmt(typeTotal)}</span>
                </div>

                {catEntries.length === 0 ? (
                  <p style={{ color: 'var(--ink-muted)', fontSize: '0.8rem', padding: '12px 0' }}>None this period</p>
                ) : (
                  catEntries.map(([cat, amt]) => {
                    const share = typeTotal > 0 ? (Number(amt) / typeTotal) * 100 : 0;
                    return (
                      <div key={cat} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--ink)' }}>{cat}</span>
                          <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: '0.88rem' }}>
                            ₹{fmt(amt)} <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', fontWeight: 400 }}>({Math.round(share)}%)</span>
                          </span>
                        </div>
                        <div style={s.miniTrack}>
                          <div
                            style={{
                              ...s.miniFill,
                              width: `${share}%`,
                              background: type === 'income' ? 'var(--green)' : 'var(--accent)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
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
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 },
  card: {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
    padding: '22px 24px', boxShadow: 'var(--shadow)',
  },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 },
  barTrack: { height: 8, background: 'var(--inset)', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, transition: 'width 0.6s ease' },
  dualBarTrack: { height: 10, background: 'var(--inset)', borderRadius: 999, overflow: 'hidden', display: 'flex' },
  dualBarFill: { height: '100%', transition: 'width 0.6s ease' },
  miniTrack: { height: 5, background: 'var(--inset)', borderRadius: 999, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 999, transition: 'width 0.4s ease' },
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
