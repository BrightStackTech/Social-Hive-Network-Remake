import { Channel } from '../models/channel.model.js';
import User from '../models/user.model.js';
import { Chat } from '../models/chat.model.js';
import { ChatMessage } from '../models/message.model.js';
import { Post } from '../models/post.model.js';

// ── Create Channel ──────────────────────────────────────────
export const createChannel = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Channel name is required' });
    }

    const channel = await Channel.create({
      name,
      description: description || '',
      admin: req.user.id,
      members: [req.user.id],
    });

    await User.findByIdAndUpdate(req.user.id, { $push: { channels: channel._id } });

    return res.status(201).json({ message: 'Channel created successfully', channel });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A channel with that name already exists' });
    }
    console.error('createChannel error:', error);
    return res.status(500).json({ message: 'Failed to create channel' });
  }
};

export const getAllChannels = async (req, res) => {
  try {
    // Populate admin to check for existence
    const channels = await Channel.find({ isPublic: true }).populate({ 
      path: 'admin', 
      select: 'username profilePicture isFreezed' 
    });
    
    const validChannels = [];
    for (const channel of channels) {
      if (!channel.admin) {
        // DELETE ORPHAN (Admin no longer exists in DB)
        await Post.deleteMany({ _id: { $in: channel.posts } });
        await Chat.deleteMany({ channel: channel._id });
        await Channel.findByIdAndDelete(channel._id);
      } else if (channel.admin.isFreezed) {
        // Just skip frozen admins, don't delete the channel
        continue;
      } else {
        validChannels.push(channel);
      }
    }

    return res.json({ channels: validChannels });
  } catch (error) {
    console.error('getAllChannels error:', error);
    return res.status(500).json({ message: 'Failed to fetch channels' });
  }
};

// ── Get my joined channels ──────────────────────────────────
export const getMyChannels = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'channels',
        select: 'name description members profilePicture admin',
        populate: { path: 'admin', select: '_id' }
      })
      .select('channels');

    const validChannels = [];
    if (user?.channels) {
      for (const channel of user.channels) {
        if (!channel.admin) {
          // DELETE ORPHAN
          await ChatMessage.deleteMany({ chat: { $in: await Chat.find({ channel: channel._id }).select('_id') } });
          await Chat.deleteMany({ channel: channel._id });
          await Channel.findByIdAndDelete(channel._id);
        } else {
          validChannels.push(channel);
        }
      }
    }

    return res.json({ channels: validChannels });
  } catch (error) {
    console.error('getMyChannels error:', error);
    return res.status(500).json({ message: 'Failed to fetch your channels' });
  }
};

// ── Get channel by ID ───────────────────────────────────────
export const getChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId)
      .populate({ path: 'admin', select: 'username email profilePicture college engineeringDomain', match: { isFreezed: { $ne: true } } })
      .populate({ path: 'members', select: 'username email profilePicture college engineeringDomain', match: { isFreezed: { $ne: true } } });

    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    if (!channel.admin) {
      // DELETE ORPHAN
      await ChatMessage.deleteMany({ chat: { $in: await Chat.find({ channel: channelId }).select('_id') } });
      await Chat.deleteMany({ channel: channelId });
      await Channel.findByIdAndDelete(channelId);
      return res.status(404).json({ message: 'Channel has been deleted because the admin no longer exists' });
    }

    // Determine if current user has a pending join request
    const isPending = channel.joinRequests.some(r => r.toString() === req.user.id);
    
    // Determine if current user was previously removed and needs approval
    const mustRequest = channel.removedMembers.some(r => r.toString() === req.user.id);

    return res.json({ 
      channel: {
        ...channel.toObject(),
        isPending,
        mustRequest
      }
    });
  } catch (error) {
    console.error('getChannel error:', error);
    return res.status(500).json({ message: 'Failed to fetch channel' });
  }
};

// ── Join Channel ────────────────────────────────────────────
export const joinChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: 'Channel found' });

    if (channel.members.includes(req.user.id)) {
      return res.status(400).json({ message: 'Already a member' });
    }

    const wasRemoved = channel.removedMembers.some(id => id.toString() === req.user.id);

    if (channel.isPublic && !wasRemoved) {
      // Public channel and user wasn't kicked - join immediately
      channel.members.push(req.user.id);
      await channel.save();
      await User.findByIdAndUpdate(req.user.id, { $push: { channels: channelId } });
      
      // Update chat participants
      await Chat.findOneAndUpdate(
        { channel: channelId },
        { $addToSet: { participants: req.user.id } }
      );

      return res.json({ message: 'Joined successfully', channel });
    } else {
      // Private channel OR user was kicked - request to join
      if (channel.joinRequests.includes(req.user.id)) {
        return res.status(400).json({ message: 'Request already pending' });
      }
      channel.joinRequests.push(req.user.id);
      await channel.save();
      await User.findByIdAndUpdate(req.user.id, { $push: { pendingChannelRequests: channelId } });
      return res.json({ message: 'Join request sent' });
    }
    await User.findByIdAndUpdate(req.user.id, { $push: { channels: channel._id } });

    return res.json({ message: 'Joined the channel' });
  } catch (error) {
    console.error('joinChannel error:', error);
    return res.status(500).json({ message: 'Failed to join channel' });
  }
};

// ... existing leaveChannel ...
export const leaveChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });

    channel.members = channel.members.filter(m => m.toString() !== req.user.id);
    await channel.save();

    await User.findByIdAndUpdate(req.user.id, { $pull: { channels: channel._id } });

    // Update chat participants
    await Chat.findOneAndUpdate(
      { channel: channelId },
      { $pull: { participants: req.user.id } }
    );

    return res.json({ message: 'Left the channel' });
  } catch (error) {
    console.error('leaveChannel error:', error);
    return res.status(500).json({ message: 'Failed to leave channel' });
  }
};

