import { useMeeting, Constants, usePubSub } from "@videosdk.live/react-sdk";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  MonitorUp, 
  Hand, 
  MessageSquare, 
  Users,
  Copy,
  ChevronDown,
  Radio,
  X,
  Maximize2,
  Pencil,
  Check,
  MoreHorizontal
} from "lucide-react";
import { useMeetingAppContext } from "./MeetingAppContextDef";
import { useState, useEffect, Fragment, useRef } from "react";
import toast from "react-hot-toast";
import { getLiveSessionsHistory, terminateLiveSession, updateRecordingURL, updateSessionTitle } from "../../api";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { Dialog, Transition } from "@headlessui/react";

interface BottomBarProps {
  setIsMeetingLeft: (left: boolean) => void;
  meetingId: string;
  meetingTitle: string;
}

export function BottomBar({ setIsMeetingLeft, meetingId, meetingTitle }: BottomBarProps) {
  const { 
    toggleMic, 
    toggleWebcam, 
    toggleScreenShare, 
    leave, 
    localMicOn, 
    localWebcamOn, 
    localScreenShareOn,
    participants,
    recordingState,
    startRecording,
    stopRecording,
    presenterId,
    activeSpeakerId,
    localParticipant
  } = useMeeting({
    onRecordingStateChanged: ({ status }) => {
        if (status === Constants.recordingEvents.RECORDING_STARTED) {
            toast.success("Meeting recording started", { icon: '🔴' });
        } else if (status === Constants.recordingEvents.RECORDING_STOPPED) {
            toast.success("Meeting recording stopped", { icon: '⚪' });
        }
    }
  });

  const { user } = useAuth();
  const { sideBarMode, setSideBarMode, hasUnreadMessages, setHasUnreadMessages } = useMeetingAppContext();
  const [isHost, setIsHost] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pipMode, setPipMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(meetingTitle);
  const [currentTitle, setCurrentTitle] = useState(meetingTitle);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pipWindowRef = useRef<HTMLVideoElement | null>(null);

  const { publish } = usePubSub("RAISE_HAND");

  useEffect(() => {
    setCurrentTitle(meetingTitle);
    setEditingTitle(meetingTitle);
  }, [meetingTitle]);

  // Identify Host Logic
  useEffect(() => {
    if (!meetingId || !user?._id) return;
    const checkHost = async () => {
        try {
            const res = await getLiveSessionsHistory();
            const session = res.data.data.find((s: any) => s.meetingId === meetingId);
            if (session && session.host) {
                const hostId = typeof session.host === 'string' ? session.host : session.host._id;
                if (hostId === user._id) {
                    setIsHost(true);
                } else {
                    setIsHost(false);
                }
            }
        } catch (err) {
            console.error("Failed to check host status", err);
        }
    };
    checkHost();
  }, [meetingId, user]);

  // Subscribe to host updates
  usePubSub("HOST_UPDATED", {
    onMessageReceived: (data) => {
        try {
            const { newHostId } = JSON.parse(data.message);
            setIsHost(newHostId === user?._id);
        } catch (e) {
            console.error("Failed to parse host update", e);
        }
    }
  });

  const togglePipMode = async () => {
    // Check if PIP Window is active or not
    if (pipWindowRef.current) {
      await document.exitPictureInPicture();
      pipWindowRef.current = null;
      return;
    }

    // Check if browser supports PIP mode
    if ("pictureInPictureEnabled" in document) {
      const source = document.createElement("canvas");
      const ctx = source.getContext("2d");
      if (!ctx) return;

      const pipVideo = document.createElement("video");
      pipWindowRef.current = pipVideo;
      pipVideo.autoplay = true;
      pipVideo.muted = true;
      pipVideo.playsInline = true;

      // Essential: Attach to DOM for browser PiP permission
      pipVideo.style.position = "fixed";
      pipVideo.style.left = "-9999px";
      document.body.appendChild(pipVideo);

      const stream = source.captureStream();
      pipVideo.srcObject = stream;
      drawCanvas();

      // When Video is ready we will start PIP mode
      pipVideo.onloadedmetadata = () => {
        pipVideo.requestPictureInPicture();
      };
      await pipVideo.play();

      // When the PIP mode starts, we will start drawing canvas with PIP view
      pipVideo.addEventListener("enterpictureinpicture", () => {
        drawCanvas();
        setPipMode(true);
      });

      // When PIP mode exits, we will dispose the track we created earlier
      pipVideo.addEventListener("leavepictureinpicture", () => {
        pipWindowRef.current = null;
        setPipMode(false);
        const stream = pipVideo.srcObject as MediaStream;
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
        }
        pipVideo.remove();
      });

      // These will draw all the video elements in to the Canvas
      function drawCanvas() {
        const videos = Array.from(document.querySelectorAll("video"))
          .filter(v => v !== pipVideo && v.readyState >= 2);
        
        try {
          ctx!.fillStyle = "#0a0b0d";
          ctx!.fillRect(0, 0, source.width, source.height);

          const participantList = Array.from(participants.values());
          
          if (participantList.length === 0) {
            ctx!.fillStyle = "#ffffff20";
            ctx!.font = "bold 40px sans-serif";
            ctx!.textAlign = "center";
            ctx!.fillText("Waiting for participants...", source.width / 2, source.height / 2);
          } else {
            // FOCUSED MODE LOGIC
            let selectedSource: any = null;
            let isPresentation = false;

            // 1. Priority: Screen Share
            if (presenterId) {
                // For local presenter, we might need a less strict check or find by display name
                const presenterVideo = videos.find(v => 
                    v.getAttribute("data-participant-id") === presenterId && 
                    v.getAttribute("data-display-name") === "Presentation"
                ) || (presenterId === localParticipant?.id ? document.querySelector('video[data-display-name="Presentation"]') : null);

                if (presenterVideo) {
                    selectedSource = presenterVideo;
                    isPresentation = true;
                }
            }

            // 2. Secondary: Active Speaker (if their webcam is on)
            if (!selectedSource && activeSpeakerId) {
                const speakerVideo = videos.find(v => v.getAttribute("data-participant-id") === activeSpeakerId && v.getAttribute("data-webcam-on") === "true");
                if (speakerVideo) {
                    selectedSource = speakerVideo;
                } else {
                    // Fallback to speaker's initials
                    selectedSource = participants.get(activeSpeakerId);
                }
            }

            // 3. Tertiary: Any other participant with webcam on
            if (!selectedSource) {
                const anyWebcam = videos.find(v => v.getAttribute("data-webcam-on") === "true");
                if (anyWebcam) {
                    selectedSource = anyWebcam;
                }
            }

            // 4. Default: Show Local Participant
            if (!selectedSource) {
                const localId = Array.from(participants.keys()).find(id => participants.get(id)?.local);
                selectedSource = participants.get(localId as string);
            }

            // DRAW SELECTED SOURCE
            const w = source.width;
            const h = source.height;

            if (selectedSource instanceof HTMLVideoElement) {
                // If it's a video, draw it full screen
                if (isPresentation) {
                    // Draw presentation (contain)
                    ctx!.drawImage(selectedSource, 0, 0, w, h);
                } else {
                    // Draw webcam (cover)
                    ctx!.drawImage(selectedSource, 0, 0, w, h);
                }
            } else if (selectedSource) {
                // It's a participant object (initials)
                const displayName = selectedSource.displayName || "User";
                const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);
                
                ctx!.fillStyle = "#1a1b1d";
                ctx!.fillRect(0, 0, w, h);

                const pSize = Math.min(w, h) * 0.4;
                ctx!.fillStyle = "#5d6bf8";
                ctx!.beginPath();
                ctx!.arc(w / 2, h / 2, pSize / 2, 0, Math.PI * 2);
                ctx!.fill();
                
                ctx!.fillStyle = "white";
                ctx!.font = `bold ${pSize * 0.4}px sans-serif`;
                ctx!.textAlign = "center";
                ctx!.textBaseline = "middle";
                ctx!.fillText(initials, w / 2, h / 2);
            }
          }
        } catch (error) {
          console.error("PiP Draw Error:", error);
        }

        if (document.pictureInPictureElement === pipVideo) {
          requestAnimationFrame(drawCanvas);
        }
      }
    } else {
        toast.error("PIP is not supported by your browser");
    }
  };

  const _handleLeave = () => {
    setIsConfirmOpen(true);
  };

  const handleEndMeetingForAll = async () => {
    setIsConfirmOpen(false);
    toast.loading("Ending session for all...", { id: "end-session" });

    try {
        const token = import.meta.env.VITE_VIDEOSDK_TOKEN;
        
        // 1. Get Session ID from VideoSDK
        const getResponse = await axios.get(
            `https://api.videosdk.live/v2/sessions?roomId=${meetingId}`,
            { headers: { Authorization: token } }
        );

        const sessionData = getResponse.data?.data?.[0];
        if (sessionData?.id) {
            // 2. Terminate session globally via VideoSDK API
            await axios.post(
                `https://api.videosdk.live/v1/meeting-sessions/${sessionData.id}/end`,
                {},
                { headers: { Authorization: token } }
            );
        }

        // 3. Update our backend
        await terminateLiveSession(meetingId);
        await updateRecordingURL(meetingId);

        toast.success("Meeting ended for all participants", { id: "end-session" });
    } catch (error) {
        console.error("Error ending meeting for all:", error);
        toast.error("Failed to end meeting globally", { id: "end-session" });
    } finally {
        leave();
        setIsMeetingLeft(true);
    }
  };

  const handleOnlyLeave = () => {
    setIsConfirmOpen(false);
    leave();
    setIsMeetingLeft(true);
  };

  const handleUpdateTitle = async () => {
    if (!editingTitle.trim()) return;
    try {
        await updateSessionTitle(meetingId, { newTitle: editingTitle });
        setCurrentTitle(editingTitle);
        setIsEditing(false);
        toast.success("Session name updated");
    } catch (err) {
        console.error("Failed to update title", err);
        toast.error("Failed to update name");
    }
  };

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    toast.success("Meeting ID copied to clipboard!");
  };

  const toggleRecording = () => {
    if (recordingState === Constants.recordingEvents.RECORDING_STARTED) {
        stopRecording();
    } else if (recordingState === Constants.recordingEvents.RECORDING_STOPPED || !recordingState) {
        startRecording();
    }
  };

  const isRecording = recordingState === Constants.recordingEvents.RECORDING_STARTED;
  const isStarting = recordingState === Constants.recordingEvents.RECORDING_STARTING;

  return (
    <>
    <div className="bg-[#0a0b0d] border-t border-white/5 py-3 px-3 sm:px-6 flex items-center justify-center lg:justify-between min-h-[70px] sm:min-h-[85px] z-20 gap-2">
      
      {/* Left section: Meeting Info - Visible on Desktop LG+ */}
      <div className="hidden lg:flex items-center gap-3">
        <div className="flex items-center bg-[#1a1b1d] border border-white/10 rounded-lg overflow-hidden h-10 shadow-lg group">
          <div className="px-3 text-white/90 text-sm font-semibold tracking-tight tabular-nums">
             {meetingId}
          </div>
          <button 
            onClick={copyMeetingId}
            className="h-full px-3 border-l border-white/10 hover:bg-white/5 transition-colors text-white/40 hover:text-white cursor-pointer"
          >
             <Copy size={16} />
          </button>
        </div>

        <div className="px-3 py-2 bg-[#1a1b1d] border border-white/10 rounded-lg h-10 flex items-center shadow-lg group/title">
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest mr-3 shrink-0">Session</span>
            
            {isEditing ? (
                <div className="flex items-center gap-2">
                    <input 
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="bg-white/5 border border-[#5d6bf8]/50 rounded px-2 py-0.5 text-sm text-white outline-none w-[150px]"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle()}
                    />
                    <button onClick={handleUpdateTitle} className="text-green-500 hover:text-green-400 cursor-pointer">
                        <Check size={16} />
                    </button>
                    <button onClick={() => setIsEditing(false)} className="text-white/40 hover:text-white cursor-pointer">
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <>
                    <span className="text-white/90 text-sm font-semibold truncate max-w-[150px]">
                        {currentTitle}
                    </span>
                    {isHost && (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="ml-2 text-white/20 hover:text-white opacity-0 group-hover/title:opacity-100 transition-opacity cursor-pointer"
                        >
                            <Pencil size={12} />
                        </button>
                    )}
                </>
            )}
        </div>
      </div>

      {/* Middle section: Master Controls */}
      <div className="flex items-center gap-2">
        {/* Recording - Host Only */}
        {isHost && (
          <button 
              disabled={isStarting}
              className={`p-3 rounded-lg border border-white/10 transition-all active:scale-95 cursor-pointer ${isRecording ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-[#1a1b1d] text-white/60'} ${isStarting ? 'opacity-50' : ''}`}
              onClick={toggleRecording}
          >
              <Radio size={20} className={isRecording ? 'animate-pulse' : ''} />
          </button>
        )}

        {/* Hand Raise - Desktop Only */}
        <button 
            onClick={() => {
                publish("RAISE_HAND", { persist: true });
            }}
            className="hidden md:flex p-3 rounded-lg border border-white/10 bg-[#1a1b1d] text-white/60 hover:text-white hover:bg-white/5 transition-all active:scale-95 cursor-pointer"
        >
            <Hand size={20} />
        </button>

        <div className="hidden md:block w-[1px] h-8 bg-white/5 mx-1" />

        {/* Audio Toggle with Dropdown */}
        <div className="flex items-center bg-[#1a1b1d] border border-white/10 rounded-lg overflow-hidden h-10 sm:h-11 shadow-lg ring-1 ring-white/5">
            <button
                onClick={() => toggleMic()}
                className={`flex-1 px-3 sm:px-4 h-full flex items-center justify-center transition-all cursor-pointer ${localMicOn ? 'text-white/90 hover:bg-white/10' : 'bg-white text-black hover:bg-white/90'}`}
            >
                {localMicOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button className="px-1.5 sm:px-2 h-full border-l border-white/5 hover:bg-white/5 text-white/40 cursor-pointer">
                <ChevronDown size={14} />
            </button>
        </div>

        {/* Video Toggle with Dropdown */}
        <div className="flex items-center bg-[#1a1b1d] border border-white/10 rounded-lg overflow-hidden h-10 sm:h-11 shadow-lg ring-1 ring-white/5">
            <button
                onClick={() => toggleWebcam()}
                className={`flex-1 px-3 sm:px-4 h-full flex items-center justify-center transition-all cursor-pointer ${localWebcamOn ? 'text-white/90 hover:bg-white/10' : 'bg-white text-black hover:bg-white/90'}`}
            >
                {localWebcamOn ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
            <button className="px-1.5 sm:px-2 h-full border-l border-white/5 hover:bg-white/5 text-white/40 cursor-pointer">
                <ChevronDown size={14} />
            </button>
        </div>

        {/* Screen Share - Desktop Only */}
        <button
          onClick={() => {
            if (presenterId && presenterId !== localParticipant?.id) {
                toast.error("You cannot share the screen when another user is already sharing", { icon: '📺' });
                return;
            }
            toggleScreenShare();
          }}
          className={`hidden md:flex p-2.5 sm:p-3 h-10 sm:h-11 min-w-[44px] sm:min-w-[50px] rounded-lg border border-white/10 transition-all active:scale-95 cursor-pointer items-center justify-center ${localScreenShareOn ? 'bg-white text-black shadow-lg shadow-white/10' : 'bg-[#1a1b1d] text-white/60 hover:bg-white/5'}`}
        >
          <MonitorUp size={18} />
        </button>

        {/* PiP Mode - Desktop Only */}
        <button
          onClick={togglePipMode}
          className={`hidden md:flex p-3 h-11 min-w-[50px] rounded-lg border border-white/10 transition-all active:scale-95 cursor-pointer items-center justify-center ${pipMode ? 'bg-[#5d6bf8] text-white shadow-lg shadow-[#5d6bf8]/20' : 'bg-[#1a1b1d] text-white/60 hover:bg-white/5'}`}
        >
          <Maximize2 size={18} />
        </button>
        
        <div className="hidden md:block w-[1px] h-8 bg-white/5 mx-1" />
        
        {/* End Meeting */}
        <button
          onClick={_handleLeave}
          className="p-2.5 sm:p-3 h-10 sm:h-11 min-w-[44px] sm:min-w-[50px] rounded-lg bg-[#fb554c] text-white hover:bg-[#e44d44] transition-all active:scale-95 cursor-pointer shadow-[0_8px_16px_rgba(251,85,76,0.2)] flex items-center justify-center"
        >
          <PhoneOff size={20} />
        </button>

        {/* More Options Toggle (Three-dot) - Now for all screen sizes */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2.5 sm:p-3 h-10 sm:h-11 min-w-[44px] sm:min-w-[50px] rounded-lg bg-[#1a1b1d] border border-white/10 text-white/60 hover:text-white transition-all active:scale-95 cursor-pointer items-center justify-center flex"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Right section: Sidebar Toggles - Desktop Only (Shared with Menu) */}
      <div className="hidden xl:flex items-center gap-3">
        <button
          onClick={() => {
            setSideBarMode(s => s === "CHAT" ? null : "CHAT");
            setHasUnreadMessages(false);
          }}
          className={`p-3 rounded-lg border transition-all active:scale-95 cursor-pointer relative ${sideBarMode === "CHAT" ? 'bg-[#5d6bf8] border-[#5d6bf8]/20 text-white shadow-[0_0_15px_rgba(93,107,248,0.4)]' : 'bg-[#1a1b1d] border-white/5 text-white/40 hover:text-white'}`}
        >
          <MessageSquare size={18} />
          {hasUnreadMessages && sideBarMode !== "CHAT" && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1a1b1d] animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setSideBarMode(s => s === "PARTICIPANTS" ? null : "PARTICIPANTS")}
          className={`px-4 py-2.5 rounded-lg border transition-all active:scale-95 cursor-pointer flex items-center gap-2.5 ${sideBarMode === "PARTICIPANTS" ? 'bg-[#5d6bf8] border-[#5d6bf8]/20 text-white shadow-[0_0_15px_rgba(93,107,248,0.4)]' : 'bg-[#1a1b1d] border-white/5 text-white/40 hover:text-white'}`}
        >
          <Users size={18} />
          <span className="text-sm font-bold tabular-nums tracking-tight">{participants.size}</span>
        </button>
      </div>
    </div>

    {/* Mobile More Options Dialog */}
    <Transition appear show={isMobileMenuOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 font-sans" onClose={() => setIsMobileMenuOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300 transform"
              enterFrom="translate-y-full sm:translate-y-0 sm:scale-95"
              enterTo="translate-y-0 sm:scale-100"
              leave="ease-in duration-200 transform"
              leaveFrom="translate-y-0 sm:scale-100"
              leaveTo="translate-y-full sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-t-[2.5rem] sm:rounded-3xl bg-[#0a0b0d] p-8 text-left align-middle shadow-2xl transition-all border-t sm:border border-white/10 ring-1 ring-white/5">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-white tracking-tight">More Options</h3>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-full bg-white/5 text-white/40 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  {/* Hand Raise */}
                  <button
                    onClick={() => {
                        publish("RAISE_HAND", { persist: true });
                        setIsMobileMenuOpen(false);
                    }}
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border bg-[#1a1b1d] border-white/5 text-white/60 transition-all active:scale-95"
                  >
                    <Hand size={24} />
                    <span className="text-sm font-bold">Raise Hand</span>
                  </button>

                  {/* Chat */}
                  <button
                    onClick={() => {
                        setSideBarMode("CHAT");
                        setHasUnreadMessages(false);
                        setIsMobileMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border bg-[#1a1b1d] border-white/5 text-white/60 relative`}
                  >
                    <MessageSquare size={24} />
                    <span className="text-sm font-bold">Chat</span>
                    {hasUnreadMessages && (
                        <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1a1b1d] animate-pulse" />
                    )}
                  </button>

                  {/* Participants */}
                  <button
                    onClick={() => {
                        setSideBarMode("PARTICIPANTS");
                        setIsMobileMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border bg-[#1a1b1d] border-white/5 text-white/60`}
                  >
                    <div className="flex items-center gap-2">
                        <Users size={24} />
                        <span className="bg-[#5d6bf8] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{participants.size}</span>
                    </div>
                    <span className="text-sm font-bold">Participants</span>
                  </button>

                  {/* Screen Share */}
                  <button
                    onClick={() => {
                        if (presenterId && presenterId !== localParticipant?.id) {
                            toast.error("You cannot share the screen when another user is already sharing", { icon: '📺' });
                            return;
                        }
                        toggleScreenShare();
                        setIsMobileMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all ${localScreenShareOn ? 'bg-[#5d6bf8]/10 border-[#5d6bf8]/20 text-[#5d6bf8]' : 'bg-[#1a1b1d] border-white/5 text-white/60'}`}
                  >
                    <MonitorUp size={24} />
                    <span className="text-sm font-bold">Share Screen</span>
                  </button>

                  {/* PiP */}
                  <button
                    onClick={() => {
                        togglePipMode();
                        setIsMobileMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all ${pipMode ? 'bg-[#5d6bf8]/10 border-[#5d6bf8]/20 text-[#5d6bf8]' : 'bg-[#1a1b1d] border-white/5 text-white/60'}`}
                  >
                    <Maximize2 size={24} />
                    <span className="text-sm font-bold">PiP Mode</span>
                  </button>

                  {/* Copy Link */}
                  <button
                    onClick={() => {
                        copyMeetingId();
                        setIsMobileMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border bg-[#1a1b1d] border-white/5 text-white/60`}
                  >
                    <Copy size={24} />
                    <span className="text-sm font-bold text-center">Copy Meeting ID</span>
                  </button>
                </div>

                {/* Session Info in Menu */}
                <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xs">
                        ID
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="text-[10px] uppercase font-black tracking-[0.2em] text-white/30 mb-0.5">Session Room</div>
                         {isEditing ? (
                            <div className="flex items-center gap-2 mt-1">
                                <input 
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    className="bg-white/10 border border-[#5d6bf8]/50 rounded-lg px-3 py-1.5 text-sm text-white outline-none w-full"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle()}
                                />
                                <button onClick={handleUpdateTitle} className="p-2 bg-green-500/20 text-green-500 rounded-lg">
                                    <Check size={18} />
                                </button>
                                <button onClick={() => setIsEditing(false)} className="p-2 bg-white/5 text-white/40 rounded-lg">
                                    <X size={16} />
                                </button>
                            </div>
                         ) : (
                            <div className="flex items-center gap-2 group/menu">
                                <div className="text-white font-bold truncate text-base">{currentTitle}</div>
                                {isHost && (
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        className="text-white/30 hover:text-white transition-colors"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                )}
                            </div>
                         )}
                      </div>
                   </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
    </Transition>

    {/* Host Confirmation Dialog */}
    <Transition appear show={isConfirmOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 font-sans" onClose={() => setIsConfirmOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-[#1a1b1d] p-8 text-center align-middle shadow-2xl transition-all border border-white/10 ring-1 ring-white/5">
                  <div className="w-16 h-16 bg-[#fb554c]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <PhoneOff className="text-[#fb554c] h-8 w-8" />
                  </div>
                  
                  <Dialog.Title as="h3" className="text-2xl font-bold leading-6 text-white mb-2">
                    {isHost ? "End meeting?" : "Leave meeting?"}
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-white/60 mb-8 leading-relaxed px-4">
                       {isHost 
                        ? "As the host, you can either step out alone or terminate the session for all participants globally."
                        : "Are you sure you want to leave the meeting?"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {isHost && (
                      <button
                        type="button"
                        className="w-full bg-[#fb554c] hover:bg-[#e44d44] text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95 cursor-pointer"
                        onClick={handleEndMeetingForAll}
                      >
                        End session for everyone
                      </button>
                    )}
                    <button
                      type="button"
                      className={`w-full font-bold py-4 rounded-2xl transition-all active:scale-95 cursor-pointer ${isHost ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' : 'bg-[#fb554c] hover:bg-[#e44d44] text-white shadow-lg'}`}
                      onClick={handleOnlyLeave}
                    >
                      {isHost ? "Just leave the room" : "Leave Meeting"}
                    </button>
                    <button
                      type="button"
                      className="w-full text-white/40 hover:text-white font-semibold py-3 transition-colors text-sm cursor-pointer"
                      onClick={() => setIsConfirmOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
