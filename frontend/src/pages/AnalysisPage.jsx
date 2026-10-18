import { useState, useEffect, useCallback } from 'react';
import analysisService from '../services/analysisService';
import transactionService from '../services/transactionService';
import userService from '../services/userService';
import DonutChart from '../components/DonutChart';
import './AnalysisPage.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now = new Date();

function fmt(n) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({ label, value, hero, color, subtext }) {
  return (
    <div className={`statCard stat-card ${hero ? 'hero' : ''}`}>
      <span className="label-micro stat-card-label">{label}</span>
      <span className="stat-card-value" style={{ color: hero ? '#fff' : (color || 'var(--ink)') }}>
        ₹{fmt(value ?? 0)}
      </span>
      {subtext && <span className="stat-card-subtext">{subtext}</span>}
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
        userService.getProfile(user.username),
      ]);
      setData(a);
      setSummary(sm);
      setBalance(u?.current_balance ?? 0);
    } catch {
      setData(null);
      setSummary(null);
    }
    setLoading(false);
  }, [user, month, year]);

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
    <div className="analysis-page">
      {/* Header */}
      <div className="analysis-header">
        <div>
          <h2 className="analysis-title">Financial Analysis</h2>
          <p className="analysis-subtitle">
            Performance and category distribution for {MONTHS[month - 1]} {year}
          </p>
        </div>
        <div className="analysis-controls">
          <select className="analysis-select" value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <input className="analysis-year-input" type="number" value={year} onChange={e => setYear(+e.target.value)} />
          <button className="analysis-btn-primary" onClick={load} disabled={loading}>
            {loading ? '…' : 'Load →'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="analysis-stats-grid">
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
        <div className="analysis-card">
          <div className="analysis-card-header">
            <span className="label-micro">Cashflow Ratio</span>
            <span className="label-micro analysis-ratio-text">
              {Math.round(incomeShare)}% Income · {Math.round(100 - incomeShare)}% Expenses
            </span>
          </div>
          <div className="analysis-dual-bar-track">
            <div className="analysis-dual-bar-fill" style={{ width: `${incomeShare}%`, background: 'var(--green)' }} title="Income" />
            <div className="analysis-dual-bar-fill" style={{ width: `${100 - incomeShare}%`, background: 'var(--accent)' }} title="Expenses" />
          </div>
        </div>
      )}

      {/* Budget bar */}
      {data?.budget_limit > 0 && (
        <div className="analysis-card">
          <div className="analysis-card-header">
            <span className="label-micro">Budget Usage — {MONTHS[month - 1]} {year}</span>
            <span className="label-micro" style={{ color: data.within_budget ? 'var(--green)' : 'var(--accent)' }}>
              {data.within_budget ? '✓ Within budget' : '✗ Over budget'} ({Math.round(budgetPct)}%)
            </span>
          </div>
          <div className="analysis-bar-track">
            <div className="analysis-bar-fill" style={{ width: `${budgetPct}%`, background: data.within_budget ? 'var(--green)' : 'var(--accent)' }} />
          </div>
          <div className="analysis-budget-legend">
            <span className="analysis-budget-legend-text">₹{fmt(data.budget_used)} used</span>
            <span className="analysis-budget-legend-text">₹{fmt(data.budget_limit)} limit</span>
          </div>
        </div>
      )}

      {/* Interactive SVG Chart for Expense Breakdown */}
      <DonutChart data={summary?.expense || {}} title={`Expenses by Category — ${MONTHS[month - 1]} ${year}`} />

      {/* Category breakdown with progress bars */}
      {summary && (
        <div className="analysis-grid2">
          {['income', 'expense'].map(type => {
            const catMap = summary[type] || {};
            const catEntries = Object.entries(catMap);
            const typeTotal = type === 'income' ? totalIncome : totalExpense;

            return (
              <div key={type} className="analysis-card">
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
                      <div key={cat} className="analysis-cat-row">
                        <div className="analysis-cat-row-top">
                          <span className="analysis-cat-name">{cat}</span>
                          <span className="analysis-cat-amount">
                            ₹{fmt(amt)} <span className="analysis-cat-pct">({Math.round(share)}%)</span>
                          </span>
                        </div>
                        <div className="analysis-mini-track">
                          <div
                            className="analysis-mini-fill"
                            style={{
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
        <div className="analysis-empty">
          <span className="label-micro">No data for this period</span>
        </div>
      )}
    </div>
  );
}
