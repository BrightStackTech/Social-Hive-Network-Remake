import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getUpdates, deleteUpdate, incrementUpdateViewCount, getUpdateViewers } from '../api';
import { Button } from '../components/ui/Button';
import { ArrowRight, X, Eye, Trash2, Loader2, ChevronLeft, MessageCircle, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Update {
  _id: string;
  media: string;
  postedBy: {
    _id: string;
    username: string;
    profilePicture: string;
  };
  createdAt: string;
  viewCount: number;
  description: string;
}

interface Viewer {
  _id: string;
  username: string;
  profilePicture: string;
  college?: string;
}

export default function CheckUserUpdatePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [updates, setUpdates] = useState<Update[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [viewerSearchQuery, setViewerSearchQuery] = useState('');
  const [loadingViewers, setLoadingViewers] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showViewersDialog, setShowViewersDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  // Time-out and interval refs
  const timerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const fetchUpdates = async () => {
    if (!userId) return;
    try {
      const response = await getUpdates(userId);
      setUpdates(response.data.data);
    } catch (error) {
      console.error('Error fetching updates:', error);
      toast.error("Failed to load stories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, [userId]);

  const startProgress = (duration: number) => {
    // Clear existing
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setProgress(0);
    
    const intervalId = setInterval(() => {
      setProgress((prev) => {
          const next = prev + (100 / (duration / 100));
          return next >= 100 ? 100 : next;
      });
    }, 100);
    intervalRef.current = intervalId;

    const timerId = setTimeout(() => {
      handleNext();
    }, duration);
    timerRef.current = timerId;
  };

  const handleNext = () => {
    if (currentIndex < updates.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Last story finished, go back
      navigate(-1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  useEffect(() => {
    if (loading || updates.length === 0 || showViewersDialog) {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (videoRef.current) videoRef.current.pause();
        return;
    }

    const currentUpdate = updates[currentIndex];
    const isVideo = currentUpdate.media.match(/\.(mp4|webm|ogg)$/i);
    let duration = 9000; // Default 9 seconds

    if (isVideo && videoRef.current) {
        videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
                duration = Math.min(videoRef.current.duration * 1000, 15000); // Max 15s for video
                startProgress(duration);
                videoRef.current.play();
            }
        };
    } else {
        startProgress(duration);
    }

    // View tracking
    if (user && currentUpdate.postedBy._id !== user._id) {
        incrementUpdateViewCount(currentUpdate._id).catch(console.error);
    }

    return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentIndex, updates, showViewersDialog, loading]);

  const handleDelete = async (updateId: string) => {
    if (!window.confirm("Delete this story?")) return;
    try {
      await deleteUpdate(updateId);
      toast.success("Story deleted");
      if (updates.length > 1) {
          setUpdates(prev => prev.filter(u => u._id !== updateId));
          if (currentIndex >= updates.length - 1) {
              setCurrentIndex(prev => prev - 1);
          }
      } else {
          navigate(-1);
      }
    } catch (error) {
      console.error('Error deleting update:', error);
      toast.error("Failed to delete story");
    }
  };

  const fetchViewers = async (updateId: string) => {
    setLoadingViewers(true);
    try {
      const response = await getUpdateViewers(updateId);
      const data = response.data.data || [];
      // Frontend Deduplication as a final layer
      const unique = Array.from(new Map(data.map((item: any) => [item._id, item])).values()) as Viewer[];
      setViewers(unique);
    } catch (error) {
      console.error('Error fetching viewers:', error);
    } finally {
      setLoadingViewers(false);
    }
  };

  if (loading) {
    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-[100]">
            <Loader2 className="animate-spin text-primary" size={40} />
        </div>
    );
  }

  if (updates.length === 0) {
    return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[100] text-white p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">No Stories Found</h2>
            <p className="text-white/40 mb-6">This user hasn't posted any updates in the last 24 hours.</p>
            <Button onClick={() => navigate(-1)} variant="outline" className="rounded-2xl px-8 border-white/20">
                Go Back
            </Button>
        </div>
    );
  }

  const currentUpdate = updates[currentIndex];
  const isVideo = currentUpdate.media.match(/\.(mp4|webm|ogg)$/i);
  const isOwner = user && user._id === currentUpdate.postedBy._id;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col overflow-hidden select-none">
      {/* ProgressBar Rail */}
      <div className="absolute top-0 left-0 right-0 z-[120] p-4 flex gap-1.5 bg-gradient-to-b from-black/80 to-transparent">
        {updates.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-white transition-all duration-100 ease-linear ${idx < currentIndex ? 'w-full' : idx === currentIndex ? '' : 'w-0'}`}
              style={idx === currentIndex ? { width: `${progress}%` } : {}}
            />
          </div>
        ))}
      </div>

      {/* Header Info */}
      <div className="absolute top-8 left-0 right-0 z-[120] px-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
            <Link to={`/profile/${currentUpdate.postedBy.username}`} className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden bg-white/5">
                    <img src={currentUpdate.postedBy.profilePicture} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                    <h4 className="text-white font-bold text-sm leading-none flex items-center gap-2">
                        {currentUpdate.postedBy.username}
                        <span className="w-1 h-1 rounded-full bg-white/40" />
                        <span className="text-white/60 font-medium text-[10px] lowercase tracking-wide">
                            {formatDistanceToNow(new Date(currentUpdate.createdAt))} ago
                        </span>
                    </h4>
                </div>
            </Link>
        </div>

        <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all pointer-events-auto backdrop-blur-md border border-white/10"
        >
            <X size={20} />
        </button>
      </div>

      {/* Media Content */}
      <div className="flex-1 relative flex items-center justify-center bg-zinc-900">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 z-[130]">
             <button 
                onClick={handlePrevious} 
                disabled={currentIndex === 0}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 text-white disabled:opacity-0 transition-opacity"
             >
                <ChevronLeft size={32} />
             </button>
             <button 
                onClick={handleNext}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 text-white transition-opacity"
             >
                <ArrowRight size={24} />
             </button>
          </div>

          {isVideo ? (
            <video 
              ref={videoRef}
              src={currentUpdate.media}
              className="w-full max-h-screen object-contain shadow-2xl"
              playsInline
              autoPlay
              muted={false}
            />
          ) : (
            <img 
              src={currentUpdate.media} 
              alt="" 
              className="w-full max-h-screen object-contain shadow-2xl" 
            />
          )}

          {/* Description Overlay */}
          {currentUpdate.description && (
            <div className="absolute bottom-24 inset-x-0 p-8 text-center z-[120] pointer-events-none">
                <p className="text-white text-lg font-medium drop-shadow-xl inline-block px-6 py-3 rounded-2xl bg-black/40 backdrop-blur-sm pointer-events-auto leading-relaxed max-w-[80%]">
                    {currentUpdate.description}
                </p>
            </div>
          )}
      </div>

      {/* Footer / Owner Actions */}
      {isOwner ? (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-[130] flex items-center justify-center gap-12">
              <button 
                onClick={() => {
                    setShowViewersDialog(true);
                    fetchViewers(currentUpdate._id);
                }}
                className="flex flex-col items-center gap-1 hover:scale-110 transition-transform group"
              >
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                      <Eye className="text-white group-hover:text-primary transition-colors" size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-white/60 tracking-wider transition-colors group-hover:text-white uppercase">
                      {currentUpdate.viewCount} views
                  </span>
              </button>

              <button 
                onClick={() => handleDelete(currentUpdate._id)}
                className="flex flex-col items-center gap-1 hover:scale-110 transition-transform group"
              >
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center transition-colors group-hover:bg-red-500/20">
                      <Trash2 className="text-red-500" size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-white/60 tracking-wider transition-colors group-hover:text-white uppercase">
                      Delete
                  </span>
              </button>
          </div>
      ) : (
          // Viewer Actions: Show Chat if mutuals
          (() => {
              const otherUserId = currentUpdate.postedBy._id;
              // Ensure we check mutuals correctly
              const isMutual = user?.followers?.some(id => id.toString() === otherUserId.toString()) && 
                               user?.following?.some(id => id.toString() === otherUserId.toString());
              
              if (isMutual) {
                  return (
                    <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent z-[130] flex items-center justify-center">
                        <button 
                            onClick={() => navigate(`/chats/${currentUpdate.postedBy.username}`)}
                            className="flex items-center gap-3 px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold shadow-2xl shadow-primary/40 transition-all hover:scale-105 active:scale-95"
                        >
                            <MessageCircle size={20} />
                            <span>Chat with {currentUpdate.postedBy.username}</span>
                        </button>
                    </div>
                  );
              }
              return null;
          })()
      )}

      {/* Viewers Dialog */}
      <Dialog open={showViewersDialog} onOpenChange={setShowViewersDialog}>
        <DialogContent className="sm:max-w-md bg-surface-dark [html.light_&]:bg-surface-card-light border-border-dark [html.light_&]:border-border-light p-0 overflow-hidden rounded-3xl">
          <DialogHeader className="p-6 border-b border-white/5 [html.light_&]:border-black/5 pb-4">
            <DialogTitle className="text-white [html.light_&]:text-text-light font-bold text-xl tracking-tight flex items-center gap-3">
                Story Viewers
            </DialogTitle>
          </DialogHeader>
          
          <div className="px-4 pb-4 border-b border-white/5 [html.light_&]:border-black/5">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 [html.light_&]:text-text-muted-light group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Search viewers..."
                value={viewerSearchQuery}
                onChange={(e) => setViewerSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white/5 [html.light_&]:bg-black/5 border border-white/5 [html.light_&]:border-black/5 rounded-2xl text-white [html.light_&]:text-text-light placeholder:text-white/20 [html.light_&]:placeholder:text-text-muted-light outline-none focus:border-primary/50 focus:bg-white/[0.07] [html.light_&]:focus:bg-black/[0.02] transition-all"
              />
            </div>
          </div>
          
          <div className="max-h-[50vh] py-2 px-4 overflow-y-auto space-y-3 custom-scrollbar">
            {loadingViewers ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-white/40">
                    <Loader2 className="animate-spin" />
                    <span className="text-sm font-medium">Fetching viewers...</span>
                </div>
            ) : (() => {
                const filteredViewers = viewers.filter(v => 
                  v.username.toLowerCase().includes(viewerSearchQuery.toLowerCase())
                );

                if (viewers.length === 0) {
                    return (
                        <div className="py-12 flex flex-col items-center justify-center gap-4 text-white/20 [html.light_&]:text-text-muted-light/40">
                            <Eye size={40} className="opacity-10" />
                            <span className="text-sm font-bold tracking-wide uppercase">No views yet</span>
                        </div>
                    );
                }

                if (filteredViewers.length === 0) {
                    return (
                        <div className="py-12 flex flex-col items-center justify-center gap-4 text-white/20 [html.light_&]:text-text-muted-light/40">
                            <Search size={40} className="opacity-10" />
                            <span className="text-sm font-bold tracking-wide uppercase">No results found</span>
                        </div>
                    );
                }

                return filteredViewers.map((viewer) => (
                    <div 
                        key={viewer._id} 
                        className="flex items-center justify-between py-3 hover:opacity-70 [html.light_&]:hover:bg-black/5 [html.light_&]:px-3 [html.light_&]:rounded-xl transition-all cursor-pointer group"
                        onClick={() => {
                            navigate(`/profile/${viewer.username}`);
                            setShowViewersDialog(false);
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <img src={viewer.profilePicture} className="w-11 h-11 rounded-full border border-white/10 [html.light_&]:border-black/5 object-cover" alt="" />
                            <div>
                                <h5 className="text-white [html.light_&]:text-text-light font-bold text-sm tracking-tight">{viewer.username}</h5>
                                {viewer.college && <p className="text-white/40 [html.light_&]:text-text-muted-light text-xs line-clamp-1 font-medium">{viewer.college}</p>}
                            </div>
                        </div>
                    </div>
                ));
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
