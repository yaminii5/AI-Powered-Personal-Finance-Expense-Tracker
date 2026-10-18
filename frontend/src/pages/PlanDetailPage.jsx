import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import planService from '../services/planService';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import AiPlanModal from '../components/AiPlanModal';
import AiChatAdvisor from '../components/AiChatAdvisor';
import { formatPlanDate, formatPlanDateRange } from '../utils/dateUtils';
import './PlanDetailPage.css';

const ITEM_CATEGORIES = [
  'General',
  'Materials',
  'Labor',
  'Stay / Hotel',
  'Travel / Flight',
  'Food & Dining',
  'Activities',
  'Equipment',
  'Permits / Fees',
  'Shopping',
  'Other',
];

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

// Form to add or edit planned line item
function ItemForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(
    initial || {
      title: '',
      category: 'General',
      estimated_amount: '',
      notes: '',
    }
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      estimated_amount: parseFloat(form.estimated_amount) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="planner-form-grid">
      <div className="planner-field full">
        <label className="label-micro">Item Description</label>
        <input
          className="planner-input"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="e.g. Cement (100 bags), Resort Booking"
          required
          autoFocus
        />
      </div>

      <div className="planner-field">
        <label className="label-micro">Category</label>
        <select
          className="planner-input"
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
        >
          {ITEM_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="planner-field">
        <label className="label-micro">Estimated Amount (₹)</label>
        <input
          className="planner-input"
          type="number"
          min="0.01"
          step="0.01"
          value={form.estimated_amount}
          onChange={(e) => set('estimated_amount', e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      <div className="planner-field full">
        <label className="label-micro">Notes (Optional)</label>
        <input
          className="planner-input"
          value={form.notes || ''}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Brand, quantity, vendor or link…"
        />
      </div>

      <div className="planner-form-actions">
        <button type="submit" className="budgets-btn-primary" disabled={loading}>
          {loading ? 'Saving…' : initial ? 'Update Item →' : 'Add Planned Item →'}
        </button>
        <button type="button" className="budgets-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// Form to log actual spend against an item
function LogSpendForm({ item, onSave, onCancel, loading }) {
  const [actualAmount, setActualAmount] = useState(
    item.actual_amount !== null && item.actual_amount !== undefined
      ? item.actual_amount
      : item.estimated_amount || ''
  );
  const [paidDate, setPaidDate] = useState(
    () => item.paid_date || new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState(item.notes || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      actual_amount: parseFloat(actualAmount) || 0,
      is_paid: true,
      paid_date: paidDate,
      notes: notes || undefined,
    });
  };

  const currentEst = Number(item.estimated_amount || 0);
  const enteredAct = parseFloat(actualAmount) || 0;
  const variance = currentEst - enteredAct;

  return (
    <form onSubmit={handleSubmit} className="planner-form-grid">
      <div className="planner-field full" style={{ background: 'var(--inset)', padding: '10px 14px', borderRadius: 10 }}>
        <span className="label-micro" style={{ display: 'block', marginBottom: 2 }}>Planned Item</span>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: '1.05rem', color: 'var(--ink)' }}>
          {item.title}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: 2 }}>
          Estimated Budget: <strong style={{ color: 'var(--ink)' }}>₹{fmt(currentEst)}</strong>
        </div>
      </div>

      <div className="planner-field">
        <label className="label-micro">Actual Spent Amount (₹)</label>
        <input
          className="planner-input"
          type="number"
          min="0.01"
          step="0.01"
          value={actualAmount}
          onChange={(e) => setActualAmount(e.target.value)}
          placeholder="0.00"
          required
          autoFocus
        />
      </div>

      <div className="planner-field">
        <label className="label-micro">Payment Date</label>
        <input
          className="planner-input"
          type="date"
          value={paidDate}
          onChange={(e) => setPaidDate(e.target.value)}
          required
        />
      </div>

      <div className="planner-field full">
        <label className="label-micro">Notes / Bill reference (Optional)</label>
        <input
          className="planner-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Invoice #, store name, or receipt note…"
        />
      </div>

      {enteredAct > 0 && (
        <div className="planner-field full" style={{ fontSize: '0.82rem', padding: '6px 2px' }}>
          Variance:{' '}
          <span
            style={{
              fontWeight: 700,
              color: variance >= 0 ? 'var(--green)' : 'var(--accent)',
            }}
          >
            {variance >= 0
              ? `✓ Saved ₹${fmt(variance)} under estimate`
              : `✗ Exceeded estimate by ₹${fmt(Math.abs(variance))}`}
          </span>
        </div>
      )}

      <div className="planner-form-actions">
        <button type="submit" className="budgets-btn-primary" disabled={loading}>
          {loading ? 'Saving…' : 'Record Purchase →'}
        </button>
        <button type="button" className="budgets-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// Form to edit plan header details
function EditPlanForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    category_type: initial.category_type || 'Trip',
    target_budget: initial.target_budget || '',
    start_date: initial.start_date || '',
    end_date: initial.end_date || '',
    status: initial.status || 'Planning',
    notes: initial.notes || '',
  });

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
        <label className="label-micro">Plan Name</label>
        <input
          className="planner-input"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          required
        />
      </div>

      <div className="planner-field">
        <label className="label-micro">Type</label>
        <select
          className="planner-input"
          value={form.category_type}
          onChange={(e) => set('category_type', e.target.value)}
        >
          {PLAN_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
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
          required
        />
      </div>

      <div className="planner-field">
        <label className="label-micro">Start Date</label>
        <input
          className="planner-input"
          type="date"
          value={form.start_date}
          onChange={(e) => set('start_date', e.target.value)}
        />
      </div>

      <div className="planner-field">
        <label className="label-micro">End Date</label>
        <input
          className="planner-input"
          type="date"
          value={form.end_date}
          onChange={(e) => set('end_date', e.target.value)}
        />
      </div>

      <div className="planner-field full">
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
        <label className="label-micro">Notes</label>
        <textarea
          className="planner-input planner-textarea"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>

      <div className="planner-form-actions">
        <button type="submit" className="budgets-btn-primary" disabled={loading}>
          {loading ? 'Saving…' : 'Save Changes →'}
        </button>
        <button type="button" className="budgets-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function PlanDetailPage({ user, show }) {
  const { planId } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All'); // All | Pending | Paid

  // Modals state
  const [itemModal, setItemModal] = useState(null); // null | 'add' | { item }
  const [spendModal, setSpendModal] = useState(null); // null | { item }
  const [editPlanModal, setEditPlanModal] = useState(false);
  const [aiModal, setAiModal] = useState(false);
  const [aiModalData, setAiModalData] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // null | 'plan' | { item }
  const [actionLoading, setActionLoading] = useState(false);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const data = await planService.get(planId);
      setPlan(data);
    } catch (e) {
      show(e.message, 'error');
    }
    setLoading(false);
  }, [planId, show]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  // Handlers
  const handleSaveItem = async (formData) => {
    setActionLoading(true);
    try {
      if (itemModal?.item) {
        await planService.updateItem(itemModal.item.item_id, formData);
        show('Plan item updated');
      } else {
        await planService.addItem(planId, formData);
        show('Plan item added');
      }
      setItemModal(null);
      await loadPlan();
    } catch (e) {
      show(e.message, 'error');
    }
    setActionLoading(false);
  };

  const handleRecordSpend = async (formData) => {
    if (!spendModal?.item) return;
    setActionLoading(true);
    try {
      await planService.updateItem(spendModal.item.item_id, formData);
      show(`Purchase recorded for "${spendModal.item.title}"`);
      setSpendModal(null);
      await loadPlan();
    } catch (e) {
      show(e.message, 'error');
    }
    setActionLoading(false);
  };

  const handleSavePlan = async (formData) => {
    setActionLoading(true);
    try {
      await planService.update(planId, formData);
      show('Plan updated successfully');
      setEditPlanModal(false);
      await loadPlan();
    } catch (e) {
      show(e.message, 'error');
    }
    setActionLoading(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    setActionLoading(true);
    try {
      if (deleteConfirm === 'plan') {
        await planService.remove(planId);
        show('Plan deleted successfully');
        navigate(`/${user.username}/planner`);
      } else if (deleteConfirm?.item) {
        await planService.removeItem(deleteConfirm.item.item_id);
        show('Item removed from plan');
        setDeleteConfirm(null);
        await loadPlan();
      }
    } catch (e) {
      show(e.message, 'error');
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
        <div className="insights-spinner" style={{ margin: '0 auto 12px' }} />
        <span>Loading plan workspace…</span>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="plan-detail-page">
        <button className="plan-back-btn" onClick={() => navigate(`/${user.username}/planner`)}>
          ← Back to All Plans
        </button>
        <div className="plan-items-empty" style={{ marginTop: 24 }}>
          <h3>Plan not found</h3>
          <p>This plan may have been deleted.</p>
        </div>
      </div>
    );
  }

  const items = plan.items || [];
  const target = Number(plan.target_budget || 0);
  const actualSpent = Number(plan.total_actual || 0);
  const totalEstimated = Number(plan.total_estimated || 0);
  const remainingTarget = Number(plan.remaining_target || 0);
  const netVariance = Number(plan.net_variance || 0);

  const pctSpent = target > 0 ? (actualSpent / target) * 100 : 0;
  const isOverTarget = actualSpent > target;

  const pendingItems = items.filter((it) => !it.is_paid);
  const paidItems = items.filter((it) => it.is_paid);

  const displayedItems = items.filter((it) => {
    if (filter === 'Pending') return !it.is_paid;
    if (filter === 'Paid') return it.is_paid;
    return true;
  });

  return (
    <div className="plan-detail-page">
      {/* Top Breadcrumb */}
      <button className="plan-back-btn" onClick={() => navigate(`/${user.username}/planner`)}>
        ← Back to Budget Plans
      </button>

      {/* Plan Header */}
      <div className="plan-detail-header">
        <div className="plan-detail-meta">
          <div className="plan-detail-title-wrap">
            <h2 className="plan-detail-title">{plan.name}</h2>
            <span className="planner-type-badge">{plan.category_type}</span>
            <span className={`planner-status-pill ${(plan.status || 'planning').toLowerCase()}`}>
              {plan.status}
            </span>
          </div>

          <p className="planner-card-dates" style={{ marginTop: 2 }}>
            📅 {formatPlanDateRange(plan.start_date, plan.end_date)}
          </p>

          {plan.notes && (
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.82rem', marginTop: 4 }}>
              {plan.notes}
            </p>
          )}
        </div>

        <div className="plan-detail-actions">
          <button
            type="button"
            className="ai-plan-trigger-btn"
            onClick={() => setAiModal(true)}
            title="Ask AI questions about this budget or optimize allocations"
          >
            ✦ AI Plan Advisor
          </button>
          <button className="budgets-btn-ghost" onClick={() => setEditPlanModal(true)}>
            Edit Plan
          </button>
          <button
            className="budgets-btn-ghost"
            style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
            onClick={() => setDeleteConfirm('plan')}
          >
            Delete Plan
          </button>
        </div>
      </div>

      {/* Financial Health & Overview Metrics */}
      <div className="plan-metrics-card">
        <div className="plan-metrics-grid">
          <div className="plan-metric-col">
            <span className="label-micro">Target Budget</span>
            <div className="plan-metric-value">₹{fmt(target)}</div>
            <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>Initial ceiling</span>
          </div>

          <div className="plan-metric-col">
            <span className="label-micro">Total Estimated</span>
            <div className="plan-metric-value" style={{ color: 'var(--blue)' }}>
              ₹{fmt(totalEstimated)}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
              {items.length} planned items
            </span>
          </div>

          <div className="plan-metric-col">
            <span className="label-micro">Actual Spent</span>
            <div className="plan-metric-value" style={{ color: 'var(--accent)' }}>
              ₹{fmt(actualSpent)}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
              {paidItems.length} purchased items
            </span>
          </div>

          <div className="plan-metric-col">
            <span className="label-micro">Remaining Buffer</span>
            <div
              className="plan-metric-value"
              style={{ color: remainingTarget >= 0 ? 'var(--green)' : 'var(--accent)' }}
            >
              ₹{fmt(remainingTarget)}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
              {remainingTarget >= 0 ? 'Available buffer' : 'Over budget'}
            </span>
          </div>

          <div className="plan-metric-col">
            <span className="label-micro">Net Variance</span>
            <div
              className="plan-metric-value"
              style={{
                color:
                  paidItems.length === 0
                    ? 'var(--ink-muted)'
                    : netVariance >= 0
                    ? 'var(--green)'
                    : 'var(--accent)',
              }}
            >
              {paidItems.length === 0
                ? '—'
                : `${netVariance >= 0 ? '+' : '-'}₹${fmt(Math.abs(netVariance))}`}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
              {paidItems.length === 0
                ? 'Pending purchases'
                : netVariance >= 0
                ? 'Saved under estimates'
                : 'Exceeded estimates'}
            </span>
          </div>
        </div>

        {/* Target Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="label-micro" style={{ textTransform: 'none' }}>
              Execution Progress ({paidItems.length}/{items.length} items purchased)
            </span>
            <span className="label-micro" style={{ color: isOverTarget ? 'var(--accent)' : 'var(--ink)' }}>
              {Math.round(pctSpent)}% of Target Spent
            </span>
          </div>
          <div className="planner-progress-track" style={{ height: 10 }}>
            <div
              className="planner-progress-fill"
              style={{
                width: `${Math.min(100, pctSpent)}%`,
                background: isOverTarget ? 'var(--accent)' : 'var(--green)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Line Items Workspace */}
      <div className="plan-items-section">
        <div className="plan-items-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 className="plan-items-title">Planned Items & Expenses</h3>
            <div className="planner-filters">
              <button
                className={`planner-filter-btn ${filter === 'All' ? 'active' : ''}`}
                onClick={() => setFilter('All')}
              >
                All ({items.length})
              </button>
              <button
                className={`planner-filter-btn ${filter === 'Pending' ? 'active' : ''}`}
                onClick={() => setFilter('Pending')}
              >
                Pending ({pendingItems.length})
              </button>
              <button
                className={`planner-filter-btn ${filter === 'Paid' ? 'active' : ''}`}
                onClick={() => setFilter('Paid')}
              >
                Paid ({paidItems.length})
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="ai-plan-trigger-btn small"
              onClick={() => setAiModal(true)}
              title="Auto-generate item breakdown with AI"
            >
              ✦ AI Auto-Plan
            </button>
            <button className="budgets-btn-primary" onClick={() => setItemModal('add')}>
              + Add Planned Item
            </button>
          </div>
        </div>

        {displayedItems.length === 0 ? (
          <div className="plan-items-empty">
            <span style={{ fontSize: '1.8rem', opacity: 0.4 }}>📋</span>
            <h4 style={{ fontFamily: "'Fraunces', serif" }}>
              {items.length === 0
                ? 'No items added to this plan yet'
                : `No ${filter.toLowerCase()} items found`}
            </h4>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.82rem' }}>
              {items.length === 0
                ? 'Estimate what you need (e.g. Hotel, Cement, Flight, Painter) and track costs in real time.'
                : 'Switch filters or add new line items to this plan.'}
            </p>
            {items.length === 0 && (
              <button
                className="budgets-btn-primary"
                onClick={() => setItemModal('add')}
                style={{ marginTop: 6 }}
              >
                + Add Your First Item
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayedItems.map((item) => {
              const est = Number(item.estimated_amount || 0);
              const act = item.actual_amount !== null && item.actual_amount !== undefined ? Number(item.actual_amount) : null;
              const variance = act !== null ? est - act : null;

              return (
                <div key={item.item_id} className="plan-item-row fade-up">
                  <div className="plan-item-left">
                    <div className={`plan-item-status-icon ${item.is_paid ? 'paid' : ''}`}>
                      {item.is_paid ? '✓' : '○'}
                    </div>
                    <div className="plan-item-info">
                      <div className="plan-item-title-row">
                        <span className="plan-item-title">{item.title}</span>
                        <span className="label-micro" style={{ background: 'var(--inset)', padding: '2px 6px', borderRadius: 4 }}>
                          {item.category}
                        </span>
                        {item.paid_date && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                            · Paid on {formatPlanDate(item.paid_date)}
                          </span>
                        )}
                      </div>
                      {item.notes && <span className="plan-item-notes">{item.notes}</span>}
                    </div>
                  </div>

                  <div className="plan-item-middle">
                    <div className="plan-amount-box">
                      <span className="label-micro">Estimated</span>
                      <span style={{ fontFamily: "'Spline Sans Mono', monospace", fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
                        ₹{fmt(est)}
                      </span>
                    </div>

                    <div className="plan-amount-box">
                      <span className="label-micro">Actual Spent</span>
                      <span className="plan-item-amount" style={{ color: act !== null ? 'var(--ink)' : 'var(--ink-muted)' }}>
                        {act !== null ? `₹${fmt(act)}` : '— Pending'}
                      </span>
                    </div>

                    <div className="plan-amount-box" style={{ minWidth: 100 }}>
                      <span className="label-micro">Variance</span>
                      {act !== null ? (
                        <span
                          className={`plan-item-variance-badge ${variance >= 0 ? 'saved' : 'over'}`}
                        >
                          {variance >= 0 ? `✓ Saved ₹${fmt(variance)}` : `✗ Over ₹${fmt(Math.abs(variance))}`}
                        </span>
                      ) : (
                        <span className="plan-item-variance-badge pending">Pending</span>
                      )}
                    </div>
                  </div>

                  <div className="plan-item-right">
                    {!item.is_paid ? (
                      <button
                        className="plan-action-btn-pay"
                        onClick={() => setSpendModal({ item })}
                      >
                        Log Purchase
                      </button>
                    ) : (
                      <button
                        className="plan-action-btn-edit-actual"
                        onClick={() => setSpendModal({ item })}
                        title="Edit actual spend"
                      >
                        Edit Actual
                      </button>
                    )}

                    <button
                      className="budget-icon-btn"
                      onClick={() => setItemModal({ item })}
                      title="Edit Item Estimate"
                    >
                      ✎
                    </button>
                    <button
                      className="budget-icon-btn delete"
                      onClick={() => setDeleteConfirm({ item })}
                      title="Delete Item"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Item Modal */}
      {itemModal && (
        <Modal
          title={itemModal?.item ? 'Edit Planned Item' : 'Add Planned Item'}
          onClose={() => setItemModal(null)}
          width={460}
        >
          <ItemForm
            initial={itemModal?.item ? itemModal.item : null}
            onSave={handleSaveItem}
            onCancel={() => setItemModal(null)}
            loading={actionLoading}
          />
        </Modal>
      )}

      {/* Record Spend Modal */}
      {spendModal?.item && (
        <Modal
          title={`Log Purchase — ${spendModal.item.title}`}
          onClose={() => setSpendModal(null)}
          width={460}
        >
          <LogSpendForm
            item={spendModal.item}
            onSave={handleRecordSpend}
            onCancel={() => setSpendModal(null)}
            loading={actionLoading}
          />
        </Modal>
      )}

      {/* Edit Plan Modal */}
      {editPlanModal && (
        <Modal title="Edit Plan Details" onClose={() => setEditPlanModal(false)} width={480}>
          <EditPlanForm
            initial={plan}
            onSave={handleSavePlan}
            onCancel={() => setEditPlanModal(false)}
            loading={actionLoading}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <ConfirmModal
          title={deleteConfirm === 'plan' ? 'Delete Plan' : 'Remove Planned Item'}
          message={
            deleteConfirm === 'plan'
              ? `Are you sure you want to permanently delete plan "${plan.name}" and all its itemized expenses? This cannot be undone.`
              : `Remove "${deleteConfirm.item?.title}" from this plan?`
          }
          confirmText="Delete"
          danger={true}
          loading={actionLoading}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteConfirm(null)}
        />
      )}

      {/* AI Budget Assistant Modal */}
      {aiModal && (
        <AiPlanModal
          initialPlan={plan}
          initialData={aiModalData}
          onClose={() => {
            setAiModal(false);
            setAiModalData(null);
          }}
          onItemsImported={() => {
            loadPlan();
          }}
          showNotification={show}
        />
      )}

      {/* Floating Bottom-Right AI Chat Advisor */}
      <AiChatAdvisor
        plan={plan}
        onOpenGenerator={(prefilled) => {
          setAiModalData(prefilled || null);
          setAiModal(true);
        }}
      />
    </div>
  );
}
