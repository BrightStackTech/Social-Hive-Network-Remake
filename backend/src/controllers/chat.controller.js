import { ChatEventEnum } from '../constants.js';
import { emitSocketEvent } from '../socket/index.js';
import { Chat } from '../models/chat.model.js';
import { Group } from '../models/group.model.js';
import { Channel } from '../models/channel.model.js';
import  User  from '../models/user.model.js';
import { ChatMessage } from '../models/message.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import mongoose from 'mongoose';

const chatCommonAggregation = () => {
  return [
    {
      $lookup: {
        from: 'users',
        foreignField: '_id',
        localField: 'participants',
        as: 'participants',
        pipeline: [
          {
            $project: {
              password: 0,
              refreshToken: 0,
              passwordResetToken: 0,
              passwordResetTokenExpiry: 0,
              emailVerificationToken: 0,
              emailVerificationExpiry: 0,
              deviceTokens: 0,
              posts: 0,
              preferences: 0,
              isEmailVerified: 0,
              loginType: 0,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'chatmessages',
        localField: 'lastMessage',
        foreignField: '_id',
        as: 'lastMessageDetails',
        pipeline: [
          {
            $lookup: {
              from: 'users',
              foreignField: '_id',
              localField: 'sender',
              as: 'sender',
              pipeline: [
                {
                  $project: {
                    username: 1,
                    profilePicture: 1,
                    email: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              sender: { $first: '$sender' },
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'groups',
        localField: 'group',
        foreignField: '_id',
        as: 'groupDetails',
        pipeline: [
          {
            $project: {
              profilePicture: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        profilePicture: { $ifNull: [{ $first: '$groupDetails.profilePicture' }, ""] },
      },
    },
    {
      $lookup: {
        from: 'chatmessages',
        localField: 'pinnedMessages',
        foreignField: '_id',
        as: 'pinnedMessages',
        pipeline: [
          {
            $lookup: {
              from: 'users',
              foreignField: '_id',
              localField: 'sender',
              as: 'sender',
              pipeline: [
                {
                  $project: {
                    username: 1,
                    profilePicture: 1,
                    email: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              sender: { $first: '$sender' },
            },
          },
        ],
      },
    },
  ];
};

const getChats = asyncHandler(async (req, res) => {
  const freezedUsers = await User.find({ isFreezed: true }).select('_id');
  const excludeIds = freezedUsers.map(a => a._id);

  const chats = await Chat.aggregate([
    {
      $match: {
        participants: {
          $elemMatch: {
            $eq: new mongoose.Types.ObjectId(req.user._id),
          },
        },
        removedBy: {
          $nin: [new mongoose.Types.ObjectId(req.user._id)],
        },
        $or: [
          { isGroupChat: true },
          { participants: { $nin: excludeIds } }
        ]
      },
    },
    ...chatCommonAggregation(),
  ]);
  return res.status(200).json(new ApiResponse(200, chats, 'Chats fetched successfully'));
});

const createOrGetOneToOneChat = asyncHandler(async (req, res) => {
  const { receiverId } = req.body;
  if (!receiverId) {
    throw new ApiError(400, 'receiverId is required');
  }

  // Try finding by ID or Username
  const receiver = await User.findOne({
    $or: [
      { _id: mongoose.isValidObjectId(receiverId) ? receiverId : null },
      { username: receiverId },
    ],
  });

  if (!receiver || receiver.isFreezed) {
    throw new ApiError(404, 'Receiver not found');
  }

  if (receiver._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You can't send message to yourself");
  }

  // Require mutual follow
  const currentUser = await User.findById(req.user._id);
  const amIFollowingThem = currentUser.following.includes(receiver._id);
  const areTheyFollowingMe = receiver.following.includes(currentUser._id);

  if (!amIFollowingThem || !areTheyFollowingMe) {
    throw new ApiError(403, 'You can only chat with users you mutually follow (they must follow you, and you must follow them)');
  }

  const isChatExist = await Chat.aggregate([
    {
      $match: {
        isGroupChat: false,
        $and: [
          {
            participants: {
              $elemMatch: {
                $eq: new mongoose.Types.ObjectId(req.user._id),
              },
            },
          },
          {
            participants: {
              $elemMatch: {
                $eq: new mongoose.Types.ObjectId(receiver._id),
              },
            },
          },
        ],
      },
    },
    ...chatCommonAggregation(),
  ]);

  if (isChatExist.length) {
    return res.status(200).json(new ApiResponse(200, isChatExist[0], 'Chat found successfully'));
  }

  const newChat = await Chat.create({
    participants: [req.user._id, receiver._id],
    admin: req.user._id,
  });

  const createdChat = await Chat.aggregate([
    {
      $match: {
        _id: newChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const data = createdChat[0];
  emitSocketEvent(req, receiver._id.toString(), ChatEventEnum.NEW_CHAT_EVENT, data);
  return res.status(201).json(new ApiResponse(201, data, 'Chat created successfully'));
});

const deleteChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (!chatId) {
    throw new ApiError(400, 'Chat id is required');
  }
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, 'Chat not found');
  }

  // Non-destructive: just add the user to removedBy list
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $addToSet: {
        removedBy: req.user._id,
      },
    },
    { new: true }
  );

  return res.status(200).json(new ApiResponse(200, updatedChat, 'Chat removed from list successfully'));
});

const createGroupChat = asyncHandler(async (req, res) => {
  const { groupId } = req.body;
  if (!groupId) {
    throw new ApiError(400, 'Group Id is required');
  }

  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }

  const isChatExist = await Chat.findOne({
    group: groupId,
    isGroupChat: true,
  });

  if (isChatExist) {
    return res.status(200).json(new ApiResponse(200, isChatExist, 'Group chat already exists'));
  }

  const newChat = await Chat.create({
    admin: group.admin,
    isGroupChat: true,
    name: group.name,
    participants: group.members,
    group: groupId,
  });

  const createdChat = await Chat.aggregate([
    {
      $match: {
        _id: newChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  return res.status(201).json(new ApiResponse(201, createdChat[0], 'Group chat created successfully'));
});

const pinMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, 'Chat not found');
  }

  // Check if user is participant
  if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
    throw new ApiError(403, 'You are not authorized to pin messages in this chat');
  }

  // If it's a channel, only admin can pin
  if (chat.channel && chat.admin.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only admins can pin messages in this channel');
  }

  // Check if message belongs to chat
  const message = await ChatMessage.findById(messageId);
  if (!message || message.chat.toString() !== chatId) {
    throw new ApiError(404, 'Message not found in this chat');
  }

  if (chat.pinnedMessages.includes(messageId)) {
    return res.status(200).json(new ApiResponse(200, chat, 'Message already pinned'));
  }

  chat.pinnedMessages.push(messageId);
  await chat.save();

  return res.status(200).json(new ApiResponse(200, chat, 'Message pinned successfully'));
});

const createChannelChat = asyncHandler(async (req, res) => {
  const { channelId } = req.body;
  if (!channelId) {
    throw new ApiError(400, 'Channel Id is required');
  }

  const channel = await Channel.findById(channelId);
  if (!channel) {
    throw new ApiError(404, 'Channel not found');
  }

  const isChatExist = await Chat.findOne({
    channel: channelId,
  });

  if (isChatExist) {
    return res.status(200).json(new ApiResponse(200, isChatExist, 'Channel chat already exists'));
  }

  const newChat = await Chat.create({
    admin: channel.admin,
    isGroupChat: true, // Reuse group chat logic for multi-participant sync
    name: channel.name,
    participants: channel.members,
    channel: channelId,
  });

  const createdChat = await Chat.aggregate([
    {
      $match: {
        _id: newChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  return res.status(201).json(new ApiResponse(201, createdChat[0], 'Channel chat created successfully'));
});

const unpinMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, 'Chat not found');
  }

  // Check if user is participant
  if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
    throw new ApiError(403, 'You are not authorized to unpin messages in this chat');
  }

  // If it's a channel, only admin can unpin
  if (chat.channel && chat.admin.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Only admins can unpin messages in this channel');
  }

  chat.pinnedMessages = chat.pinnedMessages.filter((id) => id.toString() !== messageId);
  await chat.save();

  return res.status(200).json(new ApiResponse(200, chat, 'Message unpinned successfully'));
});

export { 
  getChats, 
  createOrGetOneToOneChat, 
  deleteChat, 
  createGroupChat,
  createChannelChat,
  pinMessage,
  unpinMessage
};
