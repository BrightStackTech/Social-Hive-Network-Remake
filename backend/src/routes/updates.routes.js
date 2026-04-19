import express from 'express';
import { 
  createUpdate, 
  getUpdates, 
  deleteUpdateById, 
  incrementViewCount, 
  getViewers, 
  hasUpdates 
} from '../controllers/updates.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply verifyJWT to all routes
router.use(verifyJWT);

router.post('/', createUpdate);
router.get('/:userId', getUpdates);
router.delete('/:updateId', deleteUpdateById);
router.post('/:updateId/view', incrementViewCount);
router.get('/:updateId/viewers', getViewers);
router.get('/has-updates/:userId', hasUpdates);

export default router;
