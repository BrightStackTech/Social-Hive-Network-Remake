import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { type UserInterface } from '../types';

const API_URL = `${import.meta.env.VITE_SERVER_URL}/api/v1/users`;

interface AuthContextType {
  user: UserInterface | null;
  token: string | null;
  login: (token: string, refreshToken: string, user: UserInterface) => void;
  logout: () => void;
  updateUser: (user: UserInterface) => void;
  api: ReturnType<typeof axios.create>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInterface | null>(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    const u = JSON.parse(stored);
    return u ? { ...u, _id: u._id || u.id } : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  const login = (newToken: string, refreshToken: string, newUser: UserInterface) => {
    const normalizedUser = { ...newUser, _id: newUser._id || (newUser as any).id };
    setToken(newToken);
    setUser(normalizedUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  const updateUser = (updatedUser: UserInterface) => {
    const normalizedUser = { ...updatedUser, _id: updatedUser._id || (updatedUser as any).id };
    setUser(normalizedUser);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
  };

  const api = axios.create({
    baseURL: API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  // Update headers when token changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Global error interceptor for frozen accounts
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 403 && error.response?.data?.isFreezed) {
          // Store flag to show message after reload
          localStorage.setItem('frozen_alert', 'true');
          logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptor);
  }, [logout]);

  // Check for frozen alert on mount
  useEffect(() => {
    if (localStorage.getItem('frozen_alert')) {
      localStorage.removeItem('frozen_alert');
      // Small delay to let toast system initialize
      setTimeout(() => {
        toast.error('Oops your account has been freezzed. Try to contact the support mail for further details.', {
          duration: 6000,
          position: 'top-center',
          icon: '❄️'
        });
      }, 500);
    }
  }, []);

  // Fetch latest user profile on mount to sync followers/following
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!token) return;
      try {
        const response = await api.get('/profile');
        if (response.data?.user) {
          updateUser(response.data.user);
        }
      } catch (error) {
        console.error('Failed to sync user profile:', error);
      }
    };

    fetchUserProfile();
  }, [token]);




  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, api }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
