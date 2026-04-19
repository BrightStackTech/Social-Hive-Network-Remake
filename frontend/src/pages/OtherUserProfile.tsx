import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, UserPlus, MessageCircle, Mail, MoreVertical, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import FollowListDialog from '../components/FollowListDialog';
import OthersPostCard from '../components/posts/OthersPostCard';
import ComPostCard from '../components/composts/ComPostCard';
import type { Post } from '../components/posts/PostCard';
import ReportDialog from '../components/ReportDialog';

interface UserData {
  _id: string;
  username: string;
  email: string;
  profilePicture: string;
  college: string;
  engineeringDomain: string;
  isEmailVerified: boolean;
  bio: string;
  followers: string[];
  following: string[];
  posts: string[];
  yearOfGraduation: string;
  showYearOfGraduation: boolean;
  collegeEmail?: string;
}

import { 
  getUserPostsByUsername, 
  getUserRepostsByUsername,
  getUserCommunityPosts,
  getCategories,
  checkHasUpdates
} from '../api/index';
import CategoryCard from '../components/CategoryCard';
import type { Category } from '../components/CategoryCard';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../components/ui/DropdownMenu';
import { Dialog, DialogContent } from '../components/ui/Dialog';

export default function OtherUserProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { api, user: currentUser, updateUser } = useAuth();
  const [profile, setProfile] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMutual, setIsMutual] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Posts');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'followers' | 'following'>('followers');
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [showProfilePictureDialog, setShowProfilePictureDialog] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const tabs = ['Posts', 'Community Posts', 'Categories', 'Reposts'];

  useEffect(() => {
    if (username === currentUser?.username) {
      navigate('/profile', { replace: true });
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await api.get(`/user/${username}`);
        setProfile(res.data.user);
        setIsFollowing(res.data.isFollowing);
        setIsMutual(res.data.isMutual);
        
        // Check for updates
        const updateRes = await checkHasUpdates(res.data.user._id);
        setHasUpdates(updateRes.data.data.hasUpdates);
      } catch (error: any) {
        if (error.response?.status === 404) {
          toast.error('User not found');
          navigate('/search', { replace: true });
        } else {
          toast.error('Failed to load profile');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [username]);

  useEffect(() => {
    if (!username) return;

    const fetchTabData = async () => {
      setPostsLoading(true);
      try {
        let response;
        switch (activeTab) {
          case 'Posts':
            response = await getUserPostsByUsername(username);
            break;
          case 'Reposts':
            response = await getUserRepostsByUsername(username);
            break;
          case 'Categories':
            if (profile && profile._id) {
              response = await getCategories(profile._id);
              setCategories(response.data.data || []);
            } else {
              setCategories([]);
            }
            setPostsLoading(false);
            return;
          case 'Community Posts':
            if (profile && profile._id) {
              response = await getUserCommunityPosts(profile._id);
              setPosts(response.data.posts || []);
            } else {
              setPosts([]);
            }
            setPostsLoading(false);
            return;
          default:
            setPosts([]);
            setPostsLoading(false);
            return;
        }

        let fetchedPosts = response.data.posts || [];
        
        if (activeTab === 'Posts') {
          fetchedPosts = fetchedPosts.filter((p: Post) => !p.isRepost);
        }
        
        setPosts(fetchedPosts);
      } catch (error) {
        console.error('Fetch other user tab data error:', error);
      } finally {
        setPostsLoading(false);
      }
    };

    fetchTabData();
  }, [activeTab, username]);

  const handleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.post(`/unfollow/${profile._id}`);
        setIsFollowing(false);
        setIsMutual(false);
        setProfile((prev) => prev ? { ...prev, followers: prev.followers.filter((id) => id !== currentUser?._id) } : prev);
        if (currentUser) {
          updateUser({ ...currentUser, following: currentUser.following.filter((id) => id !== profile._id) });
        }
        toast.success('Unfollowed');
      } else {
        const res = await api.post(`/follow/${profile._id}`);
        setIsFollowing(true);
        setIsMutual(res.data.isMutual);
        setProfile((prev) => prev ? { ...prev, followers: [...prev.followers, currentUser?._id || ''] } : prev);
        if (currentUser) {
          updateUser({ ...currentUser, following: [...currentUser.following, profile._id] });
        }
        toast.success('Followed!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleChat = () => {
    if (!isMutual) {
      toast.error('The other user must follow you back for chat to be enabled');
      return;
    }
    navigate(`/chats/${profile?.username}`);
  };

  const openDialog = (type: 'followers' | 'following') => {
    setDialogType(type);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-text-muted-dark [html.light_&]:text-text-muted-light">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <p className="text-text-muted-dark [html.light_&]:text-text-muted-light">User not found</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-8 pt-8 max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="text-center">
        <div className="relative inline-block">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div className={`p-1.5 rounded-full transition-all duration-300 border-[3.5px] ${hasUpdates ? 'border-primary shadow-lg shadow-primary/20' : 'border-transparent'} hover:border-primary/50 cursor-pointer group`}>
                        <img
                            src={profile.profilePicture || `https://ui-avatars.com/api/?name=${profile.username}&background=4361ee&color=fff&size=128`}
                            alt={profile.username}
                            className="w-32 h-32 rounded-full object-cover transition-opacity group-hover:opacity-80 border-2 border-surface-dark"
                        />
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-[180px] bg-surface-dark border-border-dark p-1.5 rounded-2xl shadow-2xl">
                    <DropdownMenuItem 
                        onClick={() => setShowProfilePictureDialog(true)}
                        className="text-white [html.light_&]:text-text-light font-medium rounded-xl hover:bg-white/5 cursor-pointer py-2.5"
                    >
                        View Profile Picture
                    </DropdownMenuItem>
                    {hasUpdates && (
                        <DropdownMenuItem 
                            onClick={() => navigate(`/updates/${profile._id}`)}
                            className="text-primary font-bold rounded-xl hover:bg-primary/5 cursor-pointer py-2.5 mt-1"
                        >
                            View Updates
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                        onClick={() => setIsReportDialogOpen(true)}
                        className="text-danger font-medium rounded-xl hover:bg-danger/5 cursor-pointer py-2.5 mt-1"
                    >
                        Report This User
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={showProfilePictureDialog} onOpenChange={setShowProfilePictureDialog}>
                <DialogContent className="max-w-xl bg-transparent border-0 p-0 overflow-hidden rounded-3xl backdrop-blur-sm">
                    <img
                        src={profile.profilePicture || `https://ui-avatars.com/api/?name=${profile.username}&background=4361ee&color=fff&size=128`}
                        className="w-full h-auto aspect-square object-cover rounded-3xl shadow-2xl"
                        alt=""
                    />
                </DialogContent>
            </Dialog>
        </div>

        <h1 className="mt-4 text-2xl font-display font-bold text-text-dark [html.light_&]:text-text-light">
          {profile.username}
        </h1>
        {profile.collegeEmail && (
          <div className="mt-1 flex items-center justify-center gap-1.5 text-sm group relative">
            <Mail size={14} className="text-text-muted-dark [html.light_&]:text-text-muted-light" />
            <a 
              href={`mailto:${profile.collegeEmail}`}
              className="text-sm font-medium text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-primary transition-colors"
            >
              {profile.collegeEmail}
            </a>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-full hover:bg-white/5 [html.light_&]:hover:bg-black/5 text-text-muted-dark [html.light_&]:text-text-muted-light transition-colors cursor-pointer">
                  <MoreVertical size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-[150px] bg-surface-dark border-border-dark p-1 rounded-xl shadow-2xl z-[100]">
                <DropdownMenuItem 
                  onClick={() => window.location.href = `mailto:${profile.collegeEmail}`}
                  className="flex items-center gap-2 text-white [html.light_&]:text-text-light font-medium rounded-lg hover:bg-white/5 cursor-pointer py-2 px-3"
                >
                  <Mail size={14} />
                  Send a Mail
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setIsReportDialogOpen(true)}
                  className="flex items-center gap-2 text-danger font-medium rounded-lg hover:bg-danger/5 cursor-pointer py-2 px-3 mt-0.5"
                >
                  <ShieldAlert size={14} />
                  Report this user
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Stats + Action buttons */}
        <div className="mt-8 flex items-center justify-center gap-4 md:gap-8 flex-wrap">
          {/* Followers — clickable */}
          <button
            onClick={() => openDialog('followers')}
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity order-1"
          >
            <Users size={16} className="text-primary" />
            <span className="font-semibold text-text-dark [html.light_&]:text-text-light">
              {profile.followers.length}
            </span>
            <span className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">Followers</span>
          </button>

          {/* Follow / Following button */}
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 cursor-pointer order-2
                       ${isFollowing
                         ? 'bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light border border-border-dark [html.light_&]:border-border-light text-text-dark [html.light_&]:text-text-light hover:border-danger hover:text-danger'
                         : 'bg-primary text-white hover:bg-primary-light shadow-lg shadow-primary/25'
                       } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
          </button>

          {/* Chat button — Full width on mobile footer area, next to Follow on desktop */}
          {isFollowing && (
            <button
              onClick={handleChat}
              className={`w-full md:w-auto px-10 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 cursor-pointer
                         flex items-center justify-center gap-2 order-4 md:order-3
                         ${isMutual
                           ? 'bg-accent text-white hover:bg-accent/80 shadow-lg shadow-accent/25'
                           : 'bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light border border-border-dark [html.light_&]:border-border-light text-text-muted-dark [html.light_&]:text-text-muted-light opacity-60 font-medium'
                         }`}
            >
              <MessageCircle size={18} />
              Chat
            </button>
          )}

          {/* Following — clickable */}
          <button
            onClick={() => openDialog('following')}
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity order-3 md:order-4"
          >
            <UserPlus size={16} className="text-accent" />
            <span className="font-semibold text-text-dark [html.light_&]:text-text-light">
              {profile.following.length}
            </span>
            <span className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">Following</span>
          </button>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="mt-6 text-center">
          <h3 className="font-display font-semibold text-text-dark [html.light_&]:text-text-light">Bio</h3>
          <p className="mt-1 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light max-w-md mx-auto">
            {profile.bio}
          </p>
        </div>
      )}

      {/* College & Branch Info */}
      {(profile.college || profile.engineeringDomain) && (
        <div className="mt-6 rounded-2xl p-6
                        glass-dark [html.light_&]:glass-light
                        border border-border-dark [html.light_&]:border-border-light">
          <div className="flex flex-col items-center gap-3 text-sm">
            {profile.college && (
              <div>
                <span className="font-semibold text-text-dark [html.light_&]:text-text-light">College: </span>
                <span className="text-text-muted-dark [html.light_&]:text-text-muted-light">{profile.college}</span>
              </div>
            )}
            {profile.engineeringDomain && (
              <div>
                <span className="font-semibold text-text-dark [html.light_&]:text-text-light">Branch: </span>
                <span className="text-text-muted-dark [html.light_&]:text-text-muted-light">{profile.engineeringDomain}</span>
              </div>
            )}
            {profile.yearOfGraduation && profile.showYearOfGraduation && (
              <div>
                <span className="font-semibold text-text-dark [html.light_&]:text-text-light">Graduation: </span>
                <span className="text-text-muted-dark [html.light_&]:text-text-muted-light">{profile.yearOfGraduation}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Tabs */}
      <div className="mt-8 border-b border-border-dark [html.light_&]:border-border-light">
        <div className="flex gap-0 overflow-x-auto md:justify-center scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer
                         border-b-2 -mb-px ${
                           activeTab === tab
                             ? 'border-primary text-primary'
                             : 'border-transparent text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-text-light'
                         }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'Categories' ? (
          <div className="space-y-4">
            {postsLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-text-muted-dark [html.light_&]:text-text-muted-light">
                  No categories yet
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {categories.map((cat) => (
                  <CategoryCard 
                    key={cat._id} 
                    category={cat} 
                    onRefresh={() => setActiveTab('Categories')} 
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          postsLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-text-muted-dark [html.light_&]:text-text-muted-light">
                No {activeTab.toLowerCase()} yet
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {posts.map((post) => (
                activeTab === 'Community Posts' 
                  ? <ComPostCard key={post._id} post={post} />
                  : <OthersPostCard key={post._id} post={post} />
              ))}
            </div>
          )
        )}
      </div>

      {/* Followers/Following Dialog */}
      <FollowListDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        type={dialogType}
        username={username || ''}
      />

      {/* Report Dialog */}
      {profile && (
        <ReportDialog
          open={isReportDialogOpen}
          onOpenChange={setIsReportDialogOpen}
          reportedUser={{ 
            _id: profile._id, 
            email: profile.collegeEmail || profile.email 
          }}
        />
      )}
    </div>
  );
}
