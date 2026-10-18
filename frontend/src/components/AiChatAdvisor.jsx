import { useState, useRef, useEffect, useMemo } from 'react';
import planService from '../services/planService';
import './AiChatAdvisor.css';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const DEFAULT_CHIPS_GENERAL = [
  '4-day Goa trip under ₹5,000?',
  'Budget for 2BHK interior painting?',
  'Hidden costs in destination wedding?',
  'What buffer percentage is safe?',
];

const DEFAULT_CHIPS_PLAN = [
  'Where can I cut expenses in this plan?',
  'Am I on track with my target budget?',
  'What hidden costs should I watch for?',
  'How to allocate my remaining buffer?',
];

// Normalize and strip JSON wrapping if returned by LLM
function cleanAiText(raw) {
  if (!raw) return '';
  let str = String(raw).trim();

  // Strip markdown code fences
  if (str.startsWith('```json')) {
    str = str.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
  } else if (str.startsWith('```')) {
    str = str.replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  }

  // If wrapped in JSON object: {"answer": "..."}
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed.answer && typeof parsed.answer === 'string') {
        str = parsed.answer.trim();
      }
    } catch (_) {
      // Regex extraction fallback
      const match = str.match(/"answer"\s*:\s*"([\s\S]*)"\s*}/);
      if (match) {
        try {
          str = JSON.parse(`"${match[1]}"`);
        } catch (__) {
          str = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
      }
    }
  }

  // Replace unicode non-breaking spaces & non-breaking hyphens
  return str
    .replace(/\u202f|\u00a0/g, ' ')
    .replace(/\u2011/g, '-')
    .trim();
}

// Icon mapping for travel & event item categories
function getItemIcon(category = '', desc = '') {
  const c = `${category} ${desc}`.toLowerCase();
  if (/train|railway|irctc|express/.test(c)) return '🚆';
  if (/flight|air|plane|airport/.test(c)) return '✈️';
  if (/bus|shuttle|kadamba/.test(c)) return '🚌';
  if (/scooter|activa|bike|rental/.test(c)) return '🛵';
  if (/auto|rickshaw|taxi|cab|uber|ola|transport|travel/.test(c)) return '🚕';
  if (/stay|hotel|hostel|dorm|dormitory|resort|room|lodge|guesthouse|airbnb/.test(c)) return '🏨';
  if (/breakfast|lunch|dinner|meal|dining|food|dhaba|thali|eat|snack|tea|coffee/.test(c)) return '🍽️';
  if (/beach|sea|sunset|water sport|swim/.test(c)) return '🏖️';
  if (/entry|ticket|fort|museum|temple|palace|sightseeing|safari|tour|monument/.test(c)) return '🎟️';
  if (/paint|cement|tile|brick|steel|material/.test(c)) return '🧱';
  if (/labor|mason|painter|carpenter|worker/.test(c)) return '👷';
  if (/shop|gift|souvenir|dress/.test(c)) return '🛍️';
  return '📌';
}

// Parse markdown inline bold (*text* or **text**) into React nodes
function renderInlineMarkdown(text) {
  if (!text) return null;
  // Replace *italic* or **bold**
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={idx}>{part.slice(1, -1)}</strong>;
    }
    // Highlight currency amounts (₹X,XXX)
    const subParts = part.split(/(₹\s*[\d,]+(?:\.\d+)?(?:\s*\/\s*\w+)?)/g);
    if (subParts.length > 1) {
      return (
        <span key={idx}>
          {subParts.map((sp, sIdx) =>
            sp.startsWith('₹') ? (
              <span key={sIdx} className="ai-chat-intext-price">
                {sp}
              </span>
            ) : (
              sp
            )
          )}
        </span>
      );
    }
    return part;
  });
}

