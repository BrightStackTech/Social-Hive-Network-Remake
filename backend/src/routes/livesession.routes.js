import { Router } from "express";
import {
  createLiveSession,
  joinLiveSession,
  getLiveSessionsHistory,
  updateSessionTitle,
  terminateLiveSession,
  updateRecordingURL,
  deleteLiveSession,
  kickParticipant,
  transferHost,
  hideSessionFromHistory,
} from "../controllers/livesession.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// Secure routes
router.use(verifyJWT);

router.route("/").post(createLiveSession);
router.route("/join").post(joinLiveSession);
router.route("/history").get(getLiveSessionsHistory);
router.route("/title/:meetingId").patch(updateSessionTitle);
router.route("/terminate/:meetingId").patch(terminateLiveSession);
router.route("/recording/:meetingId").patch(updateRecordingURL);
router.route("/recordings/:meetingId").patch(updateRecordingURL);
router.route("/kick/:meetingId").post(kickParticipant);
router.route("/transfer-host/:meetingId").post(transferHost);
router.route("/hide/:meetingId").patch(hideSessionFromHistory);
router.route("/:meetingId").delete(deleteLiveSession);

export default router;
