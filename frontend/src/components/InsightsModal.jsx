import { useEffect, useState, useCallback } from 'react';
import { fetchAIInsights } from '../services/aiInsightsService';
import Modal from './Modal';
import './InsightsModal.css';

const TYPE_CONFIG = {
  warning:  { icon: '⚠️', label: 'Warning' },
  positive: { icon: '✓',  label: 'Good Progress' },
  pattern:  { icon: '📈', label: 'Trend' },
  tip:      { icon: '💡', label: 'Smart Tip' },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now = new Date();

export default function InsightsModal({
  user,
  initialMonth = now.getMonth() + 1,
  initialYear = now.getFullYear(),
  onPeriodChange,
  onClose,
}) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [insights, setInsights] = useState([]);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState([]);

  const load = useCallback(async (m, y, force = false) => {
    const key = `${y}-${m}`;
    if (!force && cache[key]) {
      setInsights(cache[key]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAIInsights(user.user_id, user.username, m, y);
      setCache(prev => ({ ...prev, [key]: data }));
      setInsights(data);
    } catch (e) {
      setError(e.message || 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  }, [user.user_id, user.username, cache]);

  useEffect(() => {
    load(month, year);
  }, [month, year, load]);

  const handlePeriodChange = (newMonth, newYear) => {
    setMonth(newMonth);
    setYear(newYear);
    setDismissed([]);
    if (onPeriodChange) onPeriodChange(newMonth, newYear);
  };

  const handleRefresh = () => {
    setDismissed([]);
    load(month, year, true);
  };

  const visible = insights.filter((_, i) => !dismissed.includes(i));

  const modalTitle = (
    <div className="insights-header-wrap">
      <span className="insights-ai-badge">✦ AI</span>
      <span>Spending Insights</span>
    </div>
  );

  return (
    <Modal title={modalTitle} onClose={onClose} width={560}>
      {/* Period Selector & Meta Bar */}
      <div className="insights-period-bar">
        <div className="insights-period-controls">
          <div className="insights-control-group">
            <label className="label-micro insights-control-lbl">Month</label>
            <select
              className="insights-select"
              value={month}
              onChange={(e) => handlePeriodChange(+e.target.value, year)}
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="insights-control-group">
            <label className="label-micro insights-control-lbl">Year</label>
            <input
              className="insights-year-input"
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(e) => handlePeriodChange(month, +e.target.value)}
            />
          </div>
        </div>

        <div className="insights-period-meta">
          <span className="insights-model-tag">
            {MONTHS[month - 1]} {year} · Groq Llama 3
          </span>
          <button
            className="insights-refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
            title="Re-generate insights for this period"
          >
            {loading ? '…' : '↻ Re-analyze'}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="insights-loading-state">
          <div className="insights-spinner" />
          <p className="insights-loading-title">Analyzing Spending Patterns</p>
          <p className="insights-loading-desc">
            Evaluating {MONTHS[month - 1]} {year} transactions, budgets, and cashflow...
          </p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="insights-error-state">
          <span className="insights-error-icon">⚠️</span>
          <div className="insights-error-content">
            <p className="insights-error-title">Unable to generate insights</p>
            <p className="insights-error-desc">{error}</p>
            <button className="insights-retry-btn" onClick={handleRefresh}>
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Insights List */}
      {!loading && !error && (
        <>
          {visible.length === 0 ? (
            <div className="insights-empty-state">
              <span className="insights-empty-icon">{insights.length > 0 ? '✓' : '✦'}</span>
              <p className="insights-empty-title">
                {insights.length > 0 ? 'All insights reviewed' : 'No insights available'}
              </p>
              <p className="insights-empty-desc">
                {insights.length > 0
                  ? 'You have dismissed all insights for this period.'
                  : `No transaction records found for ${MONTHS[month - 1]} ${year}. Add income or expense transactions to unlock AI analysis.`}
              </p>
              {insights.length > 0 && (
                <button className="insights-reset-btn" onClick={() => setDismissed([])}>
                  Restore Dismissed Insights
                </button>
              )}
            </div>
          ) : (
            <div className="insights-list">
              {visible.map((insight) => {
                const cfg = TYPE_CONFIG[insight.type] || TYPE_CONFIG.tip;
                const originalIdx = insights.indexOf(insight);
                return (
                  <div
                    key={originalIdx}
                    className={`insights-card type-${insight.type || 'tip'}`}
                  >
                    <div className="insights-card-icon-col">
                      <div className="insights-card-icon-badge">
                        {cfg.icon}
                      </div>
                    </div>
                    <div className="insights-card-content">
                      <div className="insights-card-header">
                        <span className="label-micro insights-type-pill">
                          {cfg.label}
                        </span>
                        <h4 className="insights-card-title">{insight.title}</h4>
                      </div>
                      <p className="insights-card-msg">{insight.message}</p>
                    </div>
                    <button
                      className="insights-dismiss-btn"
                      onClick={() => setDismissed((d) => [...d, originalIdx])}
                      title="Dismiss this insight"
                      aria-label="Dismiss insight"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
