import express from 'express';
import multer from 'multer';
import {
  createGroup,
  isGroupNameUnique,
  getGroup,
  getGroupForVisitors,
  getMyGroups,
  requestToJoinGroup,
  acceptRequest,
  rejectRequest,
  addToGroup,
  removeFromGroup,
  exitFromGroup,
  deleteGroup,
  updateGroupDetails,
  changeGroupAdmin,
  addNotice,
  deleteNotice,
  clearAllNotices,
  updateGroupProfilePicture,
} from '../controllers/group.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyJWT);

router.route('/create-group').post(createGroup);
router.route('/is-name-unique').post(isGroupNameUnique);
router.route('/get-group/:groupId').get(getGroup);
router.route('/get-group-for-visitors/:groupId').get(getGroupForVisitors);
router.route('/get-my-groups').get(getMyGroups);
router.route('/request-to-join-group/:groupId').post(requestToJoinGroup);
router.route('/accept-request/:userId/:groupId').post(acceptRequest);
router.route('/reject-request/:userId/:groupId').post(rejectRequest);
router.route('/add-member/:userId/:groupId').post(addToGroup);
router.route('/remove-from-group/:userId/:groupId').post(removeFromGroup);
router.route('/exit-from-group/:groupId').post(exitFromGroup);
router.route('/delete-group/:groupId').delete(deleteGroup);
router.route('/update-group-details/:groupId').patch(updateGroupDetails);
router.route('/change-admin/:userId/:groupId').post(changeGroupAdmin);
router.route('/add-notice/:groupId').post(addNotice);
router.route('/delete-notice/:groupId/:noticeId').delete(deleteNotice);
router.route('/clear-notices/:groupId').delete(clearAllNotices);
router.route('/update-group-profile-picture/:groupId').patch(upload.single('profilePicture'), updateGroupProfilePicture);

export default router;
