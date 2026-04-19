import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';

const API_URL = `${import.meta.env.VITE_SERVER_URL}/api/v1/users`;

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reactivationPending, setReactivationPending] = useState(false);
  const [deletionTerminationPending, setDeletionTerminationPending] = useState(false);
  const [remainingDays, setRemainingDays] = useState<number | null>(null);
  const [googleDeletionToken, setGoogleDeletionToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const deletionPending = params.get('deletion_pending');
    if (deletionPending) {
      const emailParam = params.get('email');
      const daysParam = params.get('days');
      const tokenParam = params.get('deletion_token');

      if (emailParam) setEmail(emailParam);
      if (daysParam) setRemainingDays(parseInt(daysParam));
      if (tokenParam) setGoogleDeletionToken(tokenParam);
      
      setDeletionTerminationPending(true);
      
      // Clear URL params without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      const { token, refreshToken, user } = res.data;

      login(token, refreshToken, user);
      toast.success('Login successful');

      // Redirect logic
      if (user.isAdmin) {
        navigate('/secured/admin/growthpage');
      } else if (!user.college) {
        navigate('/set-login');
      } else if (!user.isEmailVerified && user.loginType !== 'google') {
        navigate('/send-email-verification');
      } else {
        navigate('/profile');
      }
    } catch (error: any) {
      if (error.response?.data?.requiresReactivation) {
        setReactivationPending(true);
      } else if (error.response?.data?.requiresDeletionTermination) {
        setRemainingDays(error.response?.data?.remainingDays);
        setDeletionTerminationPending(true);
      } else if (error.response?.data?.isFreezed) {
        toast.error('Oops your account has been freezzed. Try to contact the support mail for further details.', {
          duration: 6000,
          position: 'top-center',
          icon: '❄️'
        });
      } else {
        const message = error.response?.data?.message || 'Login failed';
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmDeletionTerminationLogin = async () => {
    setLoading(true);
    setDeletionTerminationPending(false);
    try {
      if (googleDeletionToken) {
        // Google termination flow
        await axios.post(`${API_URL}/terminate-deletion-google`, { token: googleDeletionToken });
        toast.success('Deletion terminated. Please sign in with Google again.', { icon: '✅' });
        setGoogleDeletionToken(null);
      } else {
        // Email termination flow
        const res = await axios.post(`${API_URL}/login`, { email, password, confirmDeletionTermination: true });
        const { token, refreshToken, user } = res.data;

        login(token, refreshToken, user);
        toast.success('Deletion process terminated. Welcome back!', { icon: '✅' });

        if (user.isAdmin) {
          navigate('/secured/admin/growthpage');
        } else if (!user.college) {
          navigate('/set-login');
        } else if (!user.isEmailVerified && user.loginType !== 'google') {
          navigate('/send-email-verification');
        } else {
          navigate('/profile');
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const confirmReactivationLogin = async () => {
    setLoading(true);
    setReactivationPending(false);
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password, confirmReactivation: true });
      const { token, refreshToken, user } = res.data;

      login(token, refreshToken, user);
      toast.success('Account reactivated and login successful!');

      if (user.isAdmin) {
        navigate('/secured/admin/growthpage');
      } else if (!user.college) {
        navigate('/set-login');
      } else if (!user.isEmailVerified && user.loginType !== 'google') {
        navigate('/send-email-verification');
      } else {
        navigate('/profile');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Gradient accent bar */}
          <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-primary via-accent to-primary-light" />

          <div className="rounded-b-2xl p-8 sm:p-10
                          glass-dark [html.light_&]:glass-light
                          border border-border-dark [html.light_&]:border-border-light
                          shadow-2xl">

            <h1 className="text-2xl font-display font-bold text-text-dark [html.light_&]:text-text-light">
              Welcome back to SocialHive
            </h1>
            <p className="mt-2 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:text-primary-light transition-colors">
                Register here
              </Link>
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {/* Email / Username */}
              <div>
                <label className="block text-sm font-medium mb-2
                                  text-text-dark [html.light_&]:text-text-light">
                  Email Address / Username
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@example.com"
                  className="w-full px-4 py-3 rounded-xl text-sm
                             bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                             border border-border-dark [html.light_&]:border-border-light
                             text-text-dark [html.light_&]:text-text-light
                             placeholder:text-text-muted-dark/50 [html.light_&]:placeholder:text-text-muted-light/50
                             focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                             transition-all duration-200"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-text-dark [html.light_&]:text-text-light">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:text-primary-light transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 rounded-xl text-sm
                               bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                               border border-border-dark [html.light_&]:border-border-light
                               text-text-dark [html.light_&]:text-text-light
                               placeholder:text-text-muted-dark/50 [html.light_&]:placeholder:text-text-muted-light/50
                               focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                               transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1
                               text-text-muted-dark hover:text-text-dark
                               [html.light_&]:text-text-muted-light [html.light_&]:hover:text-text-light
                               transition-colors cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-sm
                           bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                           border border-border-dark [html.light_&]:border-border-light
                           text-text-dark [html.light_&]:text-text-light
                           hover:border-primary hover:text-primary
                           transition-all duration-300 cursor-pointer
                           flex items-center justify-center gap-2 group
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Login'}
                {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-dark [html.light_&]:border-border-light" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-surface-card-dark [html.light_&]:bg-surface-card-light
                                 text-text-muted-dark [html.light_&]:text-text-muted-light">
                  or
                </span>
              </div>
            </div>

            {/* Google Sign-In */}
            <button
              type="button"
              onClick={() => { window.location.href = `${import.meta.env.VITE_SERVER_URL}/api/v1/users/google`; }}
              className="w-full py-3 rounded-xl text-sm font-medium
                         bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                         border border-border-dark [html.light_&]:border-border-light
                         text-text-dark [html.light_&]:text-text-light
                         hover:border-primary/50 transition-all duration-300 cursor-pointer
                         flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>
          </div>
        </div>
      </main>

      <Footer />

      {/* Reactivation Dialog */}
      <Dialog open={reactivationPending} onOpenChange={setReactivationPending}>
        <DialogContent className="max-w-md bg-surface-dark [html.light_&]:bg-surface-card-light border-border-dark [html.light_&]:border-border-light p-6 rounded-2xl">
          <DialogHeader className="mb-0">
            <DialogTitle className="text-xl font-bold text-text-dark [html.light_&]:text-text-light mb-1">
              Reactivate Account
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light mt-4 mb-8">
            This action will reactivate your account, are you sure you want to log in?
          </p>
          <div className="flex gap-4 justify-end">
            <button 
               onClick={() => setReactivationPending(false)} 
               className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white/5 [html.light_&]:bg-black/5 hover:bg-white/10 [html.light_&]:hover:bg-black/10 text-text-dark [html.light_&]:text-text-light cursor-pointer"
            >
              No, Wait
            </button>
            <button 
               onClick={confirmReactivationLogin} 
               className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-dark shadow-[0_0_15px_rgba(79,70,229,0.3)] cursor-pointer"
            >
              Yes, Log in
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Deletion Termination Dialog */}
      <Dialog open={deletionTerminationPending} onOpenChange={setDeletionTerminationPending}>
        <DialogContent className="max-w-md bg-surface-dark [html.light_&]:bg-surface-card-light border-border-dark [html.light_&]:border-border-light p-6 rounded-2xl">
          <DialogHeader className="mb-0">
            <DialogTitle className="text-xl font-bold text-text-dark [html.light_&]:text-text-light mb-1">
              Terminate Deletion Process?
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
              You've previously set this account for deletion.
            </p>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm font-bold text-red-500 text-center">
                {remainingDays} days left until permanent deletion
              </p>
            </div>
            <p className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
              Would you like to terminate the deletion process and restore your account?
            </p>
          </div>
          <div className="flex gap-4 justify-end mt-8">
            <button 
               onClick={() => setDeletionTerminationPending(false)} 
               className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white/5 [html.light_&]:bg-black/5 hover:bg-white/10 [html.light_&]:hover:bg-black/10 text-text-dark [html.light_&]:text-text-light cursor-pointer transition-all"
            >
              No, Continue Deletion
            </button>
            <button 
               onClick={confirmDeletionTerminationLogin} 
               className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-dark shadow-[0_0_15px_rgba(79,70,229,0.3)] cursor-pointer transition-all"
            >
              Yes, Terminate
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
