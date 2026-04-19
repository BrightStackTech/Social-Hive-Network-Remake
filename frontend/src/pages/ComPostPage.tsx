import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ComPostCard from '../components/composts/ComPostCard';
import ComCommentCard from '../components/composts/ComCommentCard';
import { Loader2, ArrowLeft, Send, MessageSquare, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ComPostPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token, user } = useAuth();
    const [post, setPost] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [commentBody, setCommentBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [isRemoved, setIsRemoved] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);

    const SERVER_URI = `${import.meta.env.VITE_SERVER_URL}/api/v1`;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const postRes = await axios.get(`${SERVER_URI}/composts/${id}`);
                setPost(postRes.data);

                const comRes = await axios.get(`${SERVER_URI}/composts/${id}/comments`);
                setComments(comRes.data);

                // Check if user has joined the community of this post
                if (token && postRes.data.community?._id) {
                     const communityRes = await axios.get(`${SERVER_URI}/communities/${postRes.data.community.communityName}`);
                     const community = communityRes.data.data;
                     const userInJoined = community.joinedBy.some((m: any) => (m._id || m).toString() === user?._id?.toString());
                     const userInRemoved = community.removedMem?.some((m: any) => (m._id || m).toString() === user?._id?.toString());
                     const userInPending = community.pendingReq?.some((m: any) => (m._id || m).toString() === user?._id?.toString());
                     
                     setIsJoined(userInJoined);
                     setIsRemoved(userInRemoved);
                     setIsPending(userInPending);
                }

            } catch (err) {
                console.error(err);
                toast.error("Resource not found");
                navigate('/communities');
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchData();
    }, [id, token, user?._id]);

    const handlePostComment = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!commentBody.trim()) return;
        if (!isJoined) return toast.error("Join this community to participate!");
        
        setSubmitting(true);
        try {
            let res;
            if (replyTo) {
                // Handle Reply
                res = await axios.post(`${SERVER_URI}/composts/comments/${replyTo.id}/replies`, {
                    replyBody: commentBody
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // Find parent comment and add reply locally or just refresh
                // For simplicity and correctness with nested logic, we can refresh comments
                const comRes = await axios.get(`${SERVER_URI}/composts/${id}/comments`);
                setComments(comRes.data);
                toast.success("Replied!");
            } else {
                // Handle Root Comment
                res = await axios.post(`${SERVER_URI}/composts/${id}/comments`, {
                    commentBody,
                    communityId: post.community._id,
                    postId: post._id
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setComments([res.data, ...comments]);
                toast.success("Hived!");
            }
            
            setCommentBody('');
            setReplyTo(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to post comment");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={40} />
        </div>
    );

    if (!post) return null;

    return (
        <div className="flex flex-col h-screen overflow-y-auto scrollbar-hide py-6">
            <div className="max-w-4xl mx-auto w-full px-6 space-y-6">
                
                {/* Back Button */}
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center gap-2 text-text-muted-dark hover:text-primary transition-all font-black text-[12px] no-underline mb-2 cursor-pointer bg-transparent border-none p-0 group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    BACK
                </button>

                <ComPostCard post={post} />

                {/* Comment Section List */}
                <div className="space-y-6 pb-40">
                    <div className="flex items-center justify-between px-2 pt-4 border-t border-border-dark">
                        <h3 className="text-sm font-black text-text-muted-dark  uppercase flex items-center gap-2">
                             <MessageSquare size={16} />
                             RESPONSES ({comments.length})
                        </h3>
                    </div>

                    {comments.length > 0 ? (
                        <div className="space-y-4 pt-2">
                            {comments.map(c => (
                                <ComCommentCard 
                                    key={c._id} 
                                    comment={{...c, community: post.community}} 
                                    onReply={(id, username) => {
                                        setReplyTo({ id, username });
                                        commentInputRef.current?.focus();
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 space-y-2">
                            <MessageSquare size={32} className="text-text-muted-dark opacity-20 mx-auto" />
                            <p className="text-sm text-text-muted-dark italic">No responses yet. Start the buzz!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Bottom Comment Bar or Warning */}
            <div className="fixed bottom-0 left-0 lg:left-64 right-0 xl:right-[320px] z-50 bg-surface-dark/95 backdrop-blur-md border-t border-border-dark [html.light_&]:bg-white [html.light_&]:border-gray-200">
                <div className="max-w-4xl mx-auto px-4">
                {isRemoved || isPending ? (
                    <div className="py-6 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                        <img 
                            src={user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.username || 'G'}&background=4361ee&color=fff&size=64`} 
                            className="w-10 h-10 rounded-full border border-danger/20 grayscale opacity-80" 
                        />
                        <p className="text-[14px] font-medium text-danger/80">
                            Maybe you're being removed from the community that is associated with this post.
                        </p>
                    </div>
                ) : (
                    <>
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
                            onSubmit={handlePostComment} 
                            className="flex gap-3 py-4 w-full items-start"
                        >
                            <img
                                src={user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.username || 'G'}&background=4361ee&color=fff&size=64`}
                                alt="user"
                                className="w-10 h-10 rounded-full object-cover shrink-0 mt-1"
                            />
                            <div className="flex-1 flex gap-2">
                                <textarea
                                    ref={commentInputRef}
                                    value={commentBody}
                                    onChange={(e) => setCommentBody(e.target.value)}
                                    placeholder={isPending ? "Membership pending approval" : !isJoined ? "Join community to participate" : replyTo ? "Write your reply..." : "Add to the discussion..."}
                                    disabled={!isJoined || isPending}
                                    className="flex-1 bg-surface-elevated-dark/50 [html.light_&]:bg-gray-50 border border-border-dark [html.light_&]:border-gray-200 rounded-xl text-sm text-text-dark [html.light_&]:text-text-light placeholder:text-text-muted-dark focus:outline-none focus:border-primary/50 transition-all max-h-[120px] resize-none overflow-y-auto p-2 disabled:opacity-50"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handlePostComment();
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={submitting || !commentBody.trim() || !isJoined || isPending}
                                    className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 flex items-center justify-center shrink-0"
                                >
                                {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                </button>
                            </div>
                        </form>
                    </>
                )}
                </div>
            </div>
        </div>
    );
};

export default ComPostPage;
