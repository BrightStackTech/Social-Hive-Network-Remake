import { useState } from "react";
import { JoiningScreen } from "../components/videosdk/JoiningScreen";
import { MeetingAppProvider } from "../components/videosdk/MeetingAppContextDef";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CreateSessionPage = () => {
  const navigate = useNavigate();
  const [participantName, setParticipantName] = useState<string>("");
  const [micOn, setMicOn] = useState<boolean>(false);
  const [webcamOn, setWebcamOn] = useState<boolean>(false);
  const [_token, setToken] = useState<string>("");
  const [_meetingId, setMeetingId] = useState<string | null>(null);
  const [customAudioStream, setCustomAudioStream] = useState<MediaStream | null>(null);
  const [customVideoStream, setCustomVideoStream] = useState<MediaStream | null>(null);

  const onClickStartMeeting = (id: string) => {
    navigate(`/live-session-room/${id}?name=${encodeURIComponent(participantName)}&mic=${micOn}&webcam=${webcamOn}`);
  };

  return (
    <MeetingAppProvider>
      <div className="w-full min-h-screen [html.light_&]:bg-surface-card-light bg-[#0a0b0d] text-white flex flex-col font-sans px-6 md:px-10 relative pb-6">
        <div className="max-w-7xl mx-auto pt-4 w-full">
           <button 
              onClick={() => navigate('/live-sessions')}
              className="flex items-center gap-2 text-white/60 [html.light_&]:text-text-muted-light  hover:text-white transition-colors mb-4 group cursor-pointer"
           >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium text-lg tracking-tight">Back</span>
           </button>
           
           <div className="mb-4">
              <h1 className="text-2xl font-display font-bold text-text-dark [html.light_&]:text-text-light mb-2">
                Host a New Session
              </h1>
              <p className="text-white/40 font-medium">Configure your devices and session name before going live.</p>
           </div>
        </div>

        <div className="flex-1 flex items-center justify-center -mt-24 sm:-mt-10">
          <JoiningScreen
            participantName={participantName}
            setParticipantName={setParticipantName}
            setMeetingId={setMeetingId}
            setToken={setToken}
            onClickStartMeeting={onClickStartMeeting}
            micOn={micOn}
            webcamOn={webcamOn}
            setWebcamOn={setWebcamOn}
            setMicOn={setMicOn}
            customAudioStream={customAudioStream}
            customVideoStream={customVideoStream}
            setCustomAudioStream={setCustomAudioStream}
            setCustomVideoStream={setCustomVideoStream}
            mode="create" 
          />
        </div>
      </div>
    </MeetingAppProvider>
  );
};

export default CreateSessionPage;
