import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/Dialog";
import { getLiveSessionsHistory, deleteLiveSession, updateSessionTitle } from "../../api";
import { Loader2, Play, Users, Calendar, Clock, Video, X, Trash2, Pencil, Check } from "lucide-react";
import { format } from "date-fns";
import ReactPlayer from "react-player";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

interface SessionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionHistoryModal({ open, onOpenChange }: SessionHistoryModalProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await getLiveSessionsHistory();
      setSessions(response.data.data);
    } catch (error) {
      console.error("Error fetching history", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTitle = async (meetingId: string) => {
    if (!newTitle.trim()) return;
    try {
        await updateSessionTitle(meetingId, { newTitle });
        setSessions(prev => prev.map(s => s.meetingId === meetingId ? { ...s, title: newTitle } : s));
        setEditingSession(null);
        toast.success("Title updated");
    } catch (err) {
        console.error("Failed to update title", err);
        toast.error("Failed to update name");
    }
  };

  const handleDelete = async (meetingId: string) => {
    if (!window.confirm("Are you sure you want to delete this session from your history?")) return;
    try {
        await deleteLiveSession(meetingId);
        setSessions(prev => prev.filter(s => s.meetingId !== meetingId));
        toast.success("Session deleted from history");
    } catch (err) {
        console.error("Failed to delete session", err);
        toast.error("Failed to delete record");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
             <div className="p-2 bg-[#bf2e31]/10 rounded-lg">
                <Video className="text-[#bf2e31]" size={20} />
             </div>
             Session Logs & Recordings
          </DialogTitle>
          <p className="text-sm text-white/40 font-medium">Review your past live streams and watch recordings.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 pr-2 space-y-4 scrollbar-hide">
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="animate-spin text-[#5d6bf8]" size={32} />
            </div>
          ) : sessions.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-white/40 gap-3 border-2 border-dashed border-white/5 rounded-2xl">
              <Clock size={32} />
              <p className="font-medium">No past sessions found.</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div 
                key={session._id} 
                className="bg-[#1a1b1d]/40 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                   <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 group">
                        {editingSession === session.meetingId ? (
                             <div className="flex items-center gap-2">
                                <input 
                                    className="bg-white/5 border border-[#5d6bf8]/50 rounded px-2 py-1 text-sm text-white outline-none w-[200px]"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle(session.meetingId)}
                                />
                                <button onClick={() => handleUpdateTitle(session.meetingId)} className="text-green-500 hover:text-green-400">
                                    <Check size={16} />
                                </button>
                                <button onClick={() => setEditingSession(null)} className="text-white/40 hover:text-white">
                                    <X size={14} />
                                </button>
                             </div>
                        ) : (
                            <>
                                <h4 className="text-white font-bold text-lg group-hover:text-[#5d6bf8] transition-colors">{session.title}</h4>
                                {(session.host?._id === user?._id || session.userId === user?._id) && (
                                    <button 
                                        onClick={() => {
                                            setEditingSession(session.meetingId);
                                            setNewTitle(session.title);
                                        }}
                                        className="text-white/20 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-white/40 font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        {format(new Date(session.createdAt), "PPP")}
                      </div>
                      <div className="flex flex-col gap-1 mt-2">
                        <div className="flex items-center gap-1.5 text-text-muted-dark font-bold text-[10px] uppercase">
                            <Users size={12} />
                            <span>Participants ({session.participants?.length || 0})</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {session.participants?.map((participant: any) => (
                                <a 
                                    key={participant._id} 
                                    href={`/profile/${participant.username}`} 
                                    className="text-xs font-semibold text-[#5d6bf8] hover:underline"
                                >
                                    @{participant.username}
                                </a>
                            ))}
                            {(!session.participants || session.participants.length === 0) && (
                                <span className="text-[10px] text-white/20 italic">No participants</span>
                            )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${session.status === 'active' ? 'bg-green-500' : 'bg-white/20'}`} />
                        {session.status}
                      </div>
                    </div>
                  </div>

                  {(session.host?._id === user?._id || session.userId === user?._id) && (
                    <div className="flex items-center gap-2">
                        <button 
                        onClick={() => handleDelete(session.meetingId)}
                        className="p-3 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Delete Session"
                        >
                        <Trash2 size={18} />
                        </button>
                        {session.recordingUrl && (
                             <button 
                                onClick={() => setSelectedRecording(session.recordingUrl)}
                                className="shrink-0 bg-[#5d6bf8] hover:bg-[#4b58e2] text-white p-3 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 font-bold text-sm px-5"
                            >
                                <Play size={16} fill="currentColor" />
                                Watch
                            </button>
                        )}
                    </div>
                  )}

                  {!(session.host?._id === user?._id || session.userId === user?._id) && session.recordingUrl && (
                     <button 
                        onClick={() => setSelectedRecording(session.recordingUrl)}
                        className="shrink-0 bg-[#5d6bf8] hover:bg-[#4b58e2] text-white p-3 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 font-bold text-sm px-5"
                    >
                        <Play size={16} fill="currentColor" />
                        Watch
                    </button>
                  )}

                  {!(session.host?._id === user?._id || session.userId === user?._id) && !session.recordingUrl && (
                    <div className="shrink-0 bg-white/5 text-white/20 px-4 py-2 rounded-xl text-xs font-bold border border-white/5">
                        No recording
                    </div>
                  )}
                </div>

                {session.host && (
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
                         <img src={session.host.profileImage || "/default-avatar.png"} alt={session.host.username} className="w-6 h-6 rounded-full border border-white/10" />
                         <span className="text-xs text-white/60 font-medium">Hosted by <span className="text-white">@{session.host.username}</span></span>
                    </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Video Player Overlay */}
        {selectedRecording && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <button 
              onClick={() => setSelectedRecording(null)}
              className="absolute top-8 right-8 text-white/60 hover:text-white transition-colors"
            >
              <X size={32} />
            </button>
            <div className="w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10 glass">
              {(() => {
                const Player = ReactPlayer as any;
                return (
                  <Player
                    url={selectedRecording}
                    controls
                    width="100%"
                    height="100%"
                    playing
                  />
                );
              })()}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
