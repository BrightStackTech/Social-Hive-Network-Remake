import { useContext, createContext, useState, useEffect, useRef, type ReactNode } from "react";

interface MeetingAppContextType {
  selectedMic: { id: string | null; label: string | null };
  setSelectedMic: (mic: { id: string | null; label: string | null }) => void;
  selectedWebcam: { id: string | null; label: string | null };
  setSelectedWebcam: (webcam: { id: string | null; label: string | null }) => void;
  selectedSpeaker: { id: string | null; label: string | null };
  setSelectedSpeaker: (speaker: { id: string | null; label: string | null }) => void;
  isCameraPermissionAllowed: boolean | null;
  setIsCameraPermissionAllowed: (allowed: boolean | null) => void;
  isMicrophonePermissionAllowed: boolean | null;
  setIsMicrophonePermissionAllowed: (allowed: boolean | null) => void;
  raisedHandsParticipants: any[];
  setRaisedHandsParticipants: (participants: any[]) => void;
  sideBarMode: string | null;
  setSideBarMode: (mode: string | null | ((prev: string | null) => string | null)) => void;
  pipMode: boolean;
  setPipMode: (mode: boolean) => void;
  hasUnreadMessages: boolean;
  setHasUnreadMessages: (unread: boolean) => void;
  useRaisedHandParticipants: () => { participantRaisedHand: (participantId: string) => void };
}

export const MeetingAppContext = createContext<MeetingAppContextType | undefined>(undefined);

export const useMeetingAppContext = () => {
  const context = useContext(MeetingAppContext);
  if (!context) {
    throw new Error('useMeetingAppContext must be used within a MeetingAppProvider');
  }
  return context;
};

export const MeetingAppProvider = ({ children }: { children: ReactNode }) => {
  const [selectedMic, setSelectedMic] = useState<{ id: string | null; label: string | null }>({ id: null, label: null });
  const [selectedWebcam, setSelectedWebcam] = useState<{ id: string | null; label: string | null }>({ id: null, label: null });
  const [selectedSpeaker, setSelectedSpeaker] = useState<{ id: string | null; label: string | null }>({ id: null, label: null });
  const [isCameraPermissionAllowed, setIsCameraPermissionAllowed] = useState<boolean | null>(null);
  const [isMicrophonePermissionAllowed, setIsMicrophonePermissionAllowed] = useState<boolean | null>(null);
  const [raisedHandsParticipants, setRaisedHandsParticipants] = useState<any[]>([]);
  const [sideBarMode, setSideBarMode] = useState<string | null>(null);
  const [pipMode, setPipMode] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const useRaisedHandParticipants = () => {
    const raisedHandsParticipantsRef = useRef<any[]>([]);

    const participantRaisedHand = (participantId: string) => {
      const updatedParticipants = [...raisedHandsParticipantsRef.current];
      const newItem = { participantId, raisedHandOn: new Date().getTime() };
      
      const participantFound = updatedParticipants.findIndex(
        ({ participantId: pID }) => pID === participantId
      );
      
      if (participantFound === -1) {
        updatedParticipants.push(newItem);
      } else {
        updatedParticipants[participantFound] = newItem;
      }
      
      setRaisedHandsParticipants(updatedParticipants);
    };

    useEffect(() => {
      raisedHandsParticipantsRef.current = raisedHandsParticipants;
    }, [raisedHandsParticipants]);

    const _handleRemoveOld = () => {
      const raisedHandsParticipants = [...raisedHandsParticipantsRef.current];
      const now = new Date().getTime();

      const persisted = raisedHandsParticipants.filter(({ raisedHandOn }) => {
        return parseInt(raisedHandOn as any) + 15000 > parseInt(now as any);
      });

      if (raisedHandsParticipants.length !== persisted.length) {
        setRaisedHandsParticipants(persisted);
      }
    };

    useEffect(() => {
      const interval = setInterval(_handleRemoveOld, 1000);
      return () => clearInterval(interval);
    }, []);

    return { participantRaisedHand };
  };

  return (
    <MeetingAppContext.Provider
      value={{
        raisedHandsParticipants,
        selectedMic,
        selectedWebcam,
        selectedSpeaker,
        sideBarMode,
        pipMode,
        hasUnreadMessages,
        isCameraPermissionAllowed,
        isMicrophonePermissionAllowed,
        setRaisedHandsParticipants,
        setSelectedMic,
        setSelectedWebcam,
        setSelectedSpeaker,
        setSideBarMode,
        setPipMode,
        setHasUnreadMessages,
        useRaisedHandParticipants,
        setIsCameraPermissionAllowed,
        setIsMicrophonePermissionAllowed,
      }}
    >
      {children}
    </MeetingAppContext.Provider>
  );
};
