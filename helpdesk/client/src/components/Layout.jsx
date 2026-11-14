import { Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Toast from './Toast';
import api from '../utils/api';
import { playNotificationSound } from '../utils/notificationSound';

let toastIdCounter = 1;

export default function Layout() {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef(0);
  const pollInterval = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications');
      const allNotifications = res.data || [];
      const unread = allNotifications.filter(n => !n.read);
      const newCount = unread.length;

      if (newCount > prevUnreadRef.current) {
        // New notifications arrived
        playNotificationSound();
        const newOnes = unread.slice(0, newCount - prevUnreadRef.current);
        const newToasts = newOnes.map(n => ({
          id: toastIdCounter++,
          message: n.message,
          type: n.type,
          notificationId: n.id,
          ticketId: n.ticket_id,
        }));
        setToasts(prev => [...prev, ...newToasts]);
      }

      prevUnreadRef.current = newCount;
      setUnreadCount(newCount);
      setNotifications(unread);
    } catch {
      // Silently ignore polling errors
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    pollInterval.current = setInterval(fetchNotifications, 15000);
    return () => clearInterval(pollInterval.current);
  }, [fetchNotifications]);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setUnreadCount(0);
      setNotifications([]);
      prevUnreadRef.current = 0;
    } catch {}
  };

  const handleNotificationClick = async (notif) => {
    try {
      await api.put(`/api/notifications/${notif.id}/read`);
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);
    } catch {}

    if (notif.ticket_id) {
      navigate(`/tickets/${notif.ticket_id}`);
    } else if (notif.type === 'PASSWORD_REQUEST' || notif.message?.toLowerCase().includes('senha')) {
      navigate('/users');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <TopBar
          unreadCount={unreadCount}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onMarkAllRead={handleMarkAllRead}
        />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