// Helper: categorize expense based on description and context
function categorizeExpenseItem(desc = '', category = 'Other') {
  const d = `${desc} ${category}`.toLowerCase();
  // Food & Dining first (highest priority, so station or hostel meals are Food)
  if (/breakfast|lunch|dinner|meal|thali|fish|curry|vada pav|poha|idli|sambar|bread butter|snack|tea|coffee|canteen|dhaba|shack|food|dining|roll|biryani|roti|chorizo/.test(d)) {
    return 'Food & Dining';
  }
  // Travel / Flight (buses, trains, taxis, flights, autos)
  if (/^bus|^auto|^taxi|^shared auto|go a-|kadamba|ksrtc/i.test(d) || /train|express|railway|irctc|flight|plane|air|bus|auto|rickshaw|cab|taxi|uber|ola|transit|travel|transport|departure/.test(d)) {
    return 'Travel / Flight';
  }
  // Stay / Hotel
  if (/hostel|hotel|resort|dorm|dormitory|guesthouse|lodge|accommodation|room|stay|overnight/.test(d)) {
    return 'Stay / Hotel';
  }
  // Activities (beach, fort, museum, entry fee)
  if (/beach|fort|museum|palace|entry|sightseeing|safari|tour|monument|visit|activity|ticket|donation/.test(d)) {
    return 'Activities';
  }
  if (/scooter|bike|rental|gear|equipment/.test(d)) return 'Equipment';
  if (/material|paint|cement|tile/.test(d)) return 'Materials';
  if (/labor|worker|mason|painter/.test(d)) return 'Labor';
  if (/permit|fee|tax/.test(d)) return 'Permits / Fees';
  if (/shop|gift|souvenir/.test(d)) return 'Shopping';

  return category || 'Other';
}

