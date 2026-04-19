import User from '../models/user.model.js';
import mongoose from 'mongoose';

// ─── PLATFORM GROWTH STATS ───────────────────────────────
export const getGrowthStats = async (req, res) => {
  try {
    const { period } = req.query; // 'day', 'week', 'month', 'year', 'all'
    
    let groupBy;
    let limit;
    
    // Grouping logic based on period
    switch (period) {
      case 'day':
        groupBy = { $dateToString: { format: "%Y-%m-%d %H:00", date: "$createdAt" } };
        break;
      case 'week':
      case 'month':
        groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
        break;
      case 'year':
        groupBy = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
        break;
      default:
        groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    }

    const stats = await User.aggregate([
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Calculate cumulative total
    let cumulativeCount = 0;
    const result = stats.map(item => {
      cumulativeCount += item.count;
      return {
        date: item._id,
        users: cumulativeCount
      };
    });

    return res.status(200).json({ data: result });
  } catch (error) {
    console.error('Get growth stats error:', error);
    return res.status(500).json({ message: 'Failed to fetch analytics' });
  }
};

// ─── FREEZE USERS BY COLLEGE ID (EMAIL PREFIX) ───────────
export const freezeUsersByCollegeId = async (req, res) => {
  try {
    const { collegeId } = req.body;
    if (!collegeId) {
      return res.status(400).json({ message: 'College ID is required' });
    }

    // Regex to match prefix of collegeEmail
    const regex = new RegExp(`^${collegeId}`, 'i');
    
    const result = await User.updateMany(
      { collegeEmail: { $regex: regex } },
      { $set: { isFreezed: true, frozenByAdmin: true } }
    );

    return res.status(200).json({ 
      message: `${result.modifiedCount} accounts associated with ID "${collegeId}" have been freezed.`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Freeze users error:', error);
    return res.status(500).json({ message: 'Failed to freeze accounts' });
  }
};

// ─── GET FROZEN USERS LIST ──────────────────────────────
export const getFrozenUsers = async (req, res) => {
  try {
    const users = await User.find({ isFreezed: true })
      .select('username email collegeEmail profilePicture createdAt');
    return res.status(200).json({ users });
  } catch (error) {
    console.error('Get frozen users error:', error);
    return res.status(500).json({ message: 'Failed to fetch frozen accounts' });
  }
};

// ─── UNFREEZE USER ─────────────────────────────────────
export const unfreezeUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndUpdate(userId, { isFreezed: false, frozenByAdmin: false }, { new: true });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.status(200).json({ message: `Account ${user.username} has been unfreezed.` });
  } catch (error) {
    console.error('Unfreeze user error:', error);
    return res.status(500).json({ message: 'Failed to unfreeze account' });
  }
};

// ─── ADMIN PASSWORD UPDATE ──────────────────────────────
export const updateAdminPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect old password' });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update admin password error:', error);
    return res.status(500).json({ message: 'Failed to update password' });
  }
};

// ─── SEARCH USERS FOR SUGGESTIONS ───────────────────────
export const searchUsersByEmail = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(200).json({ users: [] });
    }

    const regex = new RegExp(`^${q}`, 'i');
    
    const users = await User.find({
      $or: [
        { collegeEmail: { $regex: regex } },
        { email: { $regex: regex } }
      ]
    })
    .select('username email collegeEmail profilePicture')
    .limit(5);

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Search users for suggestions error:', error);
    return res.status(500).json({ message: 'Failed to search users' });
  }
};
