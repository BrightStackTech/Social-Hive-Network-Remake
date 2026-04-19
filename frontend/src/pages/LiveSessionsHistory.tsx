import { useEffect, useState } from "react";
import { 
  Pencil, 
  Check, 
  X, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Video,
  Loader2,
  ExternalLink,
  RefreshCcw,
  ArrowLeft,
  Trash2
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { 
    getLiveSessionsHistory, 
    updateSessionTitle as apiUpdateSessionTitle, 
    updateRecordingURL as apiUpdateRecordingURL,
    hideSessionFromView
} from "../api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface Participant {
  _id: string;
  username: string;
}

interface LiveSessionHistory {
  meetingId: string;
  createdAt: string;
  participants: Participant[];
  recordings?: string[]; // Recordings URL if available
  recordingUrl?: string; // Some models might use this field
  title: string;
}

type SortKey = "title" | "meetingId" | "createdAt" | "participants";

const LiveSessionsHistory = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<LiveSessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempTitle, setTempTitle] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  
  const { user } = useAuth();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getLiveSessionsHistory();
        // Assuming your backend returns data in res.data.data or res.data
        const rawData = res.data?.data || res.data || [];
        
        const dataWithTitles = rawData.map((session: any) => ({
          ...session,
          title: session.title ? session.title : "Untitled session",
        }));

        setSessions(dataWithTitles);
      } catch (error) {
        console.error("Error fetching session history", error);
        toast.error("Failed to load session history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handleSort = (key: SortKey) => {
    let order: "asc" | "desc" = "asc";
    if (sortKey === key && sortOrder === "asc") {
      order = "desc";
    }
    setSortKey(key);
    setSortOrder(order);
  };

  const sortedSessions = [...sessions].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    if (sortKey === "participants") {
      aValue = a.participants?.length || 0;
      bValue = b.participants?.length || 0;
    } else if (sortKey === "createdAt") {
      aValue = new Date(a.createdAt).getTime();
      bValue = new Date(b.createdAt).getTime();
    } else {
      aValue = a[sortKey]?.toLowerCase() || "";
      bValue = b[sortKey]?.toLowerCase() || "";
    }

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const filteredSessions = sortedSessions.filter((session) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.meetingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    format(new Date(session.createdAt), 'PPP').toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.participants?.some((p) => p.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setTempTitle(sessions[index].title);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setTempTitle("");
  };

  const saveTitle = async (index: number) => {
    if (!tempTitle.trim()) {
      toast.error("Session name can't be empty!");
      return;
    }
    setUpdating(true);
    try {
      const meetingId = sessions[index].meetingId;
      await apiUpdateSessionTitle(meetingId, { newTitle: tempTitle });
      
      const updatedSessions = [...sessions];
      updatedSessions[index].title = tempTitle;
      setSessions(updatedSessions);
      
      toast.success("Session name updated successfully!");
      setEditingIndex(null);
    } catch (error) {
      toast.error("Failed to update session name");
      console.error("Update title error:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleManualSync = async (meetingId: string) => {
    const toastId = toast.loading("Fetching recordings from VideoSDK...");
    try {
        const res = await apiUpdateRecordingURL(meetingId);
        
        // Update local state if successful
        const updatedSessions = sessions.map(s => {
            if (s.meetingId === meetingId) {
                return { 
                    ...s, 
                    recordings: res.data.data.recordings,
                    recordingUrl: res.data.data.recordingUrl 
                };
            }
            return s;
        });
        setSessions(updatedSessions);
        
        toast.success("Recordings synced successfully!", { id: toastId });
    } catch (error: any) {
        console.error("Manual sync error:", error);
        toast.error(error.response?.data?.message || "No recordings found yet on VideoSDK", { id: toastId });
    }
  };

  const handleHideSession = async (meetingId: string) => {
    try {
        await hideSessionFromView(meetingId);
        setSessions(prev => prev.filter(s => s.meetingId !== meetingId));
        toast.success("Session removed from your history");
    } catch (error: any) {
        console.error("Hide session error:", error);
        toast.error("Failed to remove session from history");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const SortIcon = ({ currentKey }: { currentKey: SortKey }) => {
    if (sortKey !== currentKey) return null;
    return sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className="w-full min-h-screen bg-[#0a0b0d] text-white flex flex-col font-sans px-6 md:px-10 relative pb-6">
      <div className="max-w-7xl mx-auto pt-4 w-full">
        <button 
           onClick={() => navigate('/live-sessions')}
           className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4 group cursor-pointer"
        >
           <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
           <span className="font-medium text-lg tracking-tight">Back</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-text-dark [html.light_&]:text-text-light mb-2">
              Live Sessions History
            </h1>
            <p className="text-white/40 font-medium">
              Review your past real-time collaborations and recordings.
            </p>
          </div>
          
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-dark [html.light_&]:text-text-muted-light" size={18} />
            <input
              type="text"
              placeholder="Search by name, ID or participant..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface-dark [html.light_&]:bg-surface-card-light border border-border-dark [html.light_&]:border-border-light rounded-xl text-text-dark [html.light_&]:text-text-light focus:border-primary/50 outline-none transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-surface-dark [html.light_&]:bg-surface-card-light rounded-2xl border border-border-dark [html.light_&]:border-border-light overflow-hidden shadow-xl shadow-black/5">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-white/5 [html.light_&]:bg-black/5 border-b border-border-dark [html.light_&]:border-border-light">
                  <th className="px-6 py-4 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort("title")}>
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                      Session Name <SortIcon currentKey="title" />
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort("meetingId")}>
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                      Meeting ID <SortIcon currentKey="meetingId" />
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-primary transition-colors text-center" onClick={() => handleSort("createdAt")}>
                    <div className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider">
                      Date <SortIcon currentKey="createdAt" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center">
                    <div className="text-sm font-bold uppercase tracking-wider">Time</div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort("participants")}>
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                      Participants <SortIcon currentKey="participants" />
                    </div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="text-sm font-bold uppercase tracking-wider">Recordings</div>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <div className="text-sm font-bold uppercase tracking-wider">Action</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark [html.light_&]:divide-border-light">
                {filteredSessions.length > 0 ? (
                  filteredSessions.map((session) => {                    const isHost = user && session.participants?.[0]?._id === user._id;
                    const absIndex = sessions.findIndex(s => s.meetingId === session.meetingId);

                    return (
                      <tr key={session.meetingId} className="hover:bg-white/[0.02] [html.light_&]:hover:bg-black/[0.02] transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 min-w-[200px]">
                            {editingIndex === absIndex ? (
                              <div className="flex items-center gap-2 w-full">
                                <input
                                  autoFocus
                                  type="text"
                                  value={tempTitle}
                                  onChange={(e) => setTempTitle(e.target.value)}
                                  className="bg-surface-elevated-dark [html.light_&]:bg-white border border-primary px-3 py-1.5 rounded-lg text-sm font-semibold w-full outline-none"
                                  onKeyDown={(e) => e.key === 'Enter' && saveTitle(absIndex)}
                                />
                                  <button onClick={() => saveTitle(absIndex)} disabled={updating} className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors">
                                    {updating ? <Loader2 size={16} /> : <Check size={16} />}
                                  </button>
                                <button onClick={cancelEditing} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className={`font-semibold text-[15px] ${session.title.toLowerCase() === "untitled session" ? "text-text-muted-dark opacity-50" : "text-text-dark [html.light_&]:text-text-light"}`}>
                                  {session.title}
                                </span>
                                {isHost && (
                                  <button 
                                    onClick={() => startEditing(absIndex)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted-dark hover:text-primary transition-all rounded-lg"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 min-w-[150px]">
                          <code className="text-xs font-mono bg-white/5 [html.light_&]:bg-black/5 px-2 py-1 rounded border border-border-dark [html.light_&]:border-border-light text-text-muted-dark [html.light_&]:text-text-muted-light whitespace-nowrap break-keep">
                            {session.meetingId}
                          </code>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="text-sm text-text-dark [html.light_&]:text-text-light font-medium">
                              {format(new Date(session.createdAt), 'MMM d, yyyy')}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light font-bold">
                              {format(new Date(session.createdAt), 'hh:mm a')}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {session.participants?.map((participant) => (
                              <Link 
                                key={participant._id} 
                                to={`/profile/${participant.username}`} 
                                className="text-xs font-bold text-[#5d6bf8] hover:underline"
                              >
                                @{participant.username}
                              </Link>
                            ))}
                            {(!session.participants || session.participants.length === 0) && (
                              <span className="text-[10px] text-white/20 italic">No participants</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {session.recordings && session.recordings.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {session.recordings.map((url, i) => (
                                <a 
                                  key={i} 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-all border border-primary/10"
                                >
                                  <Video size={14} />
                                  Recording {i + 1}
                                  <ExternalLink size={12} />
                                </a>
                              ))}
                            </div>
                          ) : session.recordingUrl ? (
                              <a 
                              href={session.recordingUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-all border border-primary/10"
                            >
                              <Video size={14} />
                              View Recording
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-text-muted-dark italic opacity-50">No recordings</span>
                              <button 
                                  onClick={() => handleManualSync(session.meetingId)}
                                  className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-all border border-primary/20"
                                  title="Force Sync Recordings"
                              >
                                  <RefreshCcw size={12} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                            <button 
                                onClick={() => handleHideSession(session.meetingId)}
                                className="p-2 text-text-muted-dark hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Hide from history"
                            >
                                <Trash2 size={18} />
                            </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-white/5 rounded-full">
                          <Video size={40} className="text-text-muted-dark opacity-20" />
                        </div>
                        <div className="text-text-muted-dark font-medium">
                          {searchQuery ? "No sessions match your search." : "No live session history found."}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveSessionsHistory;
