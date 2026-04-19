import { } from "react";

export const useMediaStream = () => {
  const getVideoTrack = async ({ webcamId }: { webcamId: string | null }) => {
    try {
      const constraints = {
        video: webcamId ? { deviceId: { exact: webcamId } } : true,
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      console.log("Error in getVideoTrack", error);
      return null;
    }
  };

  const getAudioTrack = async ({ micId }: { micId: string | null }) => {
    try {
      const constraints = {
        video: false,
        audio: micId ? { deviceId: { exact: micId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      console.log("Error in getAudioTrack", error);
      return null;
    }
  };

  return { getVideoTrack, getAudioTrack };
};

export default useMediaStream;
