import { useState, useEffect, useCallback } from 'react';
import transactionService from '../services/transactionService';
import userService from '../services/userService';
import Modal from '../components/Modal';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const today = new Date().toISOString().slice(0, 10);

const EMPTY = { type: 'Expense', category: '', title: '', amount: '', date: today, notes: '' };

const CATEGORIES = {
  Expense: ['Food', 'Rent', 'Transport', 'Utilities', 'Shopping', 'Health', 'Entertainment', 'Education', 'Travel', 'Other'],
  Income:  ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Rental Income', 'Other'],
};

function fmt(n) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TxnForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || EMPTY);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} style={s.grid2}>
      <div style={s.field}>
        <label className="label-micro" style={s.lbl}>Type</label>
        <select style={s.input} value={form.type} onChange={e => { set('type', e.target.value); set('category', ''); }}>
          <option>Income</option>
          <option>Expense</option>
        </select>
      </div>
      <div style={s.field}>
        <label className="label-micro" style={s.lbl}>Category</label>
        <select style={s.input} value={form.category} onChange={e => set('category', e.target.value)} required>
          <option value="">Select category…</option>
          {CATEGORIES[form.type].map(c => <option key={c}>{c}</option>)}
        </select>
        {form.category === 'Other' && (
          <input style={{ ...s.input, marginTop: 6 }} placeholder="Specify…" required
            onChange={e => set('category', e.target.value)} />
        )}
      </div>
      <div style={s.field}>
        <label className="label-micro" style={s.lbl}>Title</label>
        <input style={s.input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Description" required />
      </div>
      <div style={s.field}>
        <label className="label-micro" style={s.lbl}>Amount (₹)</label>
        <input style={s.input} type="number" min="0.01" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" required />
      </div>
      <div style={s.field}>
        <label className="label-micro" style={s.lbl}>Date</label>
        <input style={s.input} type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
      </div>
      <div style={s.field}>
        <label className="label-micro" style={s.lbl}>Notes</label>
        <input style={s.input} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional" />
      </div>
      <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, marginTop: 4 }}>
        <button type="submit" style={s.btnPrimary} disabled={loading}>
          {loading ? 'Saving…' : initial ? 'Update →' : 'Add Transaction →'}
        </button>
        <button type="button" style={s.btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

const ALL_CATEGORIES = [...new Set([...CATEGORIES.Expense, ...CATEGORIES.Income])].filter(c => c !== 'Other').sort();

export default function TransactionsPage({ user, show, onUserUpdate }) {
  const [txns, setTxns] = useState([]);
  const [filter, setFilter] = useState({ month: '', year: '', category: '', type: '', sort: 'newest', search: '' });
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await transactionService.list(user.user_id, filter.month, filter.year);
      setTxns(data.transactions || data || []);
    } catch (e) { show(e.message, 'error'); }
  }, [user.user_id, filter.month, filter.year, show]);

  const query = filter.search.trim().toLowerCase();
  const displayed = txns
    .filter(t => !filter.category || t.category === filter.category)
    .filter(t => !filter.type || t.type === filter.type)
    .filter(t => !query || t.title.toLowerCase().includes(query) || (t.notes && t.notes.toLowerCase().includes(query)))
    .sort((a, b) => filter.sort === 'oldest'
      ? new Date(a.date) - new Date(b.date)
      : new Date(b.date) - new Date(a.date)
    );

  const hasFilters = filter.month || filter.year || filter.category || filter.type || filter.search || filter.sort !== 'newest';

  useEffect(() => { load(); }, [load]);

  const syncUserBalance = async () => {
    if (onUserUpdate && user?.username) {
      try {
        const refreshed = await userService.login(user.username);
        if (refreshed) onUserUpdate(refreshed);
      } catch (err) {
        console.error('Failed to sync balance:', err);
      }
    }
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal?.txn) {
        await transactionService.edit(modal.txn.transaction_id, form);
        show('Transaction updated');
      } else {
        await transactionService.add(user.user_id, form);
        show('Transaction added');
      }
      setModal(null);
      await load();
      await syncUserBalance();
    } catch (e) { show(e.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await transactionService.remove(id);
      show('Deleted');
      await load();
      await syncUserBalance();
    } catch (e) { show(e.message, 'error'); }
  };

  const editInitial = (t) => ({
    type: t.type, category: t.category, title: t.title,
    amount: t.amount, date: t.date, notes: t.notes || '',
  });

  return (
    <div style={s.page}>
      {/* Page header */}
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Transactions</h2>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.8rem', marginTop: 2 }}>
            {displayed.length} record{displayed.length !== 1 ? 's' : ''}{displayed.length !== txns.length ? ` (filtered from ${txns.length})` : ''}
          </p>
        </div>
        <button style={s.btnPrimary} onClick={() => setModal('add')}>+ Add Transaction</button>
      </div>

      {/* Filters & Search */}
      <div style={s.filterRow}>
        <input
          style={{ ...s.input, minWidth: 160, flex: 1, maxWidth: 220 }}
          type="text"
          placeholder="🔍 Search title / notes…"
          value={filter.search}
          onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
        />
        <select style={{ ...s.input, width: 'auto' }} value={filter.month} onChange={e => setFilter(f => ({ ...f, month: e.target.value }))}>
          <option value="">All months</option>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <input style={{ ...s.input, width: 88 }} type="number" placeholder="Year" value={filter.year} onChange={e => setFilter(f => ({ ...f, year: e.target.value }))} />
        <select style={{ ...s.input, width: 'auto' }} value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}>
          <option value="">All categories</option>
          {ALL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select style={{ ...s.input, width: 'auto' }} value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
          <option value="">All types</option>
          <option>Income</option>
          <option>Expense</option>
        </select>
        <select style={{ ...s.input, width: 'auto' }} value={filter.sort} onChange={e => setFilter(f => ({ ...f, sort: e.target.value }))}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        {hasFilters && (
          <button style={s.btnGhost} onClick={() => setFilter({ month: '', year: '', category: '', type: '', sort: 'newest', search: '' })}>
            Clear Filters
          </button>
        )}
      </div>

      {/* List */}
      {displayed.length === 0
        ? <div style={s.empty}><span className="label-micro">No matching transactions found</span></div>
        : displayed.map((t, i) => (
          <div key={t.transaction_id} className="fade-up" style={{ ...s.row, animationDelay: `${i * 0.03}s` }}>
            <div style={s.rowLeft}>
              <span style={{ ...s.dot, background: t.type === 'Income' ? 'var(--green)' : 'var(--accent)' }} />
              <div>
                <p style={s.rowTitle}>{t.title}</p>
                <p className="label-micro" style={{ marginTop: 3 }}>{t.category} · {t.date}{t.notes ? ` · ${t.notes}` : ''}</p>
              </div>
            </div>
            <div style={s.rowRight}>
              <span style={{ ...s.amount, color: t.type === 'Income' ? 'var(--green)' : 'var(--accent)' }}>
                {t.type === 'Income' ? '+' : '-'}₹{fmt(t.amount)}
              </span>
              <button style={s.iconBtn} onClick={() => setModal({ txn: t })} title="Edit" aria-label="Edit transaction">✎</button>
              <button style={{ ...s.iconBtn, color: 'var(--accent)' }} onClick={() => handleDelete(t.transaction_id)} title="Delete" aria-label="Delete transaction">✕</button>
            </div>
          </div>
        ))
      }

      {/* Modal */}
      {modal && (
        <Modal
          title={modal?.txn ? 'Edit Transaction' : 'Add Transaction'}
          onClose={() => setModal(null)}
        >
          <TxnForm
            initial={modal?.txn ? editInitial(modal.txn) : null}
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
  filterRow: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  row: {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
    padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 12, transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  rowLeft: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  rowRight: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  rowTitle: { fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  amount: { fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: '1rem' },
  iconBtn: { background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', fontSize: '0.9rem', padding: '4px 6px', borderRadius: 6 },
  empty: { padding: '48px 0', textAlign: 'center', color: 'var(--ink-muted)' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 },
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
    fontFamily: "'Fraunces',serif", cursor: 'pointer', whiteSpace: 'nowrap',
  },
};
