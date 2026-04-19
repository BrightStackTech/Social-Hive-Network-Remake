import { LiveSession } from '../models/livesession.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import axios from "axios";

/**
 * @description Create a new live session
 * @route POST /api/v1/livesessions
 * @access Private
 */
export const createLiveSession = asyncHandler(async (req, res) => {
  const { meetingId, sessionName } = req.body;

  if (!meetingId) {
    throw new ApiError(400, "Meeting ID is required");
  }

  // Check if session already exists
  const existingSession = await LiveSession.findOne({ meetingId });
  if (existingSession) {
    throw new ApiError(400, "A session with this meeting ID already exists");
  }

  const liveSession = await LiveSession.create({
    meetingId,
    title: sessionName || "Untitled session",
    host: req.user._id,
    participants: [req.user._id],
    status: 'active'
  });

  const createdSession = await LiveSession.findById(liveSession._id).populate("host", "username profileImage");

  return res
    .status(201)
    .json(new ApiResponse(201, createdSession, "Live session created successfully"));
});

/**
 * @description Join an existing live session
 * @route POST /api/v1/livesessions/join
 * @access Private
 */
export const joinLiveSession = asyncHandler(async (req, res) => {
  const { meetingId } = req.body;

  if (!meetingId) {
    throw new ApiError(400, "Meeting ID is required");
  }

  const liveSession = await LiveSession.findOne({ meetingId });
  if (!liveSession) {
    throw new ApiError(404, "Live session not found");
  }

  // Check if user is banned
  const banInfo = liveSession.bannedParticipants.find(p => p.userId.toString() === req.user._id.toString());
  if (banInfo && banInfo.isBanned) {
    throw new ApiError(403, "You're banned from this session, cannot join this session");
  }

  // Add participant if not already in the list
  if (!liveSession.participants.includes(req.user._id)) {
    liveSession.participants.push(req.user._id);
    await liveSession.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, liveSession, "Joined live session successfully"));
});

/**
 * @description Get past live sessions history for the user
 * @route GET /api/v1/livesessions/history
 * @access Private
 */
export const getLiveSessionsHistory = asyncHandler(async (req, res) => {
  // Use req.user (set via verifyJWT middleware) to filter sessions.
  const userId = req.user._id;
  
  // 1. Fetch sessions from DB (exclude if user has hidden it)
  const sessions = await LiveSession.find({ 
    participants: userId,
    hiddenFromUsers: { $ne: userId }
  })
    .populate("participants", "username profileImage")
    .populate("host", "username profileImage");

  const updatedSessions = await Promise.all(sessions.map(async (session) => {
    // Safety check: Only sync if no recordings found yet AND the session is at least 3 minutes old
    // Use either session.createdAt or startTime
    const sessionAge = Date.now() - new Date(session.startTime || session.createdAt).getTime();
    const THREE_MINUTES = 3 * 60 * 1000;

    if ((!session.recordings || session.recordings.length === 0) && sessionAge > THREE_MINUTES) {
        try {
            const token = process.env.VIDEOSDK_TOKEN;
            
            if (token) {
                const response = await axios.get(
                  `https://api.videosdk.live/v2/recordings?roomId=${session.meetingId}`,
                  { headers: { Authorization: token } }
                );
                
                const rawRecordings = response.data?.data;
                if (rawRecordings && Array.isArray(rawRecordings) && rawRecordings.length > 0) {
                  // Follow the reference structure: entry.file.fileUrl
                  const processedRecordings = rawRecordings
                    .filter(entry => entry.file && entry.file.fileUrl)
                    .map(entry => entry.file.fileUrl);

                  if (processedRecordings.length > 0) {
                      session.recordings = processedRecordings;
                      // Also store the latest in recordingUrl for backward compatibility/modal view
                      session.recordingUrl = processedRecordings[0];
                      await session.save();
                      console.log(`[VideoSDK LazySync] Auto-fetched ${processedRecordings.length} recordings for ${session.meetingId}`);
                  }
                } 
            }
        } catch (error) {
            console.error(`[VideoSDK LazySync] Failed for ${session.meetingId}: ${error.message}`);
        }
    }
    return session;
  }));

  return res.status(200).json(new ApiResponse(200, updatedSessions, "History fetched successfully"));
});

/**
 * @description Update session title
 * @route PATCH /api/v1/livesessions/title/:meetingId
 * @access Private (Host only)
 */
export const updateSessionTitle = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const { newTitle } = req.body;

  if (!newTitle) {
    throw new ApiError(400, "New title is required");
  }

  const liveSession = await LiveSession.findOneAndUpdate(
    { meetingId, host: req.user._id },
    { title: newTitle },
    { new: true }
  );

  if (!liveSession) {
    throw new ApiError(404, "Live session not found or you are not the host");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, liveSession, "Session title updated successfully"));
});

/**
 * @description Terminate a live session
 * @route PATCH /api/v1/livesessions/terminate/:meetingId
 * @access Private (Host only)
 */
