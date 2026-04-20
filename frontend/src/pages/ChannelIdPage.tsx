import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, Copy, LogOut, Shield, MessageCircle, Search, UserPlus, ArrowLeft,
  Settings, Trash2, Check, X, Globe, Lock, Save, Loader2, Clock, Camera
} from 'lucide-react';
import Cropper from 'react-cropper';
import type { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
interface Member {
  _id: string;
  username: string;
  email: string;
  profilePicture?: string;
  college?: string;
  role?: 'admin' | 'member';
}

interface ChannelData {
  _id: string;
  name: string;
  description: string;
  profilePicture?: string;
  members: Member[];
  isJoined: boolean;
  isAdmin: boolean;
  admin: Member;
  isPublic: boolean;
  isPending: boolean;
  mustRequest: boolean;
}

const DEFAULT_CHANNEL_IMAGE = "https://res.cloudinary.com/domckasfk/image/upload/v1776156528/default-channel-image_zod7df.png";

export default function ChannelIdPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'Members' | 'Join Requests' | 'Settings'>('Members');

  // Settings state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Join requests
  const [requests, setRequests] = useState<Member[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Confirmations
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  // Cropper state
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [uploading, setUploading] = useState(false);
  const cropperRef = useRef<ReactCropperElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchChannel = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${import.meta.env.VITE_SERVER_URL}/api/v1/channels/${channelId}`);
      const data = res.data.channel;
      
      const isJoined = data.members.some((m: any) => m._id === user?._id);
      const isAdmin = data.admin?._id === user?._id;
      
      // Combine admin and members for the list, marking the admin
      const allMembers = data.members.map((m: any) => ({
        ...m,
        role: m._id === data.admin?._id ? 'admin' : 'member'
      }));

      setChannel({
        ...data,
        members: allMembers,
        isJoined,
        isAdmin,
        isPending: !!data.isPending,
        mustRequest: !!data.mustRequest
      });
      setEditName(data.name);
      setEditDesc(data.description || '');
      setEditIsPublic(data.isPublic !== false);
      document.title = `SocialHive — ${data.name}`;
      
      if (isAdmin) {
        fetchRequests();
      }
    } catch (error) {
      toast.error('Failed to load channel');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (channelId) fetchChannel();
  }, [channelId]);

  const copyChannelId = () => {
    navigator.clipboard.writeText(channelId || '');
    toast.success('Channel ID copied');
  };

  const handleLeave = async () => {
    if (!channel) return;
    setActionLoading(true);
    try {
      await api.post(`${import.meta.env.VITE_SERVER_URL}/api/v1/channels/${channelId}/leave`);
      toast.success('Left the channel');
      navigate('/channels');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to leave channel');
    } finally {
      setActionLoading(false);
      setShowLeaveConfirm(false);
    }
  };

  const handleChangeAdmin = async (userId: string) => {
    setPromotingId(userId);
    try {
      await api.patch(`${import.meta.env.VITE_SERVER_URL}/api/v1/channels/${channelId}/admin/${userId}`);
      toast.success('Admin transferred successfully');
      fetchChannel();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to transfer admin');
    } finally {
      setPromotingId(null);
    }
  };

  const handleToggleJoin = async () => {
    if (!channel) return;
    try {
      if (channel.isJoined) {
        setShowLeaveConfirm(true); 
      } else if (channel.isPending) {
        await api.post(`${import.meta.env.VITE_SERVER_URL}/api/v1/channels/${channelId}/requests/cancel`);
        toast.success('Join request cancelled');
        fetchChannel();
      } else {
        const res = await api.post(`${import.meta.env.VITE_SERVER_URL}/api/v1/channels/${channelId}/join`);
        toast.success(res.data.message || 'Joined the channel');
        fetchChannel();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Action failed');
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await api.get(`${import.meta.env.VITE_SERVER_URL}/api/v1/channels/${channelId}/requests`);
      setRequests(res.data.requests || []);
    } catch {
      // silent fail
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.patch(`${import.meta.env.VITE_SERVER_URL}/api/v1/channels/${channelId}/settings`, {
        name: editName,
        description: editDesc,
        isPublic: editIsPublic
      });
      toast.success('Settings updated');
      fetchChannel();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteChannel = async () => {
    setDeleting(true);
    try {
      await api.delete(`${import.meta.env.VITE_SERVER_URL}/api/v1/channels/${channelId}/delete`);
      toast.success('Channel deleted');
      navigate('/channels');
    } catch {
      toast.error('Failed to delete channel');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleAcceptRequest = async (userId: string) => {
    try {
      await api.post(`${import.meta.env.VITE_SERVER_URL}/api/v1/channels/${channelId}/requests/${userId}/accept`);
      toast.success('Accepted');
      fetchRequests();
      fetchChannel();
    } catch {
      toast.error('Action failed');
    }
  };

  const handleRejectRequest = async (userId: string) => {
    try {
      await api.post(`${import.meta.env.VITE_SERVER_URL}/api/v1/channels/${channelId}/requests/${userId}/reject`);
      toast.success('Rejected');
      fetchRequests();
    } catch {
      toast.error('Action failed');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await api.post(`${import.meta.env.VITE_SERVER_URL}/api/v1/channels/${channelId}/members/${userId}/remove`);
      toast.success('Member removed');
      fetchChannel();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRawImage(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
    canvas.toBlob((blob) => {
      if (blob) {
        setShowCropper(false);
        setRawImage(null);
        handleUpload(blob);
      }
    }, 'image/jpeg', 0.9);
  };

  const handleUpload = async (blob: Blob) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('profilePicture', blob, 'channel_pfp.jpg');
    try {
      const res = await api.patch(
        `${import.meta.env.VITE_SERVER_URL}/api/v1/channels/${channelId}/profile-picture`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      toast.success('Channel picture updated');
      setChannel(prev => prev ? { ...prev, profilePicture: res.data.profilePicture } : null);
    } catch {
      toast.error('Failed to upload picture');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-text-muted-dark [html.light_&]:text-text-muted-light">Loading channel...</p>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <p className="text-text-muted-dark [html.light_&]:text-text-muted-light">Channel not found</p>
      </div>
    );
  }

  const filteredMembers = channel.members.filter(m => 
    m.username.toLowerCase().includes(memberSearch.toLowerCase()) || 
    m.college?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto relative">
      <button
        onClick={() => navigate(-1)}
        className="absolute left-4 top-8 p-2 rounded-xl text-text-muted-dark hover:text-primary hover:bg-primary/10 transition-all duration-300 cursor-pointer group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
      </button>

      {/* ── Channel Header (Simple & Clean) ────────────────────── */}
      <div className="text-center mb-8">
        <div className="relative w-32 h-32 mx-auto mb-4 group/pfp">
          <div className="w-full h-full rounded-full bg-surface-elevated-dark [html.light_&]:bg-white flex items-center justify-center border-4 border-surface-card-dark [html.light_&]:border-surface-card-light shadow-lg overflow-hidden shrink-0">
             <img 
               src={channel.profilePicture || DEFAULT_CHANNEL_IMAGE} 
               className={`w-full h-full object-cover transition-opacity ${uploading ? 'opacity-50' : ''}`}
               alt={channel.name} 
             />
          </div>
          {channel.isAdmin && (
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover/pfp:opacity-100 transition-all bg-black/40 rounded-2xl backdrop-blur-[2px]">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors cursor-pointer"
                title="Edit Profile Picture"
              >
                <Camera size={24} />
              </button>
              <span className="text-[10px] text-white font-bold mt-1 uppercase tracking-tighter">Edit PFP</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />
        </div>

        <h1 className="text-3xl font-bold text-text-dark [html.light_&]:text-text-light">
          {channel.name}
        </h1>
        {channel.description && (
          <p className="mt-2 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light max-w-lg mx-auto">
            {channel.description}
          </p>
        )}
        <button
          onClick={copyChannelId}
          className="mt-2 inline-flex items-center gap-1.5 text-xs cursor-pointer
                     text-text-muted-dark/60 [html.light_&]:text-text-muted-light/60
                     hover:text-primary transition-colors"
        >
          <Copy size={12} />
          Copy Channel ID
        </button>

        {/* Stats */}
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-1.5 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
            <Users size={16} className="text-primary" />
            <span className="font-semibold text-text-dark [html.light_&]:text-text-light">
              {channel.members.length}
            </span>
            Members
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {channel.isJoined && (
            <button
               onClick={() => navigate(`/chats/channel/${channelId}`)}
               className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer
                         bg-primary text-white hover:bg-primary-light transition-all shadow-md shadow-primary/20"
            >
              <MessageCircle size={16} /> Chat
            </button>
          )}

          <button
            onClick={() => {
              if (channel.isAdmin && channel.isJoined) {
                setShowDeleteConfirm(true);
              } else {
                handleToggleJoin();
              }
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all
                       ${channel.isJoined 
                          ? 'bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light border border-border-dark [html.light_&]:border-border-light text-text-dark [html.light_&]:text-text-light hover:border-danger hover:text-danger'
                          : channel.isPending
                            ? 'bg-surface-elevated-dark/50 [html.light_&]:bg-black/5 border border-white/10 [html.light_&]:border-black/10 text-text-muted-dark opacity-80 hover:bg-white/5'
                            : 'bg-primary text-white hover:bg-primary-light shadow-md shadow-primary/20'
                       }`}
          >
            {channel.isJoined 
              ? (channel.isAdmin ? <><Trash2 size={16} /> Delete Channel</> : <><LogOut size={16} /> Leave</>) 
              : channel.isPending
                ? <><Clock size={16} /> Pending</>
                : <><UserPlus size={16} /> {(channel.isPublic && !channel.mustRequest) ? 'Join Channel' : 'Request to Join'}</>
            }
          </button>
        </div>
      </div>

      {/* ── Tabs (Dynamic Style) ────────────────────── */}
      <div className="mt-8 border-b border-border-dark [html.light_&]:border-border-light">
          <div className="flex gap-0 overflow-x-auto justify-center no-scrollbar">
            {['Members', channel.isAdmin && 'Join Requests', channel.isAdmin && 'Settings'].filter(Boolean).map((tab) => (
              <button
                key={tab as string}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-3 text-sm font-semibold transition-all relative border-b-2 -mb-px whitespace-nowrap
                           ${activeTab === tab 
                             ? 'border-primary text-primary' 
                             : 'border-transparent text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-text-light'}`}
              >
                <span className="flex items-center gap-1.5">
                  {tab}
                  {(tab === 'Join Requests' && requests.length > 0) && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                      {requests.length}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
      </div>

      {/* ── Tab Content ─────────────────────────────── */}
      <div className="mt-6 max-w-3xl mx-auto w-full pb-20 overflow-hidden">
        {activeTab === 'Members' && (
          <div className="space-y-4">
            <div className="relative group max-w-4xl w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-dark group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full bg-surface-elevated-dark/30 [html.light_&]:bg-black/5 border border-white/5 [html.light_&]:border-black/5 rounded-xl py-2 pl-9 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-text-muted-dark/40"
              />
            </div>

            <div className="grid gap-2">
              {filteredMembers.map((member) => (
                <div key={member._id} className="flex items-center justify-between gap-3 p-4 rounded-xl glass-dark [html.light_&]:glass-light border border-border-dark [html.light_&]:border-border-light overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={member.profilePicture || `https://ui-avatars.com/api/?name=${member.username}&background=4361ee&color=fff&size=48`}
                      alt={member.username}
                      className="w-10 h-10 rounded-full object-cover border border-border-dark [html.light_&]:border-border-light"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-dark [html.light_&]:text-text-light truncate">
                        {member.username}
                      </p>
                      {member.college && (
                        <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light truncate">
                          {member.college}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {member.role === 'admin' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-success border border-success/30 px-2 py-0.5 rounded uppercase tracking-wide">
                        <Shield size={10} /> Admin
                      </span>
                    ) : (
                      <>
                        <span className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light">
                          Member
                        </span>
                        {channel.isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleChangeAdmin(member._id)}
                              disabled={!!promotingId && promotingId === member._id}
                              className="p-1.5 rounded-lg text-text-muted-dark hover:text-primary hover:bg-primary/10
                                         transition-all cursor-pointer flex items-center gap-1"
                              title="Make Admin"
                            >
                              {promotingId === member._id ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member._id)}
                              className="p-1.5 rounded-lg text-text-muted-dark hover:text-danger hover:bg-danger/10
                                         transition-all cursor-pointer"
                              title="Remove member"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {filteredMembers.length === 0 && (
                <p className="text-center py-10 text-sm text-text-muted-dark">No members found.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Join Requests' && (
          <div className="space-y-4">
            {loadingRequests ? (
              <div className="text-center py-10">
                <Loader2 className="animate-spin text-primary mx-auto mb-2" />
                <p className="text-xs text-text-muted-dark">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-10 text-text-muted-dark text-sm">
                No pending join requests
              </div>
            ) : (
              <div className="grid gap-3">
                {requests.map((req) => (
                  <div key={req._id} className="flex items-center justify-between gap-3 p-4 rounded-xl glass-dark [html.light_&]:glass-light border border-border-dark [html.light_&]:border-border-light">
                    <div className="flex items-center gap-3">
                      <img src={req.profilePicture || `https://ui-avatars.com/api/?name=${req.username}`} className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="text-sm font-bold text-text-dark [html.light_&]:text-text-light">{req.username}</p>
                        <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light">{req.college}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => handleAcceptRequest(req._id)} className="p-2 rounded-lg bg-success/10 text-success hover:bg-success hover:text-white transition-all cursor-pointer">
                         <Check size={18} />
                       </button>
                       <button onClick={() => handleRejectRequest(req._id)} className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-white transition-all cursor-pointer">
                         <X size={18} />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Settings' && (
          <div className="max-w-4xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
             <form onSubmit={handleUpdateSettings} className="space-y-6 bg-surface-elevated-dark/20 [html.light_&]:bg-surface-elevated-light p-6 rounded-3xl border border-border-dark [html.light_&]:border-border-light">
                <div className="flex items-center gap-3 mb-2">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Settings size={20} />
                   </div>
                   <div>
                      <h3 className="font-bold text-text-dark [html.light_&]:text-text-light">Edit Details</h3>
                      <p className="text-xs text-text-muted-dark">Update channel visibility and info</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-muted-dark uppercase tracking-wider ml-1">Channel Name</label>
                      <input 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-surface-card-dark [html.light_&]:bg-white border border-border-dark [html.light_&]:border-border-light rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-muted-dark uppercase tracking-wider ml-1">Description</label>
                      <textarea 
                        rows={3}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full bg-surface-card-dark [html.light_&]:bg-white border border-border-dark [html.light_&]:border-border-light rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                      />
                   </div>

                   <div className="flex items-center justify-between p-4 bg-surface-card-dark/50 [html.light_&]:bg-black/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        {editIsPublic ? <Globe className="text-primary" size={20} /> : <Lock className="text-warning" size={20} />}
                        <div>
                          <p className="text-sm font-bold text-text-dark [html.light_&]:text-text-light">{editIsPublic ? 'Public Channel' : 'Private Channel'}</p>
                          <p className="text-[10px] text-text-muted-dark">{editIsPublic ? 'Anyone can join instantly' : 'Join requests required'}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setEditIsPublic(!editIsPublic)}
                        className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${editIsPublic ? 'bg-primary' : 'bg-surface-elevated-dark'}`}
                      >
                         <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${editIsPublic ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                   </div>
                </div>

                <button 
                  disabled={savingSettings}
                  className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-light transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {savingSettings ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Save Changes</>}
                </button>
             </form>
          </div>
        )}
      </div>

      {/* ── Global Modals ──────────────────────────── */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm p-8">
          <DialogHeader>
            <div className="w-16 h-16 bg-danger/10 text-danger rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <DialogTitle className="text-center">Delete Channel?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted-dark text-center mb-8">
            This will permanently delete "{channel.name}" and all its data. This cannot be undone.
          </p>
          
          <div className="flex flex-col gap-3">
             <button 
               onClick={handleDeleteChannel}
               disabled={deleting}
               className="w-full py-3.5 bg-danger text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-danger/90 transition-all disabled:opacity-50"
             >
               {deleting ? <Loader2 className="animate-spin" size={18} /> : 'Yes, Delete Channel'}
             </button>
             <button 
               onClick={() => setShowDeleteConfirm(false)}
               className="w-full py-3.5 bg-surface-elevated-dark [html.light_&]:bg-black/5 text-text-dark [html.light_&]:text-text-light rounded-2xl font-bold hover:bg-white/5 transition-all"
             >
               Cancel
             </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle>Leave Channel?</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
            Are you sure you want to leave <strong>{channel.name}</strong>?
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setShowLeaveConfirm(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer
                         text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLeave}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer
                         bg-danger text-white hover:bg-danger/80 transition-all
                         disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <Loader2 size={14} className="animate-spin" />}
              Leave
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Crop Dialog ───────────────────────────── */}
      <Dialog open={showCropper} onOpenChange={(open) => { if (!open) { setShowCropper(false); setRawImage(null); } }}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>Crop Channel Picture</DialogTitle>
          </DialogHeader>
          {rawImage && (
            <Cropper
              ref={cropperRef}
              src={rawImage}
              style={{ height: 320, width: '100%' }}
              aspectRatio={1}
              guides={false}
              viewMode={1}
            />
          )}
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => { setShowCropper(false); setRawImage(null); }}
              className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer text-text-muted-dark hover:text-text-dark transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCrop}
              className="px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer bg-primary text-white hover:bg-primary-light transition-all"
            >
              Crop & Upload
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
