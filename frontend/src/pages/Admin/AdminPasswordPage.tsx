import React, { useState } from 'react';
import { Lock, Save, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const AdminPasswordPage: React.FC = () => {
  const { api } = useAuth();
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      const res = await api.patch('/admin/update-password', {
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword
      });
      toast.success(res.data.message);
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl animate-in slide-in-from-left-4 duration-500">
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-text-dark [html.light_&]:text-text-light font-display">
          Security Controls
        </h2>
        <p className="text-text-muted-dark [html.light_&]:text-text-muted-light mt-2">
          Maintain administrative access security by regularly cycling your credentials.
        </p>
      </div>

      <div className="bg-surface-dark [html.light_&]:bg-white rounded-3xl border border-border-dark [html.light_&]:border-border-light shadow-xl overflow-hidden p-8">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border-dark [html.light_&]:border-border-light">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-text-dark [html.light_&]:text-text-light">Update Credentials</h3>
            <p className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">Confirm identity to modify access password</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-dark [html.light_&]:text-text-light flex items-center gap-2">
              <Lock size={14} className="text-text-muted-dark" />
              Old Password
            </label>
            <input
              type="password"
              required
              value={passwords.oldPassword}
              onChange={(e) => setPasswords({...passwords, oldPassword: e.target.value})}
              className="w-full bg-bg-dark [html.light_&]:bg-slate-50 border border-border-dark [html.light_&]:border-border-light rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-dark [html.light_&]:text-text-light"
              placeholder="••••••••"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-dark [html.light_&]:text-text-light">New Password</label>
              <input
                type="password"
                required
                value={passwords.newPassword}
                onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                className="w-full bg-bg-dark [html.light_&]:bg-slate-50 border border-border-dark [html.light_&]:border-border-light rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-dark [html.light_&]:text-text-light"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-dark [html.light_&]:text-text-light">Confirm New Password</label>
              <input
                type="password"
                required
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                className="w-full bg-bg-dark [html.light_&]:bg-slate-50 border border-border-dark [html.light_&]:border-border-light rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-dark [html.light_&]:text-text-light"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 flex gap-3 mt-4">
            <AlertCircle className="text-amber-500 shrink-0" size={20} />
            <p className="text-xs text-amber-500/80 leading-relaxed font-medium">
              Updating your administrative password will NOT terminate existing sessions, but all future logins will require the new credentials. Ensure you have noted the new password before saving.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-white px-10 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-primary/25 disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? 'Saving Changes...' : 'Save Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPasswordPage;
