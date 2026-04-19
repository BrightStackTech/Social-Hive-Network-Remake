import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { FaMoon, FaSun } from 'react-icons/fa';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailValid, setEmailValid] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  // Initialize theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || 
                  (!document.documentElement.classList.contains('light') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
  }, []);

  // Debounced email checking to show error and disable button
  useEffect(() => {
    if (!email.trim()) {
      setEmailValid(false);
      setEmailError('');
      setIsChecking(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailValid(false);
      setEmailError('Invalid email format');
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    setEmailError('');

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/v1/users/check-email?email=${encodeURIComponent(email)}`);
        
        if (!response.data.exists) {
          setEmailValid(false);
          setEmailError('This email is not registered. Try another email or check if you\'ve entered the correct mail id.');
        } else if (response.data.loginType === 'google') {
          setEmailValid(false);
          setEmailError('This email uses Google Sign-In method. Please use Sign in with Google button on Log In page.');
        } else {
          setEmailValid(true);
          setEmailError('');
        }
      } catch (error) {
        console.error("Error checking email:", error);
        setEmailValid(false);
        setEmailError('Error communicating with server to verify email.');
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) return;

    setIsSubmitting(true);
    try {
      await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/v1/users/request-password-reset`, { email });
      toast.success("An email has been sent to this mail id to reset the password. Please check inbox (spam folder included)");
      setSent(true);
      setTimeout(() => navigate('/login'), 5000);
    } catch (error) {
      console.error("Error processing request:", error);
      toast.error("Error sending reset email");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTheme = () => {
    setDarkMode((prevMode) => {
      const newMode = !prevMode;
      if (newMode) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      return newMode;
    });
  };

  return (
    <div className="min-h-screen flex flex-col relative text-text-dark [html.light_&]:text-text-light">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md relative">
          
          {/* Gradient accent bar */}
          <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-primary via-accent to-primary-light" />

          <div className="rounded-b-2xl p-8 sm:p-10
                          glass-dark [html.light_&]:glass-light
                          border border-border-dark [html.light_&]:border-border-light
                          shadow-2xl">

            <h1 className="text-2xl font-display font-bold mt-4">
              Change Password
            </h1>
            <p className="mt-2 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
              Enter the email whose password you desire to change
            </p>

            {sent ? (
              <div className="mt-8 p-4 rounded-xl bg-success/10 border border-success/20">
                <p className="text-sm text-success font-medium">
                  ✓ Password reset link sent! Check your email inbox.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm
                               bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                               border border-border-dark [html.light_&]:border-border-light
                               text-text-dark [html.light_&]:text-text-light
                               placeholder:text-text-muted-dark/50 [html.light_&]:placeholder:text-text-muted-light/50
                               focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                               transition-all duration-200"
                  />
                  {emailError && (
                    <small className="text-red-500 block mt-2 font-medium">
                      {emailError}
                    </small>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!emailValid || isChecking || isSubmitting}
                  className={`w-full py-3.5 rounded-xl font-semibold text-sm
                             transition-all duration-300
                             flex items-center justify-center gap-2 group
                             ${(!emailValid || isChecking || isSubmitting)
                               ? 'bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light text-text-muted-dark/50 [html.light_&]:text-text-muted-light/50 cursor-not-allowed border border-border-dark [html.light_&]:border-border-light'
                               : 'bg-primary text-white hover:bg-primary-light shadow-lg shadow-primary/25 hover:shadow-primary/40 cursor-pointer'}`}
                >
                  <Send size={16} className={(!emailValid || isChecking || isSubmitting) ? "" : "group-hover:translate-x-0.5 transition-transform"} />
                  {isSubmitting ? 'Sending...' : isChecking ? 'Checking...' : 'Reset Password'}
                </button>
              </form>
            )}

            {/* Back to login */}
            <p className="mt-6 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light text-center">
              Remember your password?{' '}
              <Link to="/login" className="text-primary hover:text-primary-light transition-colors font-medium">
                Login
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Dark/Light toggle */}
      <button
        onClick={handleToggleTheme}
        className="fixed bottom-4 right-4 flex items-center justify-center p-3 rounded-full bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light border border-border-dark [html.light_&]:border-border-light hover:opacity-80 transition z-50 shadow-lg"
      >
        {darkMode ? (
          <FaMoon size={20} className="text-text-dark" />
        ) : (
          <FaSun size={20} className="text-yellow-500" />
        )}
      </button>

      <Footer />
    </div>
  );
}
