import { useState } from 'react';

const COLORS = [
  '#c0492b',
  '#e8704f',
  '#f59e0b',
  '#355b8c',
  '#6366f1',
  '#3f6b52',
  '#0d9488',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
];

function fmt(n) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DonutChart({ data = {}, title = 'Expenses Breakdown' }) {
  const entries = Object.entries(data).filter(([, val]) => Number(val) > 0);
  const total = entries.reduce((acc, [, val]) => acc + Number(val), 0);

  const [activeItem, setActiveItem] = useState(null);

  if (entries.length === 0 || total === 0) {
    return (
      <div style={s.card}>
        <span className="label-micro" style={{ marginBottom: 12 }}>{title}</span>
        <div style={s.empty}>
          <span style={{ fontSize: '1.8rem', opacity: 0.4 }}>📊</span>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.8rem', marginTop: 8 }}>
            No expense data recorded for this period.
          </p>
        </div>
      </div>
    );
  }

  const radius = 68;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const slices = entries.map(([category, amount], idx) => {
    const value = Number(amount);
    const percent = value / total;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;
    const color = COLORS[idx % COLORS.length];

    return {
      category,
      amount: value,
      percent: Math.round(percent * 100),
      color,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const displayCenter = activeItem || {
    category: 'Total',
    amount: total,
    percent: 100,
  };

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="label-micro">{title}</span>
        <span className="label-micro" style={{ color: 'var(--ink)' }}>₹{fmt(total)}</span>
      </div>

      <div style={s.chartLayout}>
        {/* SVG Donut */}
        <div style={s.svgWrapper}>
          <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="transparent"
              stroke="var(--inset)"
              strokeWidth={strokeWidth}
            />
            {slices.map((slice) => (
              <circle
                key={slice.category}
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={activeItem?.category === slice.category ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="butt"
                style={{
                  cursor: 'pointer',
                  transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                  opacity: activeItem && activeItem.category !== slice.category ? 0.45 : 1,
                }}
                onMouseEnter={() => setActiveItem(slice)}
                onMouseLeave={() => setActiveItem(null)}
              />
            ))}
          </svg>

          {/* Center text in donut hole */}
          <div style={s.centerInfo} pointerEvents="none">
            <span style={s.centerCategory}>{displayCenter.category}</span>
            <span style={s.centerAmount}>₹{fmt(displayCenter.amount)}</span>
            <span style={s.centerPercent}>{displayCenter.percent}%</span>
          </div>
        </div>

        {/* Legend */}
        <div style={s.legendList}>
          {slices.map((slice) => (
            <div
              key={slice.category}
              style={{
                ...s.legendItem,
                opacity: activeItem && activeItem.category !== slice.category ? 0.4 : 1,
                transform: activeItem?.category === slice.category ? 'translateX(3px)' : 'none',
              }}
              onMouseEnter={() => setActiveItem(slice)}
              onMouseLeave={() => setActiveItem(null)}
            >
              <span style={{ ...s.colorDot, background: slice.color }} />
              <span style={s.legendCategory}>{slice.category}</span>
              <span style={s.legendPercent}>{slice.percent}%</span>
              <span style={s.legendAmount}>₹{fmt(slice.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  card: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '22px 24px',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    flexDirection: 'column',
  },
  empty: {
    padding: '36px 0',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  chartLayout: {
    display: 'flex',
    alignItems: 'center',
    gap: 28,
    flexWrap: 'wrap',
  },
  svgWrapper: {
    position: 'relative',
    width: 180,
    height: 180,
    flexShrink: 0,
    margin: '0 auto',
  },
  centerInfo: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    pointerEvents: 'none',
  },
  centerCategory: {
    fontSize: '0.72rem',
    fontFamily: "'Spline Sans Mono', monospace",
    color: 'var(--ink-muted)',
    maxWidth: 90,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  centerAmount: {
    fontFamily: "'Fraunces', serif",
    fontWeight: 700,
    fontSize: '0.98rem',
    color: 'var(--ink)',
    marginTop: 2,
  },
  centerPercent: {
    fontSize: '0.68rem',
    color: 'var(--ink-muted)',
    marginTop: 1,
  },
  legendList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flex: 1,
    minWidth: 180,
    maxHeight: 220,
    overflowY: 'auto',
    paddingRight: 4,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 8px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '0.8rem',
  },
  colorDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    flexShrink: 0,
  },
  legendCategory: {
    flex: 1,
    color: 'var(--ink)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  legendPercent: {
    color: 'var(--ink-muted)',
    fontSize: '0.75rem',
    fontFamily: "'Spline Sans Mono', monospace",
  },
  legendAmount: {
    fontFamily: "'Fraunces', serif",
    fontWeight: 600,
    color: 'var(--ink)',
    fontSize: '0.82rem',
  },
};
