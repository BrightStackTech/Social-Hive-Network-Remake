import { Router } from 'express';
import {
  getChats,
  createOrGetOneToOneChat,
  deleteChat,
  createGroupChat,
  createChannelChat,
  pinMessage,
  unpinMessage,
} from '../controllers/chat.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyJWT);

router.route('/').get(getChats);
router.route('/c/oneToOne').post(createOrGetOneToOneChat);
router.route('/c/group').post(createGroupChat);
router.route('/c/channel').post(createChannelChat);
router.route('/delete-chat/:chatId').delete(deleteChat);
router.route('/pin/:chatId/:messageId').patch(pinMessage);
router.route('/unpin/:chatId/:messageId').patch(unpinMessage);

export default router;
