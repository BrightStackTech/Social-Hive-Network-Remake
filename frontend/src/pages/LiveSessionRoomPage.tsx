import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { MeetingProvider } from "@videosdk.live/react-sdk";
import { MeetingContainer } from "../components/videosdk/MeetingContainer";
import { MeetingAppProvider } from "../components/videosdk/MeetingAppContextDef";
import { getToken } from "../api/videosdk";
import { getLiveSessionsHistory } from "../api";
import { useAuth } from "../context/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";

const LiveSessionRoomPage = () => {
  const { meetingId } = useParams();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [meetingTitle, setMeetingTitle] = useState(searchParams.get("title") || "Untitled Session");
  
  // High-level guard to survive parent re-renders
  const hasJoinedRef = useRef(false);

  // Parse settings once and memoize
  const participantName = useMemo(() => searchParams.get("name") || "Guest", [searchParams]);
  const micEnabled = useMemo(() => searchParams.get("mic") === "true", [searchParams]);
  const webcamEnabled = useMemo(() => searchParams.get("webcam") === "true", [searchParams]);

  // Sync Meeting Title from Backend if not in URL or for guests
  useEffect(() => {
    const syncTitle = async () => {
        try {
            const res = await getLiveSessionsHistory();
            const session = res.data.data.find((s: any) => s.meetingId === meetingId);
            if (session && session.sessionMetadata?.title) {
                setMeetingTitle(session.sessionMetadata.title);
            } else if (session?.title) {
                setMeetingTitle(session.title);
            }
        } catch (err) {
            console.error("Failed to sync session title", err);
        }
    };
    if (meetingId) syncTitle();
  }, [meetingId]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        if (!meetingId) return;
        
        // Sanitize and get token
        const rawToken = await getToken();
        const t = rawToken?.trim();

        if (!t) {
            setErrorStatus(401);
            return;
        }

        if (isMounted) {
          setToken(t);
        }
      } catch (err) {
        console.error("Failed to get token", err);
        if (isMounted) {
          toast.error("Failed to initialize session");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    init();
    return () => { isMounted = false; };
  }, [meetingId]);

  // The config must be exactly as in the working example
  const { user } = useAuth();

  const meetingConfig = useMemo(() => {
    if (!meetingId || !token) return null;
    
    // Diagnostic logging
    console.log("--- VideoSDK Universal Sync ---");
    console.log("Meeting ID:", meetingId);
    console.log("Token Verified:", token.substring(0, 10) + "...");
    console.log("-------------------------------");

    return {
      meetingId,
      micEnabled: micEnabled,
      webcamEnabled: webcamEnabled,
      name: participantName ? participantName : "TestUser",
      metaData: { userId: user?._id },
      multiStream: true,
      customCameraVideoTrack: null,
      customMicrophoneAudioTrack: null
    };
  }, [meetingId, token, micEnabled, webcamEnabled, participantName, user?._id]);

  if (loading && !errorStatus) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0b0d] text-white">
        <div className="flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-24 h-24 border-4 border-primary/20 rounded-full animate-pulse" />
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold tracking-tight mb-1">Connecting to session</p>
            <p className="text-white/40 text-sm italic font-medium">Establishing secure persistent guard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorStatus === 401 || !token || !meetingId || !meetingConfig) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0b0d] text-white p-6 text-center">
        <div className="max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
             <ShieldAlert className="text-red-500 h-10 w-10" />
          </div>
          <h2 className="text-3xl font-bold text-red-500 mb-4">Connection Rejected</h2>
          <p className="text-white/60 mb-8 leading-relaxed">
            The VideoSDK servers rejected the authentication token. Please verify that your token in .env has all permissions (allow_join, allow_mod) as per the working example.
          </p>
          <div className="flex flex-col gap-3">
             <button 
                onClick={() => window.location.reload()}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-4 rounded-xl transition-all font-bold shadow-lg shadow-primary/20 active:scale-95 cursor-pointer"
             >
                Try Again
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MeetingAppProvider>
      <div className="h-[100dvh] w-screen bg-[#0a0b0d] flex flex-col overflow-hidden">
        <MeetingProvider
          config={meetingConfig as any}
          token={token}
          reinitialiseMeetingOnConfigChange={true}
          joinWithoutUserInteraction={false}
        >
          <MeetingContainer
            onMeetingLeave={() => {
                window.close();
                // Fallback for same-tab navigation
                setTimeout(() => {
                    window.location.href = '/live-sessions';
                }, 100);
            }}
            setIsMeetingLeft={() => {}} 
            hasJoinedRef={hasJoinedRef}
            meetingId={meetingId || ""}
            meetingTitle={meetingTitle}
          />
        </MeetingProvider>
      </div>
    </MeetingAppProvider>
  );
};

export default LiveSessionRoomPage;