// ── Admin Actions ──────────────────────────────────────────

export const updateChannelDetails = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { name, description, isPublic } = req.body;
    const channel = await Channel.findById(channelId);

    if (!channel) return res.status(404).json({ message: 'Channel not found' });
    if (channel.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can perform this action' });
    }

    if (name) channel.name = name;
    if (description !== undefined) channel.description = description;
    if (isPublic !== undefined) channel.isPublic = isPublic;

    await channel.save();
    return res.json({ message: 'Channel updated successfully', channel });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Name already taken' });
    console.error('updateChannelDetails error:', error);
    return res.status(500).json({ message: 'Failed to update channel' });
  }
};

export const deleteChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);

    if (!channel) return res.status(404).json({ message: 'Channel not found' });
    if (channel.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can delete the channel' });
    }

    // Cleanup references in Users
    await User.updateMany(
      { _id: { $in: [...channel.members, ...channel.joinRequests] } },
      { $pull: { channels: channelId, pendingChannelRequests: channelId } }
    );

    await Channel.findByIdAndDelete(channelId);
    return res.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    console.error('deleteChannel error:', error);
    return res.status(500).json({ message: 'Failed to delete channel' });
  }
};

export const acceptRequest = async (req, res) => {
  try {
    const { channelId, userId } = req.params;
    const channel = await Channel.findById(channelId);

    if (!channel) return res.status(404).json({ message: 'Channel not found' });
    if (channel.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can accept requests' });
    }

    if (!channel.joinRequests.includes(userId)) {
      return res.status(400).json({ message: 'No such request found' });
    }

    channel.joinRequests = channel.joinRequests.filter(id => id.toString() !== userId);
    channel.removedMembers = channel.removedMembers.filter(id => id.toString() !== userId);
    channel.members.push(userId);
    await channel.save();

    await User.findByIdAndUpdate(userId, {
      $push: { channels: channelId },
      $pull: { pendingChannelRequests: channelId }
    });

    // Update chat participants
    await Chat.findOneAndUpdate(
      { channel: channelId },
      { $addToSet: { participants: userId } }
    );

    return res.json({ message: 'Request accepted' });
  } catch (error) {
    console.error('acceptRequest error:', error);
    return res.status(500).json({ message: 'Failed to accept' });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const { channelId, userId } = req.params;
    const channel = await Channel.findById(channelId);

    if (!channel) return res.status(404).json({ message: 'Channel not found' });
    if (channel.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can reject requests' });
    }

    channel.joinRequests = channel.joinRequests.filter(id => id.toString() !== userId);
    await channel.save();

    await User.findByIdAndUpdate(userId, { $pull: { pendingChannelRequests: channelId } });

    return res.json({ message: 'Request rejected' });
  } catch (error) {
    console.error('rejectRequest error:', error);
    return res.status(500).json({ message: 'Failed to reject' });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId).populate('joinRequests', 'username email profilePicture college');

    if (!channel) return res.status(404).json({ message: 'Channel not found' });
    if (channel.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Admin only' });
    }

    return res.json({ requests: channel.joinRequests });
  } catch (error) {
    console.error('getPendingRequests error:', error);
    return res.status(500).json({ message: 'Failed to fetch' });
  }
};

export const removeFromChannel = async (req, res) => {
  try {
    const { channelId, userId } = req.params;
    const channel = await Channel.findById(channelId);

    if (!channel) return res.status(404).json({ message: 'Channel not found' });
    if (channel.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can remove members' });
    }
    
    // Admin cannot be removed or remove themselves through this endpoint
    if (channel.admin.toString() === userId) {
      return res.status(400).json({ message: 'Admin cannot be removed' });
    }

    if (!channel.members.some(m => m.toString() === userId)) {
      return res.status(400).json({ message: 'User is not a member' });
    }

    channel.members = channel.members.filter(m => m.toString() !== userId);
    // Track removed members if it's an admin eviction
    if (!channel.removedMembers.includes(userId)) {
      channel.removedMembers.push(userId);
    }
    await channel.save();

    await User.findByIdAndUpdate(userId, { $pull: { channels: channel._id } });

    // Update chat participants
    await Chat.findOneAndUpdate(
      { channel: channelId },
      { $pull: { participants: userId } }
    );

    return res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('removeFromChannel error:', error);
    return res.status(500).json({ message: 'Failed to remove member' });
  }
};

export const cancelJoinRequest = async (req, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);

    if (!channel) return res.status(404).json({ message: 'Channel not found' });

    channel.joinRequests = channel.joinRequests.filter(id => id.toString() !== req.user.id);
    await channel.save();

    await User.findByIdAndUpdate(req.user.id, { $pull: { pendingChannelRequests: channelId } });

    return res.json({ message: 'Join request cancelled' });
  } catch (error) {
    console.error('cancelJoinRequest error:', error);
    return res.status(500).json({ message: 'Failed to cancel request' });
  }
};

// ── Change Channel Admin (Ownership Transfer) ─────────────
export const changeChannelAdmin = async (req, res) => {
  try {
    const { channelId, userId } = req.params;
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });

    if (channel.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can change the channel admin' });
    }
    if (!channel.members.some(id => id.toString() === userId)) {
      return res.status(400).json({ message: 'User is not a member of this channel' });
    }

    channel.admin = userId;
    await channel.save();

    // Sync admin in the Chat model too
    await Chat.findOneAndUpdate(
      { channel: channelId },
      { admin: userId }
    );

    return res.json({ message: 'Channel admin changed successfully' });
  } catch (error) {
    console.error('changeChannelAdmin error:', error);
    return res.status(500).json({ message: 'Failed to change admin' });
  }
};
