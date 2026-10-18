import { useState, useEffect, useCallback } from 'react';
import transactionService from '../services/transactionService';
import userService from '../services/userService';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import './TransactionsPage.css';

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
  const typeCategories = CATEGORIES[form.type] || [];

  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (!initial?.category) return '';
    return typeCategories.includes(initial.category) ? initial.category : 'Other';
  });
  const [customCategory, setCustomCategory] = useState(() => {
    if (!initial?.category) return '';
    return typeCategories.includes(initial.category) && initial.category !== 'Other' ? '' : initial.category;
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleTypeSelect = (newType) => {
    set('type', newType);
    setSelectedCategory('');
    setCustomCategory('');
    set('category', '');
  };

  const handleCategorySelect = (e) => {
    const val = e.target.value;
    setSelectedCategory(val);
    if (val === 'Other') {
      set('category', customCategory);
    } else {
      set('category', val);
    }
  };

  const handleCustomCategoryChange = (e) => {
    const val = e.target.value;
    setCustomCategory(val);
    set('category', val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalCategory = selectedCategory === 'Other' ? (customCategory.trim() || 'Other') : form.category;
    onSave({ ...form, amount: parseFloat(form.amount), category: finalCategory });
  };

  return (
    <form onSubmit={handleSubmit} className="txns-form-grid">
      <div className="txns-field">
        <label className="label-micro txns-lbl">Type</label>
        <div className="txns-segmented-control">
          <button
            type="button"
            className={`txns-segment-btn ${form.type === 'Income' ? 'active-income' : 'inactive'}`}
            onClick={() => handleTypeSelect('Income')}
          >
            + Income
          </button>
          <button
            type="button"
            className={`txns-segment-btn ${form.type === 'Expense' ? 'active-expense' : 'inactive'}`}
            onClick={() => handleTypeSelect('Expense')}
          >
            - Expense
          </button>
        </div>
      </div>
      <div className="txns-field">
        <label className="label-micro txns-lbl">Category</label>
        <select className="txns-input" value={selectedCategory} onChange={handleCategorySelect} required>
          <option value="">Select category…</option>
          {CATEGORIES[form.type].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {selectedCategory === 'Other' && (
          <input
            className="txns-input"
            style={{ marginTop: 6 }}
            placeholder="Specify custom category…"
            value={customCategory}
            onChange={handleCustomCategoryChange}
            required
            autoFocus
          />
        )}
      </div>
      <div className="txns-field">
        <label className="label-micro txns-lbl">Title</label>
        <input className="txns-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Description" required />
      </div>
      <div className="txns-field">
        <label className="label-micro txns-lbl">Amount (₹)</label>
        <input className="txns-input" type="number" min="0.01" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" required />
      </div>
      <div className="txns-field">
        <label className="label-micro txns-lbl">Date</label>
        <input className="txns-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
      </div>
      <div className="txns-field">
        <label className="label-micro txns-lbl">Notes</label>
        <input className="txns-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional" />
      </div>
      <div className="txns-form-actions">
        <button type="submit" className="txns-btn-primary" disabled={loading}>
          {loading ? 'Saving…' : initial ? 'Update →' : 'Add Transaction →'}
        </button>
        <button type="button" className="txns-btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

const ALL_CATEGORIES = [...new Set([...CATEGORIES.Expense, ...CATEGORIES.Income])].filter(c => c !== 'Other').sort();

export default function TransactionsPage({ user, show, onUserUpdate }) {
  const [txns, setTxns] = useState([]);
  const [filter, setFilter] = useState({ month: '', year: '', category: '', type: '', sort: 'newest', search: '' });
  const [modal, setModal] = useState(null);
  const [deleteTxn, setDeleteTxn] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

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

  const updateFilter = (fn) => {
    setFilter(fn);
    setPage(1);
  };

  const effectivePageSize = pageSize === 'all' ? (displayed.length || 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(displayed.length / effectivePageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * effectivePageSize;
  const paginated = pageSize === 'all' ? displayed : displayed.slice(startIdx, startIdx + effectivePageSize);

  const syncUserBalance = async () => {
    if (onUserUpdate && user?.username) {
      try {
        const refreshed = await userService.getProfile(user.username);
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

  const handleDeleteConfirm = async () => {
    if (!deleteTxn) return;
    setDeleting(true);
    try {
      await transactionService.remove(deleteTxn.transaction_id);
      show('Transaction deleted');
      setDeleteTxn(null);
      await load();
      await syncUserBalance();
    } catch (e) { show(e.message, 'error'); }
    setDeleting(false);
  };

  const editInitial = (t) => ({
    type: t.type, category: t.category, title: t.title,
    amount: t.amount, date: t.date, notes: t.notes || '',
  });

  return (
    <div className="txns-page">
      {/* Page header */}
      <div className="txns-header">
        <div>
          <h2 className="txns-title">Transactions</h2>
          <p className="txns-subtitle">
            {displayed.length} record{displayed.length !== 1 ? 's' : ''}{displayed.length !== txns.length ? ` (filtered from ${txns.length})` : ''}
          </p>
        </div>
        <button className="txns-btn-primary" onClick={() => setModal('add')}>+ Add Transaction</button>
      </div>

      {/* Filters & Search */}
      <div className="txns-filter-row">
        <input
          className="txns-search-input"
          type="text"
          placeholder="🔍 Search title / notes…"
          value={filter.search}
          onChange={e => updateFilter(f => ({ ...f, search: e.target.value }))}
        />
        <select className="txns-filter-select" value={filter.month} onChange={e => updateFilter(f => ({ ...f, month: e.target.value }))}>
          <option value="">All months</option>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <input className="txns-year-input" type="number" placeholder="Year" value={filter.year} onChange={e => updateFilter(f => ({ ...f, year: e.target.value }))} />
        <select className="txns-filter-select" value={filter.category} onChange={e => updateFilter(f => ({ ...f, category: e.target.value }))}>
          <option value="">All categories</option>
          {ALL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="txns-filter-select" value={filter.type} onChange={e => updateFilter(f => ({ ...f, type: e.target.value }))}>
          <option value="">All types</option>
          <option>Income</option>
          <option>Expense</option>
        </select>
        <select className="txns-filter-select" value={filter.sort} onChange={e => updateFilter(f => ({ ...f, sort: e.target.value }))}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        {hasFilters && (
          <button className="txns-btn-ghost" onClick={() => updateFilter({ month: '', year: '', category: '', type: '', sort: 'newest', search: '' })}>
            Clear Filters
          </button>
        )}
      </div>

      {/* List */}
      {displayed.length === 0
        ? <div className="txns-empty"><span className="label-micro">No matching transactions found</span></div>
        : paginated.map((t, i) => (
          <div key={t.transaction_id} className="fade-up txnRow txn-row" style={{ animationDelay: `${i * 0.03}s` }}>
            <div className="txn-row-left">
              <span className={`txn-dot ${t.type === 'Income' ? 'income' : 'expense'}`} />
              <div>
                <p className="txn-row-title">{t.title}</p>
                <p className="label-micro txn-meta">{t.category} · {t.date}{t.notes ? ` · ${t.notes}` : ''}</p>
              </div>
            </div>
            <div className="txn-row-right">
              <span className={`txn-amount ${t.type === 'Income' ? 'income' : 'expense'}`}>
                {t.type === 'Income' ? '+' : '-'}₹{fmt(t.amount)}
              </span>
              <button className="txn-icon-btn" onClick={() => setModal({ txn: t })} title="Edit" aria-label="Edit transaction">✎</button>
              <button className="txn-icon-btn delete" onClick={() => setDeleteTxn(t)} title="Delete" aria-label="Delete transaction">✕</button>
            </div>
          </div>
        ))
      }

      {/* Pagination Bar */}
      {displayed.length > 0 && (
        <div className="txns-pagination-row">
          <span className="label-micro" style={{ color: 'var(--ink-muted)' }}>
            Showing {startIdx + 1}–{Math.min(startIdx + effectivePageSize, displayed.length)} of {displayed.length}
          </span>
          <div className="txns-pagination-controls">
            <div className="txns-page-size-group">
              <span className="label-micro" style={{ textTransform: 'none' }}>Per page:</span>
              <select
                className="txns-page-size-select"
                value={pageSize}
                onChange={e => {
                  const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                  setPageSize(val);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value="all">All</option>
              </select>
            </div>
            {pageSize !== 'all' && totalPages > 1 && (
              <div className="txns-page-nav">
                <button
                  className="txns-page-nav-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  ← Prev
                </button>
                <span className="label-micro">
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="txns-page-nav-btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit/Add Modal */}
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

      {/* Delete Confirmation Modal */}
      {deleteTxn && (
        <ConfirmModal
          title="Delete Transaction"
          message={`Are you sure you want to delete "${deleteTxn.title}" (₹${fmt(deleteTxn.amount)})? This will automatically update your account balance.`}
          confirmText="Delete"
          danger={true}
          loading={deleting}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTxn(null)}
        />
      )}
    </div>
  );
}
