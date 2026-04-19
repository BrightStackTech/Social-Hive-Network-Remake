import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Radio, Loader2, ArrowRight, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';

const CHANNEL_API = `${import.meta.env.VITE_SERVER_URL}/api/v1/channels`;

interface ChannelResult {
  _id: string;
  name: string;
  description: string;
  admin: { _id: string; username: string };
  members: any[];
  hasRequested: boolean;
  isPublic: boolean;
  isJoined: boolean;
  isPending: boolean;
  mustRequest: boolean;
}

interface JoinChannelByIdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function JoinChannelByIdDialog({ open, onOpenChange }: JoinChannelByIdDialogProps) {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ChannelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResult(null);
      setSearched(false);
      return;
    }

    const isValidId = /^[a-f\d]{24}$/i.test(trimmed);
    if (!isValidId) return;

    const timeout = setTimeout(() => {
      fetchChannel(trimmed);
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  const fetchChannel = async (id: string) => {
    setLoading(true);
    setResult(null);
    setSearched(true);

    try {
      const res = await api.get(`${CHANNEL_API}/${id}`);
      setResult(res.data.channel);
    } catch (error: any) {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinAction = async () => {
    if (!result || result.isJoined || result.isPending) return;
    setJoining(true);
    try {
      const res = await api.post(`${CHANNEL_API}/${result._id}/join`);
      toast.success(res.data.message || 'Action successful!');
      // Refresh local result state
      fetchChannel(result._id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete action');
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Join Channel by ID</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Search input */}
          <div className="relative group">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2
                         text-text-muted-dark group-focus-within:text-primary transition-colors"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Paste the 24-character Channel ID here..."
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm
                         bg-surface-elevated-dark [html.light_&]:bg-black/5
                         border border-border-dark [html.light_&]:border-border-light
                         text-text-dark [html.light_&]:text-text-light
                         placeholder:text-text-muted-dark/40
                         focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          {/* Results Container */}
          <div className="min-h-[120px] flex flex-col items-center justify-center">
            {loading && (
              <div className="text-center py-6">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                <p className="mt-2 text-xs text-text-muted-dark">Searching for channel...</p>
              </div>
            )}

            {!loading && !searched && !query.trim() && (
              <div className="text-center py-6 opacity-40">
                <Radio size={32} className="mx-auto mb-2" />
                <p className="text-xs">Enter a channel ID to find your destination</p>
              </div>
            )}

            {!loading && searched && !result && query.length >= 24 && (
              <div className="text-center py-6 text-danger/80">
                <p className="text-sm font-medium">No channel found with this ID</p>
                <p className="text-[10px] mt-1 opacity-60 uppercase tracking-widest font-bold">Please check the ID and try again</p>
              </div>
            )}

            {!loading && result && (
              <div className="w-full p-4 rounded-2xl glass-dark [html.light_&]:glass-light border border-border-dark [html.light_&]:border-border-light animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-bold text-text-dark [html.light_&]:text-text-light truncate">
                      {result.name}
                    </h4>
                    {result.description && (
                      <p className="mt-1 text-xs text-text-muted-dark [html.light_&]:text-text-muted-light line-clamp-2 leading-relaxed">
                        {result.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-primary">
                      <Radio size={14} />
                      <span>{result.members?.length || 0} Members</span>
                      <span className="mx-1 opacity-30">•</span>
                      <span className="capitalize">{result.isPublic ? 'Public' : 'Private'}</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Radio size={24} className="text-primary" />
                  </div>
                </div>

                <div className="mt-5">
                  {result.isJoined ? (
                    <button
                      onClick={() => {
                        navigate(`/channels/${result._id}`);
                        onOpenChange(false);
                      }}
                      className="w-full py-2.5 rounded-xl text-sm font-bold cursor-pointer
                                 bg-primary text-white hover:bg-primary-light transition-all flex items-center justify-center gap-2"
                    >
                      Open Channel <ArrowRight size={16} />
                    </button>
                  ) : result.isPending ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl text-sm font-bold
                                 bg-surface-elevated-dark [html.light_&]:bg-black/5
                                 border border-border-dark [html.light_&]:border-border-light
                                 text-text-muted-dark cursor-not-allowed opacity-60
                                 flex items-center justify-center gap-2"
                    >
                      <Clock size={16} /> Request Pending
                    </button>
                  ) : (
                    <button
                      onClick={handleJoinAction}
                      disabled={joining}
                      className="w-full py-2.5 rounded-xl text-sm font-bold cursor-pointer
                                 bg-primary text-white hover:bg-primary-light
                                 shadow-lg shadow-primary/25 transition-all
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 flex items-center justify-center gap-2"
                    >
                      {joining && <Loader2 size={16} className="animate-spin" />}
                      {joining ? 'Processing...' : ((result.isPublic && !result.mustRequest) ? 'Join Channel' : 'Request to Join')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
