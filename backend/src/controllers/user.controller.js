import User from '../models/user.model.js';
import { Post } from '../models/post.model.js';
import { Comment } from '../models/comment.model.js';
import { ComPost, ComComment, ComReply } from '../models/compost.model.js';
import { Chat } from '../models/chat.model.js';
import { ChatMessage } from '../models/message.model.js';
import { Group } from '../models/group.model.js';
import { Channel } from '../models/channel.model.js';
import { Community } from '../models/community.model.js';
import { Category } from '../models/category.model.js';
import { LiveSession } from '../models/livesession.model.js';
import { Update } from '../models/updates.model.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import Mailjet from 'node-mailjet';

// Helper: generate access token
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Helper: generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ─── REGISTER ────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    console.log('Register request body:', { username, email, hasPassword: !!password });
    console.log('Register file:', req.file ? { name: req.file.originalname, size: req.file.size } : 'No file');

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check existing user
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });
    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Upload profile picture to Cloudinary if provided
    let profilePictureUrl = '';
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const uploadResult = await cloudinary.uploader.upload(dataURI, {
        folder: 'image/upload',
      });
      profilePictureUrl = uploadResult.secure_url;
      console.log('Cloudinary upload success:', profilePictureUrl);
    }

    // Create user
    const user = await User.create({
      username: username.toLowerCase().replace(/\s/g, ''),
      email: email.toLowerCase(),
      password,
      profilePicture: profilePictureUrl,
      isEmailVerified: false,
      loginType: 'email',
    });

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

