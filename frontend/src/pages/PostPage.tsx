import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ThumbsUp, MessageCircle, Repeat2, Bookmark, Share2, Send, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { getPost, getCommentsByPost, addComment, deleteComment, likePost, createRepost, savePost, likeComment as apiLikeComment } from '../api/index';
import { useAuth } from '../context/AuthContext';
import PostSkeletonLoader from '../components/posts/PostSkeletonLoader';
import FollowButton from '../components/FollowButton';

function renderContent(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g;
  const mentionRegex = /(@[a-zA-Z0-9_]+)/g;

  let parts: (string | React.ReactNode)[] = [text];

  const applyRegex = (regex: RegExp, type: 'url' | 'email' | 'mention') => {
    const newParts: (string | React.ReactNode)[] = [];
    parts.forEach(part => {
      if (typeof part !== 'string') {
        newParts.push(part);
        return;
      }
      const splitParts = part.split(regex);
      splitParts.forEach((sp, i) => {
        if (sp.match(regex)) {
          if (type === 'url') {
            newParts.push(
              <a key={`${type}-${i}`} href={sp} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all" onClick={(e) => e.stopPropagation()}>{sp}</a>
            );
          } else if (type === 'email') {
            newParts.push(
              <a key={`${type}-${i}`} href={`mailto:${sp}`} className="text-accent underline" onClick={(e) => e.stopPropagation()}>{sp}</a>
            );
          } else if (type === 'mention') {
            newParts.push(
              <Link key={`${type}-${i}`} to={`/profile/${sp.slice(1)}`} className="text-primary font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>{sp}</Link>
            );
          }
        } else if (sp !== '') {
          newParts.push(sp);
        }
      });
    });
    parts = newParts;
  };

  applyRegex(urlRegex, 'url');
  applyRegex(emailRegex, 'email');
  applyRegex(mentionRegex, 'mention');

  return parts;
}

const isImage = (url: string) => /\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(url);

