import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUp, ArrowDown, MessageSquare, Reply, Edit2, Trash2, MoreVertical } from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '../ui/Dialog';
import { Button } from '../ui/Button';
import ComReplyCard from './ComReplyCard';
import { type ComReply } from './ComReplyCard';

export interface ComComment {
  _id: string;
  commentBody?: string;
  createdAt?: string;
  commentedBy?: {
    _id: string;
    username?: string;
  };
  upvotedBy?: string[];
  downvotedBy?: string[];
  pointsCount?: number;
  replies?: string[];
  community?: {
    communityName?: string;
    admin?: string;
    removedMem?: { _id: string }[];
    pendingReq?: { _id: string }[];
  };
  isEdited?: boolean;
}

const ComCommentCard = ({ comment, onReply }: { comment: ComComment, onReply?: (id: string, username: string) => void }) => {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const userId = user?._id ?? '';
  const [upvoted, setUpvoted] = useState(comment.upvotedBy?.includes(userId) || false);
  const [downvoted, setDownvoted] = useState(comment.downvotedBy?.includes(userId) || false);
  const [voteCount, setVoteCount] = useState(comment.pointsCount || 0);
  const [replyVisible, setReplyVisible] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replies, setReplies] = useState<ComReply[]>([]);
  const [repliesVisible, setRepliesVisible] = useState(true); 
  const [isAdmin, setIsAdmin] = useState(false); 
  const [isEditing, setIsEditing] = useState(false);
  const [editedCommentBody, setEditedCommentBody] = useState(comment.commentBody || '');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isAuthor = comment?.commentedBy?._id === user?._id;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState('');

  const SERVER_URI = `${import.meta.env.VITE_SERVER_URL}/api/v1`;

  useEffect(() => {
    setUpvoted(comment.upvotedBy?.includes(userId) || false);
    setDownvoted(comment.downvotedBy?.includes(userId) || false);
    setVoteCount(comment.pointsCount || 0);
  }, [comment, userId]);

  useEffect(() => {
    const fetchReplies = async () => {
      try {
        const response = await axios.get(`${SERVER_URI}/composts/comments/${comment._id}/replies`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReplies(response.data);
      } catch (error) {
        // console.error('Error fetching replies:', error);
      }
    };

    fetchReplies();
  }, [comment._id, comment.replies, token]);

  useEffect(() => {
    const fetchCommunityAdmin = async () => {
      try {
        const response = await axios.get(`${SERVER_URI}/communities/${comment.community?.communityName}`);
        const community = response.data.data;
        setIsAdmin(community.admin._id === userId);
      } catch (error) {
        // console.error('Error fetching community admin:', error);
      }
    };

    if (comment.community?.communityName) {
      fetchCommunityAdmin();
    }
  }, [comment.community, userId]);

  const handleUpvote = async () => {
    try {
      if (downvoted) {
        setDownvoted(false);
        setVoteCount(voteCount + 1);
        await axios.post(`${SERVER_URI}/composts/comments/${comment._id}/remove-downvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (!upvoted) {
        setUpvoted(true);
        setVoteCount(voteCount + 1);
        await axios.post(`${SERVER_URI}/composts/comments/${comment._id}/upvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        setUpvoted(false);
        setVoteCount(voteCount - 1);
        await axios.post(`${SERVER_URI}/composts/comments/${comment._id}/remove-upvote`, {}, {
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
        setVoteCount(voteCount - 1);
        await axios.post(`${SERVER_URI}/composts/comments/${comment._id}/remove-upvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (!downvoted) {
        setDownvoted(true);
        setVoteCount(voteCount - 1);
        await axios.post(`${SERVER_URI}/composts/comments/${comment._id}/downvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        setDownvoted(false);
        setVoteCount(voteCount + 1);
        await axios.post(`${SERVER_URI}/composts/comments/${comment._id}/remove-downvote`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Error downvoting:', error);
    }
  };

  const handleReplyClick = () => {
    if (onReply && comment._id && comment.commentedBy?.username) {
      onReply(comment._id, comment.commentedBy.username);
    } else {
      setReplyVisible(!replyVisible);
    }
  };

  const handleCancelReply = () => {
    setReplyVisible(false);
    setReplyContent('');
  };

  const handlePostReply = async () => {
    try {
      const response = await axios.post(
        `${SERVER_URI}/composts/comments/${comment._id}/replies`,
        { replyBody: replyContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReplies([...replies, response.data]);
      setReplyVisible(false);
      setReplyContent('');
      setRepliesVisible(true);
    } catch (error) {
      console.error('Error posting reply:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setIsDropdownOpen(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedCommentBody(comment.commentBody || '');
    setError('');
  };

  const handleSaveEdit = () => {
    if (!editedCommentBody.trim()) {
      setError('Comment body cannot be empty');
      return;
    }
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmEdit = async () => {
    try {
      await axios.put(`${SERVER_URI}/composts/comments/${comment._id}/edit`, {
        commentBody: editedCommentBody,
        isEdited: true,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setIsEditing(false);
      setIsConfirmDialogOpen(false);
      setError('');
      window.location.reload(); 
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
    setIsDropdownOpen(false);
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`${SERVER_URI}/composts/comments/${comment._id}/delete`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsDeleteDialogOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleToggleReplies = () => {
    setRepliesVisible(!repliesVisible);
  };

  const createdAt = comment?.createdAt ? new Date(comment.createdAt) : null;
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

  const isRemovedOrPendingMember = comment.community?.removedMem?.some((member) => member._id?.toString() === user?._id?.toString()) || 
                                   comment.community?.pendingReq?.some((member) => member._id?.toString() === user?._id?.toString());

  return (
    <div className="relative flex border border-border-dark [html.light_&]:border-border-light mb-4 rounded-xl bg-surface-elevated-dark/10 [html.light_&]:bg-surface-light group">
      {/* Left Voting Slider */}
      <div className="flex flex-col items-center py-4 px-1.5 bg-black/[0.02] border-r border-border-dark [html.light_&]:border-border-light min-w-[36px] rounded-l-xl">
        <button 
          onClick={(e) => { e.stopPropagation(); handleUpvote(); }}
          className={`p-1 rounded-lg transition-all hover:bg-danger/10 hover:text-danger ${upvoted ? 'text-danger' : 'text-text-muted-dark'}`}
        >
          <ArrowUp size={16} strokeWidth={upvoted ? 3 : 2} />
        </button>
        <div className={`text-[10px] font-black my-0.5 ${upvoted ? 'text-danger' : downvoted ? 'text-primary' : 'text-text-dark'}`}>
          {Math.max(voteCount, 0)}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); handleDownvote(); }}
          className={`p-1 rounded-lg transition-all hover:bg-primary/10 hover:text-primary ${downvoted ? 'text-primary' : 'text-text-muted-dark'}`}
        >
          <ArrowDown size={16} strokeWidth={downvoted ? 3 : 2} />
        </button>
      </div>

      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Link to={`/profile/${comment?.commentedBy?.username}`} className="text-xs font-black text-secondary no-underline hover:underline">
              {comment?.commentedBy?.username || 'Unknown'}
            </Link>
            <span className="text-[10px] text-text-muted-dark font-bold">•</span>
            <span className="text-[10px] text-text-muted-dark font-medium">{formattedDate}</span>
            {comment.isEdited && <span className="text-[10px] text-text-muted-dark italic opacity-50">(edited)</span>}
          </div>

          {(isAuthor || isAdmin) && (
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-lg text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-text-light hover:bg-white/5 [html.light_&]:hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                  <MoreVertical size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 bg-surface-card-dark [html.light_&]:bg-white border-border-dark [html.light_&]:border-border-light p-1 rounded-xl shadow-xl">
                <button
                  className="flex items-center w-full px-3 py-2 text-[10px] font-black uppercase text-text-dark [html.light_&]:text-gray-900 hover:bg-white/5 [html.light_&]:hover:bg-gray-50 rounded-lg"
                  onClick={handleEdit}
                >
                  <Edit2 className="mr-2" size={12} /> Edit
                </button>
                <button
                  className="flex items-center w-full px-3 py-2 text-[10px] font-black uppercase text-danger hover:bg-danger/10 rounded-lg"
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
              value={editedCommentBody}
              onChange={(e) => setEditedCommentBody(e.target.value)}
              className="w-full bg-surface-elevated-dark border border-border-dark rounded-xl p-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary h-24"
              autoFocus
            />
            {error && <p className="text-[10px] text-danger font-bold uppercase">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" className="h-8 text-[10px] font-black uppercase" onClick={handleCancelEdit}>Cancel</Button>
              <Button variant="primary" className="h-8 text-[10px] font-black uppercase" onClick={handleSaveEdit} disabled={!editedCommentBody.trim()}>Save Edit</Button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-text-dark [html.light_&]:text-text-light font-medium leading-relaxed mb-3">
            {renderTextWithLinks(comment?.commentBody)}
          </div>
        )}

        <div className="flex items-center gap-4">
          <button 
            className="flex items-center gap-1.5 text-[10px] font-black uppercase text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-gray-900 transition-colors" 
            onClick={handleToggleReplies}
          >
            <MessageSquare size={14} strokeWidth={2.5} />
            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
          </button>
          {!isRemovedOrPendingMember && (
            <button 
              className="flex items-center gap-1.5 text-[10px] font-black uppercase text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark [html.light_&]:hover:text-gray-900 transition-colors" 
              onClick={handleReplyClick}
            >
              <Reply size={14} strokeWidth={2.5} />
              Reply
            </button>
          )}
        </div>

        {replyVisible && (
          <div className="mt-4 animate-in slide-in-from-top-2">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply..."
              className="w-full bg-surface-elevated-dark border border-border-dark rounded-xl p-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary h-24 mb-2"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" className="h-8 text-[10px] font-black uppercase" onClick={handleCancelReply}>Cancel</Button>
              <Button variant="primary" className="h-8 text-[10px] font-black uppercase" onClick={handlePostReply} disabled={!replyContent.trim()}>Post Reply</Button>
            </div>
          </div>
        )}

        {repliesVisible && replies.length > 0 && (
          <div className="mt-6 space-y-4 border-l-2 border-border-dark [html.light_&]:border-border-light ml-2 pl-4">
            {replies.map((reply) => (
              <ComReplyCard key={reply._id} reply={{...reply, commentId: comment._id}} />
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
          <p className="text-xs font-bold text-text-muted-dark uppercase ">Save changes to this honeyed words?</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" className="font-black uppercase text-[10px]" onClick={() => setIsConfirmDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" className="font-black uppercase text-[10px]" onClick={handleConfirmEdit}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Comment</DialogTitle>
          </DialogHeader>
          <p className="text-xs font-bold text-text-muted-dark uppercase  text-danger">This will delete the comment and all its replies permanently.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" className="font-black uppercase text-[10px]" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button className="bg-danger hover:bg-danger/90 text-white font-black uppercase text-[10px]" size="sm" onClick={handleConfirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComCommentCard;
