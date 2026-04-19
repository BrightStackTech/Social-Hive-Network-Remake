import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, User, Save, Loader2, CheckCircle, XCircle, Search, ChevronDown,
} from 'lucide-react';
import type { ReactCropperElement } from 'react-cropper';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { colleges } from '../data/collegeData';

const API_URL = `${import.meta.env.VITE_SERVER_URL}/api/v1/users`;

/* ─── Searchable Select ───────────────────────────────────────────── */
function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  id,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="relative" id={id}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm text-left
                   bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                   border border-border-dark [html.light_&]:border-border-light
                   text-text-dark [html.light_&]:text-text-light
                   focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                   transition-all duration-200 cursor-pointer"
      >
        <span className={value ? '' : 'text-text-muted-dark [html.light_&]:text-text-muted-light'}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl shadow-xl
                        bg-surface-card-dark [html.light_&]:bg-surface-card-light
                        border border-border-dark [html.light_&]:border-border-light">
          <div className="sticky top-0 p-2 bg-surface-card-dark [html.light_&]:bg-surface-card-light
                          border-b border-border-dark [html.light_&]:border-border-light">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg
                            bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light">
              <Search size={14} className="text-text-muted-dark [html.light_&]:text-text-muted-light shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent text-sm text-text-dark [html.light_&]:text-text-light
                           placeholder:text-text-muted-dark focus:outline-none"
              />
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
              No results found
            </div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); setQuery(''); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer
                            hover:bg-primary/10
                            ${opt === value
                              ? 'text-primary font-semibold bg-primary/5'
                              : 'text-text-dark [html.light_&]:text-text-light'
                            }`}
              >
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Edit Profile Page ───────────────────────────────────────────── */
export default function EditProfile() {
  const navigate = useNavigate();
  const { user, updateUser, api } = useAuth();

  // ── Account details ──
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isUsernameUnique, setIsUsernameUnique] = useState(true);
  const [usernameError, setUsernameError] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);

  // ── Personal details ──
  const [phone, setPhone] = useState(user?.phone || '');
  const [college, setCollege] = useState(user?.college || '');
  const [engineeringDomain, setEngineeringDomain] = useState(user?.engineeringDomain || '');
  const [yearOfGraduation, setYearOfGraduation] = useState(user?.yearOfGraduation || '');
  const [showYearOfGraduation, setShowYearOfGraduation] = useState(user?.showYearOfGraduation || false);
  const [personalError, setPersonalError] = useState('');
  const [personalLoading, setPersonalLoading] = useState(false);

  // ── Profile picture ──
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState(user?.profilePicture || '');
  const [pfpDialogOpen, setPfpDialogOpen] = useState(false);
  const [viewPfpOpen, setViewPfpOpen] = useState(false);
  const [pfpLoading, setPfpLoading] = useState(false);
  const cropperRef = useRef<ReactCropperElement>(null);

  // Derived: branches for selected college
  const branchOptions = colleges.find((c) => c.name === college)?.branches || [];

  // ── Username check (debounced) ──
  useEffect(() => {
    if (!username) {
      setIsUsernameUnique(false);
      setUsernameError('Username cannot be empty');
      return;
    }
    if (username === user?.username) {
      setIsUsernameUnique(true);
      setUsernameError('');
      return;
    }
    if (username.length < 6) {
      setIsUsernameUnique(false);
      setUsernameError('Username must be at least 6 characters');
      return;
    }
    const regex = /^[a-zA-Z_][a-zA-Z0-9_@]*$/;
    if (!regex.test(username)) {
      setIsUsernameUnique(false);
      setUsernameError('Must start with a letter; only letters, digits, _ and @ allowed');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`${API_URL}/check-username`, { params: { username } });
        if (res.data.data.isUnique) {
          setIsUsernameUnique(true);
          setUsernameError('');
        } else {
          setIsUsernameUnique(false);
          setUsernameError('Username already taken');
        }
      } catch {
        setIsUsernameUnique(false);
        setUsernameError('Error checking username');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  // ── Handlers ──
  const handlePFPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setProfilePictureUrl(reader.result as string);
      reader.readAsDataURL(file);
      setProfilePicture(file);
    }
  };

  const handleUpdatePFP = async () => {
    if (!profilePicture || !cropperRef.current) return;
    setPfpLoading(true);
    try {
      const cropper = cropperRef.current.cropper;
      const canvas = cropper.getCroppedCanvas();
      canvas.toBlob(
        async (blob) => {
          if (!blob) return;
          const file = new File([blob], 'profile_picture.jpg', { type: 'image/jpeg' });
          const formData = new FormData();
          formData.append('profilePicture', file);

          const res = await api.patch(`${API_URL}/update-profile-picture`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          updateUser(res.data.data);
          toast.success('Profile picture updated');
          setPfpDialogOpen(false);
          setProfilePicture(null);
          setProfilePictureUrl(res.data.data.profilePicture);
          setPfpLoading(false);
        },
        'image/jpeg',
        0.8
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update picture');
      setPfpLoading(false);
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUsernameUnique || usernameError) {
      toast.error('Please fix username errors');
      return;
    }
    setAccountLoading(true);
    try {
      const res = await api.patch(`${API_URL}/update-account-details`, { username, email, bio });
      updateUser(res.data.data.user);
      toast.success('Account details updated');
      if (res.data.data.isEmailChanged) {
        toast('Please verify your new email', { icon: '📧' });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setAccountLoading(false);
    }
  };

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalError('');

    if (!college) { setPersonalError('College is required'); return; }
    if (!engineeringDomain) { setPersonalError('Engineering domain is required'); return; }
    if (yearOfGraduation.length !== 4 || isNaN(Number(yearOfGraduation))) {
      setPersonalError('Enter a valid 4-digit year');
      return;
    }

    // No change → go back
    if (
      college === user?.college &&
      engineeringDomain === user?.engineeringDomain &&
      yearOfGraduation === user?.yearOfGraduation &&
      phone === user?.phone &&
      showYearOfGraduation === (user?.showYearOfGraduation || false)
    ) {
      navigate('/profile');
      return;
    }

    setPersonalLoading(true);
    try {
      const res = await api.patch(`${API_URL}/update-personal-details`, {
        phone, college, engineeringDomain, yearOfGraduation, showYearOfGraduation,
      });
      updateUser(res.data.data);
      toast.success('Personal details updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setPersonalLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ── Page title ──
  document.title = 'SocialHive — Edit Profile';

  // All college names
  const collegeNames = colleges.map((c) => c.name);

  return (
    <div className="px-4 py-0">
      {/* ── Top tabs ─── */}
      <div className="border-b border-border-dark [html.light_&]:border-border-light">
        <div className="flex justify-center">
          {['Profile', 'Edit Profile'].map((tab) => (
            <button
              key={tab}
              onClick={() => { if (tab === 'Profile') navigate('/profile'); }}
              className={`flex-1 py-6 text-sm font-semibold text-center transition-all duration-200 cursor-pointer
                         ${tab === 'Edit Profile'
                           ? 'text-text-dark [html.light_&]:text-text-light border-b-3 border-primary'
                           : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-text-light border-b-3 border-transparent'
                         }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto py-8 space-y-8">
        {/* ═══════════ PROFILE PICTURE ═══════════ */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <img
              src={user.profilePicture || `https://ui-avatars.com/api/?name=${user.username}&background=4361ee&color=fff&size=160`}
              alt={user.username}
              className="w-32 h-32 rounded-full object-cover ring-4 ring-primary/20 shadow-xl"
            />
            <button
              onClick={() => setPfpDialogOpen(true)}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100
                         flex items-center justify-center transition-opacity cursor-pointer"
            >
              <Camera size={28} className="text-white" />
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setPfpDialogOpen(true)}
              className="text-sm font-semibold text-primary hover:text-primary-light transition-colors cursor-pointer"
            >
              Edit Picture
            </button>
            <span className="text-border-dark">|</span>
            <button
              onClick={() => setViewPfpOpen(true)}
              className="text-sm font-semibold text-primary hover:text-primary-light transition-colors cursor-pointer"
            >
              View Picture
            </button>
          </div>
        </div>

        {/* ═══════════ ACCOUNT DETAILS ═══════════ */}
        <form onSubmit={handleAccountSubmit}>
          <div className="rounded-2xl p-6 glass-dark [html.light_&]:glass-light
                          border border-border-dark [html.light_&]:border-border-light space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <User size={18} className="text-primary" />
              <h2 className="text-base font-display font-bold text-text-dark [html.light_&]:text-text-light">
                Account Details
              </h2>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-text-dark [html.light_&]:text-text-light mb-1.5">
                Username
              </label>
              <div className="relative">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm
                             bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                             border border-border-dark [html.light_&]:border-border-light
                             text-text-dark [html.light_&]:text-text-light
                             focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                             transition-all duration-200"
                />
                {username !== user.username && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isUsernameUnique ? (
                      <CheckCircle size={18} className="text-success" />
                    ) : (
                      <XCircle size={18} className="text-danger" />
                    )}
                  </div>
                )}
              </div>
              {usernameError && (
                <p className="mt-1 text-xs text-danger">{usernameError}</p>
              )}
              {!usernameError && username !== user.username && isUsernameUnique && (
                <p className="mt-1 text-xs text-success">Username available</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-dark [html.light_&]:text-text-light mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled
                className="w-full px-4 py-2.5 rounded-xl text-sm
                           bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                           border border-border-dark [html.light_&]:border-border-light
                           text-text-dark [html.light_&]:text-text-light
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                           transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-text-dark [html.light_&]:text-text-light mb-1.5">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={200}
                className="w-full px-4 py-2.5 rounded-xl text-sm resize-none
                           bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                           border border-border-dark [html.light_&]:border-border-light
                           text-text-dark [html.light_&]:text-text-light
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                           transition-all duration-200"
              />
              <p className="text-right text-xs text-text-muted-dark [html.light_&]:text-text-muted-light">
                {bio.length}/200
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={accountLoading || !isUsernameUnique || !!usernameError}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer
                           bg-primary text-white hover:bg-primary-light
                           shadow-lg shadow-primary/25 transition-all duration-300
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-2"
              >
                {accountLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Account Details
              </button>
            </div>
          </div>
        </form>

        {/* ═══════════ PERSONAL DETAILS ═══════════ */}
        <form onSubmit={handlePersonalSubmit}>
          <div className="rounded-2xl p-6 glass-dark [html.light_&]:glass-light
                          border border-border-dark [html.light_&]:border-border-light space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                   strokeLinejoin="round" className="text-primary">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
              <h2 className="text-base font-display font-bold text-text-dark [html.light_&]:text-text-light">
                Personal Details
              </h2>
            </div>

            {personalError && (
              <p className="text-sm text-danger bg-danger/10 px-4 py-2 rounded-xl">{personalError}</p>
            )}

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-text-dark [html.light_&]:text-text-light mb-1.5">
                Phone Number
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="w-full px-4 py-2.5 rounded-xl text-sm
                           bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                           border border-border-dark [html.light_&]:border-border-light
                           text-text-dark [html.light_&]:text-text-light
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                           transition-all duration-200"
              />
            </div>

            {/* College */}
            <div>
              <label className="block text-sm font-medium text-text-dark [html.light_&]:text-text-light mb-1.5">
                College
              </label>
              <SearchableSelect
                id="college-select"
                options={collegeNames}
                value={college}
                onChange={(v) => {
                  setCollege(v);
                  setEngineeringDomain(''); // reset branch on college change
                }}
                placeholder="Select your college"
              />
            </div>

            {/* Engineering Domain / Branch */}
            <div>
              <label className="block text-sm font-medium text-text-dark [html.light_&]:text-text-light mb-1.5">
                Engineering Domain / Branch
              </label>
              <SearchableSelect
                id="branch-select"
                options={branchOptions}
                value={engineeringDomain}
                onChange={setEngineeringDomain}
                placeholder={college ? 'Select your branch' : 'Select college first'}
              />
            </div>

            {/* Year of Graduation */}
            <div>
              <label className="block text-sm font-medium text-text-dark [html.light_&]:text-text-light mb-1.5">
                Year of Graduation
              </label>
              <input
                value={yearOfGraduation}
                onChange={(e) => setYearOfGraduation(e.target.value)}
                placeholder="e.g. 2027"
                maxLength={4}
                className="w-full px-4 py-2.5 rounded-xl text-sm
                           bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                           border border-border-dark [html.light_&]:border-border-light
                           text-text-dark [html.light_&]:text-text-light
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                           transition-all duration-200"
              />
              <div className="flex items-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setShowYearOfGraduation(!showYearOfGraduation)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50 ${showYearOfGraduation ? 'bg-primary' : 'bg-surface-elevated-dark [html.light_&]:bg-border-light'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${showYearOfGraduation ? 'translate-x-[8px]' : '-translate-x-[8px]'}`}
                  />
                </button>
                <span className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light select-none">
                  Show year of graduation on profile?
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={personalLoading}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer
                           bg-primary text-white hover:bg-primary-light
                           shadow-lg shadow-primary/25 transition-all duration-300
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-2"
              >
                {personalLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Personal Details
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ═══════════ EDIT PFP DIALOG ═══════════ */}
      {pfpDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 p-6 rounded-2xl
                          bg-surface-card-dark [html.light_&]:bg-surface-card-light
                          border border-border-dark [html.light_&]:border-border-light shadow-2xl">
            <h3 className="text-lg font-display font-bold text-text-dark [html.light_&]:text-text-light text-center mb-4">
              Update Profile Picture
            </h3>

            <label className="block w-full cursor-pointer">
              <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
                              bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                              border border-dashed border-border-dark [html.light_&]:border-border-light
                              text-text-muted-dark [html.light_&]:text-text-muted-light
                              hover:border-primary hover:text-primary transition-all">
                <Camera size={18} />
                Choose Image
              </div>
              <input type="file" accept="image/*" onChange={handlePFPChange} className="hidden" />
            </label>

            {profilePicture && (
              <div className="mt-4 rounded-xl overflow-hidden border border-border-dark [html.light_&]:border-border-light">
                <Cropper
                  ref={cropperRef}
                  src={profilePictureUrl}
                  aspectRatio={1}
                  style={{ height: 300, width: '100%' }}
                  background={false}
                  guides
                  viewMode={1}
                />
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setPfpDialogOpen(false); setProfilePicture(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer
                           text-text-muted-dark [html.light_&]:text-text-muted-light
                           border border-border-dark [html.light_&]:border-border-light
                           hover:text-text-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePFP}
                disabled={!profilePicture || pfpLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer
                           bg-primary text-white hover:bg-primary-light transition-all
                           shadow-lg shadow-primary/25
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2"
              >
                {pfpLoading && <Loader2 size={16} className="animate-spin" />}
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ VIEW PFP DIALOG ═══════════ */}
      {viewPfpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setViewPfpOpen(false)}
        >
          <div
            className="max-w-lg mx-4 p-4 rounded-2xl
                        bg-surface-card-dark [html.light_&]:bg-surface-card-light
                        border border-border-dark [html.light_&]:border-border-light shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-display font-bold text-text-dark [html.light_&]:text-text-light text-center mb-4">
              Profile Picture
            </h3>
            <img
              src={user.profilePicture || `https://ui-avatars.com/api/?name=${user.username}&background=4361ee&color=fff&size=900`}
              alt={user.username}
              className="w-200 rounded-xl"
            />
            <button
              onClick={() => setViewPfpOpen(false)}
              className="w-full mt-4 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer
                         text-text-muted-dark [html.light_&]:text-text-muted-light
                         border border-border-dark [html.light_&]:border-border-light
                         hover:text-text-dark transition-colors text-center"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
