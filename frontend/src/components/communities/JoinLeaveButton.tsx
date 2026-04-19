import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Loader2, Plus, LogOut, Clock } from 'lucide-react';

interface JoinLeaveButtonProps {
  communityName: string;
  isJoined: boolean;
  isRemoved?: boolean;
  isPending?: boolean;
  onJoinLeave?: () => void;
  variant?: 'sidebar' | 'cta';
  className?: string;
}

const SERVER_URI = `${import.meta.env.VITE_SERVER_URL}/api/v1`;

export const JoinLeaveButton = ({ 
  communityName, 
  isJoined: initialIsJoined, 
  isRemoved: initialIsRemoved, 
  isPending: initialIsPending,
  onJoinLeave,
  variant = 'sidebar',
  className = ''
}: JoinLeaveButtonProps) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isJoined, setIsJoined] = useState(initialIsJoined || false);
  const [isPending, setIsPending] = useState(initialIsPending || false);
  const [isRemoved, setIsRemoved] = useState(initialIsRemoved || false);

  // Sync state with props when parent re-renders
  useEffect(() => {
    setIsJoined(initialIsJoined || false);
    setIsPending(initialIsPending || false);
    setIsRemoved(initialIsRemoved || false);
  }, [initialIsJoined, initialIsPending, initialIsRemoved]);

  const handleAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return toast.error("Please login first");
    if (loading) return; 
    
    setLoading(true);
    try {
      if (isJoined) {
        await axios.post(`${SERVER_URI}/communities/${communityName}/leave`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsJoined(false);
        toast.success(`Left c/${communityName}`);
      } else if (isPending) {
        await axios.post(`${SERVER_URI}/communities/${communityName}/cancel-join-request`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsPending(false);
        setIsRemoved(true); // After canceling a request, they likely go back to removed state if they were removed
        toast.success(`Cancelled request for c/${communityName}`);
      } else if (isRemoved) {
        await axios.post(`${SERVER_URI}/communities/${communityName}/send-join-request`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsPending(true);
        setIsRemoved(false);
        toast.success(`Request sent to c/${communityName}`);
      } else {
        await axios.post(`${SERVER_URI}/communities/${communityName}/join`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsJoined(true);
        toast.success(`Joined c/${communityName}`);
      }
      onJoinLeave?.();
      window.dispatchEvent(new Event('communityChange'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const [isHovering, setIsHovering] = useState(false);

  if (loading) return (
    <div className={`flex justify-center items-center ${variant === 'sidebar' ? 'w-[80px] px-3 py-1.5' : 'px-8 h-10'} ${className}`}>
      <Loader2 className="animate-spin text-primary" size={variant === 'sidebar' ? 14 : 20} />
    </div>
  );

  const baseStyles = variant === 'sidebar' 
    ? "px-3 py-1.5 text-[9px] w-[80px]" 
    : "w-full sm:w-auto px-8 h-10 text-xs shadow-lg shadow-primary/20";

  if (isJoined) {
    return (
      <button 
        onClick={handleAction}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={`${baseStyles} rounded-lg font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
          isHovering 
            ? "bg-danger text-white border-danger shadow-lg shadow-danger/20" 
            : "bg-surface-elevated-dark [html.light_&]:bg-gray-100 text-text-muted-dark [html.light_&]:text-text-muted-light border border-border-dark/50 [html.light_&]:border-gray-200"
        } ${className}`}
      >
        <LogOut size={variant === 'sidebar' ? 10 : 14} />
        {isHovering ? "Leave" : "Joined"}
      </button>
    );
  }

  if (isPending) {
    return (
      <button 
        onClick={handleAction}
        className={`${baseStyles} rounded-lg font-black uppercase tracking-tight bg-primary/10 text-primary border border-primary/20 [html.light_&]:border-primary/10 hover:bg-primary/20 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${className}`}
      >
        <Clock size={variant === 'sidebar' ? 10 : 14} />
        Pending
      </button>
    );
  }

  return (
    <button 
      onClick={handleAction}
      className={`${baseStyles} rounded-lg font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
        isRemoved 
          ? "bg-primary/20 [html.light_&]:bg-primary/10 text-primary border border-primary/30 [html.light_&]:border-primary/20 hover:bg-primary/30" 
          : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
      } ${className}`}
    >
      <Plus size={variant === 'sidebar' ? 10 : 14} />
      {isRemoved ? "Request" : "Join"}
    </button>
  );
};
