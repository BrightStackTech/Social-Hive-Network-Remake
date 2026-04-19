import { useParticipant } from "@videosdk.live/react-sdk";
import { useEffect, useMemo, useRef } from "react";
import { MicOff, Hand } from "lucide-react";
import { useMeetingAppContext } from "./MeetingAppContextDef";

export function ParticipantView({ participantId }: { participantId: string }) {
  const {
    displayName,
    webcamStream,
    micStream,
    webcamOn,
    micOn,
    isLocal,
    isActiveSpeaker,
  } = useParticipant(participantId);

  const { raisedHandsParticipants } = useMeetingAppContext();

  const isHandRaised = useMemo(() => {
    return raisedHandsParticipants.some((p: any) => p.participantId === participantId);
  }, [raisedHandsParticipants, participantId]);

  const micRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (micRef.current) {
      if (micOn && micStream) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(micStream.track);
        micRef.current.srcObject = mediaStream;
        micRef.current.play().catch((err) => console.error("Audio Play Error:", err));
      } else {
        micRef.current.srcObject = null;
      }
    }
  }, [micStream, micOn]);

  useEffect(() => {
    if (videoRef.current) {
      if (webcamOn && webcamStream) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(webcamStream.track);
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((err) => {
            if (err.name !== "AbortError") {
                console.error("Video Play Error:", err);
            }
        });
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [webcamStream, webcamOn]);

  const initials = useMemo(() => {
    if (!displayName) return "?";
    const parts = displayName.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return displayName[0].toUpperCase();
  }, [displayName]);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#1e1e20] h-full w-full flex items-center justify-center border-2 transition-all duration-300 ${isActiveSpeaker ? 'border-[#5d6bf8] ring-4 ring-[#5d6bf8]/20' : 'border-white/5'}`}>
      <audio ref={micRef} autoPlay muted={isLocal} />
      
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        data-participant-id={participantId}
        data-webcam-on={webcamOn}
        data-display-name={displayName}
        className={`w-full h-full object-cover absoute inset-0 ${webcamOn ? 'opacity-100' : 'opacity-0'}`}
        style={{ transform: isLocal ? 'scaleX(-1)' : 'none' }}
      />

      {!webcamOn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1b1d]">
          <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-[#5d6bf8] flex items-center justify-center shadow-[0_0_40px_rgba(93,107,248,0.2)] animate-in fade-in zoom-in-95 duration-500">
            <span className="text-white text-2xl sm:text-4xl font-bold tracking-tighter">
              {initials}
            </span>
          </div>
        </div>
      )}

      {/* Info Overlay */}
      <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 z-10">
        {!micOn && <MicOff size={12} className="text-red-500 sm:w-[14px]" />}
        <span className="text-[10px] sm:text-xs text-white/90 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px] sm:max-w-[120px]">
          {isLocal ? "You" : displayName}
        </span>
      </div>

      {/* Raised Hand Icon - Restored Behavior */}
      {isHandRaised && (
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 transition-all duration-300 transform scale-100 opacity-100">
          <div className="bg-[#fbbf24] text-black p-2 sm:p-2.5 rounded-xl shadow-[0_8px_20px_rgba(251,191,36,0.5)] border border-black/10 ring-2 ring-black/5">
            <Hand size={20} fill="currentColor" strokeWidth={2.5} />
          </div>
        </div>
      )}
    </div>
  );
}
