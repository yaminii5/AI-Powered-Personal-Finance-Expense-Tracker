import { useEffect, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);

  const show = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  };

  return { toast, show, clear: () => setToast(null) };
}

export default function Toast({ toast, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id]);

  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div style={{
      ...styles.wrap,
      transform: visible ? 'translateY(0)' : 'translateY(120%)',
      opacity: visible ? 1 : 0,
      background: isError ? 'var(--accent)' : 'var(--ink)',
    }}>
      {toast.message}
    </div>
  );
}

const styles = {
  wrap: {
    position: 'fixed',
    bottom: 32,
    left: '50%',
    transform: 'translateX(-50%) translateY(120%)',
    color: '#fff',
    fontFamily: "'Spline Sans Mono', monospace",
    fontSize: '0.8rem',
    padding: '10px 20px',
    borderRadius: 10,
    zIndex: 9999,
    transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
  },
};
