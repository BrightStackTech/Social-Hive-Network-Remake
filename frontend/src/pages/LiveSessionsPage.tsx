import { useState } from "react";
import { JoiningScreen } from "../components/videosdk/JoiningScreen";
import { MeetingAppProvider } from "../components/videosdk/MeetingAppContextDef";
import { History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LiveSessionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [participantName, setParticipantName] = useState<string>(user?.username || "");
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
      <div className="w-full min-h-[90vh] bg-background-dark [html.light_&]:bg-background-light text-text-dark [html.light_&]:text-text-light p-6 md:p-10 flex flex-col font-sans relative">
        
        {/* Simplified Header */}
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
           <div>
              <h1 className="text-3xl font-display font-bold text-text-dark [html.light_&]:text-text-light mb-2">
                Live sessions
              </h1>
              <p className="text-white/40 [html.light_&]:text-text-muted-light font-medium text-lg">Host or join live sessions with your classmates.</p>
           </div>
          
          <button
            onClick={() => navigate('/live-sessions/history')}
            className="flex items-center self-start md:self-auto gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-xl active:scale-95 cursor-pointer text-base group"
          >
            <History size={20} className="group-hover:rotate-12 transition-transform" />
            View past session logs
          </button>
        </div>

        {/* Centered Lobby Content */}
        <div className="flex-1 flex items-center justify-center -mt-10">
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
          />
        </div>
      </div>
    </MeetingAppProvider>
  );
};

export default LiveSessionsPage;
