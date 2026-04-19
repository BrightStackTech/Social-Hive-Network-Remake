import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/Dialog';
import {
  RiWhatsappFill,
  RiInstagramFill,
} from 'react-icons/ri';
import { Share2 } from 'lucide-react';
import {
  BsChatTextFill,
} from 'react-icons/bs';
import {
  GoLink,
} from 'react-icons/go';
import {
  IoIosMail,
} from 'react-icons/io';
import {
  FaLinkedin,
  FaSquareXTwitter,
  FaReddit,
  FaFacebook,
  FaFacebookMessenger,
} from 'react-icons/fa6';
import {
  PiThreadsLogoFill,
} from 'react-icons/pi';
import { toast } from 'react-hot-toast';
import axios from 'axios';

interface ShareDialogProps {
  post: {
    _id: string;
    title?: string;
    content?: string;
    description?: string;
    createdBy?: { 
      username?: string;
      _id?: string;
      profilePicture?: string;
    };
    author?: {
      username?: string;
      _id?: string;
    };
    sharedBy?: string[];
  };
  postType: 'post' | 'compost';
  triggerClassName?: string;
  children?: React.ReactNode;
}

const ShareDialog = ({ post, postType, triggerClassName, children }: ShareDialogProps) => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [openDialog, setOpenDialog] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [openChatShareDialog, setOpenChatShareDialog] = useState(false);
  const [followers, setFollowers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [filteredFollowers, setFilteredFollowers] = useState<any[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<any[]>([]);

  const SERVER_URI = `${import.meta.env.VITE_SERVER_URL}/api/v1`;
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUsername = currentUser.username;

  useEffect(() => {
    const fetchFollowersAndGroups = async () => {
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

        // Mutual follows (Intersection)
        const followersList = followersRes.data?.users || [];
        const followingList = followingRes.data?.users || [];
        const mutualFollows = followersList.filter((fUser: any) => 
          followingList.some((fol: any) => fol._id === fUser._id)
        );
        
        setFollowers(mutualFollows);
        setGroups(groupsRes.data?.groups || []);
      } catch (error) {
        console.error('Error fetching followers/groups:', error);
      }
    };

    if (openChatShareDialog && token) {
      fetchFollowersAndGroups();
    }
  }, [openChatShareDialog, token]);

  useEffect(() => {
    const searchTerm = chatSearch.toLowerCase();
    setFilteredFollowers(
      followers.filter((f) =>
        f.username?.toLowerCase().includes(searchTerm) ||
        f.bio?.toLowerCase().includes(searchTerm)
      )
    );
    setFilteredGroups(
      groups.filter((g) =>
        g.name?.toLowerCase().includes(searchTerm) ||
        g.description?.toLowerCase().includes(searchTerm)
      )
    );
  }, [chatSearch, followers, groups]);

  const getPostUrl = () => {
    return `${window.location.origin}/${postType}/${post._id}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getPostUrl());
    toast.success('Link copied to clipboard');
  };

  const getShareText = () => {
    const authorUsername = post.createdBy?.username || post.author?.username || 'user';
    const displayPostType = postType === 'compost' ? 'community post' : 'post';
    const postTitle = post.title || `Check this ${displayPostType}`;
    const postUrl = getPostUrl();
    return `Check this ${displayPostType} from @${authorUsername} : ${postTitle}\n${postUrl}`;
  };

  const handleShareInChat = (follower?: any, group?: any) => {
    const postContent = post.content || post.description || '';
    const postDescription = postContent.length > 100 ? postContent.slice(0, 100) + '...' : postContent;
    const authorUsername = post.createdBy?.username || post.author?.username || 'user';
    const displayPostType = postType === 'compost' ? 'community post' : 'post';
    const postTitle = post.title || `Check this ${displayPostType}`;

    if (follower) {
      const shareUrl = `/chats/${follower.username}?text=Check%20this%20${displayPostType}%20from%20%40${authorUsername}%20%3A&title=${postTitle}&description=${postDescription}&url=${window.location.origin}/${postType}/${post._id}`;
      navigate(shareUrl);
    } else if (group) {
      const shareUrl = `/chats/group/${group._id}?text=Check%20this%20${displayPostType}%20from%20%40${authorUsername}%20%3A&title=${postTitle}&description=${postDescription}&url=${window.location.origin}/${postType}/${post._id}&groupName=${group.name}`;
      navigate(shareUrl);
    }
    setOpenChatShareDialog(false);
  };

  return (
    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
      <DialogTrigger asChild>
        {children || (
          <div 
            className={triggerClassName || "p-2 rounded-full text-text-muted-dark hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"}
            onClick={(e) => e.stopPropagation()}
          >
            <Share2 size={20} />
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Share Post</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          {/* URL Input Area */}
          <div className="relative group">
            <input
              type="text"
              readOnly
              value={getPostUrl()}
              className="w-full pl-4 pr-12 py-3 bg-white/5 [html.light_&]:bg-black/5 border border-white/10 [html.light_&]:border-black/10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              onFocus={(e) => e.target.select()}
            />
            <button 
              onClick={handleCopyLink}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <GoLink className="w-4 h-4 text-primary" />
            </button>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-center text-text-muted-dark [html.light_&]:text-text-muted-light tracking-widest uppercase">
              Share Options
            </h4>

            {/* Share in Chat Button */}
            <Dialog open={openChatShareDialog} onOpenChange={setOpenChatShareDialog}>
              <DialogTrigger asChild>
                <button className="w-full flex items-center justify-center gap-3 py-3 bg-white/5 [html.light_&]:bg-black/5 hover:bg-white/10 [html.light_&]:hover:bg-black/10 text-text-dark [html.light_&]:text-text-light font-bold rounded-2xl transition-all border border-white/10 [html.light_&]:border-black/10 group">
                  <BsChatTextFill className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" /> 
                  <span>Share in Chat</span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Share in Chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search followers or groups..."
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      className="w-full p-3 pl-10 border border-white/10 [html.light_&]:border-black/10 rounded-xl bg-white/5 [html.light_&]:bg-black/5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <BsChatTextFill className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-dark" />
                  </div>
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredFollowers.length > 0 || filteredGroups.length > 0 ? (
                      <>
                        {filteredFollowers.map((follower) => (
                          <div
                            key={follower._id}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 [html.light_&]:hover:bg-black/5 cursor-pointer transition-colors"
                            onClick={() => handleShareInChat(follower)}
                          >
                            <img
                              src={follower?.profilePicture || "https://res.cloudinary.com/dxygc9jz4/image/upload/v1701928014/default-avatar.png"}
                              className="w-10 h-10 rounded-full object-cover"
                              alt="follower profile"
                            />
                            <div className="flex-1 min-w-0">
                               <div className="font-bold text-sm truncate">{follower.username}</div>
                               <div className="text-xs text-text-muted-dark truncate">{follower.college || 'SocialHive User'}</div>
                             </div>
                          </div>
                        ))}
                        {filteredGroups.map((group) => (
                           <div
                            key={group._id}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 [html.light_&]:hover:bg-black/5 cursor-pointer transition-colors"
                            onClick={() => handleShareInChat(undefined, group)}
                          >
                            <img
                              src={group?.profilePicture || "https://res.cloudinary.com/dxygc9jz4/image/upload/t_color-white/enifyimlrv3farvfto8k.jpg"}
                              className="w-10 h-10 rounded-full object-cover border border-white/10"
                              alt="group profile"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm truncate">{group.name}</div>
                              <div className="text-xs text-text-muted-dark truncate">{group.description || 'Community Group'}</div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-center py-8 text-sm text-text-muted-dark">
                        No results found
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Social Icons Grid */}
            <div className="grid grid-cols-5 gap-4">
              <ShareIconButton onClick={handleCopyLink} icon={GoLink} color="#6366f1" />
              <ShareIconButton 
                href={`mailto:?subject=See%20this%20post&body=${encodeURIComponent(getShareText())}`} 
                icon={IoIosMail} 
                color="#ea4335" 
              />
              <ShareIconButton 
                href={`https://api.whatsapp.com/send/?text=${encodeURIComponent(getShareText())}`} 
                icon={RiWhatsappFill} 
                color="#25d366" 
              />
              <ShareIconButton 
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${getPostUrl()}`} 
                icon={FaLinkedin} 
                color="#0a66c2" 
              />
              <ShareIconButton 
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareText())}`} 
                icon={FaSquareXTwitter} 
                color="#000000" 
              />
              <ShareIconButton 
                href={`https://www.reddit.com/submit?url=${getPostUrl()}&title=${encodeURIComponent(getShareText())}`} 
                icon={FaReddit} 
                color="#ff4500" 
              />
              <ShareIconButton icon={RiInstagramFill} color="#e4405f" />
              <ShareIconButton 
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getPostUrl())}&quote=${encodeURIComponent(getShareText())}`} 
                icon={FaFacebook} 
                color="#1877f2" 
              />
              <ShareIconButton 
                href={`https://www.facebook.com/dialog/send?link=${encodeURIComponent(getPostUrl())}`} 
                icon={FaFacebookMessenger} 
                color="#006aff" 
              />
              <ShareIconButton 
                href={`https://www.threads.net/intent/post?text=${encodeURIComponent(getShareText())}`} 
                icon={PiThreadsLogoFill} 
                color="#000000" 
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ShareIconButton = ({ icon: Icon, color, href, onClick }: { icon: any, color: string, href?: string, onClick?: () => void }) => {
  const content = (
    <div 
      className="w-12 h-12 rounded-full bg-white/5 [html.light_&]:bg-black/5 hover:bg-white/10 [html.light_&]:hover:bg-black/10 flex items-center justify-center transition-all group/icon border border-white/5 [html.light_&]:border-black/5 hover:border-primary/30"
      onClick={onClick}
    >
      <Icon className="w-5 h-5 transition-transform group-hover/icon:scale-110" style={{ color }} />
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="flex justify-center">
        {content}
      </a>
    );
  }

  return <div className="flex justify-center cursor-pointer">{content}</div>;
};

export default ShareDialog;
