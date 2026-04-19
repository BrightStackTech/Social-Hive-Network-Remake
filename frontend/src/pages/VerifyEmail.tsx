import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';

const API_URL = `${import.meta.env.VITE_SERVER_URL}/api/v1/users`;

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No verification token found');
        return;
      }

      try {
        const res = await axios.get(`${API_URL}/verify-email?token=${token}`);
        setStatus('success');
        setMessage(res.data.message);
        toast.success('Email verified successfully!');

        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Verification failed');
        toast.error('Email verification failed');
      }
    };
    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-lg">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-6">
                <Loader2 size={48} className="text-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-display font-bold text-text-dark [html.light_&]:text-text-light">
                Verifying Your Email...
              </h1>
              <p className="mt-3 text-text-muted-dark [html.light_&]:text-text-muted-light">
                Please wait while we verify your email address.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle size={32} className="text-success" />
                </div>
              </div>
              <h1 className="text-2xl font-display font-bold text-success">
                Email Verified!
              </h1>
              <p className="mt-3 text-text-muted-dark [html.light_&]:text-text-muted-light">
                {message}. Redirecting you to login...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
                  <XCircle size={32} className="text-danger" />
                </div>
              </div>
              <h1 className="text-2xl font-display font-bold text-danger">
                Verification Failed
              </h1>
              <p className="mt-3 text-text-muted-dark [html.light_&]:text-text-muted-light">
                {message}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full
                           bg-primary text-white hover:bg-primary-light
                           transition-all duration-300 font-semibold text-sm cursor-pointer
                           shadow-lg shadow-primary/30"
              >
                Go to Login
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
