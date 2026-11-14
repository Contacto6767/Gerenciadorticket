import React, { createContext, useContext, useState } from 'react';
import api from '../utils/api';
import { initAudioContext } from '../utils/notificationSound';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const login = async (loginVal, password) => {
    const res = await api.post('/api/auth/login', { login: loginVal, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    initAudioContext();
    return u;
  };

  const logoff = async () => {
    try { await api.post('/api/auth/logoff'); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logoff, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
