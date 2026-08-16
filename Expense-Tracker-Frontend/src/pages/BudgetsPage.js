import { useState, useEffect, useCallback } from 'react';
import budgetService from '../services/budgetService';
import Modal from '../components/Modal';

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
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} style={s.grid2}>
      {!initial && (
        <>
          <div style={s.field}>
            <label className="label-micro" style={s.lbl}>Month</label>
            <select style={s.input} value={form.month} onChange={e => set('month', +e.target.value)}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div style={s.field}>
            <label className="label-micro" style={s.lbl}>Year</label>
            <input style={s.input} type="number" value={form.year} onChange={e => set('year', +e.target.value)} required />
          </div>
        </>
      )}
      <div style={{ ...s.field, gridColumn: initial ? '1/-1' : '1/-1' }}>
        <label className="label-micro" style={s.lbl}>Monthly Limit (₹)</label>
        <input style={s.input} type="number" min="1" step="0.01" value={form.limit_amount} onChange={e => set('limit_amount', e.target.value)} placeholder="0.00" required />
      </div>
      <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, marginTop: 4 }}>
        <button type="submit" style={s.btnPrimary} disabled={loading}>
          {loading ? 'Saving…' : initial ? 'Update Budget →' : 'Set Budget →'}
        </button>
        <button type="button" style={s.btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function BudgetsPage({ user, show }) {
  const [budgets, setBudgets] = useState([]);
  const [modal, setModal] = useState(null); // null | 'add' | { budget }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await budgetService.list(user.user_id);
      setBudgets(d.budgets || d || []);
    } catch (e) { show(e.message, 'error'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.user_id]);

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
      load();
    } catch (e) { show(e.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return;
    try { await budgetService.remove(id); show('Deleted'); load(); }
    catch (e) { show(e.message, 'error'); }
  };

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Budgets</h2>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.8rem', marginTop: 2 }}>
            Monthly spending limits
          </p>
        </div>
        <button style={s.btnPrimary} onClick={() => setModal('add')}>+ Set Budget</button>
      </div>

      {budgets.length === 0
        ? <div style={s.empty}><span className="label-micro">No budgets set yet</span></div>
        : budgets.map((b, i) => (
          <div key={b.budget_id} className="fade-up" style={{ ...s.row, animationDelay: `${i * 0.04}s` }}>
            <div>
              <p style={s.rowTitle}>{MONTHS[b.month - 1]} {b.year}</p>
              <p className="label-micro" style={{ marginTop: 3 }}>Limit: ₹{fmt(b.limit_amount)}</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={s.iconBtn} onClick={() => setModal({ budget: b })} title="Edit">✎</button>
              <button style={{ ...s.iconBtn, color: 'var(--accent)' }} onClick={() => handleDelete(b.budget_id)} title="Delete">✕</button>
            </div>
          </div>
        ))
      }

      {modal && (
        <Modal
          title={modal?.budget ? 'Edit Budget' : 'Set Monthly Budget'}
          onClose={() => setModal(null)}
          width={400}
        >
          <BudgetForm
            initial={modal?.budget ? { limit_amount: modal.budget.limit_amount } : null}
            onSave={handleSave}
            onCancel={() => setModal(null)}
            loading={saving}
          />
        </Modal>
      )}
    </div>
  );
}

const s = {
  page: { display: 'flex', flexDirection: 'column', gap: 12 },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  pageTitle: { fontFamily: "'Fraunces',serif", fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
  row: {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
    padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  rowTitle: { fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: '0.95rem' },
  iconBtn: { background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', fontSize: '0.9rem', padding: '4px 6px', borderRadius: 6 },
  empty: { padding: '48px 0', textAlign: 'center', color: 'var(--ink-muted)' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 },
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
    transition: 'opacity 0.2s, transform 0.2s', whiteSpace: 'nowrap',
  },
  btnGhost: {
    background: 'transparent', color: 'var(--ink-muted)', border: '1.5px solid var(--border)',
    borderRadius: 10, padding: '8px 16px', fontSize: '0.82rem',
    fontFamily: "'Fraunces',serif", cursor: 'pointer',
  },
};
