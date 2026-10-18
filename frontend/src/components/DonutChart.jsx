import { useState } from 'react';
import './DonutChart.css';

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
      <div className="donut-card">
        <span className="label-micro" style={{ marginBottom: 12 }}>{title}</span>
        <div className="donut-empty">
          <span className="donut-empty-icon">📊</span>
          <p className="donut-empty-text">
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
    <div className="donut-card">
      <div className="donut-header">
        <span className="label-micro">{title}</span>
        <span className="label-micro donut-total-amount">₹{fmt(total)}</span>
      </div>

      <div className="donut-chart-layout">
        {/* SVG Donut */}
        <div className="donut-svg-wrapper">
          <svg width="180" height="180" viewBox="0 0 180 180" className="donut-svg">
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
                className="donut-slice"
                style={{
                  opacity: activeItem && activeItem.category !== slice.category ? 0.45 : 1,
                }}
                onMouseEnter={() => setActiveItem(slice)}
                onMouseLeave={() => setActiveItem(null)}
              />
            ))}
          </svg>

          {/* Center text in donut hole */}
          <div className="donut-center-info" pointerEvents="none">
            <span className="donut-center-category">{displayCenter.category}</span>
            <span className="donut-center-amount">₹{fmt(displayCenter.amount)}</span>
            <span className="donut-center-percent">{displayCenter.percent}%</span>
          </div>
        </div>

        {/* Legend */}
        <div className="donut-legend-list">
          {slices.map((slice) => {
            const isDimmed = activeItem && activeItem.category !== slice.category;
            const isActive = activeItem?.category === slice.category;
            return (
              <div
                key={slice.category}
                className={`donut-legend-item ${isDimmed ? 'dimmed' : ''} ${isActive ? 'active' : ''}`}
                onMouseEnter={() => setActiveItem(slice)}
                onMouseLeave={() => setActiveItem(null)}
              >
                <span className="donut-color-dot" style={{ background: slice.color }} />
                <span className="donut-legend-category">{slice.category}</span>
                <span className="donut-legend-percent">{slice.percent}%</span>
                <span className="donut-legend-amount">₹{fmt(slice.amount)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
