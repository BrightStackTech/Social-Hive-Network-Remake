import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ComPostCard from '../components/composts/ComPostCard';
import { type ComPost } from '../components/composts/ComPostCard';
import { Globe, Users, Loader2, ShieldCheck, Calendar, Shield, Trash2, Camera, Search, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { toast } from 'react-hot-toast';
import ComSearchBar from '../components/communities/ComSearchBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import Cropper, { type ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";

const CommunityViewPage = () => {
    const { communityName } = useParams();
    const { token, user } = useAuth();
    const [community, setCommunity] = useState<any>(null);
    const [posts, setPosts] = useState<ComPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMember, setIsMember] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [isRemoved, setIsRemoved] = useState(false);
    const [joining, setJoining] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'edit'>('profile');
    const [activeFilter, setActiveFilter] = useState('All Posts');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Edit states
    const [editDescription, setEditDescription] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [deleting, setDeleting] = useState(false);
    
    // Profile Picture states
    const [profilePictureUrl, setProfilePictureUrl] = useState<string | undefined>();
    const [croppedProfilePicture, setCroppedProfilePicture] = useState<File | null>(null);
    const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cropperRef = useRef<ReactCropperElement>(null);

    // Members Dialog state
    const [showMembersDialog, setShowMembersDialog] = useState(false);
    const [showRequestsDialog, setShowRequestsDialog] = useState(false);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
    const [memberSearchQuery, setMemberSearchQuery] = useState('');

    const SERVER_URI = `${import.meta.env.VITE_SERVER_URL}/api/v1`;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const comRes = await axios.get(`${SERVER_URI}/communities/${communityName}`);
                const comData = comRes.data.data;
                setCommunity(comData);
                setEditDescription(comData.description || '');

                const postsRes = await axios.get(`${SERVER_URI}/composts/community-name/${communityName}`);
                setPosts(postsRes.data || []);

                const userId = user?._id?.toString();
                if (comData.joinedBy.some((m: any) => (m._id || m).toString() === userId)) {
                    setIsMember(true);
                } else if (comData.pendingReq?.some((m: any) => (m._id || m).toString() === userId)) {
                    setIsPending(true);
                } else if (comData.removedMem?.some((m: any) => (m._id || m).toString() === userId)) {
                    setIsRemoved(true);
                }

            } catch (err) {
                console.error(err);
                toast.error("Community not found");
            } finally {
                setLoading(false);
            }
        };
        if (communityName) fetchData();
    }, [communityName, user?._id]);

    const handleJoinLeave = async () => {
        if (!token) return toast.error("Please login first");
        setJoining(true);
        try {
            if (isMember) {
                await axios.post(`${SERVER_URI}/communities/${communityName}/leave`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIsMember(false);
                toast.success(`Left c/${communityName}`);
                window.dispatchEvent(new Event('communityChange'));
            } else if (isPending) {
                 await axios.post(`${SERVER_URI}/communities/${communityName}/cancel-join-request`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIsPending(false);
                setIsRemoved(true);
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
                setIsMember(true);
                toast.success(`Joined c/${communityName}`);
                window.dispatchEvent(new Event('communityChange'));
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Action failed");
        } finally {
            setJoining(false);
        }
    };

    const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePictureUrl(reader.result as string);
                setIsCropDialogOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfilePictureCrop = () => {
        if (!cropperRef.current?.cropper) {
            toast.error('Cropper not loaded properly');
            return;
        }
        const canvas = cropperRef.current.cropper.getCroppedCanvas();
        if (!canvas) {
            toast.error('Failed to crop image');
            return;
        }
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], 'profile_picture.png', { type: 'image/png' });
                setCroppedProfilePicture(file);
                setProfilePictureUrl(URL.createObjectURL(file));
                setIsCropDialogOpen(false);
            } else {
                toast.error('Failed to process image');
            }
        }, 'image/png');
    };

    const handleUpdateDetails = async () => {
        setSavingEdit(true);
        try {
            let pfpUrl = community.profilePicture;

            // Handle image upload if a new one is selected
            if (croppedProfilePicture) {
                const formData = new FormData();
                formData.append('file', croppedProfilePicture);
                const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'socialhive_pfp';
                const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'domckasfk';
                formData.append('upload_preset', uploadPreset);

                try {
                    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                        method: 'POST',
                        body: formData,
                    });
                    const cloudinaryResponse = await response.json();
                    if (!response.ok) throw new Error(cloudinaryResponse.error?.message || 'Upload failed');
                    pfpUrl = cloudinaryResponse.secure_url;
                } catch (err: any) {
                    console.error("Cloudinary upload failed", err);
                    toast.error(`Upload failed: ${err.message}`);
                    return;
                }
            }

            await axios.put(`${SERVER_URI}/communities/${community.communityName}`, {
                description: editDescription,
                profilePicture: pfpUrl
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setCommunity({
                ...community,
                description: editDescription,
                profilePicture: pfpUrl
            });
            toast.success("Community details updated");
            setActiveTab('profile');
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to update community");
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDeleteCommunity = async () => {
        if (!window.confirm("ARE YOU SURE? This will permanently delete the community and all its content!")) return;
        setDeleting(true);
        try {
            await axios.delete(`${SERVER_URI}/communities/${community._id}/delete`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Community deleted");
            window.location.href = '/communities';
        } catch (err) {
            toast.error("Deletion failed");
        } finally {
            setDeleting(false);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!window.confirm("Remove this member from the community?")) return;
        setRemovingMemberId(userId);
        try {
            await axios.delete(`${SERVER_URI}/communities/${community.communityName}/remove/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Member removed");
            setCommunity({
                ...community,
                joinedBy: community.joinedBy.filter((m: any) => (m._id || m) !== userId),
                joinedCount: community.joinedCount - 1
            });
        } catch (err) {
            toast.error("Failed to remove member");
        } finally {
            setRemovingMemberId(null);
        }
    };

    const filteredPosts = posts.filter(p => 
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={40} />
        </div>
    );

    if (!community) return (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
            <Globe size={64} className="text-text-muted-dark opacity-20" />
            <h2 className="text-xl font-bold font-display">Community Not Found</h2>
            <Link to="/communities"><Button variant="ghost">Go Back</Button></Link>
        </div>
    );

    const isAdmin = community.admin?._id === user?._id;
    const createdAtDate = community.createdAt ? new Date(community.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }) : 'Unknown';

    return (
        <div className="flex flex-col h-screen overflow-y-auto scrollbar-hide bg-surface-dark [html.light_&]:bg-surface-light">
            {/* Top Search Bar */}
            <div className="px-6 py-4 border-b border-border-dark [html.light_&]:border-border-light flex items-center sticky top-0 bg-surface-dark/80 [html.light_&]:bg-white/80 backdrop-blur-md z-30">
                <div className="flex-1">
                    <ComSearchBar 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onSubmit={(e) => e.preventDefault()}
                        placeholder="Search for community posts..."
                    />
                </div>
            </div>

            {/* Header Tabs */}
            <div className="border-b border-border-dark [html.light_&]:border-border-light bg-surface-dark [html.light_&]:bg-surface-light">
                <div className="flex justify-center">
                    {[
                        { id: 'profile', label: 'Community Profile' },
                        { id: 'edit', label: 'Edit Community Profile' }
                    ].map((tab) => (
                        (isAdmin ) && (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as 'profile' | 'edit')}
                                className={`flex-1 py-6 text-sm font-semibold text-center transition-all duration-200 cursor-pointer
                                    ${activeTab === tab.id
                                        ? 'text-text-dark [html.light_&]:text-text-light border-b-3 border-primary'
                                        : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-text-light border-b-3 border-transparent'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        )
                    ))}
                </div>
            </div>

            <div className="flex-1">
                {activeTab === 'profile' ? (
                    <div className="pb-20">
                        {/* Centered Profile Section */}
                        <div className="py-12 flex flex-col items-center text-center px-6">
                            <div className="w-48 h-48 rounded-full bg-surface-elevated-dark [html.light_&]:bg-white border-4 border-border-dark [html.light_&]:border-border-light overflow-hidden flex items-center justify-center shadow-2xl mb-6 group relative">
                                {community.profilePicture ? (
                                    <img src={community.profilePicture} alt={community.communityName} className="w-full h-full object-cover" />
                                ) : (
                                    <Globe className="text-text-muted-dark" size={72} />
                                )}
                            </div>
                            
                            <h1 className="text-4xl font-display font-black text-text-dark [html.light_&]:text-text-light mb-2">
                                c/{community.communityName}
                                {isAdmin && <ShieldCheck className="inline-block ml-3 text-primary" size={32} />}
                            </h1>
                            
                            <p className="text-sm font-bold text-text-muted-dark max-w-lg mb-8">
                                {community.description || "No description provided."}
                            </p>

                            {/* Meta Info Rows */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-left w-full max-w-4xl text-[10px] sm:text-[11px] font-bold text-text-muted-dark [html.light_&]:text-text-muted-light uppercase ">
                                <div className="flex items-center justify-between gap-4 border-b border-border-dark [html.light_&]:border-border-light py-2">
                                    <span className="flex items-center gap-2 shrink-0"><Calendar size={14} className="text-primary" /> Created on:</span>
                                    <span className="text-text-dark [html.light_&]:text-text-light truncate">{createdAtDate}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 border-b border-border-dark [html.light_&]:border-border-light py-2">
                                    <span className="flex items-center gap-2 shrink-0"><Shield size={14} className="text-primary" /> Admin:</span>
                                    {community.admin ? (
                                        <Link to={`/profile/${community.admin.username}`} className="text-secondary no-underline underline-offset-4 hover:underline truncate max-w-[150px]">@{community.admin.username}</Link>
                                    ) : (
                                        <span className="text-text-muted-dark font-bold truncate opacity-60">Deleted User</span>
                                    )}
                                </div>
                                <div 
                                    className="flex items-center justify-between gap-4 border-b border-border-dark [html.light_&]:border-border-light py-2 cursor-pointer hover:bg-white/5 [html.light_&]:hover:bg-gray-100 transition-colors group"
                                    onClick={() => setShowMembersDialog(true)}
                                >
                                    <span className="flex items-center gap-2 group-hover:text-primary transition-colors shrink-0"><Users size={14} className="text-primary" /> Members Joined:</span>
                                    <span className="text-text-dark [html.light_&]:text-text-light group-hover:text-primary transition-colors truncate">{community.joinedCount}</span>
                                </div>
                                <div className="flex items-center justify-end py-2">
                                    {isAdmin ? (
                                        <div className="relative">
                                            <Button 
                                                variant="outline" 
                                                className="h-10 rounded-lg px-8 text-[10px] font-black bg-surface-card-dark [html.light_&]:bg-white border-border-dark [html.light_&]:border-border-light hover:bg-white/5 [html.light_&]:hover:bg-gray-50 no-underline text-text-dark [html.light_&]:text-text-light"
                                                onClick={() => setShowRequestsDialog(true)}
                                            >
                                                MANAGE REQUESTS
                                            </Button>
                                            {community.pendingReq?.length > 0 && (
                                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-danger rounded-full border-2 border-surface-dark [html.light_&]:border-white animate-pulse shadow-lg shadow-danger/40" />
                                            )}
                                        </div>
                                    ) : (
                                        <Button 
                                            variant={isMember ? "destructive" : "primary"}
                                            className="h-10 rounded-xl px-8 text-[10px] font-black active:scale-95 transition-all no-underline"
                                            onClick={handleJoinLeave}
                                            disabled={joining}
                                        >
                                            {joining ? <Loader2 className="animate-spin" size={16} /> : (
                                                isMember ? "- LEAVE COMMUNITY" : 
                                                isPending ? "- CANCEL REQUEST" : 
                                                isRemoved ? "+ REQUEST TO JOIN" : "+ JOIN Community"
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Filter Tabs Header */}
                        <div className="bg-surface-elevated-dark/50 [html.light_&]:bg-gray-100/50 border-t border-b border-border-dark [html.light_&]:border-border-light sticky top-[68px] z-20">
                            <div className="max-w-4xl mx-auto flex items-center md:justify-center overflow-x-auto scrollbar-hide">
                                {['All Posts', 'Top Posts', 'New Posts', 'Old Posts'].map((filter) => (
                                    <button 
                                        key={filter}
                                        className={`px-8 py-4 text-[10px] sm:text-[11px] font-black uppercase whitespace-nowrap transition-all flex-shrink-0 ${activeFilter === filter ? 'bg-surface-dark [html.light_&]:bg-white text-text-dark [html.light_&]:text-text-light font-black shadow-[inset_0_-2px_0_var(--color-primary)]' : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-text-light'}`}
                                        onClick={() => setActiveFilter(filter)}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Posts List */}
                        <div className="max-w-4xl mx-auto px-2 py-10 space-y-4">
                            {filteredPosts.length > 0 ? (
                                filteredPosts.map(post => <ComPostCard key={post._id} post={post} />)
                            ) : (
                                <div className="text-center py-32 bg-surface-card-dark [html.light_&]:bg-white border border-dashed border-border-dark [html.light_&]:border-border-light rounded-3xl opacity-50">
                                    <Globe className="mx-auto mb-4 opacity-10" size={64} />
                                    <p className="text-sm font-black text-text-muted-dark [html.light_&]:text-text-muted-light uppercase">The community is quiet</p>
                                    <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light font-medium mt-1">No posts matching your current filters.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center">
                        <div className="relative group/pfp w-48 h-48 rounded-full overflow-hidden border-4 border-border-dark shadow-2xl bg-surface-elevated-dark flex items-center justify-center">
                            {profilePictureUrl || community.profilePicture ? (
                                <img src={profilePictureUrl || community.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <Globe className="text-text-muted-dark opacity-10" size={80} />
                            )}
                            <div 
                                className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover/pfp:opacity-100 transition-opacity bg-black/40 cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Camera className="text-white mb-2" size={32} />
                                <span className="text-[10px] text-white font-black uppercase ">Update Photo</span>
                            </div>
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleProfilePictureChange} 
                        />
                        <button 
                            className="text-secondary text-xs font-black uppercase  hover:underline mt-6 mb-12 cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Edit Profile Picture
                        </button>

                        <div className="w-full max-w-4xl space-y-12">
                            <div className="space-y-3">
                                <label className="text-sm font-black text-text-dark [html.light_&]:text-text-light uppercase block">Description</label>
                                <textarea 
                                    className="w-full bg-surface-elevated-dark [html.light_&]:bg-white border border-border-dark [html.light_&]:border-border-light rounded-xl p-4 text-sm font-medium text-text-dark [html.light_&]:text-text-light focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all min-h-[120px]"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder="Tell the members what this community is about..."
                                />
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-border-dark">
                                <button 
                                    className="px-6 py-3 rounded-xl bg-danger/10 text-danger border border-danger/20 text-xs font-black uppercase  hover:bg-danger hover:text-white transition-all flex items-center gap-2"
                                    onClick={handleDeleteCommunity}
                                    disabled={deleting}
                                >
                                    {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                    Delete this community
                                </button>
                                
                                <Button 
                                    variant="primary" 
                                    className="px-10 h-14 rounded-xl text-sm font-black shadow-xl active:scale-95 transition-all"
                                    onClick={handleUpdateDetails}
                                    disabled={savingEdit}
                                >
                                    {savingEdit ? <Loader2 className="animate-spin" size={20} /> : "Update Community Details"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Members Dialog */}
            <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
                <DialogContent className="max-w-md p-0 overflow-hidden bg-surface-dark [html.light_&]:bg-white rounded-3xl">
                    <DialogHeader className="px-6 py-4 border-b border-border-dark [html.light_&]:border-border-light text-left">
                        <div className="flex items-center justify-between w-full">
                            <DialogTitle className="text-base font-black text-text-dark [html.light_&]:text-text-light">Members Joined</DialogTitle>
                        </div>
                    </DialogHeader>
                    <div className="px-6 pb-4 bg-surface-elevated-dark/10 [html.light_&]:bg-black/[0.02] border-b border-border-dark [html.light_&]:border-border-light">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-dark group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Search members..."
                                value={memberSearchQuery}
                                onChange={(e) => setMemberSearchQuery(e.target.value)}
                                className="w-full bg-surface-elevated-dark/30 [html.light_&]:bg-black/5 border border-white/5 [html.light_&]:border-black/5 rounded-2xl py-2.5 pl-11 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-text-muted-dark/30"
                            />
                        </div>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide space-y-1">
                        {community.joinedBy.filter((m: any) => 
                            m.username?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                            m.college?.toLowerCase().includes(memberSearchQuery.toLowerCase())
                        ).map((member: any) => {
                            const mId = (member._id || member).toString();
                            const isMemberAdmin = mId === community.admin?._id;
                            const isCurrentUserAdmin = isAdmin;

                            return (
                                <div key={mId} className="flex items-center justify-between gap-4 p-3 rounded-2xl hover:bg-white/5 [html.light_&]:hover:bg-gray-50 transition-all group">
                                    <Link to={`/profile/${member.username}`} className="flex items-center gap-3 no-underline hover:opacity-80 transition-opacity">
                                        <div className="w-10 h-10 rounded-full bg-surface-elevated-dark [html.light_&]:bg-gray-100 border border-border-dark [html.light_&]:border-border-light overflow-hidden flex items-center justify-center shadow-lg transform active:scale-95 transition-transform">
                                            {member.profilePicture ? (
                                                <img src={member.profilePicture} alt={member.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <Users className="text-text-muted-dark [html.light_&]:text-text-muted-light opacity-30" size={18} />
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-text-dark [html.light_&]:text-text-light tracking-tight">
                                                {member.username}
                                                {isMemberAdmin && <span className="ml-2 text-[9px] font-black text-success uppercase bg-success/10 px-1.5 py-0.5 rounded-md">Admin</span>}
                                            </span>
                                            <span className="text-[10px] font-medium text-text-muted-dark [html.light_&]:text-text-muted-light line-clamp-1 max-w-[200px]">
                                                {member.college || "Member of Social Hive"}
                                            </span>
                                        </div>
                                    </Link>

                                    {isCurrentUserAdmin && !isMemberAdmin && (
                                        <button 
                                            onClick={() => handleRemoveMember(mId)}
                                            disabled={removingMemberId === mId}
                                            className="text-[10px] font-black uppercase  text-danger hover:bg-danger/10 px-3 py-1.5 rounded-xl transition-all disabled:opacity-30 cursor-pointer active:scale-95"
                                        >
                                            {removingMemberId === mId ? <Loader2 className="animate-spin" size={12} /> : "Remove"}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Crop Dialog */}
            <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
                <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl border-none bg-surface-dark [html.light_&]:bg-white">
                    <div className="p-6 bg-surface-dark [html.light_&]:bg-white border-b border-border-dark [html.light_&]:border-border-light flex items-center justify-between">
                        <DialogTitle className="text-sm font-black text-text-dark [html.light_&]:text-text-light">Adjust Community Icon</DialogTitle>
                        <button onClick={() => setIsCropDialogOpen(false)} className="text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-white [html.light_&]:hover:text-text-light transition-colors cursor-pointer">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="bg-black/80 flex items-center justify-center p-6 max-h-96">
                        {profilePictureUrl && (
                            <Cropper
                                ref={cropperRef}
                                src={profilePictureUrl}
                                style={{ maxHeight: '22rem', width: '100%' }}
                                aspectRatio={1}
                                guides={true}
                                background={false}
                                className="rounded-xl overflow-hidden shadow-2xl"
                            />
                        )}
                    </div>
                    <div className="p-6 bg-surface-dark [html.light_&]:bg-white flex gap-3">
                        <Button variant="ghost" className="flex-1 h-12 text-[12px] font-black uppercase cursor-pointer" onClick={() => setIsCropDialogOpen(false)}>Cancel</Button>
                        <Button variant="primary" className="flex-1 h-12 text-[12px] font-black uppercase shadow-lg shadow-primary/20 cursor-pointer" onClick={handleProfilePictureCrop}>Finalize Icon</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Manage Requests Dialog */}
            <ManageMemberRequestsDialog 
                open={showRequestsDialog} 
                onOpenChange={setShowRequestsDialog}
                communityName={communityName!}
                token={token!}
                SERVER_URI={SERVER_URI}
                onUpdate={() => {
                     // Refresh community data to update list if needed
                     window.location.reload(); 
                }}
            />
        </div>
    );
};

const ManageMemberRequestsDialog = ({ open, onOpenChange, communityName, token, SERVER_URI, onUpdate }: any) => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (open) fetchRequests();
    }, [open]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${SERVER_URI}/communities/${communityName}/pending-requests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(res.data.data || []);
        } catch (err) {
            toast.error("Failed to fetch requests");
        } finally {
            setLoading(false);
        }
    };

    const [searchQuery, setSearchQuery] = useState('');
    const filteredRequests = requests.filter(req => 
        req.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAction = async (userId: string, action: 'approve' | 'reject') => {
        setProcessingId(userId);
        try {
            await axios.post(`${SERVER_URI}/communities/${communityName}/handle-join-request/${userId}/${action}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Request ${action}d`);
            setRequests(prev => prev.filter(r => r._id !== userId));
            if (action === 'approve') onUpdate();
        } catch (err) {
            toast.error(`Failed to ${action} request`);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-surface-dark [html.light_&]:bg-white rounded-3xl">
                <DialogHeader className="px-6 py-4 border-b border-border-dark [html.light_&]:border-border-light text-left">
                    <div className="flex items-center justify-between w-full">
                        <DialogTitle className="text-base font-black text-text-dark [html.light_&]:text-text-light">Pending Requests</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="px-6 pb-4 bg-surface-elevated-dark/10 [html.light_&]:bg-black/[0.02] border-b border-border-dark [html.light_&]:border-border-light">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-dark group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search requests..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-surface-elevated-dark/30 [html.light_&]:bg-black/5 border border-white/5 [html.light_&]:border-black/5 rounded-2xl py-2.5 pl-11 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-text-muted-dark/30"
                        />
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-4 scrollbar-hide space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
                    ) : filteredRequests.length > 0 ? (
                        filteredRequests.map((req) => (
                            <div key={req._id} className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-surface-elevated-dark [html.light_&]:bg-gray-50 border border-border-dark [html.light_&]:border-border-light">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 [html.light_&]:border-black/5">
                                        {req.profilePicture ? (
                                            <img src={req.profilePicture} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-primary/10 flex items-center justify-center"><Users size={16} className="text-primary" /></div>
                                        )}
                                    </div>
                                    <span className="text-sm font-black text-text-dark [html.light_&]:text-text-light">@{req.username}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleAction(req._id, 'reject')}
                                        disabled={processingId === req._id}
                                        className="p-2 rounded-xl text-text-muted-dark hover:bg-danger/10 hover:text-danger transition-all cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleAction(req._id, 'approve')}
                                        disabled={processingId === req._id}
                                        className="px-4 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-light active:scale-95 transition-all cursor-pointer"
                                    >
                                        {processingId === req._id ? <Loader2 className="animate-spin" size={12} /> : "Approve"}
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-text-muted-dark text-[10px] font-black uppercase tracking-widest">No pending requests</div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CommunityViewPage;
