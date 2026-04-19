import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  MessageSquare, 
  Edit2, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  MoreVertical, 
  Share2, 
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/DropdownMenu";
import { Button } from "../ui/Button";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '../ui/Dialog';
import { Input } from '../ui/Input';
import ShareDialog from '../ShareDialog';

export interface ComPost {
  _id: string;
  title?: string;
  description?: string;
  pointsCount?: number;
  upvotedBy?: string[];
  downvotedBy?: string[];
  comments?: { _id: string }[];
  commentCount?: number;
  createdAt?: string;
  media?: string[];
  community?: {
    _id?: string;
    communityName?: string;
    admin?: string; 
  };
  author?: {
    username?: string;
    _id?: string;
  };
  isEdited?: boolean;
}

const ComPostCard = ({ post }: { post: ComPost }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const [voteCount, setVoteCount] = useState(post.pointsCount || 0);
  const userId = user?._id ?? '';
  const [upvoted, setUpvoted] = useState(post.upvotedBy?.includes(userId) || false);
  const [downvoted, setDownvoted] = useState(post.downvotedBy?.includes(userId) || false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(post.title || '');
  const [editedDescription, setEditedDescription] = useState(post.description || '');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editedMedia, setEditedMedia] = useState<string[]>(post.media || []);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState('');

  const SERVER_URI = `${import.meta.env.VITE_SERVER_URL}/api/v1`;

  useEffect(() => {
    setVoteCount(post.pointsCount || 0);
    setUpvoted(post.upvotedBy?.includes(userId) || false);
    setDownvoted(post.downvotedBy?.includes(userId) || false);
  }, [post, user]);

  useEffect(() => {
    const fetchCommunityAdmin = async () => {
      try {
        const response = await axios.get(`${SERVER_URI}/communities/${post.community?.communityName}`);
        const community = response.data.data;
        setIsAdmin(community.admin._id === userId);
      } catch (error) {
        // console.error('Error fetching community admin:', error);
      }
    };

    if (post.community?.communityName) {
      fetchCommunityAdmin();
    }
  }, [post.community, userId]);

  const handleUpvote = async () => {
    try {
      if (downvoted) {
        setDownvoted(false);
        setVoteCount(prev => prev + 1);
        await axios.post(`${SERVER_URI}/composts/${post._id}/remove-downvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (!upvoted) {
        setUpvoted(true);
        setVoteCount(prev => prev + 1);
        await axios.post(`${SERVER_URI}/composts/${post._id}/upvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        setUpvoted(false);
        setVoteCount(prev => prev - 1);
        await axios.post(`${SERVER_URI}/composts/${post._id}/remove-upvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Error upvoting:', error);
    }
  };

  const handleDownvote = async () => {
    try {
      if (upvoted) {
        setUpvoted(false);
        setVoteCount(prev => prev - 1);
        await axios.post(`${SERVER_URI}/composts/${post._id}/remove-upvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (!downvoted) {
        setDownvoted(true);
        setVoteCount(prev => prev - 1);
        await axios.post(`${SERVER_URI}/composts/${post._id}/downvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        setDownvoted(false);
        setVoteCount(prev => prev + 1);
        await axios.post(`${SERVER_URI}/composts/${post._id}/remove-downvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Error downvoting:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setIsDropdownOpen(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTitle(post.title || '');
    setEditedDescription(post.description || '');
    setEditedMedia(post.media || []);
  };

  const handleSaveEdit = () => {
    if (!editedTitle.trim()) {
      setError('Title cannot be empty');
      return;
    }
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmEdit = async () => {
    try {
      await axios.put(`${SERVER_URI}/composts/${post._id}/edit`, {
        title: editedTitle,
        description: editedDescription,
        media: editedMedia,
        isEdited: true,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setIsEditing(false);
      setIsConfirmDialogOpen(false);
      setError('');
      window.location.reload(); 
    } catch (error) {
      console.error('Error editing post:', error);
    }
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
    setIsDropdownOpen(false);
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`${SERVER_URI}/composts/posts/${post._id}/delete`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsDeleteDialogOpen(false);
      window.location.reload(); 
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handlePreviewImage = (url: string) => {
    setPreviewImage(url);
    setIsPreviewDialogOpen(true);
  };

  const handleRemoveImage = (index: number) => {
    const updatedMedia = editedMedia.filter((_, i) => i !== index);
    setEditedMedia(updatedMedia);
  };

  const createdAt = post.createdAt ? new Date(post.createdAt) : null;
  const formattedDate = createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : 'Unknown date';

  const truncateDescription = (description: string | undefined): string => {
    if (!description) return 'No description available';
    if (description.length > 200) return description.substring(0, 200) + '...';
    return description;
  };

  const isAuthor = post.author?._id === user?._id;

  const renderTextWithLinks = (text: string | undefined) => {
    if (!text) return null;
    const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
    return text.split(' ').map((part, index) => {
      if (urlPattern.test(part)) {
        return (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {part}
          </a>
        );
      }
      return <span key={index}>{part} </span>;
    });
  };


  return (
    <div className="relative flex border border-border-dark [html.light_&]:border-border-light mb-6 md:rounded-[2rem] rounded-2xl bg-surface-elevated-dark/20 [html.light_&]:bg-surface-light border-opacity-50 hover:border-border-dark [html.light_&]:hover:border-border-light transition-all group overflow-hidden shadow-xs hover:shadow-sm hover:bg-surface-elevated-dark/40 [html.light_&]:hover:bg-surface-elevated-light/40">
      {/* Left Voting Sidebar */}
      {/* Voting Sidebar - Stacked on the left */}
      <div className="flex flex-col items-center sm:py-6 py-4 px-1.5 sm:px-3 bg-black/[0.05] [html.light_&]:bg-black/[0.02] border-r border-border-dark/30 [html.light_&]:border-border-light/30 sm:min-w-[56px] min-w-[42px] gap-1 shrink-0">
        <button 
          onClick={(e) => { e.stopPropagation(); handleUpvote(); }}
          className={`sm:p-2 p-1.5 rounded-xl transition-all hover:bg-danger/20 hover:text-danger active:scale-90 ${upvoted ? 'text-danger bg-danger/10 shadow-lg shadow-danger/10' : 'text-text-muted-dark opacity-60 hover:opacity-100'}`}
        >
          <ArrowUp className="sm:w-[22px] sm:h-[22px] w-[18px] h-[18px]" strokeWidth={upvoted ? 3 : 2} />
        </button>
        <div className={`sm:text-sm text-xs font-black my-0.5 tracking-tight ${upvoted ? 'text-danger' : downvoted ? 'text-primary' : 'text-text-dark [html.light_&]:text-text-light'}`}>
          {Math.max(voteCount, 0)}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); handleDownvote(); }}
          className={`sm:p-2 p-1.5 rounded-xl transition-all hover:bg-primary/20 hover:text-primary active:scale-90 ${downvoted ? 'text-primary bg-primary/10 shadow-lg shadow-danger/10' : 'text-text-muted-dark opacity-60 hover:opacity-100'}`}
        >
          <ArrowDown className="sm:w-[22px] sm:h-[22px] w-[18px] h-[18px]" strokeWidth={downvoted ? 3 : 2} />
        </button>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 min-w-0 sm:p-4 p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 flex-wrap sm:text-[12px] text-[11px] tracking-tight">
            <Link to={`/communities/c/${post.community?.communityName}`} className="text-white [html.light_&]:text-black font-black hover:text-primary transition-colors no-underline truncate max-w-[100px] sm:max-w-none">
              c/{post.community?.communityName || 'Unknown'}
            </Link>
            <span className="text-text-muted-dark opacity-40 select-none">•</span>
            <span className="text-text-muted-dark font-black uppercase tracking-tighter opacity-70 hidden xs:inline">Posted by</span>
            <Link to={`/profile/${post.author?.username}`} className="text-text-dark [html.light_&]:text-text-light font-black hover:text-primary transition-colors no-underline truncate max-w-[80px] sm:max-w-none">
               {post.author?.username || 'Unknown'}
            </Link>
            <span className="text-text-muted-dark opacity-40 select-none">•</span>
            <span className="text-text-muted-dark font-medium whitespace-nowrap opacity-60">{formattedDate}</span>
          </div>

          {(isAdmin || isAuthor) && (
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-text-light hover:bg-white/5 [html.light_&]:hover:bg-black/5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                >
                  <MoreVertical size={18} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 bg-surface-card-dark [html.light_&]:bg-white border-border-dark [html.light_&]:border-border-light shadow-2xl rounded-xl p-1">
                <button
                  className="flex items-center w-full px-3 py-2 text-xs font-bold text-text-dark [html.light_&]:text-text-light hover:bg-white/5 [html.light_&]:hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); handleEdit(); }}
                >
                  <Edit2 className="mr-2" size={14} /> Edit
                </button>
                <button
                  className="flex items-center w-full px-3 py-2 text-xs font-bold text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                >
                  <Trash2 className="mr-2" size={14} /> Delete
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="text-lg font-bold"
              placeholder="Title"
            />
            {error && <p className="text-xs text-danger">{error}</p>}
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="w-full bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light border-border-dark [html.light_&]:border-border-light border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary h-32"
              placeholder="Description"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {editedMedia.map((url, index) => (
                <div key={index} className="relative group/img aspect-video">
                  <img
                    src={url}
                    alt={`Media ${index}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    className="absolute top-1 right-1 bg-danger text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSaveEdit} disabled={!editedTitle.trim()}>Save Changes</Button>
            </div>
          </div>
        ) : (
          <div className="cursor-pointer group/content" onClick={() => navigate(`/compost/${post._id}`)}>
            <h3 className="sm:text-xl text-base font-black text-text-dark [html.light_&]:text-text-light mb-1.5 break-words leading-tight tracking-tight group-hover/content:text-primary/90 transition-colors">
              {renderTextWithLinks(post.title || 'Untitled')}
            </h3>
            <p className="sm:text-sm text-[13px] font-medium text-text-muted-dark/80 [html.light_&]:text-text-muted-light/80 line-clamp-3 leading-6 mb-4">
              {renderTextWithLinks(truncateDescription(post.description))}
            </p>
            
            {post.media && post.media.length > 0 && (
              <div className="relative mt-4 mb-2">
                <div 
                  className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20 transition-all no-underline" 
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.media.map((url, index) => (
                    <img 
                      key={index} 
                      src={url} 
                      alt={`Media ${index}`} 
                      className="sm:h-72 h-40 w-auto min-w-[200px] max-w-[450px] object-cover rounded-[1.25rem] border border-border-dark/40 flex-shrink-0 cursor-zoom-in active:scale-[0.98] transition-all duration-300 hover:border-primary/30" 
                      onClick={() => handlePreviewImage(url)} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 mt-2">
          <button 
            className="flex items-center gap-2.5 text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-white [html.light_&]:hover:text-primary transition-all px-4 py-2 rounded-xl bg-white/[0.03] [html.light_&]:bg-black/[0.03] hover:bg-white/[0.08] [html.light_&]:hover:bg-primary/10 border border-white/[0.03] [html.light_&]:border-black/[0.03] hover:border-white/10 [html.light_&]:hover:border-primary/20 no-underline cursor-pointer font-black uppercase tracking-widest text-[10px]"
            onClick={(e) => { e.stopPropagation(); navigate(`/compost/${post._id}`); }}
          >
            <MessageSquare size={16} />
            <span>{post.commentCount} comments</span>
          </button>

          <ShareDialog post={post as any} postType="compost">
            <button 
              className="flex items-center gap-2 text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-text-light transition-colors px-2 py-1 rounded-lg hover:bg-white/5 [html.light_&]:hover:bg-black/5 no-underline border-none bg-transparent cursor-pointer font-bold"
            >
              <Share2 size={18} />
              <span className="text-xs">Share</span>
            </button>
          </ShareDialog>
        </div>
      </div>

      {/* Image Preview Overlay */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-black/90 flex items-center justify-center">
          {previewImage && (
            <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain" />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Modals */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Changes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted-dark">Are you sure you want to save these edits?</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={() => setIsConfirmDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleConfirmEdit}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted-dark">This will permanently delete this post and all its comments. Proceed?</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button className="bg-danger hover:bg-danger/90 text-white" size="sm" onClick={handleConfirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};


export default ComPostCard;
