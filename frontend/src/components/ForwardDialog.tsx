import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import { Check, Search, Users, User, Send, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { type ChatMessageInterface } from '../types';

interface ForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: ChatMessageInterface | null;
  onForward: (selectedTargets: { id: string; type: 'user' | 'group'; name: string }[]) => Promise<void>;
}

const SERVER_URI = `${import.meta.env.VITE_SERVER_URL}/api/v1`;

const ForwardDialog = ({ open, onOpenChange, onForward }: ForwardDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [targets, setTargets] = useState<{ id: string; type: 'user' | 'group'; name: string; avatar?: string; subtext?: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUsername = currentUser.username;

  useEffect(() => {
    const fetchData = async () => {
      if (!open || !token) return;
      setLoading(true);
      try {
        const [followersRes, followingRes, groupsRes] = await Promise.all([
          axios.get(`${SERVER_URI}/users/user/${currentUsername}/follow-list?type=followers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${SERVER_URI}/users/user/${currentUsername}/follow-list?type=following`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${SERVER_URI}/groups/get-my-groups`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const followersList = followersRes.data?.users || [];
        const followingList = followingRes.data?.users || [];
        const mutualFollows = followersList.filter((fUser: any) => 
          followingList.some((fol: any) => fol._id === fUser._id)
        );

        const groupList = groupsRes.data?.groups || [];

        const combinedTargets: any[] = [
          ...mutualFollows.map((u: any) => ({
            id: u._id,
            type: 'user',
            name: u.username,
            avatar: u.profilePicture,
            subtext: u.college || 'SocialHive User'
          })),
          ...groupList.map((g: any) => ({
            id: g._id,
            type: 'group',
            name: g.name,
            avatar: g.profilePicture,
            subtext: g.description || 'Community Group'
          }))
        ];

        setTargets(combinedTargets);
      } catch (error) {
        console.error('Error fetching forward targets:', error);
        toast.error('Failed to load individuals and groups');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, token, currentUsername]);

  const filteredTargets = targets.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subtext?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) return;
    setSending(true);
    const selectedTargets = targets.filter(t => selectedIds.has(t.id));
    try {
      await onForward(selectedTargets.map(t => ({ id: t.id, type: t.type as any, name: t.name })));
      onOpenChange(false);
      setSelectedIds(new Set());
      setSearchQuery('');
    } catch (error) {
      // Error handled in parent
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-surface-dark [html.light_&]:bg-white rounded-3xl">
        <DialogHeader className="px-6 py-5 border-b border-border-dark [html.light_&]:border-border-light text-left">
          <DialogTitle className="text-xl font-black text-text-dark [html.light_&]:text-text-light flex items-center gap-2">
            Forward Message
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[500px]">
          {/* Search Bar */}
          <div className="px-6 pb-4 bg-surface-elevated-dark/10 [html.light_&]:bg-black/[0.02] border-b border-border-dark [html.light_&]:border-border-light">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-dark group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search individuals or groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-elevated-dark/30 [html.light_&]:bg-black/5 border border-white/5 [html.light_&]:border-black/5 rounded-2xl py-2.5 pl-11 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-text-muted-dark/30"
              />
            </div>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest">Loading targets...</p>
              </div>
            ) : filteredTargets.length > 0 ? (
              <div className="space-y-1">
                {filteredTargets.map((target) => {
                  const isSelected = selectedIds.has(target.id);
                  return (
                    <div
                      key={target.id}
                      onClick={() => toggleSelection(target.id)}
                      className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all group
                                ${isSelected 
                                  ? 'bg-primary/10 border-primary/20' 
                                  : 'hover:bg-white/5 [html.light_&]:hover:bg-black/5 border-transparent'
                                } border`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={target.avatar || (target.type === 'group' 
                            ? "https://res.cloudinary.com/dxygc9jz4/image/upload/t_color-white/enifyimlrv3farvfto8k.jpg"
                            : "https://res.cloudinary.com/dxygc9jz4/image/upload/v1701928014/default-avatar.png")}
                          className="w-11 h-11 rounded-full object-cover border border-border-dark [html.light_&]:border-border-light"
                          alt={target.name}
                        />
                        <div className="absolute -bottom-1 -right-1 bg-surface-dark [html.light_&]:bg-white rounded-full p-0.5 border border-border-dark">
                          {target.type === 'group' ? <Users size={12} className="text-primary" /> : <User size={12} className="text-emerald-500" />}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-text-dark [html.light_&]:text-text-light truncate">
                          {target.name}
                        </div>
                        <div className="text-[11px] text-text-muted-dark [html.light_&]:text-text-muted-light truncate font-medium">
                          {target.subtext}
                        </div>
                      </div>

                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                    ${isSelected 
                                      ? 'bg-primary border-primary scale-110' 
                                      : 'border-border-dark [html.light_&]:border-border-light group-hover:border-primary/50'}`}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-40">
                <Search size={40} className="mb-2" />
                <p className="text-sm font-bold uppercase">No results found</p>
              </div>
            )}
          </div>

          {/* Bottom Action Area */}
          <div className="px-6 py-4 border-t border-border-dark [html.light_&]:border-border-light bg-surface-dark/50 [html.light_&]:bg-gray-50/50 backdrop-blur-sm">
            <button
              disabled={selectedIds.size === 0 || sending}
              onClick={handleSend}
              className="w-full h-12 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Forwarding...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Forward to {selectedIds.size} recipient{selectedIds.size !== 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardDialog;
