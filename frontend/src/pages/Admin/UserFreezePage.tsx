import React, { useState, useEffect, useRef } from 'react';
import { Search, ShieldAlert, UserCheck, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { searchUsersForFreezeAdmin } from '../../api';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

const UserFreezePage: React.FC = () => {
  const { api } = useAuth();
  const location = useLocation();
  const [collegeId, setCollegeId] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [frozenUsers, setFrozenUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);

  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Auto-fill email from navigation state
  useEffect(() => {
    const state = location.state as { emailToFreeze?: string } | null;
    if (state?.emailToFreeze) {
      setCollegeId(state.emailToFreeze);
    }
  }, [location]);

  const fetchFrozenUsers = async () => {
    try {
      setListLoading(true);
      const res = await api.get('/admin/frozen-users');
      setFrozenUsers(res.data.users);
    } catch (err) {
      toast.error('Failed to fetch frozen users');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchFrozenUsers();
  }, []);

  // Handle outside click to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (collegeId.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await searchUsersForFreezeAdmin(collegeId);
        setSuggestions(res.data.users);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Suggestions error:', err);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [collegeId]);

  const handleBulkFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeId.trim()) return;

    if (!window.confirm(`Are you sure you want to freeze ALL accounts matching College ID: ${collegeId}? This action will immediately logout all targeted users.`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/admin/freeze-by-college', { collegeId });
      toast.success(res.data.message);
      setCollegeId('');
      setShowSuggestions(false);
      fetchFrozenUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to freeze accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfreeze = async (userId: string) => {
    try {
      const res = await api.post(`/admin/unfreeze/${userId}`);
      toast.success(res.data.message);
      fetchFrozenUsers();
    } catch (err) {
      toast.error('Failed to unfreeze account');
    }
  };

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-xl">
          <h2 className="text-3xl font-bold text-text-dark [html.light_&]:text-text-light font-display">
            Account Security Management
          </h2>
          <p className="text-text-muted-dark [html.light_&]:text-text-muted-light mt-2">
            Freeze accounts in bulk by entering a College Identifier (email prefix). 
            Users will be restricted until manually restored.
          </p>
        </div>

        <form onSubmit={handleBulkFreeze} className="flex-1 max-w-md w-full">
          <label className="block text-sm font-semibold mb-2 text-text-dark [html.light_&]:text-text-light">
            Freeze by College ID
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1" ref={suggestionsRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Ex: 7001, st_23..."
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                onFocus={() => collegeId.length >= 2 && setShowSuggestions(true)}
                className="w-full bg-surface-dark [html.light_&]:bg-white border border-border-dark [html.light_&]:border-border-light rounded-xl pl-10 pr-4 py-3 text-text-dark [html.light_&]:text-text-light focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface-dark [html.light_&]:bg-white border border-border-dark [html.light_&]:border-border-light rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-2 border-b border-border-dark [html.light_&]:border-border-light bg-slate-500/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted-dark px-2">Matching Accounts</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {suggestions.map((user) => (
                      <button
                        key={user._id}
                        type="button"
                        onClick={() => {
                          // Use full college email to display in the search box
                          const email = user.collegeEmail || user.email;
                          setCollegeId(email);
                          setShowSuggestions(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-rose-500/5 text-left border-b border-border-dark [html.light_&]:border-border-light last:border-0 transition-colors group"
                      >
                        <img 
                          src={user.profilePicture || `https://ui-avatars.com/api/?name=${user.username}`} 
                          className="w-8 h-8 rounded-full border border-border-dark"
                          alt="" 
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-sm text-text-dark [html.light_&]:text-text-light group-hover:text-rose-500">
                            {user.username}
                          </span>
                          <span className="text-xs text-text-muted-dark truncate">
                            {user.collegeEmail || user.email}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !collegeId}
              className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-rose-500/20"
            >
              <ShieldAlert size={20} />
              {loading ? 'Processing...' : 'Freeze'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-surface-dark [html.light_&]:bg-white rounded-3xl border border-border-dark [html.light_&]:border-border-light overflow-hidden shadow-xl">
        <div className="p-6 border-b border-border-dark [html.light_&]:border-border-light flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg">
              <ShieldAlert size={20} />
            </div>
            <h3 className="text-xl font-bold text-text-dark [html.light_&]:text-text-light">Restricted Accounts</h3>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider bg-slate-500/10 px-3 py-1 rounded-full text-text-muted-dark [html.light_&]:text-text-muted-light">
            {frozenUsers.length} Users Freezed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-bg-dark/50 [html.light_&]:bg-slate-50 border-b border-border-dark [html.light_&]:border-border-light">
                <th className="px-6 py-4 font-semibold text-text-dark [html.light_&]:text-text-light">User</th>
                <th className="px-6 py-4 font-semibold text-text-dark [html.light_&]:text-text-light">College Email</th>
                <th className="px-6 py-4 font-semibold text-text-dark [html.light_&]:text-text-light">Restricted Date</th>
                <th className="px-6 py-4 font-semibold text-text-dark [html.light_&]:text-text-light text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark [html.light_&]:divide-border-light">
              {listLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-6 py-4 h-16 bg-slate-500/5"></td>
                  </tr>
                ))
              ) : frozenUsers.length > 0 ? (
                frozenUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-bg-dark/20 [html.light_&]:hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.profilePicture || `https://ui-avatars.com/api/?name=${user.username}`} 
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-border-dark"
                          alt="" 
                        />
                        <span className="font-bold text-text-dark [html.light_&]:text-text-light">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-text-muted-dark [html.light_&]:text-text-muted-light italic">
                        <Mail size={14} />
                        {user.collegeEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleUnfreeze(user._id)}
                        className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all group"
                        title="Unfreeze Account"
                      >
                        <UserCheck className="group-hover:scale-110" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-text-muted-dark [html.light_&]:text-text-muted-light italic">
                    All clear! No accounts currently under restriction.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserFreezePage;
