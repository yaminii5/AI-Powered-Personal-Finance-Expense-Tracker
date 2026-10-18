import { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import planService from '../services/planService';
import './AiPlanModal.css';

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

const PROMPT_CHIPS = [
  'What are common hidden costs to budget for?',
  'How to negotiate or save on vendors & stays?',
  'How to distribute funds between travel & activities?',
  'What contingency buffer percentage is safest?',
];

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Inline markdown renderer: bold, italics, prices (₹), percentages (%)
function renderFormattedMarkdown(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={idx}>{part.slice(1, -1)}</strong>;
    }
    // Highlight currency amounts (₹X,XXX) and percentages (e.g. 0.5% - 2%)
    const subParts = part.split(/(₹\s*[\d,]+(?:\.\d+)?(?:\s*[-–—]\s*₹?[\d,]+)?|\d+(?:\.\d+)?\s*%\s*[-–—]\s*\d+(?:\.\d+)?\s*%|\d+(?:\.\d+)?\s*%)/g);
    if (subParts.length > 1) {
      return (
        <span key={idx}>
          {subParts.map((sp, sIdx) => {
            if (/₹|%/.test(sp)) {
              return (
                <span key={sIdx} className="ai-plan-highlight-pill">
                  {sp}
                </span>
              );
            }
            return sp;
          })}
        </span>
      );
    }
    return part;
  });
}

// Markdown block parser (tables, headings, lists, paragraphs)
function parseMarkdownBlocks(text) {
  if (!text) return [];

  const clean = text
    .replace(/\u202f|\u00a0/g, ' ')
    .replace(/\u2011/g, '-')
    .trim();

  const rawLines = clean.split('\n');
  const blocks = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i].trim();

    if (!line || /^[-*_]{3,}$/.test(line)) {
      i++;
      continue;
    }

    // Markdown table detection
    if (line.includes('|')) {
      const tableLines = [];
      while (i < rawLines.length && rawLines[i].trim().includes('|')) {
        tableLines.push(rawLines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split('|')
          .map((c) => c.trim())
          .filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));

        const rowLines = tableLines.slice(1).filter((l) => !/^[|\s-:]+$/.test(l));

        const rows = rowLines.map((r) =>
          r
            .split('|')
            .map((c) => c.trim())
            .filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''))
        );

        blocks.push({
          type: 'table',
          headers: headerCells,
          rows,
        });
        continue;
      }
    }

    // Headings: "# ", "## ", "### "
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // Lists: "- ", "* ", "• ", "1. "
    if (/^(?:[-*•]|\d+\.)\s+/.test(line)) {
      const listItems = [];
      while (i < rawLines.length && /^(?:[-*•]|\d+\.)\s+/.test(rawLines[i].trim())) {
        const itemLine = rawLines[i].trim().replace(/^(?:[-*•]|\d+\.)\s+/, '');
        listItems.push(itemLine);
        i++;
      }
      blocks.push({
        type: 'list',
        items: listItems,
      });
      continue;
    }

    // Paragraph
    const paraLines = [];
    while (
      i < rawLines.length &&
      rawLines[i].trim() &&
      !rawLines[i].trim().includes('|') &&
      !/^#{1,6}\s+/.test(rawLines[i].trim()) &&
      !/^(?:[-*•]|\d+\.)\s+/.test(rawLines[i].trim())
    ) {
      paraLines.push(rawLines[i].trim());
      i++;
    }

    if (paraLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: paraLines.join(' '),
      });
    }
  }

  return blocks;
}

