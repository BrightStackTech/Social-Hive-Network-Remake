import { useState, useEffect, useRef } from "react";
import { Check, Clipboard, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { createLiveSession, addParticipantToLiveSession } from "../../api";
import { useNavigate } from "react-router-dom";

interface MeetingDetailsScreenProps {
  onClickJoin?: (id: string) => Promise<void>;
  _handleOnCreateMeeting: () => Promise<{ meetingId: string | null; err: any }>;
  participantName: string;
  setParticipantName: (name: string) => void;
  micOn: boolean;
  webcamOn: boolean;
  initialMode?: "create" | "join";
}

export function MeetingDetailsScreen({
  _handleOnCreateMeeting,
  participantName,
  setParticipantName,
  micOn,
  webcamOn,
  initialMode
}: MeetingDetailsScreenProps) {
  const [meetingId, setMeetingId] = useState("");
  const [sessionName, setSessionName] = useState("Untitled session");
  const [meetingIdError, setMeetingIdError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isCreateMeetingClicked, setIsCreateMeetingClicked] = useState(false);
  const [isJoinMeetingClicked, setIsJoinMeetingClicked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (user?.username) {
      setParticipantName(user.username);
    }
  }, [user, setParticipantName]);

  // Handle initial mode from route
  useEffect(() => {
    if (hasInitializedRef.current) return;

    if (initialMode === "create") {
      const triggerCreate = async () => {
        hasInitializedRef.current = true;
        setIsLoading(true);
        const { meetingId: newMeetingId, err } = await _handleOnCreateMeeting();
        if (newMeetingId) {
          setMeetingId(newMeetingId);
          setIsCreateMeetingClicked(true);
        } else {
          toast.error(err || "Failed to generate meeting ID");
          hasInitializedRef.current = false; // Allow retry if it failed
        }
        setIsLoading(false);
      };
      triggerCreate();
    } else if (initialMode === "join") {
      hasInitializedRef.current = true;
      setIsJoinMeetingClicked(true);
    }
  }, [initialMode, _handleOnCreateMeeting]);

  const openSessionInNewTab = async (id: string, name: string, title?: string) => {
    setIsLoading(true);
    
    try {
        // Robust server-side check via VideoSDK API
        const { checkUserInActiveSession } = await import("../../api/videosdk");
        const alreadyInSession = await checkUserInActiveSession(name);

        if (alreadyInSession) {
            toast.error("You're already in a session, please end/leave that session inorder to create/join new session", {
                duration: 5000,
                icon: '⚠️'
            });
            setIsLoading(false);
            return;
        }

        const url = `/live-session-room/${id}?name=${encodeURIComponent(name)}&mic=${micOn}&webcam=${webcamOn}${title ? `&title=${encodeURIComponent(title)}` : ""}`;
        window.open(url, "_blank");
        // Navigate original page back to live sessions list
        navigate('/live-sessions');
    } catch (error) {
        console.error("Session check failed", error);
        // Fallback: allow join if API check fails to avoid blocking users entirely due to API errors
        const url = `/live-session-room/${id}?name=${encodeURIComponent(name)}&mic=${micOn}&webcam=${webcamOn}${title ? `&title=${encodeURIComponent(title)}` : ""}`;
        window.open(url, "_blank");
        navigate('/live-sessions');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center w-full max-w-xl mx-auto p-4 md:p-6 bg-surface-dark [html.light_&]:bg-surface-card-light rounded-2xl border border-border-dark [html.light_&]:border-border-light backdrop-blur-sm">
      {isCreateMeetingClicked ? (
        <>
          <div
            className="border border-border-dark [html.light_&]:border-border-light rounded-xl px-4 py-3 flex items-center justify-between bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light mb-4"
          >
            <p className="text-text-dark [html.light_&]:text-text-light text-sm font-medium">{`Meeting code : ${meetingId}`}</p>
            <button
              className="p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(meetingId);
                setIsCopied(true);
                toast.success("Meeting ID copied!");
                setTimeout(() => setIsCopied(false), 3000);
              }}
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Clipboard className="h-4 w-4 text-text-muted-dark [html.light_&]:text-text-muted-light" />
              )}
            </button>
          </div>
          <input
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Enter session name"
            className={`px-4 py-3 bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light border border-border-dark [html.light_&]:border-border-light rounded-xl w-full text-center mt-2 focus:border-primary/50 outline-none transition-all ${
              sessionName === "Untitled session" ? "text-text-muted-dark italic" : "text-text-dark [html.light_&]:text-text-light font-medium"
            }`}
          />
        </>
      ) : isJoinMeetingClicked ? (
        <>
          <input
            value={meetingId}
            onChange={(e) => {
                setMeetingId(e.target.value);
                setMeetingIdError(false);
            }}
            placeholder="Enter meeting Id (e.g. xxxx-xxxx-xxxx)"
            className="px-4 py-3 bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light border border-border-dark [html.light_&]:border-border-light rounded-xl text-text-dark [html.light_&]:text-text-light w-full text-center mb-2 focus:border-primary/50 outline-none transition-all font-medium"
          />
          {meetingIdError && (
            <p className="text-xs text-red-500 mb-2 italic ml-1">{`Please enter a valid meeting ID`}</p>
          )}
        </>
      ) : null}

      {(isCreateMeetingClicked || isJoinMeetingClicked) && (
        <>
          <input
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            placeholder="Enter your name"
            className="px-4 py-3 mt-4 bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light border border-border-dark [html.light_&]:border-border-light rounded-xl text-text-dark [html.light_&]:text-text-light w-full text-center focus:border-primary/50 outline-none transition-all font-medium"
          />
          <button
            disabled={
              participantName.length < 3 ||
              isLoading
            }
            className={`w-full text-white font-semibold py-3.5 rounded-xl mt-6 transition-all shadow-lg flex items-center justify-center gap-2 ${
              participantName.length < 3
                ? "bg-surface-elevated-dark cursor-not-allowed opacity-50"
                : "bg-primary hover:bg-primary-dark active:scale-[0.98] cursor-pointer"
            }`}
            onClick={async () => {
              setIsLoading(true);
              if (isCreateMeetingClicked) {
                // Default to "Untitled session" if empty
                const finalSessionName = sessionName.trim().length === 0 ? "Untitled session" : sessionName;
                
                try {
                  await createLiveSession({
                    meetingId,
                    sessionName: finalSessionName,
                  });
                  openSessionInNewTab(meetingId, participantName, finalSessionName);
                } catch (error: any) {
                  console.error("Error creating live session", error);
                  toast.error(error.response?.data?.message || "Error creating session");
                }
              } else {
                if (meetingId.match("\\w{4}\\-\\w{4}\\-\\w{4}")) {
                  try {
                    await addParticipantToLiveSession(meetingId);
                    openSessionInNewTab(meetingId, participantName);
                  } catch (error: any) {
                    console.error("Error joining session", error);
                    const errorMessage = error.response?.data?.message;
                    if (error.response?.status === 403 && errorMessage?.includes("banned")) {
                        toast.error("You're banned from this session, cannot join this session", {
                            duration: 6000,
                            icon: '🚫'
                        });
                    } else {
                        setMeetingIdError(true);
                        toast.error(errorMessage || "Invalid meeting ID");
                    }
                  }
                } else {
                  setMeetingIdError(true);
                }
              }
              setIsLoading(false);
            }}
          >
            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : (isCreateMeetingClicked ? "Start Session" : "Join Session")}
          </button>
        </>
      )}

      {!isCreateMeetingClicked && !isJoinMeetingClicked && (
        <div className="w-full flex flex-col gap-3">
          <button
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl transition-all shadow-xl active:scale-[0.97] cursor-pointer"
            onClick={() => {
              navigate('/live-sessions/create');
            }}
          >
            Create a session
          </button>
          <button
            className="w-full bg-surface-elevated-dark [html.light_&]:bg-surface-elevated-light text-text-dark [html.light_&]:text-text-light font-bold py-4 rounded-2xl transition-all border border-border-dark [html.light_&]:border-border-light active:scale-[0.97] cursor-pointer"
            onClick={() => {
              navigate('/live-sessions/join');
            }}
          >
            Join a session
          </button>
        </div>
      )}
    </div>
  );
}
