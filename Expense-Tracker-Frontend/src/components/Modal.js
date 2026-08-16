import { useEffect } from 'react';

export default function Modal({ title, onClose, children, width = 480 }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={{ ...s.panel, maxWidth: width }} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <h3 style={s.title}>{title}</h3>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>
        <div style={s.body}>{children}</div>
      </div>
    </div>
  );
}

const s = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(28,26,23,0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
    animation: 'fadeIn 0.2s ease',
  },
  panel: {
    width: '100%',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    boxShadow: '0 8px 40px rgba(28,26,23,0.18)',
    animation: 'scaleUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px 0',
  },
  title: {
    fontFamily: "'Fraunces', serif",
    fontSize: '1.15rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: 'var(--ink)',
  },
  close: {
    background: 'none', border: 'none', color: 'var(--ink-muted)',
    fontSize: '0.9rem', cursor: 'pointer', padding: '4px 8px',
    borderRadius: 6, transition: 'color 0.2s',
  },
  body: {
    padding: '20px 24px 24px',
    overflowY: 'auto',
  },
};