// Convert parsed itinerary from chat into Plan suggestion schema for AiPlanModal
function convertPlanDataToSuggestion(planData) {
  const items = [];
  let totalAllocated = 0;

  (planData.days || []).forEach((day) => {
    (day.items || []).forEach((it) => {
      let amt = 0;
      if (it.cost) {
        const numStr = it.cost.replace(/[^\d.]/g, '');
        amt = parseFloat(numStr) || 0;
      }

      let cleanDesc = (it.desc || '').trim();

      // SAFETY NET: If amt is 0, check if cleanDesc has trailing "– **₹XXX"
      if (!amt && cleanDesc) {
        const descAmtMatch = cleanDesc.match(/(?:–|-|—|:)\s*(?:\*\*)?\s*₹\s*([\d,]+(?:\.\d+)?)/);
        if (descAmtMatch) {
          amt = parseFloat(descAmtMatch[1].replace(/[^\d.]/g, '')) || 0;
          cleanDesc = cleanDesc.slice(0, descAmtMatch.index).trim();
        }
      }

      // Clean leading/trailing markdown asterisks, hyphens
      cleanDesc = cleanDesc.replace(/[#*–—\-\s]+$/, '').replace(/^[#*–—\-\s]+/, '').trim();
      totalAllocated += amt;

      const cat = categorizeExpenseItem(cleanDesc, it.category);
      const title = cleanDesc || `${cat} item`;
      const noteParts = [];
      if (day.dayLabel) noteParts.push(`${day.dayLabel}${day.title ? ` (${day.title})` : ''}`);
      if (it.extra) noteParts.push(it.extra);

      items.push({
        title,
        category: cat,
        estimated_amount: amt,
        notes: noteParts.join(' • ') || undefined,
      });
    });
  });

  let target = 0;
  if (planData.planBudget) {
    target = parseFloat(planData.planBudget.replace(/[^\d.]/g, '')) || 0;
  }
  if (!target && planData.totalCost) {
    target = parseFloat(planData.totalCost.replace(/[^\d.]/g, '')) || 0;
  }
  if (!target) {
    target = totalAllocated;
  }

  const dayItinerary = (planData.days || []).map((d) => {
    const itemList = (d.items || [])
      .map((it) => `${it.desc}${it.cost ? ` (${it.cost})` : ''}`)
      .join(', ');
    return `${d.dayLabel}${d.title ? `: ${d.title}` : ''}. ${itemList ? `Expenses: ${itemList}` : ''}`;
  });

  const buffer = Math.max(0, target - totalAllocated);
  const cleanTitle = (planData.planTitle || 'Trip / Event Plan').replace(/^#+\s*/, '').trim();

  let categoryType = 'Trip';
  if (/renovat/i.test(cleanTitle)) categoryType = 'Renovation';
  else if (/wedding/i.test(cleanTitle)) categoryType = 'Wedding';
  else if (/event|bash|party/i.test(cleanTitle)) categoryType = 'Event';
  else if (/festival|diwali|pooja/i.test(cleanTitle)) categoryType = 'Festival';

  return {
    name: cleanTitle,
    category_type: categoryType,
    target_budget: target,
    notes: `Planned via AI Budget Advisor. Total estimated: ₹${totalAllocated.toLocaleString('en-IN')}`,
    suggestion: {
      summary: `Itinerary breakdown imported directly from AI Budget Advisor. Total allocated: ₹${totalAllocated.toLocaleString('en-IN')}.`,
      contingency_buffer: buffer,
      total_allocated: totalAllocated,
      items,
      day_wise_itinerary: dayItinerary,
      strategic_advice: planData.tips || [],
    },
  };
}

// Try parsing text into structured Day cards, Tips, and Total
function parseStructuredItinerary(rawText) {
  const text = cleanAiText(rawText);
  if (!text) return null;

  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 3) return null;

  // Check if text has itinerary or phase markers
  const hasDayOrPhase = lines.some((l) => /^(?:#+\s*|\*\*)?(?:Day\s*\d+|Phase\s*\d+)/i.test(l));
  const hasTotal = lines.some((l) => /Total\s*(?:Approx\.?|Estimated)?\s*Cost/i.test(l));
  const hasBullets = lines.some((l) => /^(?:[-*•]|\d+\.)\s+/.test(l));

  if (!hasDayOrPhase && !hasBullets) {
    return null;
  }

  let planTitle = '';
  let planBudget = '';
  const days = [];
  const tips = [];
  let totalCost = '';
  let currentSection = null;
  let activeParentCategory = null;

  // Check first line for title/budget banner e.g. "4-Day Goa Trip – ₹5,000 Budget" or "4-Day Goa Trip - ₹5,000 Budget"
  const cleanFirstLine = lines[0].replace(/^[#*\s]+|[#*\s]+$/g, '').trim();
  const titleBudgetMatch = cleanFirstLine.match(/^(.*?)(?:\s+[–—]\s+|\s+-\s+(?=[₹\d])|\s*:\s*(?=[₹\d]))(.*)$/);
  if (titleBudgetMatch) {
    planTitle = titleBudgetMatch[1].replace(/^[#*\s]+|[#*\s]+$/g, '').trim();
    planBudget = titleBudgetMatch[2].replace(/^[#*\s]+|[#*\s]+$/g, '').trim();
  } else {
    const parenMatch = cleanFirstLine.match(/^(.*?)\s*\((₹\s*[\d,]+.*)\)$/);
    if (parenMatch) {
      planTitle = parenMatch[1].replace(/^[#*\s]+|[#*\s]+$/g, '').trim();
      planBudget = parenMatch[2].replace(/^[#*\s]+|[#*\s]+$/g, '').trim();
    } else {
      planTitle = cleanFirstLine;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Ignore horizontal dividing rules e.g. "---" or "***"
    if (/^[-*_]{3,}$/.test(rawLine)) {
      continue;
    }

    const line = rawLine.replace(/\\/g, '').trim();

    // Total Cost line: "### Total Approx. Cost: **₹3,360**"
    const totalMatch = line.match(/Total\s*(?:Approx\.?|Estimated)?\s*Cost\s*:\s*(?:\*\*)?(₹?\s*[\d,]+(?:\.\d+)?)/i);
    if (totalMatch) {
      const val = totalMatch[1].replace(/\*/g, '').trim();
      totalCost = val.startsWith('₹') ? val : `₹${val}`;
      continue;
    }

    // Cost-Cutting Tips section header: "## Cost-Cutting Tips"
    if (/^(?:#+\s*)?(?:Cost[\s‑-]*Cutting\s*Tips|Money[\s‑-]*Saving\s*Tips|Smart\s*Tips|Tips)/i.test(line)) {
      currentSection = { type: 'tips' };
      activeParentCategory = null;
      continue;
    }

    // Day or Phase section header: "## Day 1 – Arrival & Panjim Exploration"
    const dayMatch = line.match(/^(?:#+\s*|\*\*)?(Day\s*\d+|Phase\s*\d+)(?:\*\*)?\s*(?:[–:-]\s*(.*))?$/i);
    if (dayMatch) {
      const subTitle = (dayMatch[2] || '').replace(/^[#*\s]+|[#*\s]+$/g, '').trim();
      currentSection = {
        type: 'day',
        dayLabel: dayMatch[1].trim(),
        title: subTitle,
        items: [],
        subTotal: '',
      };
      days.push(currentSection);
      activeParentCategory = null;
      continue;
    }

    // Day subtotal line: "**Day 1 Sub-Total:** **₹1,180**"
    if (currentSection?.type === 'day') {
      const subMatch = line.match(/(?:Day\s*\d+\s*)?Sub[-‑\s]*Total\s*:\s*(?:\*\*)?(₹?\s*[\d,]+(?:\.\d+)?)/i);
      if (subMatch) {
        const val = subMatch[1].replace(/\*/g, '').trim();
        currentSection.subTotal = val.startsWith('₹') ? val : `₹${val}`;
        continue;
      }
    }

    // Bullet or numbered line inside Tips or Day
    const isBullet = /^(?:[-*•]|\d+\.)\s+/.test(line);
    if (isBullet) {
      const cleanLine = line.replace(/^(?:[-*•]|\d+\.)\s+/, '').trim();

      if (currentSection?.type === 'tips') {
        tips.push(cleanLine);
        continue;
      }

      if (currentSection?.type === 'day') {
        // 1. Check if line is ONLY a parent category header, e.g. "- **Food:**", "**Food:**", "Entry fees:"
        const isHeaderOnly = /^(?:\*\*)?([A-Za-z0-9\s&/()‑-]+?)(?:\*\*)?:\s*$/i.test(cleanLine);
        if (isHeaderOnly) {
          const match = cleanLine.match(/^(?:\*\*)?([A-Za-z0-9\s&/()‑-]+?)(?:\*\*)?:\s*$/);
          if (match && match[1].length < 28) {
            activeParentCategory = match[1].trim();
          }
          continue; // DO NOT add an empty item row!
        }

        let category = activeParentCategory || 'Other';
        let desc = cleanLine;
        let cost = '';
        let extra = '';

        // 2. Extract Category if "**Cat:** Desc" or "Cat: Desc"
        const catMatch = desc.match(/^(?:\*\*)?([A-Za-z0-9\s&/()‑-]+?)(?:\*\*)?:\s*(.+)$/);
        if (catMatch && catMatch[1].length < 28) {
          category = catMatch[1].trim();
          desc = catMatch[2].trim();

          // Reset activeParentCategory if this is a top-level category
          if (/train|travel|transit|transport|bus|flight|stay|hotel|hostel|accommodation|activity|beach|fort/i.test(category)) {
            activeParentCategory = null;
          }
        }

        // 3. Extract trailing cost:
        // Handles: "– **₹520", "– **₹300** (night 1)", "– **₹0 (free)", "– ₹80", "(free)"
        const costMatch = desc.match(/(?:–|-|—|:)\s*(?:\*\*)?\s*(₹\s*[\d,]+(?:\.\d+)?(?:\s*\/\s*\w+)?(?:\s*per\s*\w+)?|free|included)\s*(?:\*\*)?\s*(?:\(([^)]+)\))?\s*$/i);
        if (costMatch) {
          cost = costMatch[1].trim();
          extra = costMatch[2] ? `(${costMatch[2].trim()})` : '';
          desc = desc.slice(0, costMatch.index).trim();
        } else {
          // Check trailing (free) or (included) or (₹300)
          const parenMatch = desc.match(/\((free|included|₹\s*[\d,]+(?:\.\d+)?)\)\s*$/i);
          if (parenMatch) {
            cost = parenMatch[1].trim();
            desc = desc.slice(0, parenMatch.index).trim();
          } else {
            // General inline cost match fallback
            const inlineAmtMatch = desc.match(/(?:–|-|—|:)\s*(?:\*\*)?\s*(₹\s*[\d,]+(?:\.\d+)?)\s*(?:\*\*)?/i);
            if (inlineAmtMatch) {
              cost = inlineAmtMatch[1].trim();
              desc = desc.slice(0, inlineAmtMatch.index).trim();
            }
          }
        }

        // 4. Clean leading or trailing dashes, colons, asterisks from desc
        desc = desc
          .replace(/[#*–—\-\s]+$/, '')
          .replace(/^[#*–—\-\s]+/, '')
          .trim();

        if (cost && /\(free\)/i.test(desc)) {
          desc = desc.replace(/\(free\)/i, '').trim();
        }

        if (!desc && cost) {
          desc = `${category !== 'Other' ? category : 'Miscellaneous'} Expense`;
        }

        if (!desc && !cost) {
          continue;
        }

        currentSection.items.push({
          category,
          icon: getItemIcon(category, desc),
          desc,
          cost,
          extra,
        });
        continue;
      }
    }

    // General text line fallback
    if (!planTitle && i === 0) {
      planTitle = line.replace(/^[#*\s]+/, '');
    }
  }

  // Only return structured plan if we identified days or items
  if (days.length > 0 || tips.length > 0) {
    return {
      planTitle: planTitle || 'Itinerary & Budget Breakdown',
      planBudget: planBudget || '',
      days,
      tips,
      totalCost,
    };
  }

  return null;
}

// Subcomponent: Designed Card View for Itineraries and Budget Breakdowns
function DesignedPlanCard({ planData, onOpenGenerator }) {
  const { planTitle, planBudget, days, tips, totalCost } = planData;

  const cleanBudget = planBudget ? (planBudget.startsWith('₹') ? planBudget : `₹${planBudget.replace(/^[₹\s]+/, '')}`) : '';

  return (
    <div className="ai-designed-container">
      {/* Plan Title Header Banner */}
      {planTitle && (
        <div className="ai-designed-banner">
          <div className="ai-designed-banner-main">
            <span className="ai-designed-sparkle">✦</span>
            <span className="ai-designed-plan-title">{planTitle}</span>
          </div>
          {cleanBudget && (
            <span className="ai-designed-budget-pill">
              {cleanBudget}
            </span>
          )}
        </div>
      )}

      {/* Day / Phase Cards */}
      {days.length > 0 && (
        <div className="ai-designed-days-list">
          {days.map((day, dIdx) => (
            <div key={dIdx} className="ai-designed-day-card">
              <div className="ai-designed-day-header">
                <span className="ai-designed-day-badge">📅 {day.dayLabel}</span>
                {day.title && <span className="ai-designed-day-subtitle">{day.title}</span>}
              </div>

              <div className="ai-designed-day-items">
                {day.items.map((it, itIdx) => {
                  const isFree = /^free$/i.test(it.cost);
                  const isIncluded = /^included$/i.test(it.cost);

                  return (
                    <div key={itIdx} className="ai-designed-item-row">
                      <div className="ai-designed-item-left">
                        <span className="ai-designed-cat-pill">
                          <span className="ai-designed-cat-icon">{it.icon}</span>
                          <span className="ai-designed-cat-name">{it.category}</span>
                        </span>
                        <span className="ai-designed-item-desc">
                          {renderInlineMarkdown(it.desc)}
                        </span>
                      </div>

                      {(it.cost || it.extra) && (
                        <div className="ai-designed-item-right">
                          {it.cost && (
                            <span
                              className={`ai-designed-cost-chip ${
                                isFree ? 'free' : isIncluded ? 'included' : 'paid'
                              }`}
                            >
                              {it.cost}
                            </span>
                          )}
                          {it.extra && <span className="ai-designed-cost-extra">{it.extra}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {day.subTotal && (
                <div className="ai-designed-day-subtotal">
                  <span className="ai-designed-subtotal-label">Day Sub-Total</span>
                  <span className="ai-designed-subtotal-val">{day.subTotal}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cost-Cutting Tips Card */}
      {tips.length > 0 && (
        <div className="ai-designed-tips-card">
          <div className="ai-designed-tips-header">
            <span className="ai-designed-tips-icon">💡</span>
            <span className="ai-designed-tips-title">Cost-Cutting Tips</span>
          </div>
          <div className="ai-designed-tips-list">
            {tips.map((tip, tIdx) => (
              <div key={tIdx} className="ai-designed-tip-item">
                <span className="ai-designed-tip-sparkle">✦</span>
                <span className="ai-designed-tip-text">{renderInlineMarkdown(tip)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total Approx. Cost Banner */}
      {totalCost && (
        <div className="ai-designed-total-banner">
          <div className="ai-designed-total-left">
            <span className="ai-designed-total-icon">🧾</span>
            <span className="ai-designed-total-label">Total Approx. Cost</span>
          </div>
          <span className="ai-designed-total-amount">{totalCost}</span>
        </div>
      )}

      {/* 1-Click Convert to Auto-Plan */}
      {onOpenGenerator && (
        <button
          type="button"
          className="ai-designed-auto-btn"
          onClick={() => {
            const prefilled = convertPlanDataToSuggestion(planData);
            onOpenGenerator(prefilled);
          }}
          title="Open Auto-Plan Generator with these exact items prefilled"
        >
          🪄 Create Full Plan from this Itinerary →
        </button>
      )}
    </div>
  );
}

// Subcomponent: Editorial Advice View for general Q&A (non-itinerary)
function EditorialAdviceView({ text }) {
  const cleaned = cleanAiText(text);

  return cleaned.split('\n\n').map((paragraph, pIdx) => {
    const lines = paragraph.split('\n');
    return (
      <div key={pIdx} className="ai-chat-p">
        {lines.map((line, lIdx) => {
          const isBullet =
            line.trim().startsWith('- ') ||
            line.trim().startsWith('* ') ||
            line.trim().startsWith('• ');
          const cleanLine = isBullet ? line.trim().replace(/^[-*•]\s+/, '') : line;

          if (isBullet) {
            return (
              <div key={lIdx} className="ai-chat-bullet-line">
                <span className="ai-chat-bullet-dot">•</span>
                <span className="ai-chat-bullet-content">{renderInlineMarkdown(cleanLine)}</span>
              </div>
            );
          }

          // Bold subhead e.g. "Key Strategy:" or "### Section"
          const isHeader =
            cleanLine.startsWith('###') ||
            cleanLine.startsWith('##') ||
            (cleanLine.endsWith(':') && cleanLine.length < 50);

          if (isHeader) {
            const hText = cleanLine.replace(/^#+\s*/, '');
            return (
              <div key={lIdx} className="ai-chat-subhead">
                <span className="ai-chat-subhead-accent" />
                <span>{renderInlineMarkdown(hText)}</span>
              </div>
            );
          }

          return (
            <div key={lIdx} className="ai-chat-text-line">
              {renderInlineMarkdown(cleanLine)}
            </div>
          );
        })}
      </div>
    );
  });
}

// Message Bubble Component that switches between Designed and Raw View
function AiMessageBubble({ message, onOpenGenerator }) {
  const [showRaw, setShowRaw] = useState(false);
  const structuredPlan = useMemo(() => {
    if (message.sender !== 'ai') return null;
    return parseStructuredItinerary(message.text);
  }, [message.text, message.sender]);

  if (message.sender === 'user') {
    return (
      <div className="ai-chat-bubble user">
        <div className="ai-chat-bubble-content">{message.text}</div>
        <span className="ai-chat-time">{message.time}</span>
      </div>
    );
  }

  return (
    <div className={`ai-chat-bubble ai ${structuredPlan ? 'designed-active' : ''}`}>
      {/* Top bar with designed indicator and optional raw toggle */}
      <div className="ai-chat-bubble-top">
        <div className="ai-chat-bubble-badge">
          <span className="ai-chat-badge-dot" />
          <span>{structuredPlan ? '✦ Designed Itinerary View' : 'AI Advice'}</span>
        </div>
        {structuredPlan && (
          <button
            type="button"
            className="ai-chat-toggle-view"
            onClick={() => setShowRaw((prev) => !prev)}
            title={showRaw ? 'Switch to Designed View' : 'Switch to Raw Text'}
          >
            {showRaw ? '✦ Designed View' : '📝 Text'}
          </button>
        )}
      </div>

      {/* Bubble Content: Designed Plan, Editorial Advice, or Raw */}
      <div className="ai-chat-bubble-content">
        {showRaw ? (
          <pre className="ai-chat-raw-pre">{cleanAiText(message.text)}</pre>
        ) : structuredPlan ? (
          <DesignedPlanCard planData={structuredPlan} onOpenGenerator={onOpenGenerator} />
        ) : (
          <EditorialAdviceView text={message.text} />
        )}
      </div>

      <span className="ai-chat-time">{message.time}</span>
    </div>
  );
}

export default function AiChatAdvisor({ plan = null, onOpenGenerator = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Initial welcome greeting
  const [messages, setMessages] = useState(() => {
    if (plan) {
      return [
        {
          id: 'welcome',
          sender: 'ai',
          text: `Hi! I'm your **AI Budget Advisor** tuned into **${plan.name}** (Target: ₹${fmt(plan.target_budget)}).\n\nAsk me anything: realistic cost estimates, day-wise itineraries, train routes, or how to allocate your buffer!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
    }
    return [
      {
        id: 'welcome',
        sender: 'ai',
        text: `Hi! I'm your **AI Budget Advisor**.\n\nPlanning a trip, home renovation, wedding, or event? Ask me for realistic Indian cost estimates, train routes, or budget breakdowns!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Update welcome message if plan changes
  useEffect(() => {
    if (plan) {
      setMessages((prev) => {
        if (prev.length === 1 && prev[0].id === 'welcome') {
          return [
            {
              id: 'welcome',
              sender: 'ai',
              text: `Hi! I'm your **AI Budget Advisor** tuned into **${plan.name}** (Target: ₹${fmt(plan.target_budget)}).\n\nAsk me anything: realistic cost estimates, day-wise itineraries, train routes, or how to allocate your buffer!`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ];
        }
        return prev;
      });
    }
  }, [plan]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = async (textToSend) => {
    const q = (textToSend || input).trim();
    if (!q || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await planService.askAiAdvisor({
        question: q,
        plan_id: plan?.plan_id,
        target_budget: plan?.target_budget,
        category_type: plan?.category_type,
        event_name: plan?.name,
      });

      const cleanAnswer = cleanAiText(res.answer || 'I could not generate an answer at this moment.');

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: cleanAnswer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: `Sorry, I encountered an error: ${err.message || 'Failed to consult AI'}. Please check your connection or try again.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const chips = plan ? DEFAULT_CHIPS_PLAN : DEFAULT_CHIPS_GENERAL;

  return (
    <>
      {/* Floating Action Button (FAB) at Bottom Right */}
      <div className="ai-chat-fab-wrap">
        <button
          type="button"
          className={`ai-chat-fab ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen((prev) => !prev)}
          title={isOpen ? 'Close AI Budget Advisor' : 'Open AI Budget Advisor'}
          aria-label="Toggle AI Budget Advisor"
        >
          {isOpen ? (
            <span className="ai-chat-fab-close">✕</span>
          ) : (
            <>
              <span className="ai-chat-fab-sparkle">✦</span>
              <span className="ai-chat-fab-label">AI Advisor</span>
            </>
          )}
        </button>
      </div>

      {/* Floating Chat Assistant Window */}
      {isOpen && (
        <div className="ai-chat-window fade-up">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <div className="ai-chat-avatar">✦</div>
              <div>
                <h4 className="ai-chat-title">AI Budget Advisor</h4>
                <p className="ai-chat-status">
                  <span className="ai-chat-online-dot" />
                  {plan ? `Tuned to: ${plan.name}` : 'Ready for questions • Groq AI'}
                </p>
              </div>
            </div>
            <div className="ai-chat-header-actions">
              {onOpenGenerator && (
                <button
                  type="button"
                  className="ai-chat-action-btn"
                  onClick={onOpenGenerator}
                  title="Open Auto-Plan Generator"
                >
                  🪄 Auto-Plan
                </button>
              )}
              <button
                type="button"
                className="ai-chat-close-btn"
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
                aria-label="Minimize chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="ai-chat-body">
            {messages.map((m) => (
              <div key={m.id} className={`ai-chat-msg-row ${m.sender}`}>
                {m.sender === 'ai' && <div className="ai-chat-msg-avatar">✦</div>}
                <AiMessageBubble message={m} onOpenGenerator={onOpenGenerator} />
              </div>
            ))}

            {loading && (
              <div className="ai-chat-msg-row ai">
                <div className="ai-chat-msg-avatar">✦</div>
                <div className="ai-chat-bubble ai loading">
                  <div className="ai-chat-typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="ai-chat-chips-tray">
            {chips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                className="ai-chat-chip-pill"
                onClick={() => handleSend(chip)}
                disabled={loading}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="ai-chat-footer">
            <input
              ref={inputRef}
              type="text"
              className="ai-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for routes, costs, or budget advice…"
              disabled={loading}
            />
            <button
              type="button"
              className="ai-chat-send-btn"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              title="Send message"
              aria-label="Send message"
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
