import { v2 as cloudinary } from 'cloudinary';
import { Post } from '../models/post.model.js';
import User from '../models/user.model.js';
import { Group } from '../models/group.model.js';

// ─── CREATE POST ─────────────────────────────────────────
export const createPost = async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    // Upload media files to Cloudinary
    const mediaUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const b64 = Buffer.from(file.buffer).toString('base64');
        const dataURI = `data:${file.mimetype};base64,${b64}`;
        const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'class-network/posts',
          resource_type: resourceType,
        });
        mediaUrls.push(result.secure_url);
      }
    }

    const post = await Post.create({
      title: title.trim(),
      content: content.trim(),
      media: mediaUrls,
      createdBy: userId,
    });

    // Add post ref to user
    await User.findByIdAndUpdate(userId, { $push: { posts: post._id } });

    const populated = await Post.findById(post._id).populate(
      'createdBy',
      'username profilePicture'
    );


    return res.status(201).json({ message: 'Post created', post: populated });
  } catch (error) {
    console.error('createPost error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── GET POSTS BY USERNAME ───────────────────────────────
export const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || user.isFreezed) {
      return res.status(404).json({ message: 'User not found' });
    }

    const posts = await Post.find({ createdBy: user._id })
      .populate('createdBy', 'username profilePicture')
      .populate({
        path: 'repostedPost',
        populate: {
          path: 'createdBy',
          select: 'username profilePicture'
        }
      })
      .sort({ createdAt: -1 });

    const sanitizedPosts = await Promise.all(posts.map(async (post) => {
      const p = post.toObject();
      
      // Populate to check existence
      const populated = await Post.findById(post._id)
        .populate('likes', '_id')
        .populate('reposts', '_id')
        .populate('savedBy', '_id');
      
      const validLikes = populated.likes.filter(u => u !== null).map(u => u._id);
      const validReposts = populated.reposts.filter(u => u !== null).map(u => u._id);
      const validSaves = populated.savedBy.filter(u => u !== null).map(u => u._id);

      // Background Heal if necessary
      if (validLikes.length !== post.likes.length || 
          validReposts.length !== post.reposts.length || 
          validSaves.length !== post.savedBy.length) {
        await Post.findByIdAndUpdate(post._id, { 
          likes: validLikes,
          reposts: validReposts,
          savedBy: validSaves
        });
      }

      p.likes = validLikes;
      p.reposts = validReposts;
      p.savedBy = validSaves;
      return p;
    }));

    return res.status(200).json({ posts: sanitizedPosts });
  } catch (error) {
    console.error('getUserPosts error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── GET POST BY ID ──────────────────────────────────────
export const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId)
      .populate('createdBy', 'username profilePicture college')
      .populate({
        path: 'repostedPost',
        populate: {
          path: 'createdBy',
          select: 'username profilePicture'
        }
      });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Sanitize Engagement Arrays
    const populatedEngagement = await Post.findById(postId)
      .populate('likes', '_id')
      .populate('reposts', '_id')
      .populate('savedBy', '_id');

    const validLikes = populatedEngagement.likes.filter(u => u !== null).map(u => u._id);
    const validReposts = populatedEngagement.reposts.filter(u => u !== null).map(u => u._id);
    const validSaves = populatedEngagement.savedBy.filter(u => u !== null).map(u => u._id);

    // Sync DB if needed
    if (validLikes.length !== post.likes.length || 
        validReposts.length !== post.reposts.length || 
        validSaves.length !== post.savedBy.length) {
      await Post.findByIdAndUpdate(postId, { 
        likes: validLikes,
        reposts: validReposts,
        savedBy: validSaves
      });
    }

    const postObj = post.toObject();
    postObj.likes = validLikes;
    postObj.reposts = validReposts;
    postObj.savedBy = validSaves;

    return res.status(200).json({ post: postObj });
  } catch (error) {
    console.error('getPostById error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── DELETE POST ─────────────────────────────────────────
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorised to delete this post' });
    }

    await Post.findByIdAndDelete(postId);
    await User.findByIdAndUpdate(userId, { $pull: { posts: postId } });

    return res.status(200).json({ message: 'Post deleted' });
  } catch (error) {
    console.error('deletePost error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── UPDATE POST ─────────────────────────────────────────
export const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content, existingMedia } = req.body; // existingMedia is a JSON string of URLs to keep
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.createdBy.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to edit this post' });
    }

    let updatedMedia = [];
    if (existingMedia) {
      try {
        updatedMedia = JSON.parse(existingMedia);
      } catch (e) {
        updatedMedia = typeof existingMedia === 'string' ? [existingMedia] : existingMedia;
      }
    }

    // Upload new media files to Cloudinary if any
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const b64 = Buffer.from(file.buffer).toString('base64');
        const dataURI = `data:${file.mimetype};base64,${b64}`;
        const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'class-network/posts',
          resource_type: resourceType,
        });
        updatedMedia.push(result.secure_url);
      }
    }

    const hasChanged = title !== post.title || content !== post.content || JSON.stringify(updatedMedia) !== JSON.stringify(post.media);

    post.title = title || post.title;
    post.content = content || post.content;
    post.media = updatedMedia.length > 0 ? updatedMedia : post.media;
    
    if (hasChanged) {
      post.isEdited = true;
    }

    await post.save();

    const populated = await Post.findById(post._id).populate(
      'createdBy',
      'username profilePicture'
    );

    return res.status(200).json({ message: 'Post updated', post: populated });
  } catch (error) {
    console.error('updatePost error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── LIKE POST ────────────────────────────────────────────
export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const hasLiked = post.likes.includes(userId);

    if (hasLiked) {
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
    } else {
      post.likes.push(userId);
    }

    await post.save();

    // Re-verify after operation for accurate response
    const populated = await Post.findById(postId).populate('likes', '_id');
    const validLikes = populated.likes.filter(u => u !== null).map(u => u._id);
    
    if (validLikes.length !== post.likes.length) {
      post.likes = validLikes;
      await post.save();
    }

    return res.status(200).json({
      message: hasLiked ? 'Post unliked' : 'Post liked',
      likes: post.likes.length,
      liked: !hasLiked
    });
  } catch (error) {
    console.error('likePost error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── REPOST ───────────────────────────────────────────────
export const createRepost = async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.user._id;

    const originalPost = await Post.findById(postId);
    if (!originalPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if already reposted
    const hasReposted = originalPost.reposts.includes(userId);

    if (hasReposted) {
      // Find and delete the repost document
      await Post.findOneAndDelete({ createdBy: userId, repostedPost: postId, isRepost: true });
      
      // Update original post
      originalPost.reposts = originalPost.reposts.filter(id => id.toString() !== userId.toString());
      await originalPost.save();

      return res.status(200).json({
        message: 'Repost removed',
        repostLength: originalPost.reposts.length,
        reposted: false
      });
    }

    // Create repost
    const repost = await Post.create({
      title: originalPost.title,
      content: originalPost.content,
      media: originalPost.media,
      createdBy: userId,
      isRepost: true,
      repostedPost: postId
    });

    // Add repost to original post
    originalPost.reposts.push(userId);
    await originalPost.save();

    // Re-verify original post engagement
    const populatedOriginal = await Post.findById(postId).populate('reposts', '_id');
    const validReposts = populatedOriginal.reposts.filter(u => u !== null).map(u => u._id);
    
    if (validReposts.length !== originalPost.reposts.length) {
      originalPost.reposts = validReposts;
      await originalPost.save();
    }

    const populated = await Post.findById(repost._id).populate(
      'createdBy',
      'username profilePicture'
    ).populate('repostedPost', 'title content createdBy');

    return res.status(201).json({
      message: 'Post reposted',
      repost: populated,
      repostLength: originalPost.reposts.length,
      reposted: true
    });
  } catch (error) {
    console.error('createRepost error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── SHARE POST ────────────────────────────────────────────
export const sharePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Add user to sharedBy
    if (!post.sharedBy.includes(userId)) {
      post.sharedBy.push(userId);
      await post.save();

    }

    return res.status(200).json({
      message: 'Post shared',
      sharedBy: post.sharedBy.length
    });
  } catch (error) {
    console.error('sharePost error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── SAVE POST ────────────────────────────────────────────
export const savePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const hasSaved = post.savedBy.includes(userId);

    if (hasSaved) {
      post.savedBy = post.savedBy.filter(id => id.toString() !== userId.toString());
    } else {
      post.savedBy.push(userId);
    }

    await post.save();

    return res.status(200).json({
      message: hasSaved ? 'Post unsaved' : 'Post saved',
      savedBy: post.savedBy.length,
      isSaved: !hasSaved
    });
  } catch (error) {
    console.error('savePost error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── GET REPOSTS BY USERNAME ──────────────────────────────
export const getUserReposts = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || user.isFreezed) return res.status(404).json({ message: 'User not found' });

    const posts = await Post.find({ createdBy: user._id, isRepost: true })
      .populate('createdBy', 'username profilePicture')
      .populate({
        path: 'repostedPost',
        populate: {
          path: 'createdBy',
          select: 'username profilePicture'
        }
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({ posts });
  } catch (error) {
    console.error('getUserReposts error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── GET LIKED POSTS BY USERNAME ──────────────────────────
export const getUserLikedPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || user.isFreezed) return res.status(404).json({ message: 'User not found' });

    const posts = await Post.find({ likes: user._id })
      .populate('createdBy', 'username profilePicture')
      .populate({
        path: 'repostedPost',
        populate: {
          path: 'createdBy',
          select: 'username profilePicture'
        }
      })
      .sort({ createdAt: -1 });

    const sanitizedPosts = await Promise.all(posts.map(async (post) => {
      const p = post.toObject();
      const populated = await Post.findById(post._id).populate('likes reposts savedBy', '_id');
      const validLikes = populated.likes.filter(u => u !== null).map(u => u._id);
      const validReposts = populated.reposts.filter(u => u !== null).map(u => u._id);
      const validSaves = populated.savedBy.filter(u => u !== null).map(u => u._id);

      if (validLikes.length !== post.likes.length || validReposts.length !== post.reposts.length || validSaves.length !== post.savedBy.length) {
        await Post.findByIdAndUpdate(post._id, { likes: validLikes, reposts: validReposts, savedBy: validSaves });
      }

      p.likes = validLikes;
      p.reposts = validReposts;
      p.savedBy = validSaves;
      return p;
    }));

    return res.status(200).json({ posts: sanitizedPosts });
  } catch (error) {
    console.error('getUserLikedPosts error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── GET SAVED POSTS (Protected) ──────────────────────────
export const getUserSavedPosts = async (req, res) => {
  try {
    const userId = req.user.id;

    const excludeUsers = await User.find({ $or: [{ isAdmin: true }, { isFreezed: true }] }).select('_id');
    const excludeIds = excludeUsers.map(a => a._id);

    const posts = await Post.find({ 
      savedBy: userId,
      createdBy: { $nin: excludeIds }
    })
      .populate('createdBy', 'username profilePicture')
      .populate({
        path: 'repostedPost',
        populate: {
          path: 'createdBy',
          select: 'username profilePicture'
        }
      })
      .sort({ createdAt: -1 });

    const sanitizedPosts = await Promise.all(posts.map(async (post) => {
      const p = post.toObject();
      const populated = await Post.findById(post._id).populate('likes reposts savedBy', '_id');
      const validLikes = populated.likes.filter(u => u !== null).map(u => u._id);
      const validReposts = populated.reposts.filter(u => u !== null).map(u => u._id);
      const validSaves = populated.savedBy.filter(u => u !== null).map(u => u._id);

      if (validLikes.length !== post.likes.length || validReposts.length !== post.reposts.length || validSaves.length !== post.savedBy.length) {
        await Post.findByIdAndUpdate(post._id, { likes: validLikes, reposts: validReposts, savedBy: validSaves });
      }

      p.likes = validLikes;
      p.reposts = validReposts;
      p.savedBy = validSaves;
      return p;
    }));

    return res.status(200).json({ posts: sanitizedPosts });
  } catch (error) {
    console.error('getUserSavedPosts error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── GET COMMUNITY POSTS (Protected) ──────────────────────
export const getUserCommunityPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Find groups the user is in
    const groups = await Group.find({ members: userId });
    const postIds = groups.reduce((acc, group) => [...acc, ...group.posts], []);

    const excludeUsers = await User.find({ $or: [{ isAdmin: true }, { isFreezed: true }] }).select('_id');
    const excludeIds = excludeUsers.map(a => a._id);

    const posts = await Post.find({ 
      _id: { $in: postIds },
      createdBy: { $nin: excludeIds }
    })
      .populate('createdBy', 'username profilePicture')
      .populate({
        path: 'repostedPost',
        populate: {
          path: 'createdBy',
          select: 'username profilePicture'
        }
      })
      .sort({ createdAt: -1 });

    const sanitizedPosts = await Promise.all(posts.map(async (post) => {
      const p = post.toObject();
      const populated = await Post.findById(post._id).populate('likes reposts savedBy', '_id');
      const validLikes = populated.likes.filter(u => u !== null).map(u => u._id);
      const validReposts = populated.reposts.filter(u => u !== null).map(u => u._id);
      const validSaves = populated.savedBy.filter(u => u !== null).map(u => u._id);

      if (validLikes.length !== post.likes.length || validReposts.length !== post.reposts.length || validSaves.length !== post.savedBy.length) {
        await Post.findByIdAndUpdate(post._id, { likes: validLikes, reposts: validReposts, savedBy: validSaves });
      }

      p.likes = validLikes;
      p.reposts = validReposts;
      p.savedBy = validSaves;
      return p;
    }));

    return res.status(200).json({ posts: sanitizedPosts });
  } catch (error) {
    console.error('getUserCommunityPosts error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── GET POST PARTICIPANTS (Likes/Reposts) ──────────────
export const getPostParticipants = async (req, res) => {
  try {
    const { postId } = req.params;
    const { type } = req.query; // 'likes' or 'reposts'

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    let userIds = [];
    if (type === 'likes') {
      userIds = post.likes;
    } else if (type === 'reposts') {
      userIds = post.reposts;
    } else {
      return res.status(400).json({ message: 'Invalid type. Use "likes" or "reposts"' });
    }

    const users = await User.find({ 
      _id: { $in: userIds },
      isAdmin: { $ne: true },
      isFreezed: { $ne: true }
    })
      .select('username profilePicture college');

    return res.status(200).json({ users });
  } catch (error) {
    console.error('getPostParticipants error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─── SEARCH POSTS ──────────────────────────────────────────
export const searchPosts = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(200).json({ posts: [] });
    }

    const admins = await User.find({ $or: [{ isAdmin: true }, { isFreezed: true }] }).select('_id');
    const excludeIds = admins.map(a => a._id);

    const posts = await Post.find({
      isRepost: { $ne: true },
      createdBy: { $nin: excludeIds },
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } }
      ]
    })
    .populate('createdBy', 'username profilePicture')
    .populate({
      path: 'repostedPost',
      populate: {
        path: 'createdBy',
        select: 'username profilePicture'
      }
    })
    .sort({ createdAt: -1 });

    return res.status(200).json({ posts });
  } catch (error) {
    console.error('searchPosts error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
