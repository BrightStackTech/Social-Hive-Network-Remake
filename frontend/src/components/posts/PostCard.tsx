import { useState } from 'react';
import { ThumbsUp, MessageCircle, Repeat2, Bookmark, Trash2, X, ChevronLeft, ChevronRight, Share2, Pencil } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { likePost, createRepost, savePost, deletePost as apiDeletePost, updatePost as apiUpdatePost } from '../../api/index';
import PostParticipantsDialog from '../PostParticipantsDialog';
import FollowButton from '../FollowButton';
import { type Category } from '../CategoryCard';
import { useCategory } from '../../context/CategoryContext';
import ShareDialog from '../ShareDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Button } from '../ui/Button';

export interface Post {
  _id: string;
  title: string;
  content: string;
  media: string[];
  createdBy: { _id: string; username: string; profilePicture: string; college?: string };
  likes: string[];
  comments: string[];
  reposts: string[];
  isRepost?: boolean;
  repostedPost?: Post;
  savedBy: string[];
  sharedBy?: string[];
  isEdited?: boolean;
  createdAt: string;
}

function renderContent(text: string, categories: Category[], isTitle: boolean = false) {
  if (!text) return text;
  
  const urlRegex = /https?:\/\/[^\s]+/g;
  const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+/g;
  const categoryRegex = /@@[a-zA-Z0-9_]+/g;
  const userRegex = /@[a-zA-Z0-9_]+/g;

  let parts: (string | React.ReactNode)[] = [text];

  const applyRegex = (regex: RegExp, type: 'url' | 'email' | 'category' | 'user') => {
    const newParts: (string | React.ReactNode)[] = [];
    parts.forEach(part => {
      if (typeof part !== 'string') {
        newParts.push(part);
        return;
      }

      let lastIdx = 0;
      let match;
      regex.lastIndex = 0;

      while ((match = regex.exec(part)) !== null) {
        // Special check for user regex: don't match if it's the second @ of @@
        if (type === 'user' && match.index > 0 && part[match.index - 1] === '@') {
          continue;
        }

        if (match.index > lastIdx) {
          newParts.push(part.substring(lastIdx, match.index));
        }

        const sp = match[0];
        const i = match.index;

        if (type === 'url') {
          newParts.push(
            <a key={`${type}-${i}`} href={sp} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all" onClick={(e) => e.stopPropagation()}>{sp}</a>
          );
        } else if (type === 'email') {
          newParts.push(
            <a key={`${type}-${i}`} href={`mailto:${sp}`} className="text-accent underline" onClick={(e) => e.stopPropagation()}>{sp}</a>
          );
        } else if (type === 'category') {
          const catName = sp.slice(2);
          const matchCat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
          if (matchCat) {
            newParts.push(
              <Link key={`${type}-${i}`} to={`/category/${matchCat._id}`} className={`text-accent ${isTitle ? '' : 'font-bold'} hover:underline`} onClick={(e) => e.stopPropagation()}>{sp}</Link>
            );
          } else {
            newParts.push(
              <Link key={`${type}-${i}`} to={`/search?q=${encodeURIComponent(sp)}`} className={`text-accent ${isTitle ? '' : 'font-bold'} hover:underline opacity-80`} onClick={(e) => e.stopPropagation()}>{sp}</Link>
            );
          }
        } else if (type === 'user') {
          const username = sp.slice(1);
          newParts.push(
            <Link key={`${type}-${i}`} to={`/profile/${username}`} className={`text-primary ${isTitle ? 'font-bold' : 'font-medium'} hover:underline`} onClick={(e) => e.stopPropagation()}>{sp}</Link>
          );
        }
        
        lastIdx = regex.lastIndex;
      }

      if (lastIdx < part.length) {
        newParts.push(part.substring(lastIdx));
      }
    });
    parts = newParts;
  };

  applyRegex(urlRegex, 'url');
  applyRegex(emailRegex, 'email');
  applyRegex(categoryRegex, 'category');
  applyRegex(userRegex, 'user');

  return parts;
}

interface Props {
  post: Post;
  onDeleted: () => void;
}

