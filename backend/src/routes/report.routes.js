import express from 'express';
import multer from 'multer';
import { createReport } from '../controllers/report.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/create', authMiddleware, upload.single('media'), createReport);

export default router;