// ─── LOGIN ───────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: email.toLowerCase() },
      ],
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.isDeletionScheduled) {
      if (!req.body.confirmDeletionTermination) {
        const scheduledDate = new Date(user.deletionScheduleDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - scheduledDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const remainingDays = Math.max(0, 7 - diffDays);

        return res.status(403).json({
          requiresDeletionTermination: true,
          remainingDays,
          message: `You've previously set this account for deletion. Terminate Deletion Process? (${remainingDays} days left until permanent deletion)`
        });
      } else {
        user.isDeletionScheduled = false;
        user.deletionScheduleDate = undefined;
        user.isFreezed = false;
      }
    }

    if (user.isFreezed) {
      if (user.frozenByAdmin) {
        return res.status(403).json({ 
          message: 'Your account has been freezed, please contact the support mail for further details.',
          isFreezed: true
        });
      } else if (!req.body.confirmReactivation) {
        return res.status(403).json({
          requiresReactivation: true,
          message: 'This action will reactivate your account, are you sure you want to log in?'
        });
      } else {
        user.isFreezed = false;
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      message: 'Login successful',
      token: accessToken,
      refreshToken,
      user: {
        _id: user._id,
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        college: user.college,
        engineeringDomain: user.engineeringDomain,
        isEmailVerified: user.isEmailVerified,
        bio: user.bio,
        followers: user.followers,
        following: user.following,
        posts: user.posts,
        yearOfGraduation: user.yearOfGraduation,
        showYearOfGraduation: user.showYearOfGraduation,
        loginType: user.loginType,
        isAdmin: user.isAdmin,
        isFreezed: user.isFreezed,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

// ─── GOOGLE OAUTH: REDIRECT TO GOOGLE ────────────────────
export const googleRedirect = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL;

  const scope = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ].join(' ');

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&prompt=consent`;

  return res.redirect(authUrl);
};

// ─── GOOGLE OAUTH: CALLBACK ─────────────────────────────
export const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Google token error:', tokenData);
      return res.redirect(`${process.env.CLIENT_URL}/login?error=google_token_failed`);
    }

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userInfoResponse.json();

    if (!googleUser.email) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=google_no_email`);
    }

    // Enhance resolution of Google picture if present
    let googlePicture = googleUser.picture || '';
    if (googlePicture && googlePicture.includes('googleusercontent.com')) {
      // Replace size parameter with s360-c for better resolution
      googlePicture = googlePicture.replace(/=s\d+-c/g, '=s360-c');
      if (!googlePicture.includes('=s')) {
        googlePicture = googlePicture.includes('?') ? `${googlePicture}&sz=360` : `${googlePicture}?sz=360`;
      }
    }

    // Find or create user
    let user = await User.findOne({
      email: googleUser.email.toLowerCase(),
    });

    if (user) {
      // Link existing email account to Google
      if (user.loginType !== 'google') {
        user.loginType = 'google';
        user.password = googleUser.id; // Using google ID as temporary password
        user.isEmailVerified = true;
      }
      
      // Migrate to Cloudinary if currently using a Google URL or missing
      if (googlePicture && (!user.profilePicture || user.profilePicture.includes('googleusercontent.com'))) {
        try {
          const uploadResult = await cloudinary.uploader.upload(googlePicture, {
            folder: 'image/upload',
          });
          user.profilePicture = uploadResult.secure_url;
        } catch (uploadError) {
          console.error('Cloudinary upload error for existing Google user:', uploadError);
          if (!user.profilePicture) user.profilePicture = googlePicture;
        }
      }

      if (user.isDeletionScheduled) {
        const scheduledDate = new Date(user.deletionScheduleDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - scheduledDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const remainingDays = Math.max(0, 7 - diffDays);

        const deletionToken = jwt.sign(
          { id: user._id, email: user.email, action: 'terminate_deletion' },
          process.env.JWT_SECRET,
          { expiresIn: '5m' }
        );

        return res.redirect(
          `${process.env.CLIENT_URL}/login?deletion_pending=true&email=${encodeURIComponent(user.email)}&days=${remainingDays}&deletion_token=${deletionToken}`
        );
      }

      if (user.isFreezed) {
        if (user.frozenByAdmin) {
          return res.redirect(`${process.env.CLIENT_URL}/login?error=account_freezed`);
        } else {
          user.isFreezed = false;
        }
      }
    } else {
      // Create new user from Google profile
      const baseUsername = googleUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
      let username = baseUsername;
      let counter = 1;

      // Ensure unique username
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      let profilePictureUrl = googlePicture;
      if (googlePicture) {
        try {
          const uploadResult = await cloudinary.uploader.upload(googlePicture, {
            folder: 'image/upload',
          });
          profilePictureUrl = uploadResult.secure_url;
        } catch (uploadError) {
          console.error('Cloudinary upload error for new Google user:', uploadError);
        }
      }

      user = new User({
        username,
        email: googleUser.email.toLowerCase(),
        password: googleUser.id,
        profilePicture: profilePictureUrl || '',
        loginType: 'google',
        isEmailVerified: true,
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Redirect to frontend with tokens
    const frontendUrl =
      `${process.env.CLIENT_URL}/auth/google/callback` +
      `?token=${encodeURIComponent(accessToken)}` +
      `&refreshToken=${encodeURIComponent(refreshToken)}` +
      `&user=${encodeURIComponent(JSON.stringify({
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        college: user.college,
        engineeringDomain: user.engineeringDomain,
        isEmailVerified: user.isEmailVerified,
        bio: user.bio,
        followers: user.followers,
        following: user.following,
        posts: user.posts,
        yearOfGraduation: user.yearOfGraduation,
        showYearOfGraduation: user.showYearOfGraduation,
        loginType: user.loginType,
      }))}`;

    return res.redirect(frontendUrl);
  } catch (error) {
    console.error('Google callback error:', error);
    return res.redirect(`${process.env.CLIENT_URL}/login?error=google_server_error`);
  }
};

// ─── UPDATE COLLEGE & BRANCH ─────────────────────────────
export const updateCollegeBranch = async (req, res) => {
  try {
    const { college, engineeringDomain } = req.body;

    if (!college || !engineeringDomain) {
      return res.status(400).json({ message: 'College and branch are required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { college, engineeringDomain },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'College and branch updated',
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Update college error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── SEND VERIFICATION EMAIL ─────────────────────────────
export const sendVerificationEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Generate token
    const verificationToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    user.emailVerificationToken = verificationToken;
    user.emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    // Configure Mailjet
    const mailjet = Mailjet.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_SECRET_KEY
    );

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

    const result = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: 'brightstack.work.01@gmail.com',
            Name: 'Social Hive',
          },
          To: [
            {
              Email: user.email,
              Name: user.username,
            },
          ],
          Subject: 'Verify your email - Social Hive',
          HTMLPart: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0f1a; border-radius: 16px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #4361ee, #6c63ff); padding: 32px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 28px;">Social Hive</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Email Verification</p>
              </div>
              <div style="padding: 32px; color: #f1f5f9;">
                <p style="font-size: 16px; line-height: 1.6;">Hello <strong>${user.username}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6;">Please click the button below to verify your email address:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #4361ee, #6c63ff); color: #fff; text-decoration: none; padding: 14px 40px; border-radius: 12px; font-size: 16px; font-weight: 600;">
                    Verify Email
                  </a>
                </div>
                <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">This link will expire in 24 hours. If you did not create an account, please ignore this email.</p>
              </div>
              <div style="background: #111827; padding: 16px; text-align: center;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">&copy; 2026 Social Hive. All rights reserved.</p>
              </div>
            </div>
          `,
        },
      ],
    });

    console.log('Verification email sent successfully:', result.body);

    return res.status(200).json({
      message: 'Verification email sent',
      email: user.email,
    });
  } catch (error) {
    console.error('Send verification email error:', error);
    return res.status(500).json({ message: 'Failed to send verification email', error: error.message });
  }
};

// ─── VERIFY EMAIL ────────────────────────────────────────
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({ message: 'Email already verified' });
    }

    if (user.emailVerificationToken !== token) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    if (user.emailVerificationTokenExpiry && user.emailVerificationTokenExpiry < new Date()) {
      return res.status(400).json({ message: 'Verification token has expired' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = '';
    user.emailVerificationTokenExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ message: 'Server error during email verification' });
  }
};

// ─── SEND COLLEGE EMAIL VERIFICATION ─────────────────────
export const sendCollegeVerificationEmail = async (req, res) => {
  try {
    const { collegeEmail } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!collegeEmail || !/^[a-z0-9._%+-]+@(nmims\.in|svkmmumbai\.onmicrosoft\.com|nmims\.edu)$/i.test(collegeEmail)) {
      return res.status(400).json({ message: 'Please provide a valid college email (@nmims.in, @svkmmumbai.onmicrosoft.com, or @nmims.edu)' });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.collegeEmail = collegeEmail.toLowerCase();
    user.isCollegeEmailVerified = false;
    user.collegeEmailVerificationToken = otp;
    user.collegeEmailVerificationTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await user.save({ validateBeforeSave: false });

    // Send OTP via Mailjet
    const mailjet = Mailjet.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_SECRET_KEY
    );

    await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: 'brightstack.work.01@gmail.com',
            Name: 'Social Hive',
          },
          To: [
            {
              Email: collegeEmail.toLowerCase(),
              Name: user.username,
            },
          ],
          Subject: 'College Email Verification - Social Hive',
          HTMLPart: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0f1a; border-radius: 16px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #4361ee, #6c63ff); padding: 32px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 28px;">Social Hive</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">College Email Verification</p>
              </div>
              <div style="padding: 32px; color: #f1f5f9;">
                <p style="font-size: 16px; line-height: 1.6;">Hello <strong>${user.username}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6;">Your verification code is:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <div style="display: inline-block; background: linear-gradient(135deg, #4361ee, #6c63ff); color: #fff; padding: 16px 48px; border-radius: 12px; font-size: 32px; font-weight: 700; letter-spacing: 8px;">
                    ${otp}
                  </div>
                </div>
                <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
              </div>
              <div style="background: #111827; padding: 16px; text-align: center;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">&copy; 2026 Social Hive. All rights reserved.</p>
              </div>
            </div>
          `,
        },
      ],
    });

    console.log('College verification OTP sent to:', collegeEmail);

    return res.status(200).json({
      message: 'Verification code sent to your college email',
    });
  } catch (error) {
    console.error('Send college verification email error:', error);
    return res.status(500).json({ message: 'Failed to send verification email', error: error.message });
  }
};

