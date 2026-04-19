import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const userParam = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Google sign-in failed. Please try again.');
      navigate('/login');
      return;
    }

    if (token && refreshToken && userParam) {
      try {
        const user = JSON.parse(userParam);
        login(token, refreshToken, user);
        toast.success('Signed in with Google!');

        // Redirect based on user state
        if (!user.college) {
          navigate('/set-login');
        } else {
          navigate('/profile');
        }
      } catch {
        toast.error('Failed to parse user data');
        navigate('/login');
      }
    } else {
      toast.error('Google sign-in failed. Missing data.');
      navigate('/login');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-muted-dark [html.light_&]:text-text-muted-light text-sm">
          Signing in with Google...
        </p>
      </div>
    </div>
  );
}
