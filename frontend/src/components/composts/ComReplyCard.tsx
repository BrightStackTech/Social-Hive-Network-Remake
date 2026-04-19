import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUp, ArrowDown, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '../ui/Dialog';
import { Link } from 'react-router-dom';

export interface ComReply {
  _id: string;
  replyBody?: string;
  createdAt?: string;
  repliedBy?: {
    _id: string;
    username?: string;
  };
  upvotedBy?: string[];
  downvotedBy?: string[];
  pointsCount?: number;
  comment?: {
    community?: {
      communityName?: string;
    };
  };
  isEdited?: boolean;
  replies?: ComReply[];
  commentId?: string;
  parentId?: string;
  community?: any;
  post?: any;
}

const ComReplyCard = ({ reply }: { reply: ComReply }) => {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const userId = user?._id ?? '';
  const [upvoted, setUpvoted] = useState(reply.upvotedBy?.includes(userId) || false);
  const [downvoted, setDownvoted] = useState(reply.downvotedBy?.includes(userId) || false);
  const [voteCount, setVoteCount] = useState(reply.pointsCount || 0);
  const [isAdmin, setIsAdmin] = useState(false); 
  const [isEditing, setIsEditing] = useState(false);
  const [editedReplyBody, setEditedReplyBody] = useState(reply.replyBody || '');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isAuthor = reply?.repliedBy?._id === user?._id;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState('');
  const [replyVisible, setReplyVisible] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replies, setReplies] = useState<ComReply[]>(reply.replies || []);
  const [repliesVisible, setRepliesVisible] = useState(true);
  const [isPostingReply, setIsPostingReply] = useState(false);

  const SERVER_URI = `${import.meta.env.VITE_SERVER_URL}/api/v1`;

  useEffect(() => {
    setUpvoted(reply.upvotedBy?.includes(userId) || false);
    setDownvoted(reply.downvotedBy?.includes(userId) || false);
    setVoteCount(reply.pointsCount || 0);
  }, [reply, userId]);

  useEffect(() => {
    const fetchCommunityAdmin = async () => {
      try {
        const response = await axios.get(`${SERVER_URI}/communities/${reply.comment?.community?.communityName}`);
        const community = response.data.data;
        setIsAdmin(community.admin._id === userId);
      } catch (error) {
        // console.error('Error fetching community admin:', error);
      }
    };

    if (reply.comment?.community?.communityName) {
      fetchCommunityAdmin();
    }
  }, [reply.comment?.community?.communityName, userId]);

  useEffect(() => {
    const fetchSubReplies = async () => {
      try {
        const response = await axios.get(`${SERVER_URI}/composts/replies/${reply._id}/replies`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReplies(response.data);
      } catch (error) {
        // Silent error for optional nesting
      }
    };

    if (reply._id) {
       fetchSubReplies();
    }
  }, [reply._id, token]);

  const handleReplyClick = () => {
    setReplyVisible(!replyVisible);
  };

  const handlePostSubReply = async () => {
    if (!replyContent.trim()) return;
    setIsPostingReply(true);
    try {
      // Find the root comment ID accurately
      const rootCommentId = reply.commentId || (reply as any).comment?._id || (reply as any).comment;
      
      const response = await axios.post(
        `${SERVER_URI}/composts/comments/${rootCommentId}/replies`,
        { 
          replyBody: replyContent,
          parentId: reply._id, // This marks it as a nested reply
          communityId: (reply as any).community?._id || (reply as any).community,
          postId: (reply as any).post?._id || (reply as any).post
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReplies([...replies, response.data]);
      setReplyVisible(false);
      setReplyContent('');
      setRepliesVisible(true);
    } catch (error) {
      console.error('Error posting sub-reply:', error);
    } finally {
      setIsPostingReply(false);
    }
  };

  const handleUpvoteReply = async () => {
    try {
      if (downvoted) {
        setDownvoted(false);
        setVoteCount(voteCount + 1);
        await axios.post(`${SERVER_URI}/composts/replies/${reply._id}/remove-downvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (!upvoted) {
        setUpvoted(true);
        setVoteCount(voteCount + 1);
        await axios.post(`${SERVER_URI}/composts/replies/${reply._id}/upvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        setUpvoted(false);
        setVoteCount(voteCount - 1);
        await axios.post(`${SERVER_URI}/composts/replies/${reply._id}/remove-upvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Error upvoting reply:', error);
    }
  };

  const handleDownvoteReply = async () => {
    try {
      if (upvoted) {
        setUpvoted(false);
        setVoteCount(voteCount - 1);
        await axios.post(`${SERVER_URI}/composts/replies/${reply._id}/remove-upvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (!downvoted) {
        setDownvoted(true);
        setVoteCount(voteCount - 1);
        await axios.post(`${SERVER_URI}/composts/replies/${reply._id}/downvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        setDownvoted(false);
        setVoteCount(voteCount + 1);
        await axios.post(`${SERVER_URI}/composts/replies/${reply._id}/remove-downvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Error downvoting reply:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setIsDropdownOpen(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedReplyBody(reply.replyBody || '');
    setError('');
  };

  const handleSaveEdit = () => {
    if (!editedReplyBody.trim()) {
      setError('Reply body cannot be empty');
      return;
    }
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmEdit = async () => {
    try {
      await axios.put(`${SERVER_URI}/composts/replies/${reply._id}/edit`, {
        replyBody: editedReplyBody,
        isEdited: true,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setIsEditing(false);
      setIsConfirmDialogOpen(false);
      setError('');
      window.location.reload(); 
    } catch (error) {
      console.error('Error editing reply:', error);
    }
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
    setIsDropdownOpen(false);
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`${SERVER_URI}/composts/replies/${reply._id}/delete`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsDeleteDialogOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  };

  const createdAt = reply?.createdAt ? new Date(reply.createdAt) : null;
  const formattedDate = createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : 'Unknown date';

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
    <div className="relative flex border border-border-dark [html.light_&]:border-border-light rounded-xl bg-surface-elevated-dark/10 [html.light_&]:bg-surface-light/50 group">
      {/* Left Voting Slider */}
      <div className="flex flex-col items-center py-4 px-1 bg-black/[0.01] [html.light_&]:bg-gray-100/30 border-r border-border-dark [html.light_&]:border-border-light min-w-[32px] rounded-l-xl">
        <button 
          onClick={(e) => { e.stopPropagation(); handleUpvoteReply(); }}
          className={`p-1 rounded-lg transition-all hover:bg-danger/10 hover:text-danger ${upvoted ? 'text-danger' : 'text-text-muted-dark [html.light_&]:text-text-muted-light'}`}
        >
          <ArrowUp size={14} strokeWidth={upvoted ? 3 : 2} />
        </button>
        <div className={`text-[9px] font-black my-0.5 ${upvoted ? 'text-danger' : downvoted ? 'text-primary' : 'text-text-dark [html.light_&]:text-text-light'}`}>
          {Math.max(voteCount, 0)}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); handleDownvoteReply(); }}
          className={`p-1 rounded-lg transition-all hover:bg-primary/10 hover:text-primary ${downvoted ? 'text-primary' : 'text-text-muted-dark [html.light_&]:text-text-muted-light'}`}
        >
          <ArrowDown size={14} strokeWidth={downvoted ? 3 : 2} />
        </button>
      </div>

      <div className="flex-1 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Link to={`/profile/${reply?.repliedBy?.username}`} className="text-[10px] font-black text-secondary no-underline hover:underline">
              {reply?.repliedBy?.username || 'Unknown'}
            </Link>
            <span className="text-[10px] text-text-muted-dark [html.light_&]:text-text-muted-light">•</span>
            <span className="text-[10px] text-text-muted-dark [html.light_&]:text-text-muted-light font-medium">{formattedDate}</span>
          </div>

          {(isAuthor || isAdmin) && (
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-lg text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-text-light hover:bg-white/5 [html.light_&]:hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                  <MoreVertical size={12} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 bg-surface-card-dark [html.light_&]:bg-surface-card-light border-border-dark [html.light_&]:border-border-light p-1 rounded-xl">
                <button
                  className="flex items-center w-full px-3 py-2 text-[10px] font-black uppercase text-text-dark [html.light_&]:text-text-light hover:bg-white/5 [html.light_&]:hover:bg-gray-50 rounded-lg"
                  onClick={handleEdit}
                >
                  <Edit2 className="mr-2" size={12} /> Edit
                </button>
                <button
                  className="flex items-center w-full px-3 py-2 text-[10px] font-black uppercase  text-danger hover:bg-danger/10 rounded-lg"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2" size={12} /> Delete
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editedReplyBody}
              onChange={(e) => setEditedReplyBody(e.target.value)}
              className="w-full bg-surface-elevated-dark [html.light_&]:bg-white border border-border-dark [html.light_&]:border-border-light rounded-xl p-3 text-xs font-medium text-text-dark [html.light_&]:text-text-light focus:outline-none focus:ring-1 focus:ring-primary h-20"
              autoFocus
            />
            {error && <p className="text-[10px] text-danger font-bold uppercase">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" className="h-7 text-[9px] font-black uppercase" onClick={handleCancelEdit}>Cancel</Button>
              <Button variant="primary" className="h-7 text-[9px] font-black uppercase" onClick={handleSaveEdit} disabled={!editedReplyBody.trim()}>Save</Button>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-text-dark [html.light_&]:text-text-light font-medium leading-relaxed">
            {renderTextWithLinks(reply?.replyBody)}
            {reply.isEdited && <span className="text-[9px] text-text-muted-dark italic opacity-40 ml-2">(edited)</span>}
          </div>
        )}

        <div className="mt-2 flex items-center gap-4">
           <button 
             onClick={() => setRepliesVisible(!repliesVisible)}
             className="text-[9px] font-black uppercase text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-text-light transition-colors"
           >
             {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
           </button>
           <button 
             onClick={handleReplyClick}
             className="text-[9px] font-black uppercase text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-primary transition-colors"
           >
             Reply
           </button>
        </div>

        {replyVisible && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={`Replying to @${reply.repliedBy?.username}...`}
              className="w-full bg-surface-elevated-dark [html.light_&]:bg-white border border-border-dark [html.light_&]:border-border-light rounded-xl p-3 text-[11px] font-medium text-text-dark [html.light_&]:text-text-light focus:outline-none focus:ring-1 focus:ring-primary h-20 mb-2"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" className="h-7 text-[9px] font-black uppercase" onClick={() => setReplyVisible(false)}>Cancel</Button>
              <Button variant="primary" className="h-7 text-[9px] font-black uppercase" onClick={handlePostSubReply} disabled={!replyContent.trim() || isPostingReply}>
                {isPostingReply ? 'Posting...' : 'Post Reply'}
              </Button>
            </div>
          </div>
        )}

        {repliesVisible && replies.length > 0 && (
          <div className="mt-4 space-y-4 border-l-2 border-border-dark/30 [html.light_&]:border-gray-200 ml-1 pl-4">
            {replies.map((subReply) => (
              <ComReplyCard key={subReply._id} reply={{
                ...subReply,
                commentId: reply.commentId || (reply as any).comment?._id || (reply as any).comment,
                community: (reply as any).community,
                post: (reply as any).post
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialogs */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Edit</DialogTitle>
          </DialogHeader>
          <p className="text-xs font-bold text-text-muted-dark uppercase ">Update this reply?</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" className="font-black uppercase text-[10px]" onClick={() => setIsConfirmDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" className="font-black uppercase text-[10px]" onClick={handleConfirmEdit}>Update</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Reply</DialogTitle>
          </DialogHeader>
          <p className="text-xs font-bold text-text-muted-dark uppercase  text-danger">Delete this reply permanently?</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" className="font-black uppercase text-[10px]" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button className="bg-danger hover:bg-danger/90 text-white font-black uppercase text-[10px]" size="sm" onClick={handleConfirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComReplyCard;
