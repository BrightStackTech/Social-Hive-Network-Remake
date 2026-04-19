import { Group } from '../models/group.model.js';
import User from '../models/user.model.js';
import { Chat } from '../models/chat.model.js';
import { ChatMessage } from '../models/message.model.js';
import { v2 as cloudinary } from 'cloudinary';

// ── Create Group ──────────────────────────────────────────
export const createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const group = await Group.create({
      name,
      description: description || '',
      admin: req.user.id,
      members: [req.user.id],
    });

    await User.findByIdAndUpdate(req.user.id, { $push: { groups: group._id } });

    return res.status(201).json({ message: 'Group created successfully', group });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A group with that name already exists' });
    }
    console.error('createGroup error:', error);
    return res.status(500).json({ message: 'Failed to create group' });
  }
};

// ── Check group name uniqueness ───────────────────────────
export const isGroupNameUnique = async (req, res) => {
  try {
    const { name } = req.body;
    const exists = await Group.findOne({ name });
    return res.json({ isUnique: !exists });
  } catch (error) {
    console.error('isGroupNameUnique error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── Get group (member-only) ───────────────────────────────
export const getGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId)
      .populate({ path: 'admin', select: 'username email profilePicture college engineeringDomain', match: { isFreezed: { $ne: true } } })
      .populate({ path: 'members', select: 'username email profilePicture college engineeringDomain', match: { isFreezed: { $ne: true } } })
      .populate({ path: 'notices.admin', select: 'username profilePicture email' });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.admin) {
      // DELETE ORPHAN (Admin no longer exists in DB)
      await ChatMessage.deleteMany({ chat: { $in: await Chat.find({ group: groupId }).select('_id') } });
      await Chat.deleteMany({ group: groupId });
      await Group.findByIdAndDelete(groupId);
      return res.status(404).json({ message: 'Group has been deleted because the admin no longer exists' });
    }

    const isMember = group.members.some((m) => m._id.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Populate join requests only for admin
    let joinRequests = [];
    if (group.admin._id.toString() === req.user.id) {
      joinRequests = await User.find(
        { _id: { $in: group.joinRequests } },
        'username email profilePicture'
      );
    }

    // Filter expired notices (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    group.notices = group.notices.filter(notice => notice.createdAt > thirtyDaysAgo);
    await group.save(); // Cleanup database on each fetch

    return res.json({
      group: {
        ...group.toObject(),
        joinRequests,
      },
    });
  } catch (error) {
    console.error('getGroup error:', error);
    return res.status(500).json({ message: 'Failed to fetch group' });
  }
};

// ... existing functions ...

// ── Notice Board ──────────────────────────────────────────
export const addNotice = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can add notices' });
    }

    group.notices.push({
      content,
      admin: req.user.id,
      createdAt: new Date()
    });
    await group.save();

    // Re-populate and return notices to ensure names/PFPs are included
    const updatedGroup = await Group.findById(groupId).populate('notices.admin', 'username profilePicture email');

    return res.status(201).json({ message: 'Notice added successfully', notices: updatedGroup.notices });
  } catch (error) {
    console.error('addNotice error:', error);
    return res.status(500).json({ message: 'Failed to add notice' });
  }
};

export const deleteNotice = async (req, res) => {
  try {
    const { groupId, noticeId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can delete notices' });
    }

    group.notices = group.notices.filter(n => n._id.toString() !== noticeId);
    await group.save();

    return res.json({ message: 'Notice deleted successfully', notices: group.notices });
  } catch (error) {
    console.error('deleteNotice error:', error);
    return res.status(500).json({ message: 'Failed to delete notice' });
  }
};

export const clearAllNotices = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can clear notices' });
    }

    group.notices = [];
    await group.save();

    return res.json({ message: 'All notices cleared' });
  } catch (error) {
    console.error('clearAllNotices error:', error);
    return res.status(500).json({ message: 'Failed to clear notices' });
  }
};

