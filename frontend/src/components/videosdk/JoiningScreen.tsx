import { useEffect, useRef, useState, useCallback } from "react";
import { MeetingDetailsScreen } from "./MeetingDetailsScreen";
import { createMeeting, getToken, validateMeeting } from "../../api/videosdk";
import { Constants, useMediaDevice } from "@videosdk.live/react-sdk";
import useMediaStream from "../../hooks/useMediaStream";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useMeetingAppContext } from "./MeetingAppContextDef";
import toast from "react-hot-toast";
import { MicSelector, CameraSelector, SpeakerSelector } from "./DeviceSelectors";

interface JoiningScreenProps {
  participantName: string;
  setParticipantName: (name: string) => void;
  setMeetingId: (id: string) => void;
  setToken: (token: string) => void;
  onClickStartMeeting: (id: string) => void;
  micOn: boolean;
  webcamOn: boolean;
  setWebcamOn: (on: boolean) => void;
  setMicOn: (on: boolean) => void;
  customAudioStream: MediaStream | null;
  customVideoStream: MediaStream | null;
  setCustomAudioStream: (stream: MediaStream | null) => void;
  setCustomVideoStream: (stream: MediaStream | null) => void;
  mode?: "create" | "join";
}

export function JoiningScreen({
  participantName,
  setParticipantName,
  setMeetingId,
  setToken,
  onClickStartMeeting,
  micOn,
  webcamOn,
  setWebcamOn,
  setMicOn,
  customAudioStream,
  customVideoStream,
  setCustomAudioStream,
  setCustomVideoStream,
  mode
}: JoiningScreenProps) {
  const {
    selectedWebcam,
    selectedMic,
    setSelectedMic,
    setSelectedWebcam,
    setSelectedSpeaker,
    selectedSpeaker,
    isCameraPermissionAllowed: _isCameraPermissionAllowed,
    isMicrophonePermissionAllowed: _isMicrophonePermissionAllowed,
    setIsCameraPermissionAllowed,
    setIsMicrophonePermissionAllowed,
  } = useMeetingAppContext();

  const [{ webcams, mics, speakers }, setDevices] = useState<{ webcams: any[]; mics: any[]; speakers: any[] }>({
    webcams: [],
    mics: [],
    speakers: [],
  });
  
  const { getVideoTrack, getAudioTrack } = useMediaStream();
  
  const onDeviceChanged = () => {
    getCameraDevices();
    getAudioDevices();
  };

  const {
    checkPermissions,
    getCameras,
    getMicrophones,
    requestPermission,
    getPlaybackDevices,
  } = useMediaDevice({ onDeviceChanged });

  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const webcamRef = useRef<boolean>(webcamOn);
  const micRef = useRef<boolean>(micOn);

  const handleClickJoin = useCallback(async (id: string) => {
    const token = await getToken();
    const { meetingId, err } = await validateMeeting({ roomId: id, token });
    if (meetingId === id) {
      setToken(token);
      setMeetingId(id);
      onClickStartMeeting(id);
    } else {
      toast.error(err || "Invalid meeting ID");
    }
  }, [setToken, setMeetingId, onClickStartMeeting]);

  const handleCreateMeeting = useCallback(async () => {
    const token = await getToken();
    const { meetingId, err } = await createMeeting({ token });
    if (meetingId) {
      setToken(token);
      setMeetingId(meetingId);
      onClickStartMeeting(meetingId);
    }
    return { meetingId, err };
  }, [setToken, setMeetingId, onClickStartMeeting]);

  useEffect(() => { webcamRef.current = webcamOn; }, [webcamOn]);
  useEffect(() => { micRef.current = micOn; }, [micOn]);

  useEffect(() => {
    if (webcamOn && videoTrack) {
      if (videoTrackRef.current && videoTrackRef.current !== videoTrack) {
        videoTrackRef.current.stop();
      }
      videoTrackRef.current = videoTrack;

      if (videoPlayerRef.current) {
        videoPlayerRef.current.srcObject = new MediaStream([videoTrack]);
        videoPlayerRef.current.play().catch(console.error);
      }
    } else {
      if (videoPlayerRef.current) videoPlayerRef.current.srcObject = null;
    }
  }, [webcamOn, videoTrack]);

  useEffect(() => { checkMediaPermission(); }, []);

  // Cleanup tracks on unmount
  useEffect(() => {
    return () => {
      if (customAudioStream) {
        customAudioStream.getTracks().forEach(track => track.stop());
      }
      if (customVideoStream) {
        customVideoStream.getTracks().forEach(track => track.stop());
      }
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
      }
    };
  }, [customAudioStream, customVideoStream]);

  const _toggleWebcam = async () => {
    if (webcamOn) {
      if (videoTrackRef.current) videoTrackRef.current.stop();
      if (customVideoStream) {
        customVideoStream.getTracks().forEach(track => track.stop());
      }
      setVideoTrack(null);
      setCustomVideoStream(null);
      setWebcamOn(false);
    } else {
      await getDefaultMediaTracks({ mic: false, webcam: true });
      setWebcamOn(true);
    }
  };

  const _toggleMic = async () => {
    if (micOn) {
      if (customAudioStream) {
        customAudioStream.getTracks().forEach(track => track.stop());
      }
      setCustomAudioStream(null);
      setMicOn(false);
    } else {
      await getDefaultMediaTracks({ mic: true, webcam: false });
      setMicOn(true);
    }
  };

  const getDefaultMediaTracks = async ({ mic, webcam }: { mic: boolean; webcam: boolean }) => {
    if (mic) {
      const stream = await getAudioTrack({ micId: selectedMic.id });
      if (stream) {
        setCustomAudioStream(stream);
      }
    }

    if (webcam) {
      const stream = await getVideoTrack({ webcamId: selectedWebcam.id });
      if (stream) {
        setCustomVideoStream(stream);
        const tracks = stream.getVideoTracks();
        if (tracks.length > 0) setVideoTrack(tracks[0]);
      }
    }
  };

  const checkMediaPermission = async () => {
    try {
      const perms = await checkPermissions();
      setIsCameraPermissionAllowed(perms.get(Constants.permission.VIDEO) ?? null);
      setIsMicrophonePermissionAllowed(perms.get(Constants.permission.AUDIO) ?? null);

      if (perms.get(Constants.permission.AUDIO)) {
        // Permission already granted, but we don't auto-start the track
        // respecting the user's manual choice
      } else {
        const p = await requestPermission(Constants.permission.AUDIO);
        setIsMicrophonePermissionAllowed(p.get(Constants.permission.AUDIO) ?? null);
      }

      if (perms.get(Constants.permission.VIDEO)) {
        // Permission already granted, but we don't auto-start the track
        // respecting the user's manual choice
      } else {
        const p = await requestPermission(Constants.permission.VIDEO);
        setIsCameraPermissionAllowed(p.get(Constants.permission.VIDEO) ?? null);
      }
      
      getCameraDevices();
      getAudioDevices();
    } catch (e) {
      console.error(e);
    }
  };

  const getCameraDevices = async () => {
    const cams = await getCameras();
    setDevices(d => ({ ...d, webcams: cams }));
    if (cams.length > 0 && !selectedWebcam.id) {
        setSelectedWebcam({ id: cams[0].deviceId, label: cams[0].label });
    }
  };

  const getAudioDevices = async () => {
    const audioMics = await getMicrophones();
    const playbacks = await getPlaybackDevices();
    setDevices(d => ({ ...d, mics: audioMics, speakers: playbacks }));
    if (audioMics.length > 0 && !selectedMic.id) {
        setSelectedMic({ id: audioMics[0].deviceId, label: audioMics[0].label });
    }
    if (playbacks.length > 0 && !selectedSpeaker.id) {
        setSelectedSpeaker({ id: playbacks[0].deviceId, label: playbacks[0].label });
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full max-w-7xl mx-auto py-6 sm:py-12 animate-in fade-in zoom-in-95 duration-500">
      
      <div className="w-full flex flex-col xl:flex-row items-center justify-center gap-8 xl:gap-14">
        
        {/* Left side: Video Preview */}
        <div className="flex flex-col gap-6 w-full max-w-xl">
          <div className="relative bg-surface-dark [html.light_&]:bg-surface-card-light rounded-3xl overflow-hidden aspect-[4/3] w-full flex items-center justify-center border border-border-dark [html.light_&]:border-border-light group ring-1 ring-white/5">
            
            <video
              ref={videoPlayerRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform transition-opacity duration-700 ${webcamOn ? 'scale-x-[-1] opacity-100' : 'opacity-0 hidden'}`}
            />

            {!webcamOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-surface-dark [html.light_&]:bg-surface-card-light">
                 <div className="text-text-dark [html.light_&]:text-text-light text-xl font-bold tracking-tight">The camera is off</div>
              </div>
            )}

            {/* Device Logic Overlays - Repositioned to bottom */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
              <button 
                onClick={_toggleMic}
                className={`p-4 rounded-full border border-border-dark [html.light_&]:border-border-light outline-none cursor-pointer transition-all  active:scale-90 ${micOn ? 'bg-primary/20 hover:bg-primary/30 text-primary' : 'bg-red-500 text-white hover:bg-red-600'}`}
              >
                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button 
                onClick={_toggleWebcam}
                className={`p-4 rounded-full border border-border-dark [html.light_&]:border-border-light outline-none cursor-pointer transition-all  active:scale-90 ${webcamOn ? 'bg-primary/20 hover:bg-primary/30 text-primary' : 'bg-red-500 text-white hover:bg-red-600'}`}
              >
                {webcamOn ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
            </div>
          </div>

          {/* Device Selectors */}
          <div className="relative z-30 flex flex-col md:flex-row w-full md:justify-center gap-4 px-2 transition-opacity">
              <MicSelector 
                  devices={mics} 
                  selectedDevice={selectedMic} 
                  onSelect={(d: any) => {
                      setSelectedMic({ id: d.deviceId, label: d.label });
                      getDefaultMediaTracks({ mic: true, webcam: false });
                  }}
              />
              <CameraSelector 
                  devices={webcams} 
                  selectedDevice={selectedWebcam} 
                  onSelect={(d: any) => {
                      setSelectedWebcam({ id: d.deviceId, label: d.label });
                      getDefaultMediaTracks({ mic: false, webcam: true });
                  }}
              />
              <SpeakerSelector 
                  devices={speakers} 
                  selectedDevice={selectedSpeaker} 
                  onSelect={(d: any) => setSelectedSpeaker({ id: d.deviceId, label: d.label })}
              />
          </div>
        </div>

        {/* Right side: Meeting Details */}
        <div className="w-full max-w-xl shrink-0">
          <MeetingDetailsScreen
            participantName={participantName}
            setParticipantName={setParticipantName}
            micOn={micOn}
            webcamOn={webcamOn}
            initialMode={mode}
            onClickJoin={handleClickJoin}
            _handleOnCreateMeeting={handleCreateMeeting}
          />
        </div>
      </div>
    </div>
  );
}
