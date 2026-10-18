import { useState, useEffect, useCallback } from 'react';
import budgetService from '../services/budgetService';
import analysisService from '../services/analysisService';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import './BudgetsPage.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now = new Date();

function fmt(n) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BudgetForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(
    initial || { month: now.getMonth() + 1, year: now.getFullYear(), limit_amount: '' }
  );
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="budgets-form-grid">
      {initial ? (
        <div className="budgets-period-box">
          <span className="label-micro" style={{ display: 'block', marginBottom: 2 }}>Budget Period</span>
          <span className="budgets-period-title">
            {MONTHS[initial.month - 1]} {initial.year}
          </span>
        </div>
      ) : (
        <>
          <div className="budgets-field">
            <label className="label-micro budgets-lbl">Month</label>
            <select className="budgets-input" value={form.month} onChange={e => set('month', +e.target.value)}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="budgets-field">
            <label className="label-micro budgets-lbl">Year</label>
            <input className="budgets-input" type="number" min="2000" max="2100" value={form.year} onChange={e => set('year', +e.target.value)} required />
          </div>
        </>
      )}
      <div className="budgets-field full-width">
        <label className="label-micro budgets-lbl">Monthly Limit (₹)</label>
        <input className="budgets-input" type="number" min="1" step="0.01" value={form.limit_amount} onChange={e => set('limit_amount', e.target.value)} placeholder="0.00" required />
      </div>
      <div className="budgets-form-actions">
        <button type="submit" className="budgets-btn-primary" disabled={loading}>
          {loading ? 'Saving…' : initial ? 'Update Budget →' : 'Set Budget →'}
        </button>
        <button type="button" className="budgets-btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function BudgetsPage({ user, show }) {
  const [budgets, setBudgets] = useState([]);
  const [spendingMap, setSpendingMap] = useState({});
  const [modal, setModal] = useState(null); // null | 'add' | { budget }
  const [deleteBudget, setDeleteBudget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await budgetService.list(user.user_id);
      const list = d.budgets || d || [];
      setBudgets(list);

      // Fetch progress metrics for each budget in parallel
      const analyses = await Promise.allSettled(
        list.map(b => analysisService.get(user.user_id, b.month, b.year))
      );
      const map = {};
      list.forEach((b, idx) => {
        const res = analyses[idx];
        if (res.status === 'fulfilled' && res.value) {
          map[b.budget_id] = {
            spent: res.value.total_expenses ?? 0,
            within: res.value.within_budget ?? ((res.value.total_expenses ?? 0) <= b.limit_amount),
          };
        }
      });
      setSpendingMap(map);
    } catch (e) { show(e.message, 'error'); }
  }, [user.user_id, show]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal?.budget) {
        await budgetService.update(modal.budget.budget_id, form.limit_amount);
        show('Budget updated');
      } else {
        await budgetService.add(user.user_id, form);
        show('Budget set');
      }
      setModal(null);
      await load();
    } catch (e) { show(e.message, 'error'); }
    setSaving(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteBudget) return;
    setDeleting(true);
    try {
      await budgetService.remove(deleteBudget.budget_id);
      show('Budget deleted');
      setDeleteBudget(null);
      await load();
    } catch (e) { show(e.message, 'error'); }
    setDeleting(false);
  };

  return (
    <div className="budgets-page">
      <div className="budgets-header">
        <div>
          <h2 className="budgets-title">Budgets</h2>
          <p className="budgets-subtitle">
            Monthly spending limits and real-time expenditure tracking
          </p>
        </div>
        <button className="budgets-btn-primary" onClick={() => setModal('add')}>+ Set Budget</button>
      </div>

      {budgets.length === 0
        ? <div className="budgets-empty"><span className="label-micro">No budgets set yet</span></div>
        : budgets.map((b, i) => {
          const progress = spendingMap[b.budget_id];
          const spent = progress ? progress.spent : 0;
          const limit = Number(b.limit_amount);
          const pct = limit > 0 ? (spent / limit) * 100 : 0;
          const isOver = spent > limit;

          return (
            <div key={b.budget_id} className="fade-up budgets-card" style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="budgets-card-header">
                <div>
                  <h3 className="budgets-row-title">{MONTHS[b.month - 1]} {b.year}</h3>
                  <p className="label-micro budgets-limit-text">
                    Limit: ₹{fmt(limit)}
                  </p>
                </div>
                <div className="budgets-card-actions">
                  <span
                    className={`label-micro budget-badge ${isOver ? 'over' : 'within'}`}
                  >
                    {isOver ? '✗ Over budget' : '✓ Within budget'} ({Math.round(pct)}%)
                  </span>
                  <button className="budget-icon-btn" onClick={() => setModal({ budget: b })} title="Edit" aria-label="Edit budget">✎</button>
                  <button className="budget-icon-btn delete" onClick={() => setDeleteBudget(b)} title="Delete" aria-label="Delete budget">✕</button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="budgets-bar-track">
                <div
                  className="budgets-bar-fill"
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    background: isOver ? 'var(--accent)' : 'var(--green)',
                  }}
                />
              </div>

              {/* Spending Breakdown Readout */}
              <div className="budgets-breakdown-readout">
                <span className="budgets-spent-text">
                  ₹{fmt(spent)} spent
                </span>
                <span className={`budgets-remaining-text ${isOver ? 'over' : ''}`}>
                  {isOver ? `Exceeded by ₹${fmt(spent - limit)}` : `₹${fmt(Math.max(0, limit - spent))} remaining`}
                </span>
              </div>
            </div>
          );
        })
      }

      {/* Set/Edit Budget Modal */}
      {modal && (
        <Modal
          title={modal?.budget ? `Edit Budget — ${MONTHS[modal.budget.month - 1]} ${modal.budget.year}` : 'Set Monthly Budget'}
          onClose={() => setModal(null)}
          width={420}
        >
          <BudgetForm
            initial={modal?.budget ? modal.budget : null}
            onSave={handleSave}
            onCancel={() => setModal(null)}
            loading={saving}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteBudget && (
        <ConfirmModal
          title="Delete Budget"
          message={`Are you sure you want to delete the budget limit of ₹${fmt(deleteBudget.limit_amount)} for ${MONTHS[deleteBudget.month - 1]} ${deleteBudget.year}?`}
          confirmText="Delete"
          danger={true}
          loading={deleting}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteBudget(null)}
        />
      )}
    </div>
  );
}