// ── Get group for visitors (non-members) ──────────────────
export const getGroupForVisitors = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId)
      .populate({ path: 'admin', select: 'username email profilePicture', match: { isFreezed: { $ne: true } } })
      .populate({ path: 'members', select: 'username email profilePicture', match: { isFreezed: { $ne: true } } });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some((m) => m._id.toString() === req.user.id);
    if (isMember) {
      return res.status(403).json({ message: 'User is already a member — use /get-group instead' });
    }

    const hasRequested = group.joinRequests.map((id) => id.toString()).includes(req.user.id);

    return res.json({
      group: {
        _id: group._id,
        name: group.name,
        description: group.description,
        admin: group.admin,
        members: group.members,
        hasRequested,
      },
    });
  } catch (error) {
    console.error('getGroupForVisitors error:', error);
    return res.status(500).json({ message: 'Failed to fetch group' });
  }
};

// ── Get my groups ─────────────────────────────────────────
export const getMyGroups = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'groups',
        select: 'name description members profilePicture admin',
        populate: { path: 'admin', select: '_id' }
      })
      .select('groups');

    const validGroups = [];
    if (user?.groups) {
      for (const group of user.groups) {
        if (!group.admin) {
          // Cleanup orphan
          await ChatMessage.deleteMany({ chat: { $in: await Chat.find({ group: group._id }).select('_id') } });
          await Chat.deleteMany({ group: group._id });
          await Group.findByIdAndDelete(group._id);
        } else {
          validGroups.push(group);
        }
      }
    }

    return res.json({ groups: validGroups });
  } catch (error) {
    console.error('getMyGroups error:', error);
    return res.status(500).json({ message: 'Failed to fetch groups' });
  }
};

// ── Request to join group ─────────────────────────────────
export const requestToJoinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.members.map((id) => id.toString()).includes(req.user.id)) {
      return res.status(400).json({ message: 'Already a member' });
    }
    if (group.joinRequests.map((id) => id.toString()).includes(req.user.id)) {
      return res.status(400).json({ message: 'Request already sent' });
    }

    group.joinRequests.push(req.user.id);
    await group.save();

    await User.findByIdAndUpdate(req.user.id, { $push: { pendingGroupRequests: group._id } });

    return res.json({ message: 'Join request sent' });
  } catch (error) {
    console.error('requestToJoinGroup error:', error);
    return res.status(500).json({ message: 'Failed to send request' });
  }
};

// ── Accept join request ───────────────────────────────────
export const acceptRequest = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can accept requests' });
    }
    if (!group.joinRequests.map((id) => id.toString()).includes(userId)) {
      return res.status(400).json({ message: 'No such request' });
    }

    group.joinRequests = group.joinRequests.filter((id) => id.toString() !== userId);
    group.members.push(userId);
    await group.save();

    await User.findByIdAndUpdate(userId, {
      $push: { groups: group._id },
      $pull: { pendingGroupRequests: group._id },
    });

    // Also update the chat participants if it exists
    await Chat.findOneAndUpdate(
      { group: groupId, isGroupChat: true },
      { $addToSet: { participants: userId } }
    );

    return res.json({ message: 'Request accepted' });
  } catch (error) {
    console.error('acceptRequest error:', error);
    return res.status(500).json({ message: 'Failed to accept request' });
  }
};

// ── Reject join request ───────────────────────────────────
export const rejectRequest = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can reject requests' });
    }

    group.joinRequests = group.joinRequests.filter((id) => id.toString() !== userId);
    await group.save();

    await User.findByIdAndUpdate(userId, { $pull: { pendingGroupRequests: group._id } });

    return res.json({ message: 'Request rejected' });
  } catch (error) {
    console.error('rejectRequest error:', error);
    return res.status(500).json({ message: 'Failed to reject request' });
  }
};