export const terminateLiveSession = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;

  const liveSession = await LiveSession.findOneAndUpdate(
    { meetingId, host: req.user._id },
    { 
      status: 'ended',
      terminatedAt: new Date()
    },
    { new: true }
  );

  if (!liveSession) {
    throw new ApiError(404, "Live session not found or you are not the host");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, liveSession, "Session terminated successfully"));
});

/**
 * @description Update recording URL
 * @route PATCH /api/v1/livesessions/recording/:meetingId
 * @access Private
 */
export const updateRecordingURL = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  let { recordingUrl, recordings } = req.body;

  console.log(`[VideoSDK Sync] Manual sync trigger for meeting: ${meetingId}`);

  // If data not provided in body, fetch from VideoSDK API
  if (!recordings || recordings.length === 0) {
    try {
      const token = process.env.VIDEOSDK_TOKEN;
      if (!token) {
        console.error("[VideoSDK Sync] Error: VIDEOSDK_TOKEN is missing in .env");
      }

      const response = await axios.get(
        `https://api.videosdk.live/v2/recordings?roomId=${meetingId}`,
        { headers: { Authorization: token } }
      );
      
      console.log(`[VideoSDK Sync] API Status: ${response.status} for ${meetingId}`);
      
      const rawData = response.data?.data;
      if (rawData && Array.isArray(rawData) && rawData.length > 0) {
        // Follow reference: entry.file.fileUrl
        recordings = rawData
          .filter(entry => entry.file && entry.file.fileUrl)
          .map(entry => entry.file.fileUrl);
        
        if (recordings.length > 0) {
            recordingUrl = recordings[0];
            console.log(`[VideoSDK Sync] Found ${recordings.length} recordings`);
        }
      } else {
        console.log(`[VideoSDK Sync] No recordings found for room ${meetingId}`);
      }
    } catch (error) {
      console.error(`[VideoSDK Sync] Error fetching recording: ${error.message}`);
    }
  }

  const liveSession = await LiveSession.findOne({ meetingId });
  if (!liveSession) {
    throw new ApiError(404, "Live session not found");
  }

  if (recordings && recordings.length > 0) {
      liveSession.recordings = recordings;
      liveSession.recordingUrl = recordingUrl || recordings[0];
      await liveSession.save();
      
      return res.status(200).json(new ApiResponse(200, liveSession, "Recording links updated successfully"));
  }

  throw new ApiError(404, "No recordings available to sync");
});

/**
 * @description Delete a live session history record
 * @route DELETE /api/v1/livesessions/:meetingId
 * @access Private (Host only)
 */
export const deleteLiveSession = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;

  const liveSession = await LiveSession.findOneAndDelete({
    meetingId,
    host: req.user._id
  });

  if (!liveSession) {
    throw new ApiError(404, "Live session not found or you are not authorized to delete it");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Session deleted successfully from history"));
});

/**
 * @description Kick a participant and track strike count
 * @route POST /api/v1/livesessions/kick/:meetingId
 * @access Private (Host only)
 */
export const kickParticipant = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const { userIdToKick } = req.body;

  if (!userIdToKick) {
    throw new ApiError(400, "User ID to kick is required");
  }

  const liveSession = await LiveSession.findOne({ meetingId });

  if (!liveSession) {
    throw new ApiError(404, "Live session not found");
  }

  // Verify host
  if (liveSession.host.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the host can kick participants");
  }

  // Find or create ban entry
  let banIndex = liveSession.bannedParticipants.findIndex(p => p.userId.toString() === userIdToKick.toString());

  if (banIndex === -1) {
    liveSession.bannedParticipants.push({
      userId: userIdToKick,
      kickCount: 1,
      isBanned: false
    });
  } else {
    liveSession.bannedParticipants[banIndex].kickCount += 1;
    if (liveSession.bannedParticipants[banIndex].kickCount >= 3) {
      liveSession.bannedParticipants[banIndex].isBanned = true;
    }
  }

  await liveSession.save();

  return res.status(200).json(new ApiResponse(200, liveSession, "Participant kicked and count updated"));
});

/**
 * @description Transfer host role to another participant
 * @route POST /api/v1/livesessions/transfer-host/:meetingId
 * @access Private (Host only)
 */
export const transferHost = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const { newHostId } = req.body;

  if (!newHostId) {
    throw new ApiError(400, "New host ID is required");
  }

  const liveSession = await LiveSession.findOne({ meetingId });

  if (!liveSession) {
    throw new ApiError(404, "Live session not found");
  }

  // Verify current host
  if (liveSession.host.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the current host can transfer host role");
  }

  liveSession.host = newHostId;
  await liveSession.save();

  return res.status(200).json(new ApiResponse(200, liveSession, "Host role transferred successfully"));
});

/**
 * @description Hide a session from personal history
 * @route PATCH /api/v1/livesessions/hide/:meetingId
 * @access Private
 */
export const hideSessionFromHistory = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const userId = req.user._id;

  const liveSession = await LiveSession.findOne({ meetingId });

  if (!liveSession) {
    throw new ApiError(404, "Live session not found");
  }

  // Add user to hidden list if not already there
  if (!liveSession.hiddenFromUsers.includes(userId)) {
    liveSession.hiddenFromUsers.push(userId);
    await liveSession.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Session hidden from your history successfully"));
});
