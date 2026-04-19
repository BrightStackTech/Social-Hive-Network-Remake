import { useMeeting, useParticipant } from "@videosdk.live/react-sdk";
import { useEffect, useRef } from "react";
import { MonitorUp, X } from "lucide-react";

interface PresenterViewProps {
    presenterId: string;
    isLocalPresenter: boolean;
}

export function PresenterView({ presenterId, isLocalPresenter }: PresenterViewProps) {
  const { screenShareStream, screenShareOn } = useParticipant(presenterId);
  const { toggleScreenShare } = useMeeting();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Only mount video if it's NOT the local presenter
    if (videoRef.current && screenShareOn && screenShareStream) {
      const mediaStream = new MediaStream();
      mediaStream.addTrack(screenShareStream.track);
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch((err) => {
        if (err.name !== "AbortError") {
            console.error("Presentation Play Error:", err);
        }
      });
    } else if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
  }, [screenShareStream, screenShareOn, isLocalPresenter]);

  if (isLocalPresenter) {
    return (
        <div className="flex-1 w-full h-full bg-[#0a0b0d] rounded-2xl overflow-hidden relative border border-white/5 flex flex-col items-center justify-center">
            {/* Blurred background video for translucent feedback */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover blur-[80px] opacity-30 pointer-events-none saturate-150"
            />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 z-10">
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col items-center max-w-xl shadow-[0_32px_120px_-12px_rgba(0,0,0,0.6)] text-center ring-1 ring-white/5">
                    <div className="w-20 h-20 rounded-2xl bg-[#5d6bf8] flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(93,107,248,0.4)] animate-in zoom-in duration-500">
                        <MonitorUp size={28} className="text-white" />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">You are presenting to everyone</h2>
                    <p className="text-white/60 mb-6 leading-relaxed max-w-sm">
                        Everything on your screen is currently visible to all participants. Return to this tab to manage your presentation.
                    </p>
                    
                    <button 
                        onClick={() => toggleScreenShare()}
                        className="w-full sm:w-auto px-6 py-4 bg-[#fb554c] hover:bg-[#e44d44] text-white font-bold rounded-2xl transition-all shadow-xl shadow-[#fb554c]/20 active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer group text-lg"
                    >
                        <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        Stop Presenting
                    </button>
                </div>
            </div>
            
            {/* Subtle overlay grid for techy feel */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
        </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full bg-[#1a1b1d] rounded-2xl overflow-hidden relative border border-white/5 shadow-2xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        data-participant-id={presenterId}
        data-webcam-on="true"
        data-display-name="Presentation"
        className="w-full h-full object-contain"
      />
      <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 z-10 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs text-white/90 font-bold uppercase tracking-wider">
          LIVE PRESENTATION
        </span>
      </div>
    </div>
  );
}