// Structured Advisor response component with tables, headings, checklists
function ParsedAdvisorResponse({ content }) {
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);

  return (
    <div className="ai-plan-parsed-content">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return (
            <div key={idx} className="ai-plan-advisor-subhead">
              <span className="ai-plan-subhead-accent" />
              <h4>{renderFormattedMarkdown(block.text)}</h4>
            </div>
          );
        }

        if (block.type === 'table') {
          return (
            <div key={idx} className="ai-plan-table-wrap">
              <table className="ai-plan-advisor-table">
                <thead>
                  <tr>
                    {block.headers.map((h, hIdx) => (
                      <th key={hIdx}>{renderFormattedMarkdown(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx}>{renderFormattedMarkdown(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={idx} className="ai-plan-parsed-list">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx}>
                  <span className="ai-plan-list-bullet">✦</span>
                  <div className="ai-plan-list-text">{renderFormattedMarkdown(item)}</div>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={idx} className="ai-plan-parsed-p">
            {renderFormattedMarkdown(block.text)}
          </p>
        );
      })}
    </div>
  );
}

export default function AiPlanModal({
  onClose,
  initialPlan = null,
  initialData = null,
  userId = null,
  onPlanCreated = null,
  onItemsImported = null,
  showNotification,
}) {
  const [tab, setTab] = useState('generate'); // 'generate' | 'advisor'

  // Generator form state
  const [form, setForm] = useState({
    name: initialData?.name || initialPlan?.name || '',
    category_type: initialData?.category_type || initialPlan?.category_type || 'Trip',
    target_budget: initialData?.target_budget
      ? String(initialData.target_budget)
      : initialPlan?.target_budget
      ? String(initialPlan.target_budget)
      : '',
    notes: initialData?.notes || initialPlan?.notes || '',
  });

  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(() => initialData?.suggestion || null);
  const [selectedItems, setSelectedItems] = useState(() => {
    if (initialData?.suggestion?.items) {
      const sel = {};
      initialData.suggestion.items.forEach((_, idx) => {
        sel[idx] = true;
      });
      return sel;
    }
    return {};
  });
  const [importing, setImporting] = useState(false);

  // Sync if initialData changes after mount
  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || initialPlan?.name || '',
        category_type: initialData.category_type || initialPlan?.category_type || 'Trip',
        target_budget: initialData.target_budget ? String(initialData.target_budget) : '',
        notes: initialData.notes || '',
      });
      if (initialData.suggestion) {
        setSuggestion(initialData.suggestion);
        const sel = {};
        (initialData.suggestion.items || []).forEach((_, idx) => {
          sel[idx] = true;
        });
        setSelectedItems(sel);
      }
    }
  }, [initialData, initialPlan]);

  // Advisor Q&A state
  const [question, setQuestion] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorAnswer, setAdvisorAnswer] = useState(null);

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  // Handle AI breakdown generation
  const handleGenerate = async (e) => {
    e.preventDefault();
    const budgetNum = parseFloat(form.target_budget);
    if (!budgetNum || budgetNum <= 0) {
      showNotification('Please enter a valid target budget.', 'error');
      return;
    }

    setLoading(true);
    setSuggestion(null);
    try {
      const data = await planService.getAiSuggestion({
        name: form.name,
        category_type: form.category_type,
        target_budget: budgetNum,
        notes: form.notes || undefined,
      });

      setSuggestion(data);
      // Select all suggested items by default
      const sel = {};
      (data.items || []).forEach((_, idx) => {
        sel[idx] = true;
      });
      setSelectedItems(sel);
    } catch (err) {
      showNotification(err.message || 'Failed to generate budget breakdown.', 'error');
    }
    setLoading(false);
  };

  // Toggle individual item checkbox
  const toggleItem = (idx) => {
    setSelectedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Import items into existing plan or create new plan with items
  const handleApplyItems = async () => {
    if (!suggestion || !suggestion.items) return;
    const itemsToImport = suggestion.items.filter((_, idx) => selectedItems[idx]);

    if (itemsToImport.length === 0) {
      showNotification('Select at least one item to import.', 'error');
      return;
    }

    setImporting(true);
    try {
      if (initialPlan) {
        // Bulk add to existing plan
        await planService.bulkAddItems(initialPlan.plan_id, itemsToImport);
        showNotification(`✓ ${itemsToImport.length} items added to ${initialPlan.name}!`);
        if (onItemsImported) onItemsImported();
        onClose();
      } else if (userId) {
        // Create new plan and bulk add items
        const newPlan = await planService.create(userId, {
          name: form.name,
          category_type: form.category_type,
          target_budget: parseFloat(form.target_budget) || 0,
          status: 'Planning',
          notes: form.notes || undefined,
        });

        await planService.bulkAddItems(newPlan.plan_id, itemsToImport);
        showNotification(`✓ Plan "${newPlan.name}" created with ${itemsToImport.length} items!`);
        if (onPlanCreated) onPlanCreated(newPlan);
        onClose();
      }
    } catch (err) {
      showNotification(err.message || 'Failed to apply items to plan.', 'error');
    }
    setImporting(false);
  };

  // Handle Q&A Advisor
  const handleAskAdvisor = async (promptText) => {
    const q = promptText || question;
    if (!q || !q.trim()) return;

    setAdvisorLoading(true);
    setAdvisorAnswer(null);
    try {
      const data = await planService.askAiAdvisor({
        question: q,
        plan_id: initialPlan?.plan_id,
        target_budget: parseFloat(form.target_budget) || initialPlan?.target_budget || undefined,
        category_type: form.category_type || initialPlan?.category_type || undefined,
        event_name: form.name || initialPlan?.name || undefined,
      });
      setAdvisorAnswer(data.answer);
    } catch (err) {
      showNotification(err.message || 'Failed to consult AI advisor.', 'error');
    }
    setAdvisorLoading(false);
  };

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const selectedSum = (suggestion?.items || [])
    .filter((_, idx) => selectedItems[idx])
    .reduce((acc, it) => acc + (it.estimated_amount || 0), 0);

  return (
    <Modal
      title="✦ AI Budget Assistant"
      onClose={onClose}
      width={680}
    >
      <div className="ai-plan-modal-container">
        {/* Navigation Tabs */}
        <div className="ai-plan-tabs">
          <button
            type="button"
            className={`ai-plan-tab-btn ${tab === 'generate' ? 'active' : ''}`}
            onClick={() => setTab('generate')}
          >
            🪄 Auto-Plan Breakdown
          </button>
          <button
            type="button"
            className={`ai-plan-tab-btn ${tab === 'advisor' ? 'active' : ''}`}
            onClick={() => setTab('advisor')}
          >
            💬 Ask Plan Advisor
          </button>
        </div>

        {/* TAB 1: Auto-Plan Generator */}
        {tab === 'generate' && (
          <div className="ai-plan-section">
            <form onSubmit={handleGenerate} className="ai-plan-form-grid">
              <div className="ai-plan-field full">
                <label className="label-micro">Event / Project Name</label>
                <input
                  className="ai-plan-input"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="e.g. 4-Day Goa Trip, Kitchen Renovation, Birthday Bash"
                  required
                />
              </div>

              <div className="ai-plan-field">
                <label className="label-micro">Category</label>
                <select
                  className="ai-plan-input"
                  value={form.category_type}
                  onChange={(e) => setField('category_type', e.target.value)}
                >
                  {PLAN_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ai-plan-field">
                <label className="label-micro">Target Budget (₹)</label>
                <input
                  className="ai-plan-input"
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.target_budget}
                  onChange={(e) => setField('target_budget', e.target.value)}
                  placeholder="e.g. 40000"
                  required
                />
              </div>

              <div className="ai-plan-field full">
                <label className="label-micro">Specific Requirements / Context (Optional)</label>
                <input
                  className="ai-plan-input"
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  placeholder="e.g. For 2 adults, flight from Mumbai, prefer beach hotels"
                />
              </div>

              <div className="ai-plan-field full" style={{ marginTop: 2 }}>
                <button
                  type="submit"
                  className="ai-plan-btn-generate"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="ai-plan-spinner" /> Generating Smart Breakdown…
                    </>
                  ) : (
                    '✦ Generate Itemized Breakdown with Groq AI →'
                  )}
                </button>
              </div>
            </form>

            {/* Generated Results */}
            {suggestion && (
              <div className="ai-plan-results fade-up">
                <div className="ai-plan-summary-banner">
                  <div>
                    <span className="label-micro" style={{ color: 'var(--accent)' }}>AI Strategy</span>
                    <p className="ai-plan-summary-text">{suggestion.summary}</p>
                  </div>
                  {suggestion.contingency_buffer > 0 && (
                    <div className="ai-plan-buffer-badge">
                      <span className="label-micro">Buffer Reserve</span>
                      <strong>₹{fmt(suggestion.contingency_buffer)}</strong>
                    </div>
                  )}
                </div>

                {/* Day-by-Day Places & Itinerary Breakdown */}
                {suggestion.day_wise_itinerary?.length > 0 && (
                  <div className="ai-plan-itinerary-wrap">
                    <div className="ai-plan-itinerary-header">
                      <span className="label-micro" style={{ color: 'var(--blue)' }}>
                        📅 Day-by-Day Places & Schedule
                      </span>
                      <span className="label-micro" style={{ color: 'var(--ink-muted)' }}>
                        {suggestion.day_wise_itinerary.length} Days Itinerary
                      </span>
                    </div>
                    <div className="ai-plan-itinerary-list">
                      {suggestion.day_wise_itinerary.map((step, idx) => {
                        const parts = step.split(': ');
                        const dayLabel = parts.length > 1 ? parts[0] : `Day ${idx + 1}`;
                        const dayDesc = parts.length > 1 ? parts.slice(1).join(': ') : step;
                        return (
                          <div key={idx} className="ai-plan-itinerary-day">
                            <span className="ai-plan-day-badge">{dayLabel}</span>
                            <p className="ai-plan-day-text">{dayDesc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="ai-plan-items-table-wrap">
                  <div className="ai-plan-items-table-header">
                    <span className="label-micro">Itemized Expenses & Tickets ({suggestion.items?.length || 0})</span>
                    <span className="label-micro" style={{ color: 'var(--ink-muted)' }}>
                      Selected: ₹{fmt(selectedSum)} ({selectedCount} items)
                    </span>
                  </div>

                  <div className="ai-plan-items-list">
                    {suggestion.items.map((item, idx) => {
                      const isChecked = !!selectedItems[idx];
                      return (
                        <div
                          key={idx}
                          className={`ai-plan-item-row ${isChecked ? 'selected' : ''}`}
                          onClick={() => toggleItem(idx)}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleItem(idx)}
                            onClick={(e) => e.stopPropagation()}
                            className="ai-plan-checkbox"
                          />
                          <div className="ai-plan-item-meta">
                            <div className="ai-plan-item-title-row">
                              <span className="ai-plan-item-title">{item.title}</span>
                              <span className="ai-plan-item-cat">{item.category}</span>
                            </div>
                            {item.notes && <p className="ai-plan-item-notes">{item.notes}</p>}
                          </div>
                          <div className="ai-plan-item-amount">₹{fmt(item.estimated_amount)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Strategic Advice */}
                {suggestion.strategic_advice?.length > 0 && (
                  <div className="ai-plan-advice-box">
                    <span className="label-micro" style={{ color: 'var(--green)' }}>
                      💡 Smart Money-Saving Tips
                    </span>
                    <ul className="ai-plan-advice-list">
                      {suggestion.strategic_advice.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Import Action */}
                <div className="ai-plan-apply-actions">
                  <button
                    type="button"
                    className="ai-plan-btn-apply"
                    onClick={handleApplyItems}
                    disabled={importing || selectedCount === 0}
                  >
                    {importing
                      ? 'Importing…'
                      : initialPlan
                      ? `✓ Add ${selectedCount} Items to "${initialPlan.name}" →`
                      : `✓ Create Plan & Import ${selectedCount} Items →`}
                  </button>
                  <button type="button" className="planner-btn-ghost" onClick={onClose}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Ask Plan Advisor */}
        {tab === 'advisor' && (
          <div className="ai-plan-section">
            <p className="ai-plan-advisor-intro">
              Ask any financial question about this plan, vendor negotiation tactics, or expense allocations.
              {initialPlan && (
                <span>
                  {' '}Advisor is tuned into <strong>{initialPlan.name}</strong> (Target: ₹{fmt(initialPlan.target_budget)}).
                </span>
              )}
            </p>

            {/* Quick Chips */}
            <div className="ai-plan-chips">
              {PROMPT_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="ai-plan-chip"
                  onClick={() => {
                    setQuestion(chip);
                    handleAskAdvisor(chip);
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="ai-plan-ask-input-group">
              <textarea
                className="ai-plan-input ai-plan-textarea"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your question… e.g. How to allocate ₹1.5L for 2BHK interior work?"
                rows={3}
              />
              <button
                type="button"
                className="ai-plan-btn-ask"
                onClick={() => handleAskAdvisor()}
                disabled={advisorLoading || !question.trim()}
              >
                {advisorLoading ? 'Thinking…' : 'Ask Advisor →'}
              </button>
            </div>

            {/* Advisor Response */}
            {advisorLoading && (
              <div className="ai-plan-advisor-loading">
                <span className="ai-plan-spinner" />
                <span>Consulting AI Advisor…</span>
              </div>
            )}

            {advisorAnswer && !advisorLoading && (
              <div className="ai-plan-advisor-response fade-up">
                <div className="ai-plan-advisor-badge">
                  <span className="label-micro">Advisor Recommendation</span>
                </div>
                <div className="ai-plan-markdown-body">
                  <ParsedAdvisorResponse content={advisorAnswer} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

