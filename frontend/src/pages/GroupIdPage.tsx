import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Users, Copy, LogOut, Trash2, UserPlus, Check, X, Shield, Loader2, MessageCircle, Camera, Upload,
  Bold, Italic, Underline, Strikethrough, Highlighter, Search, ArrowLeft
} from 'lucide-react';
import Cropper from 'react-cropper';
import type { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import GroupSettings from '../components/GroupSettings';
import { DEFAULT_GROUP_IMAGE } from '../utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';


const GROUP_API = `${import.meta.env.VITE_SERVER_URL}/api/v1/groups`;

interface Member {
  _id: string;
  username: string;
  email: string;
  profilePicture: string;
  college?: string;
  engineeringDomain?: string;
}

interface JoinRequest {
  _id: string;
  username: string;
  email: string;
  profilePicture: string;
}

interface GroupData {
  _id: string;
  name: string;
  description: string;
  profilePicture?: string;
  admin: Member;
  members: Member[];
  joinRequests: JoinRequest[];
  notices: {
    _id: string;
    content: string;
    admin: {
      _id: string;
      username: string;
      profilePicture: string;
    };
    createdAt: string;
  }[];
}

export default function GroupIdPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { api, user } = useAuth();

  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('Members');

  // Confirm dialogs
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClearNotices, setConfirmClearNotices] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newNotice, setNewNotice] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [requestSearch, setRequestSearch] = useState('');
  const [showAdminExitWarning, setShowAdminExitWarning] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  // Cropper state
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [uploading, setUploading] = useState(false);
  const cropperRef = useRef<ReactCropperElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);



  const isAdmin = group?.admin._id === (user?._id || (user as any)?.id);

  useEffect(() => {
    fetchGroup();
  }, [groupId]);

  const fetchGroup = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${GROUP_API}/get-group/${groupId}`);
      const g = res.data.group;
      setGroup(g);
      document.title = `SocialHive — ${g.name}`;
    } catch (error: any) {
      if (error.response?.status === 403) {
        navigate(`/groups/view/${groupId}`, { replace: true });
      } else {
        toast.error('Failed to load group');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Actions ─────────────────────────────────────────
  const handleLeave = async () => {
    setActionLoading(true);
    try {
      await api.post(`${GROUP_API}/exit-from-group/${groupId}`);
      toast.success('Left the group');
      navigate('/groups');
    } catch {
      toast.error('Failed to leave group');
    } finally {
      setActionLoading(false);
      setConfirmLeave(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await api.delete(`${GROUP_API}/delete-group/${groupId}`);
      toast.success('Group deleted');
      navigate('/groups');
    } catch {
      toast.error('Failed to delete group');
    } finally {
      setActionLoading(false);
      setConfirmDelete(false);
    }
  };

  const handleAcceptRequest = async (userId: string) => {
    try {
      await api.post(`${GROUP_API}/accept-request/${userId}/${groupId}`);
      toast.success('Request accepted');
      fetchGroup();
    } catch {
      toast.error('Failed to accept');
    }
  };

  const handleRejectRequest = async (userId: string) => {
    try {
      await api.post(`${GROUP_API}/reject-request/${userId}/${groupId}`);
      toast.success('Request rejected');
      fetchGroup();
    } catch {
      toast.error('Failed to reject');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await api.post(`${GROUP_API}/remove-from-group/${userId}/${groupId}`);
      toast.success('Member removed');
      fetchGroup();
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleChangeAdmin = async (userId: string) => {
    setPromotingId(userId);
    try {
      await api.post(`${GROUP_API}/change-admin/${userId}/${groupId}`);
      toast.success('Admin transferred successfully');
      fetchGroup();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to transfer admin');
    } finally {
      setPromotingId(null);
    }
  };



  const copyGroupId = () => {
    navigator.clipboard.writeText(groupId || '');
    toast.success('Group ID copied');
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
    formData.append('profilePicture', blob, 'group_pfp.jpg');

    try {
      const res = await api.patch(`${GROUP_API}/update-group-profile-picture/${groupId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Group picture updated');
      setGroup(prev => prev ? { ...prev, profilePicture: res.data.profilePicture } : null);
    } catch (err) {
      toast.error('Failed to upload picture');
    } finally {
      setUploading(false);
    }
  };

  const applyFormatting = (tag: string) => {
    const textarea = document.getElementById('notice-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    let replacement = '';
    if (tag === 'up') {
        replacement = selectedText.toUpperCase();
    } else if (tag === 'low') {
        replacement = selectedText.toLowerCase();
    } else {
        replacement = `[${tag}]${selectedText}[/${tag}]`;
    }

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setNewNotice(newValue);

    // Focus back and set selection after state update (deferred)
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 0);
  };

  const formatNoticeText = (text: string) => {
    if (!text) return text;
    
    // Parse custom tags into HTML-like structures (using React fragments)
    // For simplicity, we use regex to replace tags. 
    // Since we need to return React nodes, we'll split and map.
    
    let parts: (string | React.ReactNode)[] = [text];

    const rules = [
      { regex: /\[b\](.*?)\[\/b\]/g, component: (t: string) => <strong key={t}>{t}</strong> },
      { regex: /\[i\](.*?)\[\/i\]/g, component: (t: string) => <em key={t}>{t}</em> },
      { regex: /\[u\](.*?)\[\/u\]/g, component: (t: string) => <span key={t} className="underline">{t}</span> },
      { regex: /\[s\](.*?)\[\/s\]/g, component: (t: string) => <del key={t}>{t}</del> },
      { regex: /\[h\](.*?)\[\/h\]/g, component: (t: string) => <mark key={t} className="bg-yellow-400 text-black px-1 rounded">{t}</mark> },
    ];

    rules.forEach(rule => {
      const newParts: (string | React.ReactNode)[] = [];
      parts.forEach(part => {
        if (typeof part !== 'string') {
          newParts.push(part);
          return;
        }

        let lastIndex = 0;
        let match;
        while ((match = rule.regex.exec(part)) !== null) {
          if (match.index > lastIndex) {
            newParts.push(part.substring(lastIndex, match.index));
          }
          newParts.push(rule.component(match[1]));
          lastIndex = rule.regex.lastIndex;
        }
        if (lastIndex < part.length) {
          newParts.push(part.substring(lastIndex));
        }
      });
      parts = newParts;
    });

    return parts;
  };

  // ── NoticeBoard Actions ────────────────────────────
  const handleAddNotice = async () => {
    if (!newNotice.trim()) return;
    setActionLoading(true);
    try {
      await api.post(`${GROUP_API}/add-notice/${groupId}`, { content: newNotice });
      toast.success('Notice posted');
      setNewNotice('');
      fetchGroup();
    } catch {
      toast.error('Failed to post notice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    try {
      await api.delete(`${GROUP_API}/delete-notice/${groupId}/${noticeId}`);
      toast.success('Notice deleted');
      fetchGroup();
    } catch {
      toast.error('Failed to delete notice');
    }
  };

  const handleClearNotices = async () => {
    setActionLoading(true);
    try {
      await api.delete(`${GROUP_API}/clear-notices/${groupId}`);
      toast.success('All notices cleared');
      fetchGroup();
    } catch {
      toast.error('Failed to clear notices');
    } finally {
      setActionLoading(false);
      setConfirmClearNotices(false);
    }
  };

  // ─── Loading ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-text-muted-dark [html.light_&]:text-text-muted-light">Loading group...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <p className="text-text-muted-dark [html.light_&]:text-text-muted-light">Group not found</p>
      </div>
    );
  }

  // ─── Tabs config ───────────────────────────────────
  const tabs = ['Members', 'Notice Board', ...(isAdmin ? ['Join Requests', 'Settings'] : [])];

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto relative">
      <button
        onClick={() => navigate(-1)}
        className="absolute left-4 top-6 p-2 rounded-xl text-text-muted-dark hover:text-primary hover:bg-primary/10 transition-all duration-300 cursor-pointer group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
      </button>

      {/* ── Group Header ────────────────────────────── */}
      <div className="text-center mb-6">
        {/* Profile Picture */}
        <div className="relative w-32 h-32 mx-auto mb-4 group/pfp">
          <img
            src={group.profilePicture || DEFAULT_GROUP_IMAGE}
            alt={group.name}
            className={`w-full h-full rounded-full object-cover border-4 border-surface-card-dark [html.light_&]:border-surface-card-light shadow-xl transition-opacity ${uploading ? 'opacity-50' : ''}`}
          />
          {isAdmin && (
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

        <h1 className="text-3xl font-display font-bold text-text-dark [html.light_&]:text-text-light">
          {group.name}
        </h1>
        {group.description && (
          <p className="mt-2 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light max-w-lg mx-auto">
            {group.description}
          </p>
        )}
        <button
          onClick={copyGroupId}
          className="mt-2 inline-flex items-center gap-1.5 text-xs cursor-pointer
                     text-text-muted-dark/60 [html.light_&]:text-text-muted-light/60
                     hover:text-primary transition-colors"
        >
          <Copy size={12} />
          Copy Group ID
        </button>

        {/* Stats */}
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-1.5">
            <Users size={16} className="text-primary" />
            <span className="font-semibold text-text-dark [html.light_&]:text-text-light">
              {group.members.length}
            </span>
            <span className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">Members</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => navigate(`/chats/group/${group._id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer
                       bg-primary text-white hover:bg-primary-light transition-all duration-300 shadow-md shadow-primary/20"
          >
            <MessageCircle size={16} /> Chat
          </button>

          <button
            onClick={() => {
              if (isAdmin) {
                setShowAdminExitWarning(true);
              } else {
                setConfirmLeave(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer
                       bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light
                       border border-border-dark [html.light_&]:border-border-light
                       text-text-dark [html.light_&]:text-text-light
                       hover:border-danger hover:text-danger transition-all duration-300"
          >
            <LogOut size={16} /> Leave
          </button>

          {isAdmin && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer
                         bg-danger/10 text-danger border border-danger/30
                         hover:bg-danger hover:text-white transition-all duration-300"
            >
              <Trash2 size={16} /> Delete Group
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────── */}
      <div className="mt-6 border-b border-border-dark [html.light_&]:border-border-light">
        <div className="flex gap-0 overflow-x-auto justify-center no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer
                         border-b-2 -mb-px ${
                           selectedTab === tab
                             ? 'border-primary text-primary'
                             : 'border-transparent text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-text-light'
                         }`}
            >
              {tab}
              {tab === 'Join Requests' && group.joinRequests.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-primary text-white">
                  {group.joinRequests.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────── */}
      <div className="mt-6 max-w-3xl mx-auto w-full pb-20 overflow-hidden">
        {/* Members tab */}
        {selectedTab === 'Members' && (
          <div className="space-y-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-dark group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full bg-surface-elevated-dark/30 [html.light_&]:bg-black/5 border border-white/5 [html.light_&]:border-black/5 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-text-muted-dark/40"
              />
            </div>
            <div className="space-y-2">
              {group.members.filter(m => 
                m.username.toLowerCase().includes(memberSearch.toLowerCase()) || 
                m.college?.toLowerCase().includes(memberSearch.toLowerCase())
              ).map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between gap-3 p-4 rounded-xl
                             glass-dark [html.light_&]:glass-light
                             border border-border-dark [html.light_&]:border-border-light"
                >
                  <Link
                    to={`/profile/${member.username}`}
                    className="flex items-center gap-3 min-w-0 no-underline group/link"
                  >
                    <img
                      src={member.profilePicture || `https://ui-avatars.com/api/?name=${member.username}&background=4361ee&color=fff&size=48`}
                      alt={member.username}
                      className="w-10 h-10 rounded-full object-cover border border-border-dark [html.light_&]:border-border-light"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-dark [html.light_&]:text-text-light truncate
                                    group-hover/link:text-primary transition-colors">
                        {member.username}
                      </p>
                      {member.college && (
                        <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light truncate">
                          {member.college}
                        </p>
                      )}
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    {member._id === group.admin._id ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-success">
                        <Shield size={13} /> Admin
                      </span>
                    ) : (
                      <>
                        <span className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light">
                          Member
                        </span>
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleChangeAdmin(member._id)}
                              disabled={promotingId === member._id}
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
            </div>
          </div>
        )}

        {/* Join Requests tab */}
        {selectedTab === 'Join Requests' && isAdmin && (
          <div>
            {group.joinRequests.length === 0 ? (
              <div className="text-center py-16">
                <UserPlus size={48} className="mx-auto text-text-muted-dark/20 [html.light_&]:text-text-muted-light/20" />
                <p className="mt-4 text-text-muted-dark [html.light_&]:text-text-muted-light">
                  No pending requests
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-dark group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Search join requests..."
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    className="w-full bg-surface-elevated-dark/30 [html.light_&]:bg-black/5 border border-white/5 [html.light_&]:border-black/5 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-text-muted-dark/40"
                  />
                </div>
                <div className="space-y-2">
                  {group.joinRequests.filter(req => 
                    req.username.toLowerCase().includes(requestSearch.toLowerCase()) || 
                    req.email.toLowerCase().includes(requestSearch.toLowerCase())
                  ).map((req) => (
                    <div
                      key={req._id}
                      className="flex items-center justify-between gap-3 p-4 rounded-xl
                                 glass-dark [html.light_&]:glass-light
                                 border border-border-dark [html.light_&]:border-border-light"
                    >
                      <Link
                        to={`/profile/${req.username}`}
                        className="flex items-center gap-3 min-w-0 no-underline"
                      >
                        <img
                          src={req.profilePicture || `https://ui-avatars.com/api/?name=${req.username}&background=4361ee&color=fff&size=40`}
                          alt={req.username}
                          className="w-9 h-9 rounded-full object-cover border border-border-dark [html.light_&]:border-border-light"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-dark [html.light_&]:text-text-light truncate">
                            {req.username}
                          </p>
                          <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light truncate">
                            {req.email}
                          </p>
                        </div>
                      </Link>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleAcceptRequest(req._id)}
                          className="p-2 rounded-lg bg-success/10 text-success hover:bg-success hover:text-white
                                     transition-all cursor-pointer"
                          title="Accept"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req._id)}
                          className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-white
                                     transition-all cursor-pointer"
                          title="Reject"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notice Board tab */}
        {selectedTab === 'Notice Board' && (
          <div className="space-y-6">
            {isAdmin && (
              <div className="p-5 rounded-2xl glass-dark [html.light_&]:glass-light border border-primary/20 bg-primary/5">
                <h4 className="text-sm font-semibold text-primary mb-4">Post New Notice</h4>
                <div className="bg-surface-elevated-dark/30 [html.light_&]:bg-black/5 rounded-2xl p-4 border border-border-dark [html.light_&]:border-border-light">
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border-dark/50 [html.light_&]:border-border-light/50">
                     <button onClick={() => applyFormatting('b')} title="Bold" className="p-1.5 hover:bg-surface-elevated-dark rounded-md transition-colors text-text-dark [html.light_&]:text-text-light cursor-pointer"><Bold size={14} /></button>
                     <button onClick={() => applyFormatting('i')} title="Italic" className="p-1.5 hover:bg-surface-elevated-dark rounded-md transition-colors text-text-dark [html.light_&]:text-text-light cursor-pointer"><Italic size={14} /></button>
                     <button onClick={() => applyFormatting('u')} title="Underline" className="p-1.5 hover:bg-surface-elevated-dark rounded-md transition-colors text-text-dark [html.light_&]:text-text-light cursor-pointer"><Underline size={14} /></button>
                     <button onClick={() => applyFormatting('s')} title="Strikethrough" className="p-1.5 hover:bg-surface-elevated-dark rounded-md transition-colors text-text-dark [html.light_&]:text-text-light cursor-pointer"><Strikethrough size={14} /></button>
                     <button onClick={() => applyFormatting('h')} title="Highlight" className="p-1.5 hover:bg-surface-elevated-dark rounded-md transition-colors text-text-dark [html.light_&]:text-text-light cursor-pointer"><Highlighter size={14} /></button>
                     <div className="w-px h-4 bg-border-dark/50 mx-1" />
                     <button onClick={() => applyFormatting('up')} title="Uppercase" className="text-[10px] font-bold px-2 py-1 hover:bg-surface-elevated-dark rounded-md transition-colors text-text-dark [html.light_&]:text-text-light cursor-pointer">ABC</button>
                     <button onClick={() => applyFormatting('low')} title="Lowercase" className="text-[10px] font-bold px-2 py-1 hover:bg-surface-elevated-dark rounded-md transition-colors text-text-dark [html.light_&]:text-text-light cursor-pointer">abc</button>
                  </div>
                  <textarea
                    id="notice-textarea"
                    value={newNotice}
                    onChange={(e) => setNewNotice(e.target.value)}
                    placeholder="Write an announcement for the group..."
                    className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none min-h-[100px] text-text-dark [html.light_&]:text-text-light placeholder:text-text-muted-dark/50"
                  />
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-dark/50 [html.light_&]:border-border-light/50">
                    <p className="text-[10px] text-text-muted-dark opacity-60">Notices expire after 30 days.</p>
                    <button
                      onClick={handleAddNotice}
                      disabled={actionLoading || !newNotice.trim()}
                      className="px-5 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-light transition-all shadow-lg shadow-primary/25 disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoading ? 'Loading...' : 'Post Notice'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-text-dark [html.light_&]:text-text-light">Previous Notices</h3>
              {isAdmin && group.notices.length > 0 && (
                <button 
                  onClick={() => setConfirmClearNotices(true)}
                  className="text-xs text-danger hover:underline font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            {group.notices.length === 0 ? (
              <div className="text-center py-12 opacity-50">
                <div className="w-16 h-16 bg-surface-elevated-dark rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle size={32} />
                </div>
                <p>No active notices</p>
              </div>
            ) : (
              <div className="space-y-4">
                {group.notices.slice().reverse().map((notice) => (
                  <div key={notice._id} className="p-5 rounded-2xl glass-dark [html.light_&]:glass-light border border-border-dark [html.light_&]:border-border-light relative group">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <img 
                          src={notice.admin.profilePicture || `https://ui-avatars.com/api/?name=${notice.admin.username}&background=4361ee&color=fff`} 
                          className="w-6 h-6 rounded-full"
                          alt=""
                        />
                        <span className="text-xs font-bold text-primary">{notice.admin.username}</span>
                        <span className="text-[10px] text-text-muted-dark opacity-60">•</span>
                        <span className="text-[10px] text-text-muted-dark opacity-60">
                          {new Date(notice.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(notice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteNotice(notice._id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-danger/10 rounded-lg text-danger transition-all cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-text-dark [html.light_&]:text-text-light leading-relaxed whitespace-pre-wrap">
                      {formatNoticeText(notice.content)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings tab */}
        {selectedTab === 'Settings' && isAdmin && (
          <GroupSettings group={group} refreshFunc={fetchGroup} />
        )}
      </div>

      {/* ── Confirm Leave Dialog ────────────────────── */}
      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle>Leave Group?</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
            Are you sure you want to leave <strong>{group.name}</strong>?
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setConfirmLeave(false)}
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

      {/* ── Confirm Delete Dialog ───────────────────── */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-danger">Delete Group?</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
            This will permanently delete <strong>{group.name}</strong> and all its data. This cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer
                         text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer
                         bg-danger text-white hover:bg-danger/80 transition-all
                         disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <Loader2 size={14} className="animate-spin" />}
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* ── Confirm Clear Notices Dialog ───────────── */}
      <Dialog open={confirmClearNotices} onOpenChange={setConfirmClearNotices}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-danger">Clear All Notices?</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
             Are you sure you want to delete all notices? This cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setConfirmClearNotices(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer
                         text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleClearNotices}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer
                         bg-danger text-white hover:bg-danger/80 transition-all
                         disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <Loader2 size={14} className="animate-spin" />}
              Clear All
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Cropper Modal */}
      <Dialog open={showCropper && !!rawImage} onOpenChange={(open) => { if(!open) { setShowCropper(false); setRawImage(null); } }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-border-dark [html.light_&]:border-border-light mb-0">
             <DialogTitle>Crop Group Picture</DialogTitle>
          </DialogHeader>
          
          <div className="p-4 bg-black/20">
            <Cropper
              ref={cropperRef}
              src={rawImage!}
              style={{ height: 350, width: '100%' }}
              aspectRatio={1}
              guides={true}
              viewMode={1}
              dragMode="move"
              background={false}
            />
          </div>

          <div className="p-4 flex gap-3 border-t border-border-dark [html.light_&]:border-border-light bg-surface-elevated-dark/50 [html.light_&]:bg-surface-elevated-light">
            <button
              onClick={() => { setShowCropper(false); setRawImage(null); }}
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
                         transition-all cursor-pointer shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
            >
              <Upload size={16} /> Save Picture
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Admin Exit Warning Dialog */}
      <Dialog open={showAdminExitWarning} onOpenChange={setShowAdminExitWarning}>
        <DialogContent className="max-w-sm p-8">
           <DialogHeader>
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                 <Shield size={32} />
              </div>
              <DialogTitle className="text-center">Successor Required</DialogTitle>
           </DialogHeader>
           <p className="text-sm text-text-muted-dark text-center mb-8">Make another member admin inorder to exit this group.</p>
           
           <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setShowAdminExitWarning(false);
                  setSelectedTab('Members');
                }}
                className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all cursor-pointer"
              >
                Ok
              </button>
              <button 
                onClick={() => setShowAdminExitWarning(false)}
                className="w-full py-3.5 bg-surface-elevated-dark [html.light_&]:bg-black/5 text-text-dark [html.light_&]:text-text-light rounded-2xl font-bold hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