// ─── VERIFY COLLEGE EMAIL OTP ────────────────────────────
export const verifyCollegeEmail = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!otp) {
      return res.status(400).json({ message: 'Verification code is required' });
    }

    if (user.isCollegeEmailVerified) {
      return res.status(200).json({ message: 'College email already verified', verified: true });
    }

    if (user.collegeEmailVerificationToken !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (user.collegeEmailVerificationTokenExpiry && user.collegeEmailVerificationTokenExpiry < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    user.isCollegeEmailVerified = true;
    user.collegeEmailVerificationToken = '';
    user.collegeEmailVerificationTokenExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ message: 'College email verified successfully', verified: true });
  } catch (error) {
    console.error('Verify college email error:', error);
    return res.status(500).json({ message: 'Server error during verification' });
  }
};

// ─── GET PROFILE ─────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshToken -emailVerificationToken');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const freezedUsers = await User.find({ isFreezed: true }).select('_id');
    const excludeIds = freezedUsers.map(a => a._id.toString());

    const userObj = user.toObject();
    userObj.followers = userObj.followers.filter(id => !excludeIds.includes(id.toString()));
    userObj.following = userObj.following.filter(id => !excludeIds.includes(id.toString()));

    return res.status(200).json({ user: userObj });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── SEARCH USERS ────────────────────────────────────────
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(200).json({ users: [] });
    }

    const users = await User.find({
      username: { $regex: q.trim(), $options: 'i' },
      _id: { $ne: req.user.id },
      isAdmin: { $ne: true },
      isFreezed: { $ne: true }
    })
      .select('username profilePicture college engineeringDomain')
      .limit(20);

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET FOLLOWERS / FOLLOWING LIST ──────────────────────
export const getFollowList = async (req, res) => {
  try {
    const { username } = req.params;
    const { type } = req.query; // 'followers' or 'following'

    if (!type || !['followers', 'following'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Use "followers" or "following".' });
    }

    const user = await User.findOne({ username: username.toLowerCase() })
      .populate({
        path: type,
        match: { isAdmin: { $ne: true }, isFreezed: { $ne: true } },
        select: 'username profilePicture college'
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Still need to filter out the null results from the match
    const filteredList = user[type].filter(u => u !== null);

    return res.status(200).json({ users: filteredList });
  } catch (error) {
    console.error('Get follow list error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET USER BY USERNAME (public profile) ───────────────
export const getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user.id;

    const user = await User.findOne({ username: username.toLowerCase() })
      .select('-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry');

    if (!user || user.isFreezed) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hiding admin profile from standard users
    const requester = await User.findById(currentUserId);
    if (user.isAdmin && (!requester || !requester.isAdmin)) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check follow relationships
    const isFollowing = user.followers.some((id) => id.toString() === currentUserId);
    const isFollowedBy = user.following.some((id) => id.toString() === currentUserId);

    const freezedUsers = await User.find({ isFreezed: true }).select('_id');
    const excludeIds = freezedUsers.map(a => a._id.toString());

    const userObj = user.toObject();
    userObj.followers = userObj.followers.filter(id => !excludeIds.includes(id.toString()));
    userObj.following = userObj.following.filter(id => !excludeIds.includes(id.toString()));

    return res.status(200).json({
      user: userObj,
      isFollowing,
      isFollowedBy,
      isMutual: isFollowing && isFollowedBy,
    });
  } catch (error) {
    console.error('Get user by username error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── FOLLOW USER ─────────────────────────────────────────
export const followUser = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId } = req.params;

    if (currentUserId === userId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already following
    if (targetUser.followers.includes(currentUserId)) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    // Add current user to target's followers, add target to current user's following
    await User.findByIdAndUpdate(userId, { $addToSet: { followers: currentUserId } });
    await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: userId } });

    // Check if mutual
    const currentUser = await User.findById(currentUserId);
    const isMutual = targetUser.following.some((id) => id.toString() === currentUserId);

    return res.status(200).json({
      message: 'Followed successfully',
      isFollowing: true,
      isMutual,
    });
  } catch (error) {
    console.error('Follow user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── UNFOLLOW USER ───────────────────────────────────────
export const unfollowUser = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId } = req.params;

    if (currentUserId === userId) {
      return res.status(400).json({ message: 'You cannot unfollow yourself' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove current user from target's followers, remove target from current user's following
    await User.findByIdAndUpdate(userId, { $pull: { followers: currentUserId } });
    await User.findByIdAndUpdate(currentUserId, { $pull: { following: userId } });

    return res.status(200).json({
      message: 'Unfollowed successfully',
      isFollowing: false,
      isMutual: false,
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── REMOVE FOLLOWER ─────────────────────────────────────
export const removeFollower = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId } = req.params;

    // Remove userId from my followers, remove me from their following
    await User.findByIdAndUpdate(currentUserId, { $pull: { followers: userId } });
    await User.findByIdAndUpdate(userId, { $pull: { following: currentUserId } });

    return res.status(200).json({ message: 'Follower removed successfully' });
  } catch (error) {
    console.error('Remove follower error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Helper: build standard user response object
const buildUserResponse = (user) => ({
  _id: user._id,
  id: user._id,
  username: user.username,
  email: user.email,
  profilePicture: user.profilePicture,
  college: user.college,
  engineeringDomain: user.engineeringDomain,
  isEmailVerified: user.isEmailVerified,
  bio: user.bio,
  phone: user.phone,
  followers: user.followers,
  following: user.following,
  posts: user.posts,
  yearOfGraduation: user.yearOfGraduation,
  showYearOfGraduation: user.showYearOfGraduation,
  loginType: user.loginType,
  isAdmin: user.isAdmin,
  isFreezed: user.isFreezed,
});

// ─── CHECK USERNAME UNIQUENESS ───────────────────────────
export const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || username.trim().length === 0) {
      return res.status(400).json({ message: 'Username is required' });
    }

    const existing = await User.findOne({
      username: username.toLowerCase(),
      _id: { $ne: req.user.id },
    });

    return res.status(200).json({
      data: { isUnique: !existing },
    });
  } catch (error) {
    console.error('Check username error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── UPDATE ACCOUNT DETAILS (username, email, bio) ───────
export const updateAccountDetails = async (req, res) => {
  try {
    const { username, email, bio } = req.body;

    if (!username || !email) {
      return res.status(400).json({ message: 'Username and email are required' });
    }

    // Check username uniqueness
    const existingUsername = await User.findOne({
      username: username.toLowerCase(),
      _id: { $ne: req.user.id },
    });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Check email uniqueness
    const existingEmail = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: req.user.id },
    });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isEmailChanged = user.email !== email.toLowerCase();

    user.username = username.toLowerCase().replace(/\s/g, '');
    user.email = email.toLowerCase();
    user.bio = bio || '';

    if (isEmailChanged) {
      user.isEmailVerified = false;
    }

    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      message: 'Account details updated',
      data: {
        user: buildUserResponse(user),
        isEmailChanged,
      },
    });
  } catch (error) {
    console.error('Update account details error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── UPDATE PERSONAL DETAILS (phone, college, branch, year) ─
export const updatePersonalDetails = async (req, res) => {
  try {
    const { phone, college, engineeringDomain, yearOfGraduation, showYearOfGraduation } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        phone: phone || '', 
        college: college || '', 
        engineeringDomain: engineeringDomain || '', 
        yearOfGraduation: yearOfGraduation || '',
        showYearOfGraduation: showYearOfGraduation !== undefined ? showYearOfGraduation : false
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Personal details updated',
      data: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Update personal details error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── UPDATE PROFILE PICTURE ─────────────────────────────
export const updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Upload to Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: 'image/upload',
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: uploadResult.secure_url },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Profile picture updated',
      data: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Update profile picture error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET USER FEED ─────────────────────────────────────────
export const getUserFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, skip = 0 } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Show all posts from all users except the current user, admins and freezed users
    const excludeUsers = await User.find({ $or: [{ isAdmin: true }, { isFreezed: true }] }).select('_id');
    const excludeIds = excludeUsers.map(a => a._id);

    const posts = await Post.find({ 
      createdBy: { $nin: [userId, ...excludeIds] } 
    })
      .populate('createdBy', 'username profilePicture college')
      .populate({
        path: 'repostedPost',
        populate: {
          path: 'createdBy',
          select: 'username profilePicture college'
        }
      })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    return res.status(200).json({
      message: 'Feed fetched successfully',
      data: posts,
    });
  } catch (error) {
    console.error('getUserFeed error:', error);
    return res.status(500).json({ message: 'Server error fetching feed' });
  }
};

// ─── GET ACCOUNTS TO FOLLOW ──────────────────────────────
export const getAccountsToFollow = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    // Suggest users from same college who are not followed yet and are NOT admins
    const recommendations = await User.find({
      _id: { $nin: [...user.following, userId] },
      college: user.college,
      isAdmin: { $ne: true },
      isFreezed: { $ne: true }
    })
    .select('username profilePicture college')
    .limit(10);

    // If not enough users from same college, add others
    if (recommendations.length < 5) {
        const others = await User.find({
            _id: { $nin: [...user.following, userId, ...recommendations.map(r => r._id)] },
            isAdmin: { $ne: true },
            isFreezed: { $ne: true }
        })
        .select('username profilePicture college')
        .limit(10 - recommendations.length);
        recommendations.push(...others);
    }

    return res.status(200).json({
      message: 'Recommendations fetched successfully',
      data: recommendations,
    });
  } catch (error) {
    console.error('getAccountsToFollow error:', error);
    return res.status(500).json({ message: 'Server error fetching recommendations' });
  }
};

// ─── CHECK EMAIL STATUS (Frozen?) ─────────────────────────
export const checkEmailStatus = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const user = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { collegeEmail: email.toLowerCase() }
      ]
    });
    
    if (user && user.isFreezed) {
      return res.status(200).json({ isFrozen: true });
    }
    
    return res.status(200).json({ isFrozen: false });
  } catch (error) {
    console.error('Check email status error:', error);
    return res.status(500).json({ message: 'Server error check email status' });
  }
};

