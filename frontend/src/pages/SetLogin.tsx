import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { colleges } from '../data/collegeData';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

type SelectOption = {
  value: string;
  label: string;
};

type CollegeOption = SelectOption & {
  branches: string[];
};

const collegeOptions: CollegeOption[] = colleges.map((college) => ({
  value: college.name,
  label: college.name,
  branches: college.branches,
}));

const formatCountdown = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

// ─── Custom Searchable Select ──────────────────────────────
function SearchableSelect<T extends SelectOption>({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found',
  disabled = false,
}: {
  options: T[];
  value: T | null;
  onChange: (option: T | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const isDark = theme === 'dark';

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm
          border transition-all duration-200
          ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer'}
          ${isDark
            ? 'bg-[#1a2236] border-[#1e293b] text-slate-100 hover:border-primary'
            : 'bg-slate-100 border-slate-200 text-slate-900 hover:border-primary'}
          ${isOpen ? 'ring-2 ring-primary/40 border-primary' : ''}`}
      >
        <span className={value ? '' : isDark ? 'text-slate-400' : 'text-slate-500'}>
          {value ? value.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                setSearch('');
              }}
              className="p-0.5 rounded-full hover:bg-slate-500/30 transition-colors"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-1 w-full rounded-xl border shadow-2xl overflow-hidden
            ${isDark ? 'bg-[#111827] border-[#1e293b]' : 'bg-white border-slate-200'}`}
        >
          {/* Search input */}
          <div className={`flex items-center gap-2 px-3 py-2.5 border-b
            ${isDark ? 'border-[#1e293b]' : 'border-slate-200'}`}>
            <Search size={14} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className={`flex-1 bg-transparent text-sm outline-none
                ${isDark ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
            />
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className={`px-4 py-3 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {emptyMessage}
              </div>
            ) : (
              filtered.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer transition-colors
                    ${value?.value === option.value
                      ? 'bg-primary text-white'
                      : isDark
                        ? 'text-slate-100 hover:bg-primary/20'
                        : 'text-slate-900 hover:bg-primary/10'}`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────
export default function SetLogin() {
  const navigate = useNavigate();
  const { api, updateUser } = useAuth();
  const [college, setCollege] = useState<CollegeOption | null>(null);
  const [branch, setBranch] = useState<SelectOption | null>(null);
  const [collegeEmail, setCollegeEmail] = useState('');
  const [verifyCountdown, setVerifyCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isCollegeEmailVerified, setIsCollegeEmailVerified] = useState(false);

  const branchOptions: SelectOption[] = (college?.branches || []).map((b) => ({
    value: b,
    label: b,
  }));

  useEffect(() => {
    if (verifyCountdown === 0) return;

    const timeoutId = window.setTimeout(() => {
      setVerifyCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [verifyCountdown]);

  // Admin bypass: Admins should not see this page
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const u = JSON.parse(storedUser);
      if (u.isAdmin) {
        navigate('/secured/admin/growthpage');
      }
    }
  }, [navigate]);

  const isCollegeEmailValid = /^[a-z0-9._%+-]+@(nmims\.in|svkmmumbai\.onmicrosoft\.com|nmims\.edu)$/i.test(collegeEmail.trim());

  const canContinue = !!college && !!branch?.value && isCollegeEmailVerified;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canContinue) {
      toast.error('Please complete all fields and verify your college email');
      return;
    }

    setLoading(true);
    try {
      const res = await api.put('/update-college-branch', {
        college: college!.value,
        engineeringDomain: branch!.value,
      });

      updateUser(res.data.user);
      toast.success('College and branch saved');

      if (res.data.user.loginType === 'google') {
        navigate('/profile');
      } else {
        navigate('/send-email-verification');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCollegeChange = (selectedOption: CollegeOption | null) => {
    setCollege(selectedOption);
    setBranch(null);
  };

  const handleSendOtp = async () => {
    if (!collegeEmail.trim()) {
      toast.error('Please enter your college email id');
      return;
    }

    if (!isCollegeEmailValid) {
      toast.error('Only @nmims.in, @svkmmumbai.onmicrosoft.com, or @nmims.edu email addresses are allowed');
      return;
    }

    setSendingOtp(true);
    try {
      await api.post('/send-college-verification', {
        collegeEmail: collegeEmail.trim(),
      });
      toast.success('Verification code sent! Check your college inbox.');
      setOtpSent(true);
      setVerifyCountdown(120);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send verification email';
      toast.error(message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      toast.error('Please enter the verification code');
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await api.post('/verify-college-email', { otp: otp.trim() });
      if (res.data.verified) {
        setIsCollegeEmailVerified(true);
        toast.success('College email verified!');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Verification failed';
      toast.error(message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Reset verification if email changes
  const [isEmailFrozen, setIsEmailFrozen] = useState(false);

  const handleEmailChange = async (val: string) => {
    const email = val.toLowerCase();
    setCollegeEmail(email);
    setIsEmailFrozen(false);

    if (isCollegeEmailVerified) {
      setIsCollegeEmailVerified(false);
      setOtpSent(false);
      setOtp('');
      setVerifyCountdown(0);
    }

    // Check if email is frozen (debounced later if needed, but simple for now)
    if (email && /^[a-z0-9._%+-]+@(nmims\.in|svkmmumbai\.onmicrosoft\.com|nmims\.edu)$/i.test(email)) {
      try {
        const res = await api.get(`/check-email-status?email=${email}`);
        if (res.data.isFrozen) {
          setIsEmailFrozen(true);
          toast.error('This email is frozen. Please try a different email.');
        }
      } catch (err) {
        console.error('Check status error:', err);
      }
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
              Almost There!
            </h1>
            <p className="mt-2 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
              Select your college and branch to continue
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {/* College */}
              <div>
                <label className="block text-sm font-medium mb-2
                                  text-text-dark [html.light_&]:text-text-light">
                  College <span className="text-danger">*</span>
                </label>
                <SearchableSelect
                  options={collegeOptions}
                  value={college}
                  onChange={handleCollegeChange}
                  placeholder="Select College"
                />
              </div>

              {/* Branch */}
              <div>
                <label className="block text-sm font-medium mb-2
                                  text-text-dark [html.light_&]:text-text-light">
                  Branch <span className="text-danger">*</span>
                </label>
                <SearchableSelect
                  options={branchOptions}
                  value={branch}
                  onChange={(option) => setBranch(option)}
                  placeholder="Select Branch"
                  searchPlaceholder="Search branch..."
                  emptyMessage="No branches found"
                  disabled={!college}
                />
              </div>

              {/* College Email */}
              <div>
                <label className="block text-sm font-medium mb-2
                                  text-text-dark [html.light_&]:text-text-light">
                  College Email ID <span className="text-danger">*</span>
                </label>

                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={collegeEmail}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="yourname@nmims.in or college email"
                      disabled={isCollegeEmailVerified}
                      className="w-full px-4 py-3 rounded-xl text-sm
                                 bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                                 border border-border-dark [html.light_&]:border-border-light
                                 text-text-dark [html.light_&]:text-text-light
                                 placeholder:text-text-muted-dark [html.light_&]:placeholder:text-text-muted-light
                                 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                                 transition-all duration-200
                                 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <p className="mt-2 text-xs text-text-muted-dark [html.light_&]:text-text-muted-light">
                      Allowed: @nmims.in, @svkmmumbai.onmicrosoft.com, @nmims.edu
                    </p>
                  </div>

                  {/* Verify Button / Green Tick */}
                  <div className="pt-0.5">
                    {isCollegeEmailVerified ? (
                      <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center
                                      shadow-lg shadow-emerald-500/30 animate-[scaleIn_0.3s_ease-out]">
                        <Check size={24} className="text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendingOtp || !isCollegeEmailValid || (verifyCountdown > 0 && otpSent) || isEmailFrozen}
                        className="px-5 py-3 rounded-xl font-semibold text-sm
                                   bg-success text-white hover:bg-success/90
                                   transition-all duration-300 cursor-pointer
                                   shadow-lg shadow-success/25
                                   disabled:bg-slate-500 disabled:text-slate-200 disabled:shadow-none
                                   disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {sendingOtp ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : verifyCountdown > 0 && otpSent ? (
                          formatCountdown(verifyCountdown)
                        ) : otpSent ? (
                          'Resend'
                        ) : (
                          'Verify'
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* OTP Input — shows after sending */}
                {otpSent && !isCollegeEmailVerified && (
                  <div className="mt-4 animate-[slideDown_0.3s_ease-out]">
                    <label className="block text-xs font-medium mb-2
                                      text-text-muted-dark [html.light_&]:text-text-muted-light">
                      Enter the 6-digit code sent to {collegeEmail}
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="flex-1 px-4 py-3 rounded-xl text-sm text-center tracking-[0.5em] font-mono font-bold
                                   bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                                   border border-border-dark [html.light_&]:border-border-light
                                   text-text-dark [html.light_&]:text-text-light
                                   placeholder:text-text-muted-dark [html.light_&]:placeholder:text-text-muted-light
                                   focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                                   transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otp.length < 6 || verifyingOtp}
                        className="px-6 py-3 rounded-xl font-semibold text-sm
                                   bg-primary text-white hover:bg-primary-light
                                   transition-all duration-300 cursor-pointer
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {verifyingOtp ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          'Confirm'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !canContinue}
                className="w-full py-3.5 rounded-xl font-semibold text-sm
                           bg-primary text-white hover:bg-primary-light
                           transition-all duration-300 cursor-pointer
                           flex items-center justify-center gap-2 group
                           shadow-lg shadow-primary/30
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Continue'}
                {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
