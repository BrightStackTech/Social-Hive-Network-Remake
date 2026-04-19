import express from 'express';
import multer from 'multer';
import {
  createPost,
  getUserPosts,
  getPostById,
  deletePost,
  likePost,
  createRepost,
  getUserReposts,
  getUserLikedPosts,
  getUserSavedPosts,
  getUserCommunityPosts,
  sharePost,
  savePost,
  getPostParticipants,
  searchPosts,
  updatePost
} from '../controllers/post.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Protected specific routes before generic public routes to avoid collisions
router.get('/user/saved', authMiddleware, getUserSavedPosts);
router.get('/user/community', authMiddleware, getUserCommunityPosts);

// Public
router.get('/user/:username', getUserPosts);
router.get('/user/:username/reposts', getUserReposts);
router.get('/user/:username/liked', getUserLikedPosts);
router.get('/search', searchPosts);
router.get('/:postId', getPostById);
router.get('/:postId/participants', getPostParticipants);

// Protected Actions
router.post('/create', authMiddleware, upload.array('media', 10), createPost);
router.delete('/:postId', authMiddleware, deletePost);
router.post('/:postId/like', authMiddleware, likePost);
router.post('/repost', authMiddleware, createRepost);
router.post('/:postId/share', authMiddleware, sharePost);
router.post('/:postId/save', authMiddleware, savePost);
router.put('/:postId', authMiddleware, upload.array('media', 10), updatePost);

export default router;
