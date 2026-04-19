import { useEffect, useRef, useState } from 'react';
import { LogOut, Mail, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function SendVerificationEmail() {
  const navigate = useNavigate();
  const { api, user, logout } = useAuth();
  const [sending, setSending] = useState(true);
  const [sent, setSent] = useState(false);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const sendEmail = async () => {
      try {
        await api.post('/send-verification-email');
        setSent(true);
      } catch (error: any) {
        const message = error.response?.data?.message || 'Failed to send verification email';
        toast.error(message);
      } finally {
        setSending(false);
      }
    };
    sendEmail();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-lg">
          {sending ? (
            <>
              <div className="flex justify-center mb-6">
                <Loader2 size={48} className="text-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-display font-bold text-text-dark [html.light_&]:text-text-light">
                Sending Verification Email...
              </h1>
              <p className="mt-3 text-text-muted-dark [html.light_&]:text-text-muted-light">
                Please wait while we send the verification link to your email.
              </p>
            </>
          ) : sent ? (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail size={32} className="text-primary" />
                </div>
              </div>
              <h1 className="text-2xl font-display font-bold text-text-dark [html.light_&]:text-text-light">
                Check Your Email
              </h1>
              <p className="mt-3 text-text-muted-dark [html.light_&]:text-text-muted-light">
                A verification link has been sent to{' '}
                <span className="text-primary font-medium">{user?.email}</span>.
                Please check your email and click on the link to verify your email.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-display font-bold text-danger">
                Something went wrong
              </h1>
              <p className="mt-3 text-text-muted-dark [html.light_&]:text-text-muted-light">
                We couldn't send the verification email. Please try again later.
              </p>
            </>
          )}

          <button
            onClick={handleLogout}
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full
                       border-2 border-border-dark [html.light_&]:border-border-light
                       text-text-dark [html.light_&]:text-text-light
                       hover:border-danger hover:text-danger
                       transition-all duration-300 font-semibold text-sm cursor-pointer"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </main>
    </div>
  );
}
