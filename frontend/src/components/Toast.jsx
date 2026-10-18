import { useEffect, useState } from 'react';
import './Toast.css';

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
  }, [toast, onDone]);

  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div
      className={`toast-wrap ${visible ? 'visible' : ''} ${isError ? 'error' : 'info'}`}
    >
      {toast.message}
    </div>
  );
}
