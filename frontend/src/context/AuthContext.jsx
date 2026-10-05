import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('brsr_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('brsr_token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      authApi.getMe()
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('brsr_user', JSON.stringify(res.data));
        })
        .catch((err) => {
          console.warn('Session check failed or expired:', err.message);
          if (err.response?.status === 401) {
            logout();
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (identifier, password) => {
    const cleanId = (identifier || '').trim();
    const cleanPwd = (password || '').trim();
    const res = await authApi.login({
      username: cleanId,
      email: cleanId,
      password: cleanPwd
    });
    const { access_token, user: loggedUser } = res.data;
    setToken(access_token);
    setUser(loggedUser);
    localStorage.setItem('brsr_token', access_token);
    localStorage.setItem('brsr_user', JSON.stringify(loggedUser));
    return loggedUser;
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('brsr_token');
    localStorage.removeItem('brsr_user');
  };

  const isAdmin = user?.role === 'system_admin';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
