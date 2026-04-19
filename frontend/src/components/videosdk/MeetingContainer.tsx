import { useMeeting, usePubSub } from "@videosdk.live/react-sdk";
import { useState, useEffect} from "react";
import { ParticipantGrid } from "./ParticipantGrid";
import { BottomBar } from "./BottomBar";
import { ChatPanel } from "./ChatPanel";
import { ParticipantPanel } from "./ParticipantPanel";
import { useMeetingAppContext } from "./MeetingAppContextDef";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

// Persistent global tracker to ensure single join across all remounts
const joinedMeetingsTracker = new Set<string>();

interface MeetingContainerProps {
  onMeetingLeave: () => void;
  setIsMeetingLeft: (left: boolean) => void;
  hasJoinedRef: React.MutableRefObject<boolean>;
  meetingId: string;
  meetingTitle: string;
}

export function MeetingContainer({
  onMeetingLeave,
  setIsMeetingLeft,
  hasJoinedRef,
  meetingId,
  meetingTitle,
}: MeetingContainerProps) {
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const { sideBarMode, setHasUnreadMessages, useRaisedHandParticipants } = useMeetingAppContext();
  const [isJoined, setIsJoined] = useState(false);
  
  const { participantRaisedHand } = useRaisedHandParticipants();

  // Sounds
  const notificationAudio = new Audio("https://static.videosdk.live/prebuilt/notification.mp3");
  
  const _handleOnError = (data: any) => {
    const { code, message } = data;
    console.error("VideoSDK Error", code, message);
    toast.error(`Meeting Error: ${message}`);
  };

  const { participants, join, localParticipant } = useMeeting({
    onParticipantJoined: (participant) => {
        console.log("Joined", participant.id);
    },
    onMeetingJoined: () => {
      console.log("Meeting Joined successfully");
      setIsJoined(true);
    },
    onMeetingLeft: () => {
      onMeetingLeave();
    },
    onError: _handleOnError,
  });

  // PubSub - Raise Hand
  usePubSub("RAISE_HAND", {
    onMessageReceived: (data) => {
      const { senderId, senderName } = data;
      const isLocal = senderId === localParticipant?.id;
      
      // Ignore local messages as they are handled in BottomBar.tsx
      if (isLocal) return;

      notificationAudio.play().catch(() => {});
      toast(`${senderName} raised hand 🖐🏼`, {
        icon: '🖐🏼',
        duration: 4000,
        position: 'bottom-left',
        style: { 
            background: '#1a1b1d', 
            color: '#fff', 
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600'
        }
      });

      participantRaisedHand(senderId);
    },
  });

  // PubSub - Chat
  usePubSub("CHAT", {
    onMessageReceived: (data) => {
      const { senderId, senderName, message } = data;
      const isLocal = senderId === localParticipant?.id;

      if (!isLocal) {
        if (sideBarMode !== "CHAT") {
            setHasUnreadMessages(true);
            notificationAudio.play().catch(() => {});
        }
        
        toast(`${senderName}: ${message.length > 30 ? message.substring(0, 30) + "..." : message}`, {
            icon: '💬',
            duration: 4000,
            position: 'bottom-left',
            style: { background: '#1a1b1d', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
        });
      }
    },
  });

  useEffect(() => {
    if (participants) {
      setParticipantIds(Array.from(participants.keys()));
    }
  }, [participants]);

  // Atomic Persistence Guard
  useEffect(() => {
    if (isJoined) {
        hasJoinedRef.current = true;
        return;
    }

    // Delay the join to ensure component stability
    const timer = setTimeout(() => {
        if (!joinedMeetingsTracker.has(meetingId)) {
            console.log(`--- ATOMIC GUARD: Executing single join for ${meetingId} ---`);
            joinedMeetingsTracker.add(meetingId);
            join();
            hasJoinedRef.current = true;
        }
    }, 500);

    return () => clearTimeout(timer);
  }, [join, isJoined, meetingId, hasJoinedRef]);

  if (!isJoined) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-[#0a0b0d]">
        <div className="relative flex items-center justify-center">
            <div className="absolute w-32 h-32 border-4 border-[#5d6bf8]/20 rounded-full animate-pulse" />
            <Loader2 className="animate-spin text-[#5d6bf8] h-12 w-12" />
        </div>
        <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Joining Meeting...</h2>
            <p className="text-white/40 font-medium italic">Setting up your secure live connection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0b0d] overflow-hidden">
      <div className="flex-1 flex relative overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <ParticipantGrid participantIds={participantIds} />
        </div>
        
        {sideBarMode === "CHAT" && <ChatPanel />}
        {sideBarMode === "PARTICIPANTS" && <ParticipantPanel />}
      </div>
      
      <BottomBar 
        setIsMeetingLeft={setIsMeetingLeft} 
        meetingId={meetingId}
        meetingTitle={meetingTitle}
      />
    </div>
  );
}
