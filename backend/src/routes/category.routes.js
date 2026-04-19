import express from 'express';
import multer from 'multer';
import { 
  createCategory, 
  getCategories, 
  getCategory, 
  updateCategory, 
  deleteCategory 
} from '../controllers/category.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authMiddleware, upload.single('image'), createCategory);
router.get('/', getCategories);
router.get('/:id', getCategory);
router.put('/:id', authMiddleware, upload.single('image'), updateCategory);
router.delete('/:id', authMiddleware, deleteCategory); 

export default router;