// ─── CHECK EMAIL (for password reset) ────────────────────
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.status(200).json({ exists: true, loginType: user.loginType });
    } else {
      return res.status(200).json({ exists: false });
    }
  } catch (error) {
    console.error('Check email error:', error);
    return res.status(500).json({ message: 'Server error check email' });
  }
};

// ─── REQUEST PASSWORD RESET ──────────────────────────────
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate reset token securely (random)
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    user.resetPasswordToken = token;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    await user.save({ validateBeforeSave: false });

    // Send email using Mailjet
    const mailjet = Mailjet.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_SECRET_KEY
    );

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: 'brightstack.work.01@gmail.com',
            Name: 'Social Hive',
          },
          To: [
            {
              Email: user.email,
              Name: user.username,
            },
          ],
          Subject: 'Password Reset Request - Social Hive',
          HTMLPart: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0f1a; border-radius: 16px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #4361ee, #6c63ff); padding: 32px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 28px;">Social Hive</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Password Reset</p>
              </div>
              <div style="padding: 32px; color: #f1f5f9;">
                <p style="font-size: 16px; line-height: 1.6;">Hello <strong>${user.username}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6;">You requested to reset your password. Click the button below to set a new password:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #4361ee, #6c63ff); color: #fff; text-decoration: none; padding: 14px 40px; border-radius: 12px; font-size: 16px; font-weight: 600;">
                    Reset Password
                  </a>
                </div>
                <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">This link is valid for 1 hour. If you did not request this, please ignore this email.</p>
              </div>
              <div style="background: #111827; padding: 16px; text-align: center;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">&copy; 2026 Social Hive. All rights reserved.</p>
              </div>
            </div>
          `,
        },
      ],
    });

    return res.status(200).json({ message: 'Reset email sent' });
  } catch (error) {
    console.error('Request password reset error:', error);
    return res.status(500).json({ message: 'Server error requesting password reset' });
  }
};

// ─── RESET PASSWORD ──────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save(); // 'pre' save hook hashes the password

    return res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Server error resetting password' });
  }
};

// ─── DEACTIVATE ACCOUNT ────────────────────────────────────
export const deactivateAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id || req.user.id, { $set: { isFreezed: true, frozenByAdmin: false } }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ message: 'Account deactivated successfully' });
  } catch (error) {
    console.error('Deactivate account error:', error);
    return res.status(500).json({ message: 'Server error during deactivation' });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Implementation of 7-day scheduled deletion
    user.isDeletionScheduled = true;
    user.deletionScheduleDate = new Date();
    user.isFreezed = true; // Act as deactivated (undiscoverable)

    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ 
      message: 'Deletion process has begun. Deletion process takes about a week (7 days). You can terminate the deletion process anytime by logging into your account.' 
    });
  } catch (error) {
    console.error('Error in scheduleDeletion:', error);
    return res.status(500).json({ message: 'Server error during account deletion scheduling' });
  }
};

// ─── TERMINATE DELETION (GOOGLE) ──────────────────────────
export const terminateDeletionGoogle = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Termination token is required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || decoded.action !== 'terminate_deletion') {
      return res.status(400).json({ message: 'Invalid or expired termination token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isDeletionScheduled = false;
    user.deletionScheduleDate = undefined;
    user.isFreezed = false;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ message: 'Deletion process terminated successfully. You can now sign in with Google.' });
  } catch (error) {
    console.error('Terminate deletion google error:', error);
    return res.status(400).json({ message: 'Token expired or invalid. Please try signing in with Google again.' });
  }
};
