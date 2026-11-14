import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function Toast({ toasts, onDismiss }) {
  const navigate = useNavigate();
  const timers = useRef({});

  useEffect(() => {
    toasts.forEach(t => {
      if (!timers.current[t.id]) {
        timers.current[t.id] = setTimeout(() => {
          onDismiss(t.id);
          delete timers.current[t.id];
        }, 5000);
      }
    });

    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, [toasts, onDismiss]);

  const handleClick = async (toast) => {
    onDismiss(toast.id);
    // Mark notification as read
    if (toast.notificationId) {
      try {
        await api.put(`/api/notifications/${toast.notificationId}/read`);
      } catch {}
    }
    if (toast.ticketId) {
      navigate(`/tickets/${toast.ticketId}`);
    } else if (toast.type === 'PASSWORD_REQUEST' || toast.message?.toLowerCase().includes('senha')) {
      navigate('/users');
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div
          key={t.id}
          className="toast"
          onClick={() => handleClick(t)}
          role="alert"
        >
          <span className="toast-icon">🔔</span>
          <span className="toast-message">{t.message}</span>
          <span
            className="toast-close"
            onClick={e => { e.stopPropagation(); onDismiss(t.id); }}
          >×</span>
        </div>
      ))}
    </div>
  );
}
