import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import planService from '../services/planService';
import Modal from '../components/Modal';
import { formatPlanDateRange } from '../utils/dateUtils';
import './PlannerPage.css';

const PLAN_CATEGORIES = [
  'Trip',
  'Renovation',
  'Event',
  'Festival',
  'Wedding',
  'Daily Cap',
  'Shopping',
  'Other',
];

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({ label, value, hero, color, subtext, isCurrency = true }) {
  return (
    <div className={`stat-card ${hero ? 'hero' : ''}`}>
      <span className="label-micro stat-card-label">{label}</span>
      <span className="stat-card-value" style={{ color: hero ? '#fff' : (color || 'var(--ink)') }}>
        {isCurrency ? `₹${fmt(value ?? 0)}` : (value ?? 0)}
      </span>
      {subtext && <span className="stat-card-subtext">{subtext}</span>}
    </div>
  );
}

function PlanForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(
    initial || {
      name: '',
      category_type: 'Trip',
      target_budget: '',
      start_date: '',
      end_date: '',
      status: 'Planning',
      notes: '',
    }
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      target_budget: parseFloat(form.target_budget) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="planner-form-grid">
      <div className="planner-field full">
        <label className="label-micro">Plan / Event Title</label>
        <input
          className="planner-input"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. House Renovation, Goa Trip 2026"
          required
          autoFocus
        />
      </div>

      <div className="planner-field">
        <label className="label-micro">Type / Category</label>
        <select
          className="planner-input"
          value={form.category_type}
          onChange={(e) => set('category_type', e.target.value)}
        >
          {PLAN_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="planner-field">
        <label className="label-micro">Target Budget (₹)</label>
        <input
          className="planner-input"
          type="number"
          min="1"
          step="0.01"
          value={form.target_budget}
          onChange={(e) => set('target_budget', e.target.value)}
          placeholder="e.g. 200000"
          required
        />
      </div>

      <div className="planner-field">
        <label className="label-micro">Start Date (Optional)</label>
        <input
          className="planner-input"
          type="date"
          value={form.start_date || ''}
          onChange={(e) => set('start_date', e.target.value)}
        />
      </div>

      <div className="planner-field">
        <label className="label-micro">End Date (Optional)</label>
        <input
          className="planner-input"
          type="date"
          value={form.end_date || ''}
          onChange={(e) => set('end_date', e.target.value)}
        />
      </div>

      <div className="planner-field">
        <label className="label-micro">Status</label>
        <select
          className="planner-input"
          value={form.status}
          onChange={(e) => set('status', e.target.value)}
        >
          <option value="Planning">Planning</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      <div className="planner-field full">
        <label className="label-micro">Notes (Optional)</label>
        <textarea
          className="planner-input planner-textarea"
          value={form.notes || ''}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Any goals, checklist, or scope notes…"
        />
      </div>

      <div className="planner-form-actions">
        <button type="submit" className="budgets-btn-primary" disabled={loading}>
          {loading ? 'Saving…' : initial ? 'Update Plan →' : 'Create Plan →'}
        </button>
        <button type="button" className="budgets-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function PlannerPage({ user, show }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const loadPlans = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await planService.list(user.user_id);
      setPlans(data || []);
    } catch (e) {
      show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, show]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const newPlan = await planService.create(user.user_id, form);
      show(`Created plan "${newPlan.name}"`);
      setModal(false);
      navigate(`/${user.username}/planner/${newPlan.plan_id}`);
    } catch (e) {
      show(e.message, 'error');
    }
    setSaving(false);
  };

  const filteredPlans = plans.filter((p) => {
    if (filterStatus === 'All') return true;
    return p.status.toLowerCase() === filterStatus.toLowerCase();
  });

  // Rollup totals
  const totalTarget = plans.reduce((acc, p) => acc + (p.target_budget || 0), 0);
  const totalSpent = plans.reduce((acc, p) => acc + (p.total_actual || 0), 0);
  const totalVariance = plans.reduce((acc, p) => acc + (p.net_variance || 0), 0);

  return (
    <div className="planner-page">
      {/* Page Header */}
      <div className="planner-header">
        <div>
          <h2 className="planner-title">Budget Planner</h2>
          <p className="planner-subtitle">
            Dedicated event, trip, and renovation budgets with Estimated vs. Actual tracking
          </p>
        </div>
        <button className="budgets-btn-primary" onClick={() => setModal(true)}>
          + Create New Plan
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="planner-stats-grid">
        <StatCard
          label="Active Plans"
          value={plans.filter((p) => p.status !== 'Completed').length}
          hero
          isCurrency={false}
          subtext={`${plans.length} total planned`}
        />
        <StatCard label="Total Target Budget" value={totalTarget} color="var(--blue)" subtext="All events pooled" />
        <StatCard label="Total Actual Spent" value={totalSpent} color="var(--accent)" subtext="Executed transactions" />
        <StatCard
          label="Net Savings / Variance"
          value={Math.abs(totalVariance)}
          color={totalVariance >= 0 ? 'var(--green)' : 'var(--accent)'}
          subtext={totalVariance >= 0 ? 'Saved under estimate' : 'Exceeded estimate'}
        />
      </div>

      {/* Status Filter Tabs */}
      {plans.length > 0 && (
        <div className="planner-filters">
          {['All', 'Planning', 'Ongoing', 'Completed'].map((st) => (
            <button
              key={st}
              className={`planner-filter-btn ${filterStatus === st ? 'active' : ''}`}
              onClick={() => setFilterStatus(st)}
            >
              {st}
            </button>
          ))}
        </div>
      )}

      {/* Plans Grid */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
          <div className="insights-spinner" style={{ margin: '0 auto 12px' }} />
          <span>Loading plans…</span>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="planner-empty">
          <span className="planner-empty-icon">🗺️</span>
          <h3 className="planner-empty-title">
            {plans.length === 0 ? 'No budget plans created yet' : 'No plans match this status'}
          </h3>
          <p className="planner-empty-desc">
            Plan your next vacation, home renovation, wedding, or major purchase with itemized estimated vs. actual expenses.
          </p>
          {plans.length === 0 && (
            <button className="budgets-btn-primary" onClick={() => setModal(true)} style={{ marginTop: 8 }}>
              + Create Your First Plan
            </button>
          )}
        </div>
      ) : (
        <div className="planner-grid">
          {filteredPlans.map((plan) => {
            const target = plan.target_budget || 0;
            const spent = plan.total_actual || 0;
            const pct = target > 0 ? (spent / target) * 100 : 0;
            const isOver = spent > target;
            const statusClass = (plan.status || 'planning').toLowerCase();

            return (
              <div
                key={plan.plan_id}
                className="planner-card fade-up"
                onClick={() => navigate(`/${user.username}/planner/${plan.plan_id}`)}
              >
                <div className="planner-card-header">
                  <div className="planner-card-title-group">
                    <h3 className="planner-card-title">{plan.name}</h3>
                    <p className="planner-card-dates">
                      📅 {formatPlanDateRange(plan.start_date, plan.end_date)}
                    </p>
                  </div>
                  <div className="planner-badge-wrap">
                    <span className="planner-type-badge">{plan.category_type}</span>
                    <span className={`planner-status-pill ${statusClass}`}>{plan.status}</span>
                  </div>
                </div>

                <div className="planner-card-budget-row">
                  <div>
                    <span className="label-micro">Target Budget</span>
                    <div className="planner-budget-amount">₹{fmt(target)}</div>
                  </div>
                  <div className="planner-spent-meta">
                    <span className="label-micro" style={{ color: isOver ? 'var(--accent)' : 'var(--ink-muted)' }}>
                      {isOver ? 'Over Budget' : 'Spent'} ({Math.round(pct)}%)
                    </span>
                    <div className="planner-spent-figure" style={{ color: isOver ? 'var(--accent)' : 'var(--ink)' }}>
                      ₹{fmt(spent)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="planner-progress-track">
                  <div
                    className="planner-progress-fill"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      background: isOver ? 'var(--accent)' : 'var(--green)',
                    }}
                  />
                </div>

                <div className="planner-card-footer">
                  <div className="planner-footer-left">
                    <span className="planner-allocated-text">
                      Est: ₹{fmt(plan.total_estimated)}
                    </span>
                    <span className="planner-paid-count">
                      · {plan.paid_items_count} / {plan.items_count} paid
                    </span>
                  </div>
                  <span
                    className={`planner-variance-text ${
                      plan.paid_items_count === 0
                        ? 'pending'
                        : plan.net_variance >= 0
                        ? 'saved'
                        : 'over'
                    }`}
                  >
                    {plan.paid_items_count === 0
                      ? 'No items paid yet'
                      : plan.net_variance >= 0
                      ? `✓ Saved ₹${fmt(plan.net_variance)}`
                      : `✗ Over by ₹${fmt(Math.abs(plan.net_variance))}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Plan Modal */}
      {modal && (
        <Modal title="Create New Budget Plan" onClose={() => setModal(false)} width={480}>
          <PlanForm onSave={handleSave} onCancel={() => setModal(false)} loading={saving} />
        </Modal>
      )}
    </div>
  );
}
