import { useEffect, useRef, useState } from 'react';

export default function Toast({ toast }) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!toast) {
      setVisible(false);
      return;
    }

    // Show with animation delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });

    // Auto-hide
    timeoutRef.current = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timeoutRef.current);
  }, [toast]);

  if (!toast) return null;

  const cls = `ws-toast ${visible ? 'show' : ''} ${toast.isError ? 'error' : ''} ${toast.type || ''}`.trim();

  return <div className={cls}>{toast.msg}</div>;
}
