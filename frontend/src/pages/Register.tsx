import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, X } from 'lucide-react';
import Cropper from 'react-cropper';
import type { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import toast from 'react-hot-toast';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const API_URL = `${import.meta.env.VITE_SERVER_URL}/api/v1/users`;

export default function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cropper state
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const cropperRef = useRef<ReactCropperElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRawImage(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
    canvas.toBlob((blob) => {
      if (blob) {
        setCroppedBlob(blob);
        setCroppedPreview(canvas.toDataURL());
        setShowCropper(false);
        setRawImage(null);
      }
    }, 'image/jpeg', 0.9);
  };

  const handleCancelCrop = () => {
    setShowCropper(false);
    setRawImage(null);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // No spaces, force lowercase
    const value = e.target.value.replace(/\s/g, '').toLowerCase();
    setUsername(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !email || !password || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password', password);
      if (croppedBlob) {
        formData.append('profilePicture', croppedBlob, 'profile.jpg');
      }

      await axios.post(`${API_URL}/register`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Registration successful, login to continue');
      navigate('/login');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
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
              Welcome to SocialHive
            </h1>
            <p className="mt-2 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
              Have an account already?{' '}
              <Link to="/login" className="text-primary hover:text-primary-light transition-colors">
                Login Here
              </Link>
            </p>

            {/* Google Sign-Up */}
            <button
              type="button"
              onClick={() => { window.location.href = `${import.meta.env.VITE_SERVER_URL}/api/v1/users/google`; }}
              className="w-full mt-6 py-3 rounded-xl text-sm font-medium
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
              Sign up with Google
            </button>

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

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium mb-2
                                  text-text-dark [html.light_&]:text-text-light">
                  Username <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="unique_username"
                  className="w-full px-4 py-3 rounded-xl text-sm
                             bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                             border border-border-dark [html.light_&]:border-border-light
                             text-text-dark [html.light_&]:text-text-light
                             placeholder:text-text-muted-dark/50 [html.light_&]:placeholder:text-text-muted-light/50
                             focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                             transition-all duration-200"
                />
                <p className="mt-1.5 text-xs text-text-muted-dark [html.light_&]:text-text-muted-light">
                  No spaces or uppercase allowed
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2
                                  text-text-dark [html.light_&]:text-text-light">
                  Email Address (Preferably gmail) <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  className="w-full px-4 py-3 rounded-xl text-sm
                             bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                             border border-border-dark [html.light_&]:border-border-light
                             text-text-dark [html.light_&]:text-text-light
                             placeholder:text-text-muted-dark/50 [html.light_&]:placeholder:text-text-muted-light/50
                             focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                             transition-all duration-200"
                />
              </div>

              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium mb-2
                                  text-text-dark [html.light_&]:text-text-light">
                  Profile Picture
                </label>
                {croppedPreview ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={croppedPreview}
                      alt="Cropped profile"
                      className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => { setCroppedBlob(null); setCroppedPreview(null); }}
                      className="text-sm text-danger hover:text-danger/80 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer
                                    bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                                    border border-border-dark [html.light_&]:border-border-light
                                    hover:border-primary/50 transition-all duration-200">
                    <span className="px-3 py-1 rounded-lg text-xs font-medium
                                     bg-surface-dark [html.light_&]:bg-surface-light
                                     border border-border-dark [html.light_&]:border-border-light
                                     text-text-dark [html.light_&]:text-text-light">
                      Choose File
                    </span>
                    <span className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light truncate">
                      No file chosen
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-2
                                  text-text-dark [html.light_&]:text-text-light">
                  Password <span className="text-danger">*</span>
                </label>
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

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium mb-2
                                  text-text-dark [html.light_&]:text-text-light">
                  Confirm Password <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1
                               text-text-muted-dark hover:text-text-dark
                               [html.light_&]:text-text-muted-light [html.light_&]:hover:text-text-light
                               transition-colors cursor-pointer"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
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
                {loading ? 'Signing up...' : 'Sign up'}
                {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Cropper Modal */}
      {showCropper && rawImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden
                          bg-surface-card-dark [html.light_&]:bg-surface-card-light
                          border border-border-dark [html.light_&]:border-border-light
                          shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border-dark [html.light_&]:border-border-light">
              <h3 className="font-display font-semibold text-text-dark [html.light_&]:text-text-light">
                Crop Profile Picture
              </h3>
              <button
                onClick={handleCancelCrop}
                className="p-1 rounded-lg hover:bg-surface-elevated-dark [html.light_&]:hover:bg-surface-elevated-light
                           text-text-muted-dark [html.light_&]:text-text-muted-light transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <Cropper
                ref={cropperRef}
                src={rawImage}
                style={{ height: 350, width: '100%' }}
                aspectRatio={1}
                guides={true}
                viewMode={1}
                dragMode="move"
                background={false}
              />
            </div>
            <div className="flex gap-3 p-4 border-t border-border-dark [html.light_&]:border-border-light">
              <button
                onClick={handleCancelCrop}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium
                           border border-border-dark [html.light_&]:border-border-light
                           text-text-muted-dark [html.light_&]:text-text-muted-light
                           hover:border-danger hover:text-danger transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCrop}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium
                           bg-primary text-white hover:bg-primary-light
                           transition-all cursor-pointer shadow-lg shadow-primary/30"
              >
                Crop & Save
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
