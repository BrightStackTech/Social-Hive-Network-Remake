import { Router } from 'express';
import { sendMessage, getChatMessages, deleteMessage, getThreadMessages } from '../controllers/message.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyJWT);

router.route('/send-message/:chatId').post(upload.array('attachments', 5), sendMessage);
router.route('/get-messages/:chatId').get(getChatMessages);
router.route('/get-thread-messages/:messageId').get(getThreadMessages);
router.route('/delete-message/:messageId').delete(deleteMessage);

export default router;
