import { useMeeting, useParticipant, usePubSub } from "@videosdk.live/react-sdk";
import { Mic, MicOff, Video, VideoOff, X, User, MoreVertical, UserPlus, UserMinus } from "lucide-react";
import { useMeetingAppContext } from "./MeetingAppContextDef";
import { useState, useEffect, Fragment } from "react";
import { useAuth } from "../../context/AuthContext";
import { getLiveSessionsHistory, kickParticipant, transferHost } from "../../api";
import { Menu, Transition } from "@headlessui/react";
import toast from "react-hot-toast";

function ParticipantListItem({ participantId, isLocalHost, meetingId }: { participantId: string, isLocalHost: boolean, meetingId: string }) {
  const { displayName, micOn, webcamOn, isLocal, participant } = useParticipant(participantId);
  const { participants } = useMeeting();
  
  // Get userId from metadata we injected in LiveSessionRoomPage
  const participantUserId = (participant?.metaData as any)?.userId;

  const { publish } = usePubSub("HOST_UPDATED");

  const handleMakeHost = async () => {
    if (!participantUserId) {
        toast.error("User ID not found for this participant");
        return;
    }
    try {
        await transferHost(meetingId, participantUserId);
        publish(JSON.stringify({ newHostId: participantUserId }), { persist: true });
        toast.success(`${displayName} is now the host`);
    } catch (err) {
        console.error("Failed to transfer host", err);
        toast.error("Failed to transfer host role");
    }
  };

  const handleRemoveParticipant = async () => {
    if (!participantUserId) {
        toast.error("User ID not found for this participant");
        return;
    }
    try {
        // 1. Log the kick in backend (increments strike count)
        await kickParticipant(meetingId, participantUserId);
        
        // 2. Remove from VideoSDK meeting
        const participant = participants.get(participantId);
        if (participant) {
            participant.remove();
            toast.success(`${displayName} has been removed`);
        }
    } catch (err) {
        console.error("Failed to remove participant", err);
        toast.error("Failed to remove participant");
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#5d6bf8]/10 flex items-center justify-center border border-[#5d6bf8]/20 relative">
          <User size={20} className="text-[#5d6bf8]" />
          {/* Host indicator icon could go here if we tracked current hostId */}
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-bold truncate max-w-[120px]">
            {displayName} {isLocal && "(You)"}
          </p>
          <p className="text-white/40 text-[10px] uppercase tracking-wider font-bold">Participant</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${micOn ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
          {micOn ? <Mic size={14} /> : <MicOff size={14} />}
        </div>
        <div className={`p-1.5 rounded-lg ${webcamOn ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
          {webcamOn ? <Video size={14} /> : <VideoOff size={14} />}
        </div>

        {/* Host Actions Menu */}
        {isLocalHost && !isLocal && (
          <Menu as="div" className="relative ml-1">
            <Menu.Button className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer">
              <MoreVertical size={16} />
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-[#1a1b1d] border border-white/10 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-[60] overflow-hidden">
                <div className="p-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleMakeHost}
                        className={`${
                          active ? 'bg-[#5d6bf8] text-white' : 'text-white/70'
                        } group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors cursor-pointer`}
                      >
                        <UserPlus size={14} />
                        Make Host
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleRemoveParticipant}
                        className={`${
                          active ? 'bg-red-500 text-white' : 'text-red-400'
                        } group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors cursor-pointer`}
                      >
                        <UserMinus size={14} />
                        Remove
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        )}
      </div>
    </div>
  );
}

export function ParticipantPanel() {
  const { participants, meetingId } = useMeeting();
  const { setSideBarMode } = useMeetingAppContext();
  const { user } = useAuth();
  const [isLocalHost, setIsLocalHost] = useState(false);
  const participantIds = Array.from(participants.keys());

  // Host Identification (Re-using BottomBar logic)
  useEffect(() => {
    if (!meetingId || !user?._id) return;
    const checkHost = async () => {
        try {
            const res = await getLiveSessionsHistory();
            const session = res.data.data.find((s: any) => s.meetingId === meetingId);
            if (session && session.host) {
                const hostId = typeof session.host === 'string' ? session.host : session.host._id;
                if (hostId === user._id) {
                    setIsLocalHost(true);
                } else {
                    setIsLocalHost(false);
                }
            }
        } catch (err) {
            console.error("Failed to check host status", err);
        }
    };
    checkHost();
  }, [meetingId, user, participants.size]); // Re-check when someone leaves/joins

  // Subscribe to host updates
  usePubSub("HOST_UPDATED", {
    onMessageReceived: (data) => {
        try {
            const { newHostId } = JSON.parse(data.message);
            setIsLocalHost(newHostId === user?._id);
        } catch (e) {
            console.error("Failed to parse host update", e);
        }
    }
  });

  return (
    <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-10 flex flex-col h-full bg-[#0a0b0d] md:bg-[#1a1b1d] border-l border-white/5 w-full md:w-80 shadow-2xl">
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <h3 className="text-white font-bold flex items-center gap-2">
            Participants
            <span className="bg-[#5d6bf8] text-[10px] px-1.5 py-0.5 rounded-full">{participantIds.length}</span>
        </h3>
        <button onClick={() => setSideBarMode(null)} className="text-white/40 hover:text-white cursor-pointer">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {participantIds.map((id) => (
          <ParticipantListItem 
            key={id} 
            participantId={id} 
            isLocalHost={isLocalHost}
            meetingId={meetingId || ""}
          />
        ))}
      </div>
    </div>
  );
}
