import { Router } from 'express';
import { 
    createChannel, 
    getAllChannels, 
    getMyChannels, 
    getChannel, 
    joinChannel, 
    leaveChannel,
    updateChannelDetails,
    deleteChannel,
    getPendingRequests,
    acceptRequest,
    rejectRequest,
    removeFromChannel,
    cancelJoinRequest,
    changeChannelAdmin
} from '../controllers/channel.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = Router();

// All channel routes require authentication
router.use(verifyJWT);

router.route('/create-channel').post(createChannel);
router.route('/all').get(getAllChannels);
router.route('/my-channels').get(getMyChannels);
router.route('/:channelId').get(getChannel);
router.route('/:channelId/join').post(joinChannel);
router.route('/:channelId/leave').post(leaveChannel);

// Admin Routes
router.route('/:channelId/settings').patch(updateChannelDetails);
router.route('/:channelId/delete').delete(deleteChannel);
router.route('/:channelId/requests').get(getPendingRequests);
router.route('/:channelId/requests/:userId/accept').post(acceptRequest);
router.route('/:channelId/requests/:userId/reject').post(rejectRequest);
router.route('/:channelId/members/:userId/remove').post(removeFromChannel);
router.route('/:channelId/requests/cancel').post(cancelJoinRequest);
router.route('/:channelId/admin/:userId').patch(changeChannelAdmin);

export default router;