// ── Add member to group (admin only) ─────────────────────
export const addToGroup = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can add members' });
    }
    if (group.members.map((id) => id.toString()).includes(userId)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    group.members.push(userId);
    await group.save();

    await User.findByIdAndUpdate(userId, { $push: { groups: group._id } });

    // Also update the chat participants if it exists
    await Chat.findOneAndUpdate(
      { group: groupId, isGroupChat: true },
      { $addToSet: { participants: userId } }
    );

    return res.json({ message: 'User added to group' });
  } catch (error) {
    console.error('addToGroup error:', error);
    return res.status(500).json({ message: 'Failed to add user' });
  }
};

// ── Remove member from group (admin only) ─────────────────
export const removeFromGroup = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can remove members' });
    }
    if (!group.members.map((id) => id.toString()).includes(userId)) {
      return res.status(400).json({ message: 'User is not a member' });
    }

    group.members = group.members.filter((id) => id.toString() !== userId);
    await group.save();

    await User.findByIdAndUpdate(userId, { $pull: { groups: group._id } });

    // Also update the chat participants if it exists
    await Chat.findOneAndUpdate(
      { group: groupId, isGroupChat: true },
      { $pull: { participants: userId } }
    );

    return res.json({ message: 'User removed from group' });
  } catch (error) {
    console.error('removeFromGroup error:', error);
    return res.status(500).json({ message: 'Failed to remove user' });
  }
};

// ── Leave group ───────────────────────────────────────────
export const exitFromGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.members.map((id) => id.toString()).includes(req.user.id)) {
      return res.status(400).json({ message: 'You are not a member' });
    }

    group.members = group.members.filter((id) => id.toString() !== req.user.id);
    await group.save();

    await User.findByIdAndUpdate(req.user.id, { $pull: { groups: group._id } });

    // Also update the chat participants if it exists
    await Chat.findOneAndUpdate(
      { group: groupId, isGroupChat: true },
      { $pull: { participants: req.user.id } }
    );

    return res.json({ message: 'Left the group' });
  } catch (error) {
    console.error('exitFromGroup error:', error);
    return res.status(500).json({ message: 'Failed to leave group' });
  }
};

// ── Delete group (admin only) ─────────────────────────────
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can delete the group' });
    }

    // Remove group reference from all members
    for (const memberId of group.members) {
      await User.findByIdAndUpdate(memberId, { $pull: { groups: group._id } });
    }
    // Remove from pending requests
    for (const reqId of group.joinRequests) {
      await User.findByIdAndUpdate(reqId, { $pull: { pendingGroupRequests: group._id } });
    }

    await Group.findByIdAndDelete(groupId);

    return res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('deleteGroup error:', error);
    return res.status(500).json({ message: 'Failed to delete group' });
  }
};

// ── Update group details (admin only) ─────────────────────
export const updateGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can update group details' });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    await group.save();

    return res.json({ message: 'Group updated', group });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A group with that name already exists' });
    }
    console.error('updateGroupDetails error:', error);
    return res.status(500).json({ message: 'Failed to update group' });
  }
};

// ── Change group admin (admin only) ───────────────────────
export const changeGroupAdmin = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can change the group admin' });
    }
    if (!group.members.map((id) => id.toString()).includes(userId)) {
      return res.status(400).json({ message: 'User is not a member of this group' });
    }

    group.admin = userId;
    await group.save();

    return res.json({ message: 'Group admin changed successfully' });
  } catch (error) {
    console.error('changeGroupAdmin error:', error);
    return res.status(500).json({ message: 'Failed to change admin' });
  }
};

// ── Update group profile picture (admin only) ─────────────
export const updateGroupProfilePicture = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admin can update the profile picture' });
    }

    // Upload to Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: 'image/upload',
    });

    group.profilePicture = uploadResult.secure_url;
    await group.save();

    return res.json({ 
      message: 'Group profile picture updated', 
      profilePicture: group.profilePicture 
    });
  } catch (error) {
    console.error('updateGroupProfilePicture error:', error);
    return res.status(500).json({ message: 'Failed to update profile picture' });
  }
};
