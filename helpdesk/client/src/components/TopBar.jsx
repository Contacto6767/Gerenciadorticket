import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { setSoundEnabled, getSoundEnabled } from '../utils/notificationSound';

const ROLE_LABELS = {
  ADMIN: 'Admin',
  TECHNICIAN: 'Técnico',
  USER: 'Usuário',
};

export default function TopBar({ unreadCount, notifications = [], onNotificationClick, onMarkAllRead }) {
  const { user, logoff } = useAuth();
  const [soundOn, setSoundOn] = useState(getSoundEnabled());
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSoundToggle = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  if (!user) return null;

  return (
    <header className="app-topbar">
      <div className="topbar-spacer" />

      <div className="topbar-user">
        <span className="topbar-username">{user.name}</span>
        <span className={`badge badge-${user.role}`}>{ROLE_LABELS[user.role]}</span>
      </div>

      <button
        className="topbar-btn"
        title={soundOn ? 'Desativar som' : 'Ativar som'}
        onClick={handleSoundToggle}
      >
        {soundOn ? '🔊' : '🔇'}
      </button>

      <div style={{ position: 'relative' }}>
        <button
          className="topbar-btn"
          title="Notificações"
          onClick={() => setShowDropdown(prev => !prev)}
        >
          🔔
          {unreadCount > 0 && (
            <span className="topbar-bell-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {showDropdown && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: 8,
              width: 320,
              background: '#ffffff',
              borderRadius: 8,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              zIndex: 1000,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>Notificações</span>
              {unreadCount > 0 && (
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                  onClick={() => {
                    onMarkAllRead();
                  }}
                >
                  Marcar lidas
                </button>
              )}
            </div>

            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  Nenhuma notificação não lida
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      setShowDropdown(false);
                      onNotificationClick(n);
                    }}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      fontSize: 13,
                      lineHeight: 1.4,
                      color: '#334155',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                  >
                    <div>{n.message}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      {new Date(n.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <button className="btn-logoff" onClick={logoff}>
        Logoff
      </button>
    </header>
  );
}
