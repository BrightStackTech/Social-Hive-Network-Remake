import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { v2 as cloudinary } from 'cloudinary';
import { createServer } from 'http';
import { Server } from 'socket.io';
import userRoutes from './src/routes/user.routes.js';
import postRoutes from './src/routes/post.routes.js';
import groupRoutes from './src/routes/group.routes.js';
import chatRoutes from './src/routes/chat.routes.js';
import messageRoutes from './src/routes/message.routes.js';
import commentRoutes from './src/routes/comment.routes.js';
import categoryRoutes from './src/routes/category.routes.js';
import communityRoutes from './src/routes/community.routes.js';
import compostRoutes from './src/routes/compost.routes.js';
import channelRoutes from './src/routes/channel.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import livesessionRoutes from './src/routes/livesession.routes.js';
import updatesRoutes from './src/routes/updates.routes.js';
import reportRoutes from './src/routes/report.routes.js';
import { socketIoInitializer } from './src/socket/index.js';

dotenv.config();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Socket.IO initialization
socketIoInitializer(io);

// Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/communities', communityRoutes);
app.use('/api/v1/composts', compostRoutes);
app.use('/api/v1/channels', channelRoutes);
app.use('/api/v1/users/admin', adminRoutes);
app.use('/api/v1/livesessions', livesessionRoutes);
app.use('/api/v1/updates', updatesRoutes);
app.use('/api/v1/reports', reportRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Social Hive API is running' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 8000;

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
