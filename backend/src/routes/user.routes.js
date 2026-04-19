import express from 'express';
import multer from 'multer';
import {
  register,
  login,
  googleRedirect,
  googleCallback,
  updateCollegeBranch,
  sendVerificationEmail,
  verifyEmail,
  sendCollegeVerificationEmail,
  verifyCollegeEmail,
  getProfile,
  searchUsers,
  getFollowList,
  getUserByUsername,
  followUser,
  unfollowUser,
  removeFollower,
  checkUsername,
  updateAccountDetails,
  updatePersonalDetails,
  updateProfilePicture,
  getUserFeed,
  getAccountsToFollow,
  checkEmail,
  requestPasswordReset,
  resetPassword,
  deactivateAccount,
  deleteAccount,
  checkEmailStatus,
  terminateDeletionGoogle,
} from '../controllers/user.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Multer: store file in memory for Cloudinary upload
const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.post('/register', upload.single('profilePicture'), register);
router.post('/login', login);
router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);
router.get('/verify-email', verifyEmail);
router.get('/check-email', checkEmail);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/terminate-deletion-google', terminateDeletionGoogle);


// Protected routes
router.get('/feed', authMiddleware, getUserFeed);
router.get('/recommendations', authMiddleware, getAccountsToFollow);
router.put('/update-college-branch', authMiddleware, updateCollegeBranch);
router.post('/send-verification-email', authMiddleware, sendVerificationEmail);
router.post('/send-college-verification', authMiddleware, sendCollegeVerificationEmail);
router.post('/verify-college-email', authMiddleware, verifyCollegeEmail);
router.get('/profile', authMiddleware, getProfile);
router.get('/search', authMiddleware, searchUsers);
router.get('/check-username', authMiddleware, checkUsername);
router.get('/check-email-status', authMiddleware, checkEmailStatus);
router.get('/user/:username/follow-list', authMiddleware, getFollowList);
router.get('/user/:username', authMiddleware, getUserByUsername);
router.post('/follow/:userId', authMiddleware, followUser);
router.post('/unfollow/:userId', authMiddleware, unfollowUser);
router.post('/remove-follower/:userId', authMiddleware, removeFollower);
router.patch('/update-account-details', authMiddleware, updateAccountDetails);
router.patch('/update-personal-details', authMiddleware, updatePersonalDetails);
router.patch('/update-profile-picture', authMiddleware, upload.single('profilePicture'), updateProfilePicture);
router.post('/deactivate', authMiddleware, deactivateAccount);
router.post('/delete', authMiddleware, deleteAccount);

export default router;

