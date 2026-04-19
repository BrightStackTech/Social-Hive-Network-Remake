import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '../ui/Dialog';
import { Search as SearchIcon, Globe, Loader2, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { JoinLeaveButton } from './JoinLeaveButton';

interface Community {
  _id: string;
  communityName: string;
  profilePicture: string;
  joinedCount: number;
  description?: string;
  removedMem: string[];
  pendingReq: string[];
}

interface CommunityListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'Browse' | 'Joined';
}

const SERVER_URI = `${import.meta.env.VITE_SERVER_URL}/api/v1`;

export const CommunityListDialog = ({ 
  open, 
  onOpenChange, 
  initialTab = 'Browse' 
}: CommunityListDialogProps) => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'Browse' | 'Joined'>(initialTab);
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [browseCommunities, setBrowseCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Update internal state when prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, open]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const endpoint = activeTab === 'Joined' ? 'joined-communities' : 'unjoined-communities';
      const res = await axios.get(`${SERVER_URI}/communities/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (activeTab === 'Joined') {
        setJoinedCommunities(res.data.data || []);
      } else {
        setBrowseCommunities(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchData();
  }, [open, activeTab]);

  const communities = activeTab === 'Joined' ? joinedCommunities : browseCommunities;
  const filtered = communities.filter(c => 
    c.communityName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none bg-surface-dark [html.light_&]:bg-white shadow-2xl">
        {/* Header with Tabs */}
        <div className="p-6 pb-2 space-y-6">
          <div className="flex items-center justify-between border-b border-border-dark/50 [html.light_&]:border-border-light py-2">
            <DialogTitle className="text-xl font-black text-white [html.light_&]:text-text-light tracking-tight">Communities</DialogTitle>
            <button 
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-full hover:bg-white/5 [html.light_&]:hover:bg-black/5 text-text-muted-dark [html.light_&]:text-text-muted-light transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Segmented Control / Tabs */}
          <div className="flex overflow-x-auto scrollbar-hide bg-surface-elevated-dark/50 [html.light_&]:bg-gray-100 p-1 rounded-2xl border border-border-dark/50 [html.light_&]:border-border-light">
            {(['Browse', 'Joined'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearch('');
                }}
                className={`flex-1 py-2.5 px-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${
                  activeTab === tab 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-white [html.light_&]:hover:text-text-light'
                }`}
              >
                {tab === 'Browse' ? 'Browse Communities' : 'Joined Communities'}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted-dark [html.light_&]:text-text-muted-light" size={14} />
            <input 
              type="text"
              placeholder={activeTab === 'Browse' ? "Search for new communities..." : "Search joined groups..."}
              className="w-full bg-surface-elevated-dark/30 [html.light_&]:bg-gray-100 border border-border-dark [html.light_&]:border-border-light rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 [html.light_&]:text-text-light transition-all placeholder:text-text-muted-dark/40 [html.light_&]:placeholder:text-text-muted-light/40"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Community List */}
        <div className="max-h-[50vh] overflow-y-auto px-4 pb-6 space-y-2 scrollbar-none">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-primary" size={32} />
              <p className="text-[10px] font-black text-text-muted-dark [html.light_&]:text-text-muted-light uppercase tracking-widest animate-pulse">Synchronizing...</p>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map(c => (
              <div key={c._id} className="flex items-center gap-4 p-3 rounded-3xl hover:bg-white/5 [html.light_&]:hover:bg-black/5 transition-all group">
                <Link 
                  to={`/communities/c/${c.communityName}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-4 flex-1 min-w-0 no-underline"
                >
                  <div className="w-12 h-12 rounded-2xl bg-surface-elevated-dark [html.light_&]:bg-gray-100 border border-border-dark [html.light_&]:border-border-light flex items-center justify-center overflow-hidden shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                    {c.profilePicture ? (
                      <img src={c.profilePicture} alt={c.communityName} className="w-full h-full object-cover" />
                    ) : (
                      <Globe className="text-text-muted-dark [html.light_&]:text-text-muted-light group-hover:text-primary transition-colors" size={24} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white [html.light_&]:text-text-light truncate">c/{c.communityName}</p>
                    <p className="text-[10px] text-text-muted-dark [html.light_&]:text-text-muted-light font-bold truncate opacity-60">
                      {c.joinedCount} members
                    </p>
                  </div>
                </Link>
                <JoinLeaveButton 
                  communityName={c.communityName}
                  isJoined={activeTab === 'Joined'}
                  isRemoved={user?._id ? c.removedMem?.includes(user._id) : false}
                  isPending={user?._id ? c.pendingReq?.includes(user._id) : false}
                  onJoinLeave={() => {
                    fetchData();
                    window.dispatchEvent(new Event('communityChange'));
                  }}
                />
              </div>
            ))
          ) : (
            <div className="py-20 text-center space-y-3 opacity-40">
              <Globe className="mx-auto text-text-muted-dark" size={40} />
              <p className="text-[10px] font-black text-text-muted-dark uppercase tracking-widest">
                {search ? "No matches found" : "No communities here"}
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-2 border-t border-border-dark/50 [html.light_&]:border-border-light bg-surface-elevated-dark/20 [html.light_&]:bg-gray-50 text-center">
            <button 
                onClick={() => onOpenChange(false)}
                className="text-[11px] font-black uppercase text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-white [html.light_&]:hover:text-text-light transition-colors tracking-widest cursor-pointer"
            >
                Close
            </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
