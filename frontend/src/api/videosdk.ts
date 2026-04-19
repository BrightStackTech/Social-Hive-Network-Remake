const API_BASE_URL = "https://api.videosdk.live";

// This token is intended for development and demo purposes as provided by the user.
export const VIDEOSDK_TOKEN = import.meta.env.VITE_VIDEOSDK_TOKEN;

export const getToken = async () => {
  if (!VIDEOSDK_TOKEN) {
    console.error("VIDEOSDK_TOKEN is missing in environment variables! Checked VITE_VIDEOSDK_TOKEN.");
  }
  return VIDEOSDK_TOKEN;
};

export const createMeeting = async ({ token }: { token: string }) => {
  try {
    const url = `${API_BASE_URL}/v2/rooms`;
    const options = {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json" },
    };

    console.log("VideoSDK: Creating room (POST /v2/rooms)...");
    const response = await fetch(url, options);
    
    if (response.status === 401) {
       const text = await response.text();
       console.error("VideoSDK 401 Unauthorized during Create Room:", text);
       return { meetingId: null, err: "Invalid Token Permissions (401)" };
    }

    const data = await response.json();

    if (data.roomId) {
      console.log("VideoSDK: Room created successfully:", data.roomId);
      return { meetingId: data.roomId, err: null };
    } else {
      console.error("VideoSDK: Meeting creation failed:", data);
      return { meetingId: null, err: data.error || "Unknown error" };
    }
  } catch (error: any) {
    console.error("VideoSDK: Network Error during createMeeting:", error);
    return { meetingId: null, err: error.message };
  }
};

export const validateMeeting = async ({ roomId, token }: { roomId: string; token: string }) => {
  try {
    const url = `${API_BASE_URL}/v2/rooms/validate/${roomId}`;
    const options = {
      method: "GET",
      headers: { Authorization: token, "Content-Type": "application/json" },
    };

    console.log(`VideoSDK: Validating room ${roomId}...`);
    const response = await fetch(url, options);

    if (response.status === 401) {
       console.error("VideoSDK 401 Unauthorized during Validate Room.");
    }

    if (response.status === 400) {
      const data = await response.text();
      return { meetingId: null, err: data };
    }

    const data = await response.json();

    if (data.roomId) {
      return { meetingId: data.roomId, err: null };
    } else {
      return { meetingId: null, err: data.error };
    }
  } catch (error: any) {
    console.error("VideoSDK: Network Error during validateMeeting:", error);
    return { meetingId: null, err: error.message };
  }
};

/**
 * Robust check to see if a participant name is currently in any "active" session globally.
 * Uses the VideoSDK /v2/sessions API.
 */
export const checkUserInActiveSession = async (participantName: string) => {
  try {
    const token = await getToken();
    // Get all active sessions
    const url = `${API_BASE_URL}/v2/sessions`;
    const options = {
      method: "GET",
      headers: { Authorization: token, "Content-Type": "application/json" },
    };

    const response = await fetch(url, options);
    const result = await response.json();

    if (!result.data || !Array.isArray(result.data)) return false;

    // Iterate through active sessions and check participant names
    // Note: This API sometimes only returns high-level data. 
    // If participants are missing from the top level, we might need a fallback,
    // but the user's screenshot suggests they can see them here.
    for (const session of result.data) {
        // Only check ongoing/active sessions
        // VideoSDK sessions 'end' is null for active ones
        if (session.end === null) {
            // Check if participants list exists in this summary
            if (session.participants && Array.isArray(session.participants)) {
                const found = session.participants.some((p: any) => p.name === participantName);
                if (found) return true;
            }
        }
    }

    return false;
  } catch (error) {
    console.error("Error checking active sessions:", error);
    return false;
  }
};
