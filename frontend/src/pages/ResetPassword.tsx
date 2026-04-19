import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaMoon, FaSun, FaEye, FaEyeSlash } from "react-icons/fa";
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || 
                  (!document.documentElement.classList.contains('light') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    if (confirmPassword && newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match.");
    } else {
      setConfirmError("");
    }
  }, [confirmPassword, newPassword]);

  const isFormValid = () => {
    return (
      newPassword &&
      confirmPassword &&
      newPassword === confirmPassword
    );
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/v1/users/reset-password`, {
        token,
        newPassword,
      });
      toast.success(response.data.message);
      navigate("/login");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.response?.data?.message || "Error resetting password");
    }
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) {
      toast.error("Please check your entries.");
      return;
    }
    setShowConfirmDialog(true);
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
          
          <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-primary via-accent to-primary-light" />

          <div className="rounded-b-2xl p-8 sm:p-10
                          glass-dark [html.light_&]:glass-light
                          border border-border-dark [html.light_&]:border-border-light
                          shadow-2xl">
                          
            <h1 className="text-2xl font-display font-bold mt-4">
              Reset Password
            </h1>

            <form onSubmit={onFormSubmit} className="mt-8 space-y-5">
              {/* New Password Field */}
              <div className="relative">
                <label className="block text-sm font-medium mb-2">New Password</label>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm
                               bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                               border border-border-dark [html.light_&]:border-border-light
                               text-text-dark [html.light_&]:text-text-light
                               placeholder:text-text-muted-dark/50 [html.light_&]:placeholder:text-text-muted-light/50
                               focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                               transition-all duration-200 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center mt-7 hover:opacity-80 transition cursor-pointer"
                >
                  {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {/* Confirm Password Field */}
              <div className="relative">
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm
                               bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                               border border-border-dark [html.light_&]:border-border-light
                               text-text-dark [html.light_&]:text-text-light
                               placeholder:text-text-muted-dark/50 [html.light_&]:placeholder:text-text-muted-light/50
                               focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                               transition-all duration-200 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center mt-7 hover:opacity-80 transition cursor-pointer"
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
                {confirmError && <small className="text-red-500 block mt-1">{confirmError}</small>}
              </div>

              <button
                type="submit"
                disabled={!isFormValid()}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm
                           transition-all duration-300
                           flex items-center justify-center gap-2 group mt-4
                           ${isFormValid() 
                             ? 'bg-primary text-white hover:bg-primary-light shadow-lg shadow-primary/25 hover:shadow-primary/40 cursor-pointer' 
                             : 'bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light text-text-muted-dark/50 [html.light_&]:text-text-muted-light/50 cursor-not-allowed border border-border-dark [html.light_&]:border-border-light'}`}
              >
                Reset Password
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 backdrop-blur-sm">
          <div className="bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light p-6 rounded-xl shadow-2xl border border-border-dark [html.light_&]:border-border-light max-w-sm w-full mx-4">
            <p className="mb-6 text-lg font-medium">Are you sure you want to reset your password?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 rounded-lg bg-surface-dark [html.light_&]:bg-surface-light hover:opacity-80 transition border border-border-dark [html.light_&]:border-border-light cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  handleSubmit();
                }}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-light text-white shadow-lg shadow-primary/25 transition cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dark/Light toggle */}
      <button
        onClick={handleToggleTheme}
        className="fixed bottom-4 right-4 flex items-center justify-center p-3 rounded-full bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light border border-border-dark [html.light_&]:border-border-light hover:opacity-80 transition z-50 shadow-lg cursor-pointer"
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
};

export default ResetPassword;