export default function PostCard({ post, onDeleted }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [expanded, setExpanded] = useState(false);


  const isRepost = post.isRepost && post.repostedPost;
  const effectivePost = isRepost && post.repostedPost ? post.repostedPost : post;

  // Interaction states - now mirrored to effectivePost
  const [likes, setLikes] = useState(effectivePost.likes?.length || 0);
  const [liked, setLiked] = useState(user ? (effectivePost.likes || []).includes(user._id) : false);
  const [reposts, setReposts] = useState(effectivePost.reposts?.length || 0);
  const [reposted, setReposted] = useState(user ? effectivePost.reposts?.includes(user._id) : false);
  const [isSaved, setIsSaved] = useState(user ? (effectivePost.savedBy || []).includes(user._id) : false);
  const [saveCount, setSaveCount] = useState(effectivePost.savedBy?.length || 0);
  
  const [loading, setLoading] = useState({
    like: false,
    repost: false,
    save: false,
    share: false
  });

  const [participantsModal, setParticipantsModal] = useState<{ open: boolean, type: 'likes' | 'reposts' }>({ open: false, type: 'likes' });
  const { categories } = useCategory();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(effectivePost.title);
  const [editContent, setEditContent] = useState(effectivePost.content);
  const [editMedia, setEditMedia] = useState<string[]>(effectivePost.media);
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
  const [updating, setUpdating] = useState(false);


  const CONTENT_LIMIT = 300;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiDeletePost(post._id); // Delete the own post/repost
      toast.success('Post deleted');
      onDeleted();
    } catch {
      toast.error('Failed to delete post');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return toast.error('Please login to like');
    if (loading.like) return;

    setLoading(prev => ({ ...prev, like: true }));
    try {
      // Use effectivePost._id to ensure we like the original post
      const res = await likePost({ postId: effectivePost._id });
      setLikes(res.data.likes);
      setLiked(res.data.liked);
    } catch (err) {
      toast.error('Failed to like post');
    } finally {
      setLoading(prev => ({ ...prev, like: false }));
    }
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return toast.error('Please login to repost');
    if (loading.repost) return;

    setLoading(prev => ({ ...prev, repost: true }));
    try {
      const res = await createRepost({ postId: effectivePost._id });
      setReposts(res.data.repostLength);
      setReposted(res.data.reposted);
      toast.success(res.data.reposted ? 'Post reposted' : 'Repost removed');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to repost');
    } finally {
      setLoading(prev => ({ ...prev, repost: false }));
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return toast.error('Please login to save');
    if (loading.save) return;

    setLoading(prev => ({ ...prev, save: true }));
    try {
      const res = await savePost(effectivePost._id);
      setIsSaved(res.data.isSaved);
      setSaveCount(res.data.savedBy);
      toast.success(res.data.isSaved ? 'Post saved' : 'Post unsaved');
    } catch (err) {
      toast.error('Failed to update save status');
    } finally {
      setLoading(prev => ({ ...prev, save: false }));
    }
  };


  const handleUpdate = async () => {
    if (!editTitle.trim() || !editContent.trim()) return toast.error('Title and content are required');
    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append('title', editTitle.trim());
      formData.append('content', editContent.trim());
      formData.append('existingMedia', JSON.stringify(editMedia));
      
      newMediaFiles.forEach(file => {
        formData.append('media', file);
      });

      await apiUpdatePost(post._id, formData);
      toast.success('Post updated');
      setIsEditing(false);
      // Reload or update parent state? Usually onDeleted/callback is enough or just refresh.
      // For simplicity, we can just reload for now or trust the parent.
      window.location.reload(); 
    } catch (err) {
      toast.error('Failed to update post');
    } finally {
      setUpdating(false);
    }
  };

  const isImage = (url: string) => /\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(url);

  return (
    <div className="rounded-2xl border border-border-dark [html.light_&]:border-gray-200 glass-dark [html.light_&]:bg-white [html.light_&]:shadow-sm p-4 flex flex-col gap-3 group/card hover:border-primary/30 transition-all duration-300">
      {/* Repost Indicator Header - Reference Style */}
      {isRepost && post.createdBy && (
        <div className="flex items-center gap-2 px-1 pb-2 border-b border-border-dark/50 [html.light_&]:border-gray-100 mb-1">
          <span className="text-text-muted-dark [html.light_&]:text-text-muted-light text-xs font-medium">Reposted by</span>
          <div className="flex items-center gap-1.5 bg-surface-elevated-dark/50 [html.light_&]:bg-gray-50 px-2 py-0.5 rounded-full border border-border-dark/30 [html.light_&]:border-gray-200">
            <img 
              src={post.createdBy.profilePicture || `https://ui-avatars.com/api/?name=${post.createdBy.username}&background=4361ee&color=fff&size=24`} 
              className="w-4 h-4 rounded-full border border-primary/20"
              alt="reposter"
            />
            <span className="text-xs font-semibold text-text-dark [html.light_&]:text-text-light">{post.createdBy.username}</span>
            <div className="w-[1px] h-3 bg-border-dark [html.light_&]:bg-gray-200 mx-1" />
            <span className="text-[10px] text-text-muted-dark [html.light_&]:text-text-muted-light">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      )}

      {/* Main Card Header - Original Author */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {effectivePost.createdBy ? (
            <>
              <Link to={`/profile/${effectivePost.createdBy.username}`} onClick={(e) => e.stopPropagation()}>
                <img
                  src={effectivePost.createdBy.profilePicture || `https://ui-avatars.com/api/?name=${effectivePost.createdBy.username}&background=4361ee&color=fff&size=64`}
                  alt={effectivePost.createdBy.username}
                  className="w-10 h-10 rounded-full object-cover border-2 border-primary/20 hover:border-primary transition-colors"
                />
              </Link>
              <div>
                <div className="flex items-center gap-1.5">
                  <Link 
                    to={`/profile/${effectivePost.createdBy.username}`} 
                    className="font-semibold text-sm text-text-dark [html.light_&]:text-text-light hover:text-primary transition-colors no-underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {effectivePost.createdBy.username}
                  </Link>
                  <div className="w-1 h-1 rounded-full bg-text-muted-dark [html.light_&]:bg-text-muted-light" />
                  <p className="text-[11px] text-text-muted-dark [html.light_&]:text-text-muted-light font-normal">
                    {formatDistanceToNow(new Date(effectivePost.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {effectivePost.createdBy.college && (
                  <p className="text-[10px] text-primary font-medium">{effectivePost.createdBy.college}</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-500/20 flex items-center justify-center border-2 border-slate-500/10">
                <span className="text-slate-400 text-xs">?</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-400 italic">Deleted User</span>
                <p className="text-[11px] text-text-muted-dark [html.light_&]:text-text-muted-light font-normal">
                  {formatDistanceToNow(new Date(effectivePost.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Delete/Edit buttons or Follow Button */}
        {user?._id === effectivePost.createdBy?._id ? (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditTitle(effectivePost.title);
                setEditContent(effectivePost.content);
                setEditMedia(effectivePost.media);
                setIsEditing(true);
              }}
              className="p-2 rounded-full hover:bg-primary/10 text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-primary transition cursor-pointer"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              className="p-2 rounded-full hover:bg-red-500/10 text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-red-400 transition cursor-pointer"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ) : effectivePost.createdBy ? (
          <div className="flex items-center gap-2 scale-75 origin-right">
            <FollowButton 
              userIdToFollow={effectivePost.createdBy._id} 
              callback={() => window.location.reload()} 
            />
          </div>
        ) : null}
      </div>

      {/* Title */}
      {isEditing ? (
        <input 
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full bg-surface-elevated-dark/50 [html.light_&]:bg-gray-50 border border-border-dark [html.light_&]:border-gray-200 rounded-lg p-2 text-[15px] font-bold text-text-dark [html.light_&]:text-text-light focus:outline-none focus:border-primary/50"
          placeholder="Post title"
        />
      ) : (
        <h3 className="font-display font-bold text-text-dark [html.light_&]:text-text-light text-[20px] px-1 leading-tight">
          {renderContent(effectivePost.title, categories, true)}
          {effectivePost.isEdited && (
            <span className="text-[11px] font-normal text-text-muted-dark/50 [html.light_&]:text-text-muted-light/50 italic ml-2 select-none align-middle">
              (edited)
            </span>
          )}
        </h3>
      )}

      {/* Content */}
      <div className="text-[16px] text-text-muted-dark [html.light_&]:text-text-muted-light leading-relaxed whitespace-pre-wrap break-words px-1">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full bg-surface-elevated-dark/50 [html.light_&]:bg-gray-50 border border-border-dark [html.light_&]:border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50 min-h-[100px]"
            placeholder="What's on your mind?"
          />
        ) : (
          expanded || (effectivePost.content?.length || 0) <= CONTENT_LIMIT
            ? renderContent(effectivePost.content || '', categories)
            : [...renderContent((effectivePost.content || '').slice(0, CONTENT_LIMIT), categories), '...']
        )}
      </div>

      {isEditing && (
        <div className="flex flex-col gap-2 mt-2">
          {/* Media preview in edit mode */}
          <div className="flex flex-wrap gap-2">
            {editMedia.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border-dark">
                <img src={url} className="w-full h-full object-cover" />
                <button 
                  onClick={() => setEditMedia(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-bl-lg"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {newMediaFiles.map((file, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-primary/30">
                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover opacity-70" />
                <button 
                  onClick={() => setNewMediaFiles(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-bl-lg"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border-dark hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors">
              <span className="text-xl text-text-muted-dark">+</span>
              <input 
                type="file" 
                multiple 
                hidden 
                onChange={(e) => {
                  if (e.target.files) {
                    setNewMediaFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }
                }} 
              />
            </label>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button 
              onClick={handleUpdate}
              disabled={updating}
              className="px-4 py-1.5 bg-primary text-white rounded-full text-xs font-bold hover:bg-primary-light transition disabled:opacity-50"
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              className="px-4 py-1.5 bg-white/5 text-text-muted-dark rounded-full text-xs font-bold hover:bg-white/10 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {(post.content?.length || 0) > CONTENT_LIMIT && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline text-left cursor-pointer w-fit"
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      )}

      {/* Media carousel */}
      {(post.media?.length || 0) > 0 && (
        <div className="relative rounded-xl overflow-hidden bg-black/20 [html.light_&]:bg-gray-100 border border-border-dark [html.light_&]:border-gray-200">
          {isImage(post.media[mediaIndex]) ? (
            <img
              src={post.media[mediaIndex]}
              alt="post media"
              className="w-full max-h-[450px] object-contain cursor-pointer"
              onClick={() => setLightbox(true)}
            />
          ) : (
            <video
              src={post.media[mediaIndex]}
              controls
              controlsList="nodownload"
              className="w-full max-h-[450px] object-contain"
            />
          )}
          {(post.media?.length || 0) > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMediaIndex((prev) => (prev - 1 + (post.media?.length || 0)) % (post.media?.length || 0));
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/70 transition"
              >
                <ChevronLeft size={16} className="text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMediaIndex((prev) => (prev + 1) % (post.media?.length || 0));
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/70 transition"
              >
                <ChevronRight size={16} className="text-white" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {post.media?.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMediaIndex(i);
                    }}
                    className={`w-1.5 h-1.5 rounded-full transition cursor-pointer ${i === mediaIndex ? 'bg-primary w-3' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between pt-1 border-t border-border-dark [html.light_&]:border-gray-100 mt-2 text-text-muted-dark [html.light_&]:text-text-muted-light">
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-start gap-1">
            <button 
              onClick={handleLike}
              disabled={loading.like}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer group/btn
                ${liked ? 'text-danger' : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-danger'}`}
            >
              <div className={`p-2 rounded-full transition-colors ${liked ? 'bg-danger/10' : 'group-hover/btn:bg-danger/10'}`}>
                <ThumbsUp size={20} fill={liked ? 'currentColor' : 'none'} className={loading.like ? 'animate-pulse' : ''} />
              </div>
              <span className="text-xs font-medium">{likes}</span>
            </button>
            {user?._id === effectivePost.createdBy?._id && (
              <button 
                onClick={(e) => { e.stopPropagation(); setParticipantsModal({ open: true, type: 'likes' }); }}
                className="text-[10px] text-primary hover:underline font-medium -mt-1 ml-1 cursor-pointer"
              >
                See Liked Users
              </button>
            )}
          </div>

          <div className="flex flex-col items-start gap-1">
            <button 
              onClick={() => navigate(`/post/${effectivePost._id}`)}
              className="flex items-center gap-1.5 text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-primary transition-colors cursor-pointer group/btn"
            >
              <div className="p-2 rounded-full group-hover/btn:bg-primary/10">
                <MessageCircle size={20} />
              </div>
              <span className="text-xs font-medium">{effectivePost.comments?.length || 0}</span>
            </button>
          </div>

          <div className="flex flex-col items-start gap-1">
            <button 
              onClick={handleRepost}
              disabled={loading.repost}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer group/btn
                ${reposted ? 'text-success' : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-success'}`}
            >
              <div className={`p-2 rounded-full transition-colors ${reposted ? 'bg-success/10' : 'group-hover/btn:bg-success/10'}`}>
                <Repeat2 size={20} className={loading.repost ? 'animate-spin' : ''} />
              </div>
              <span className="text-xs font-medium">{reposts}</span>
            </button>
            {user?._id === effectivePost.createdBy?._id && (
              <button 
                onClick={(e) => { e.stopPropagation(); setParticipantsModal({ open: true, type: 'reposts' }); }}
                className="text-[10px] text-primary hover:underline font-medium -mt-1 ml-1 cursor-pointer"
              >
                See Reposted Users
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleSave}
            disabled={loading.save}
            className={`flex items-center gap-1.5 p-2 rounded-full transition-colors cursor-pointer
              ${isSaved ? 'text-accent bg-accent/10' : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-accent hover:bg-accent/10'}`}
          >
            <Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} />
            <span className="text-xs font-medium">{saveCount}</span>
          </button>

          <ShareDialog post={effectivePost} postType="post">
            <button 
              className="p-2 rounded-full text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <Share2 size={20} />
            </button>
          </ShareDialog>
        </div>
      </div>


      {/* Lightbox */}
      {lightbox && isImage(post.media[mediaIndex]) && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setLightbox(false)}
        >
          <img
            src={post.media[mediaIndex]}
            alt="full"
            className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>
      )}
      {/* Participant Dialog */}
      <PostParticipantsDialog
        open={participantsModal.open}
        onClose={() => setParticipantsModal({ ...participantsModal, open: false })}
        type={participantsModal.type}
        postId={effectivePost._id}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted-dark py-4">
            Are you sure you want to delete this post? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}