export default function PostPage() {
  const { postId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);

  // Interaction states
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [reposts, setReposts] = useState(0);
  const [reposted, setReposted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!postId) return;
      setLoading(true);
      try {
        const postRes = await getPost(postId);
        const commentsRes = await getCommentsByPost(postId);
        
        const postData = postRes.data.post;
        setPost(postData);
        setComments(commentsRes.data.data);
        
        // Init states
        setLikes(postData.likes.length);
        setLiked(user ? postData.likes.includes(user._id) : false);
        setReposts(postData.reposts?.length || 0);
        setReposted(user ? postData.reposts?.includes(user._id) : false);
        setIsSaved(user ? postData.savedBy?.includes(user._id) : false);

      } catch (err) {
        toast.error('Failed to load post');
        navigate('/explore');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [postId, user, navigate]);

  const handleLike = async () => {
    if (!user) return toast.error('Please login to like');
    try {
      const res = await likePost({ postId: post._id });
      setLikes(res.data.likes);
      setLiked(res.data.liked);
    } catch (err) {
      toast.error('Failed to update like');
    }
  };

  const handleRepost = async () => {
    if (!user) return toast.error('Please login to repost');
    try {
      const res = await createRepost({ postId: post._id });
      setReposts(res.data.repostLength);
      setReposted(true);
      toast.success('Post reposted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to repost');
    }
  };

  const handleSave = async () => {
    if (!user) return toast.error('Please login to save');
    try {
      const res = await savePost(post._id);
      setIsSaved(res.data.isSaved);
      toast.success(res.data.isSaved ? 'Post saved' : 'Post unsaved');
    } catch (err) {
      toast.error('Failed to update save status');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) return toast.error('Please login to comment');

    setCommentLoading(true);
    try {
      await addComment(post._id, newComment.trim(), replyTo?.id);
      
      // If it's a reply, we can just reload all comments to ensure correct tree/sorting
      // or manually insert. Reloading is safer for correct ordering.
      const commentsRes = await getCommentsByPost(post._id);
      setComments(commentsRes.data.data);
      
      setNewComment('');
      setReplyTo(null);
      toast.success(replyTo ? 'Reply added' : 'Comment added');
    } catch (err) {
      toast.error('Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return toast.error('Please login to like');
    try {
      const res = await apiLikeComment(commentId);
      // Update the comment in the local state
      setComments(prev => prev.map(c => 
        c._id === commentId 
          ? { ...c, likeCount: res.data.data.likeCount, isLiked: res.data.data.isLiked } 
          : c
      ));
    } catch (err) {
      toast.error('Failed to like comment');
    }
  };

  const buildCommentTree = (flatComments: any[]) => {
    const map: { [key: string]: any } = {};
    const roots: any[] = [];
    
    flatComments.forEach(c => {
      map[c._id] = { ...c, replies: [] };
    });
    
    flatComments.forEach(c => {
      if (c.parentId && map[c.parentId]) {
        map[c.parentId].replies.push(map[c._id]);
      } else {
        roots.push(map[c._id]);
      }
    });

    // Sort by likes primarily, then date
    const sortFn = (a: any, b: any) => {
      if ((b.likeCount || 0) !== (a.likeCount || 0)) {
        return (b.likeCount || 0) - (a.likeCount || 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    };

    const sortRecursive = (node: any) => {
      node.replies.sort(sortFn);
      node.replies.forEach(sortRecursive);
    };

    roots.sort(sortFn);
    roots.forEach(sortRecursive);
    
    return roots;
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
      toast.success('Comment deleted');
    } catch (err) {
      toast.error('Failed to delete comment');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <PostSkeletonLoader />
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen relative flex flex-col">
      <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col gap-6 w-full pb-32">
        <div className="rounded-2xl border border-border-dark [html.light_&]:border-gray-200 glass-dark [html.light_&]:bg-white [html.light_&]:shadow-sm p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/profile/${post.createdBy.username}`}>
              <img
                src={post.createdBy.profilePicture || `https://ui-avatars.com/api/?name=${post.createdBy.username}&background=4361ee&color=fff&size=64`}
                alt={post.createdBy.username}
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/20 hover:border-primary transition-colors"
              />
            </Link>
            <div>
              <Link to={`/profile/${post.createdBy.username}`} className="font-bold text-base text-text-dark [html.light_&]:text-text-light hover:text-primary transition-colors">
                {post.createdBy.username}
              </Link>
              <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <FollowButton 
              userIdToFollow={post.createdBy._id} 
          />
        </div>

        {/* Post Title & Content */}
        <h1 className="text-xl font-display font-bold text-text-dark [html.light_&]:text-text-light">
          {post.title}
        </h1>
        <div className="text-[15px] text-text-muted-dark [html.light_&]:text-text-muted-light leading-relaxed whitespace-pre-wrap break-words">
          {renderContent(post.content)}
        </div>

        {/* Media */}
        {post.media.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden bg-black/20 [html.light_&]:bg-gray-100 border border-border-dark [html.light_&]:border-gray-200 max-h-[600px]">
            {isImage(post.media[mediaIndex]) ? (
              <img
                src={post.media[mediaIndex]}
                alt="post media"
                className="w-full h-full object-contain cursor-pointer"
              />
            ) : (
              <video
                src={post.media[mediaIndex]}
                controls
                controlsList="nodownload"
                className="w-full h-full object-contain bg-black"
              />
            )}
            {post.media.length > 1 && (
              <>
                <button
                  onClick={() => setMediaIndex((prev) => (prev - 1 + post.media.length) % post.media.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-black/70 transition"
                >
                  <ChevronLeft size={20} className="text-white" />
                </button>
                <button
                  onClick={() => setMediaIndex((prev) => (prev + 1) % post.media.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-black/70 transition"
                >
                  <ChevronRight size={20} className="text-white" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Stats & Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border-dark [html.light_&]:border-gray-100 mt-2">
            <div className="flex items-center gap-8">
              <button 
                onClick={handleLike}
                className={`flex items-center gap-2 transition-colors cursor-pointer group/btn
                  ${liked ? 'text-danger' : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-danger'}`}
              >
                <div className={`p-2.5 rounded-full transition-colors ${liked ? 'bg-danger/10' : 'group-hover/btn:bg-danger/10'}`}>
                  <ThumbsUp size={22} fill={liked ? 'currentColor' : 'none'} />
                </div>
                <span className="text-sm font-bold">{likes}</span>
              </button>

              <button className="flex items-center gap-2 text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-primary transition-colors cursor-pointer group/btn">
                <div className="p-2.5 rounded-full group-hover/btn:bg-primary/10">
                  <MessageCircle size={22} />
                </div>
                <span className="text-sm font-bold">{comments.length}</span>
              </button>

              <button 
                onClick={handleRepost}
                className={`flex items-center gap-2 transition-colors cursor-pointer group/btn
                  ${reposted ? 'text-success' : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-success'}`}
              >
                <div className={`p-2.5 rounded-full transition-colors ${reposted ? 'bg-success/10' : 'group-hover/btn:bg-success/10'}`}>
                  <Repeat2 size={22} />
                </div>
                <span className="text-sm font-bold">{reposts}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleSave}
                className={`p-2.5 rounded-full transition-colors cursor-pointer
                  ${isSaved ? 'text-accent bg-accent/10' : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-accent hover:bg-accent/10'}`}
              >
                <Bookmark size={22} fill={isSaved ? 'currentColor' : 'none'} />
              </button>
              <button className="p-2.5 rounded-full text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer">
                <Share2 size={22} />
              </button>
            </div>
        </div>
      </div>

      {/* Comments List Section */}
      <div className="max-w-4xl mx-auto w-full mb-32">
        <div className="rounded-2xl border border-border-dark [html.light_&]:border-gray-200 glass-dark [html.light_&]:bg-white [html.light_&]:shadow-sm p-6">
          <h2 className="text-lg font-bold text-text-dark [html.light_&]:text-text-light mb-6 flex items-center gap-2">
              Comments
              <span className="text-sm font-normal text-text-muted-dark">{comments.length}</span>
          </h2>
          
          {/* Comments List */}
          <div className="flex flex-col gap-6">
              {buildCommentTree(comments).map((c) => (
                  <CommentItem 
                    key={c._id} 
                    comment={c} 
                    user={user} 
                    onDelete={handleDeleteComment} 
                    onLike={handleLikeComment}
                    onReply={(id: string, username: string) => {
                      setReplyTo({ id, username });
                      // Scroll to input?
                      const input = document.querySelector('textarea');
                      input?.focus();
                    }}
                    level={0}
                  />
              ))}
              {comments.length === 0 && (
                  <div className="py-10 text-center">
                      <p className="text-sm text-text-muted-dark italic">No comments yet. Be the first to join the conversation!</p>
                  </div>
              )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Comment Bar */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 xl:right-[320px] z-50 bg-surface-dark/95 backdrop-blur-md border-t border-border-dark [html.light_&]:bg-white [html.light_&]:border-gray-200">
        <div className="max-w-4xl mx-auto px-4">
          {replyTo && (
            <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-primary/10">
              <p className="text-[11px] text-primary">
                Replying to <span className="font-bold">@{replyTo.username}</span>
              </p>
              <button onClick={() => setReplyTo(null)} className="text-text-muted-dark hover:text-text-dark">
                <X size={14} />
              </button>
            </div>
          )}
          <form 
            onSubmit={handleAddComment} 
            className="flex gap-3 py-4 w-full items-start"
          >
              <img
                  src={user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.username || 'G'}&background=4361ee&color=fff&size=64`}
                  alt="user"
                  className="w-10 h-10 rounded-full object-cover shrink-0 mt-1"
              />
              <div className="flex-1 flex gap-2">
                  <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={replyTo ? "Write your reply..." : "Add a comment..."}
                      className="flex-1 bg-surface-elevated-dark/50 [html.light_&]:bg-gray-50 border border-border-dark [html.light_&]:border-gray-200 rounded-xl text-sm text-text-dark [html.light_&]:text-text-light placeholder:text-text-muted-dark focus:outline-none focus:border-primary/50 transition-all max-h-[120px] resize-none overflow-y-auto p-2"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment(e);
                        }
                      }}
                  />
                  <button
                      type="submit"
                      disabled={commentLoading || !newComment.trim()}
                      className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 flex items-center justify-center shrink-0"
                  >
                  {commentLoading ? '...' : <Send size={18} />}
                  </button>
              </div>
          </form>
        </div>
      </div>
    </div>
  </div>
  );
}

// ── Recursive Comment Component ─────────────────────────────
function CommentItem({ comment, user, onDelete, onLike, onReply, level }: any) {
  const isAuthor = user?._id === comment.user._id;
  
  return (
    <div className={`flex flex-col gap-2 ${level > 0 ? 'ml-6 border-l border-white/5 [html.light_&]:border-gray-100 pl-4' : ''}`}>
      <div className="group/comment flex gap-3 pb-4">
        <Link to={`/profile/${comment.user.username}`} className="shrink-0">
          <img
            src={comment.user.profilePicture || `https://ui-avatars.com/api/?name=${comment.user.username}&background=4361ee&color=fff&size=64`}
            alt={comment.user.username}
            className="w-8 h-8 rounded-full object-cover"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Link to={`/profile/${comment.user.username}`} className="font-bold text-xs text-text-dark [html.light_&]:text-text-light hover:text-primary transition-colors">
                {comment.user.username}
              </Link>
              <span className="text-[10px] text-text-muted-dark [html.light_&]:text-text-muted-light">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>
            {isAuthor && (
              <button 
                onClick={() => onDelete(comment._id)}
                className="p-1 px-2 text-[10px] font-bold bg-danger/10 text-danger rounded opacity-0 group-hover/comment:opacity-100 transition-opacity hover:bg-danger hover:text-white"
              >
                Delete
              </button>
            )}
          </div>
          <p className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light leading-relaxed mb-2">
            {comment.comment}
          </p>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onLike(comment._id)}
              className={`flex items-center gap-1 text-[11px] font-bold transition-colors ${comment.isLiked ? 'text-danger' : 'text-text-muted-dark hover:text-danger'}`}
            >
              <ThumbsUp size={14} fill={comment.isLiked ? 'currentColor' : 'none'} />
              {comment.likeCount || 0}
            </button>
            <button 
              onClick={() => onReply(comment._id, comment.user.username)}
              className="text-[11px] font-bold text-text-muted-dark hover:text-primary transition-colors"
            >
              Reply
            </button>
          </div>
        </div>
      </div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="flex flex-col gap-4">
          {comment.replies.map((reply: any) => (
            <CommentItem 
              key={reply._id} 
              comment={reply} 
              user={user} 
              onDelete={onDelete} 
              onLike={onLike}
              onReply={onReply}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
