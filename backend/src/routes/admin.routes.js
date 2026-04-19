import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import {
  getGrowthStats,
  freezeUsersByCollegeId,
  getFrozenUsers,
  unfreezeUser,
  updateAdminPassword,
  searchUsersByEmail
} from '../controllers/admin.controller.js';
import { getAllReports } from '../controllers/report.controller.js';

const router = express.Router();

// Apply auth and admin check to all admin routes
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/growth-stats', getGrowthStats);
router.post('/freeze-by-college', freezeUsersByCollegeId);
router.get('/frozen-users', getFrozenUsers);
router.post('/unfreeze/:userId', unfreezeUser);
router.patch('/update-password', updateAdminPassword);
router.get('/search-users', searchUsersByEmail);
router.get('/all-reports', getAllReports);

export default router;
