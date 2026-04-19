import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, CheckCircle, Users, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import FollowListDialog from '../components/FollowListDialog';
import PostCard, { type Post } from '../components/posts/PostCard';
import ComPostCard from '../components/composts/ComPostCard';
import { 
  getUserPostsByUsername, 
  getUserRepostsByUsername, 
  getUserLikedPostsByUsername, 
  getUserSavedPosts, 
  getUserCommunityPosts,
  getCategories,
  checkHasUpdates 
} from '../api/index';
import CategoryCard from '../components/CategoryCard';
import { type Category } from '../components/CategoryCard';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../components/ui/DropdownMenu';
import { Dialog, DialogContent } from '../components/ui/Dialog';

interface UserProfile {
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
  loginType: string;
  savedPosts: string[];
  collegeEmail: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const { api, token, logout, user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'followers' | 'following'>('followers');
  const [hasUpdates, setHasUpdates] = useState(false);
  const [showProfilePictureDialog, setShowProfilePictureDialog] = useState(false);

  const tabs = ['Posts', 'Community Posts', 'Categories', 'Saved Posts', 'Liked Posts', 'Reposts'];

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return; 
    }

    const fetchTabData = async () => {
      setPostsLoading(true);
      try {
        let response;
        const username = profile?.username || currentUser?.username;
        if (!username && activeTab !== 'Community Posts' && activeTab !== 'Saved Posts') {
            // Wait for profile or use current user
            return;
        }

        switch (activeTab) {
          case 'Posts':
            response = await getUserPostsByUsername(username!);
            break;
          case 'Community Posts':
            response = await getUserCommunityPosts(profile?._id || currentUser?._id || '');
            break;
          case 'Saved Posts':
            response = await getUserSavedPosts();
            break;
          case 'Liked Posts':
            response = await getUserLikedPostsByUsername(username!);
            break;
          case 'Reposts':
            response = await getUserRepostsByUsername(username!);
            break;
          case 'Categories':
            response = await getCategories(profile?._id || currentUser?._id);
            setCategories(response.data.data || []);
            setPostsLoading(false);
            return;
          default:
            return;
        }

        let fetchedPosts = response.data.posts || [];
        if (activeTab === 'Posts') {
          fetchedPosts = fetchedPosts.filter((p: Post) => !p.isRepost);
        }
        setPosts(fetchedPosts);
      } catch (error) {
        console.error('Fetch tab data error:', error);
        toast.error(`Failed to load ${activeTab.toLowerCase()}`);
      } finally {
        setPostsLoading(false);
      }
    };

    if (token) {
      fetchTabData();
    }
  }, [activeTab, token, profile?.username, currentUser?.username]);

  useEffect(() => {
    if (!token) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get('/profile');
        setProfile(res.data.user);
      } catch (error: any) {
        toast.error('Failed to load profile');
        if (error.response?.status === 401) {
          logout();
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchUpdateStatus = async () => {
      if (!currentUser?._id) return;
      try {
        const res = await checkHasUpdates(currentUser._id);
        const hasUpdatesStatus = res.data.data.hasUpdates;
        setHasUpdates(hasUpdatesStatus);
      } catch (error) {
        console.error('Failed to check updates', error);
      }
    };

    if (token) {
      fetchProfile();
      fetchUpdateStatus();
    }
  }, [token, currentUser?._id]);

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
        <p className="text-text-muted-dark [html.light_&]:text-text-muted-light">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-8 max-w-4xl mx-auto">
      {/* Top-level Profile Tabs */}
      <div className="border-b border-border-dark [html.light_&]:border-border-light">
        <div className="flex justify-center">
          {['Profile', 'Edit Profile'].map((tab) => (
            <button
              key={tab}
              onClick={() => { if (tab === 'Edit Profile') navigate('/editProfile'); }}
              className={`flex-1 py-6 text-sm font-semibold text-center transition-all duration-200 cursor-pointer
                         ${tab === 'Profile'
                           ? 'text-text-dark [html.light_&]:text-text-light border-b-3 border-primary'
                           : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-text-light border-b-3 border-transparent'
                         }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="py-8">
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

        {/* Username */}
        <h1 className="mt-4 text-2xl font-display font-bold text-text-dark [html.light_&]:text-text-light">
          {profile.username}
        </h1>

        {/* Email with verification badge */}
        <div className="mt-1 flex items-center justify-center gap-1.5 text-sm">
          <Mail size={14} className="text-text-muted-dark [html.light_&]:text-text-muted-light" />
          <a 
            href={`mailto:${profile.email}`}
            className="text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-primary transition-colors"
          >
            {profile.email}
          </a>
          {profile.isEmailVerified && (
            <CheckCircle size={14} className="text-success" />
          )}
        </div>

        <div className="mt-1 flex items-center justify-center gap-1.5 text-sm">
          <Mail size={14} className="text-text-muted-dark [html.light_&]:text-text-muted-light" />
          <a 
            href={`mailto:${profile.collegeEmail}`}
            className="text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-primary transition-colors"
          >
            {profile.collegeEmail}
          </a>
          <CheckCircle size={14} className="text-success" />
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center justify-center gap-8">
          <button
            onClick={() => { setDialogType('followers'); setDialogOpen(true); }}
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Users size={16} className="text-primary" />
            <span className="font-semibold text-text-dark [html.light_&]:text-text-light">
              {profile.followers.length}
            </span>
            <span className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">Followers</span>
          </button>
          <button
            onClick={() => { setDialogType('following'); setDialogOpen(true); }}
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
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

      {/* Tabs */}
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
      <div className="mt-6">
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
          <>
            {postsLoading ? (
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
              <div className="flex flex-col gap-4">
                {posts.map((post) => (
                  activeTab === 'Community Posts'
                    ? <ComPostCard key={post._id} post={post as any} />
                    : <PostCard
                        key={post._id}
                        post={post}
                        onDeleted={() => setPosts((prev) => prev.filter((p) => p._id !== post._id))}
                      />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      </div>

      {/* Followers/Following Dialog */}
      <FollowListDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        type={dialogType}
        username={profile.username}
        allowRemove
        onRemove={(userId) => {
          setProfile((prev) => {
            if (!prev) return prev;
            if (dialogType === 'followers') {
              return { ...prev, followers: prev.followers.filter((id) => id !== userId) };
            } else {
              return { ...prev, following: prev.following.filter((id) => id !== userId) };
            }
          });
        }}
      />
    </div>
  );
}
