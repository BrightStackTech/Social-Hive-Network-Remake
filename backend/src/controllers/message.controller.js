import mongoose from 'mongoose';
import { ChatMessage } from '../models/message.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ChatEventEnum } from '../constants.js';
import { emitSocketEvent } from '../socket/index.js';
import { Chat } from '../models/chat.model.js';
import { Group } from '../models/group.model.js';
import User from '../models/user.model.js';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import { uploadToS3 } from '../config/aws.js';

const chatMessageCommonAggregation = () => {
  return [
    {
      $lookup: {
        from: 'users',
        foreignField: '_id',
        localField: 'sender',
        as: 'sender',
        pipeline: [
          {
            $project: {
              _id: 1,
              username: {
                $cond: {
                  if: { $eq: ['$_id', new mongoose.Types.ObjectId(process.env.HIVEAI_BOT_ID || '69d948ea4ee80ad6382362fa')] },
                  then: 'hiveai',
                  else: '$username',
                },
              },
              profilePicture: {
                $cond: {
                  if: { $eq: ['$_id', new mongoose.Types.ObjectId(process.env.HIVEAI_BOT_ID || '69d948ea4ee80ad6382362fa')] },
                  then: 'https://res.cloudinary.com/domckasfk/image/upload/v1773008287/social-hive-mini-project_tzq4ns.png',
                  else: '$profilePicture',
                },
              },
              email: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        sender: {
          $ifNull: [
            { $first: '$sender' },
            {
              _id: '$sender',
              username: 'Deleted User',
              profilePicture: 'https://ui-avatars.com/api/?name=Deleted+User&background=666&color=fff',
            },
          ],
        },
      },
    },
    {
      $lookup: {
        from: 'chatmessages',
        localField: 'replyTo',
        foreignField: '_id',
        as: 'replyTo',
        pipeline: [
          {
            $lookup: {
              from: 'users',
              localField: 'sender',
              foreignField: '_id',
              as: 'sender',
              pipeline: [
                {
                  $project: {
                    username: 1,
                    profilePicture: 1,
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
          {
            $project: {
              content: 1,
              sender: 1,
              attachments: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        replyTo: { $first: '$replyTo' },
      },
    },
  ];
};


const getChatMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (!chatId) {
    throw new ApiError(400, 'Chat id is required');
  }
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, 'Chat not found');
  }
  const isParticipant = chat.participants.some(p => p.toString() === req.user._id.toString());
  
  if (!isParticipant) {
    if (chat.isGroupChat && chat.group) {
      // Self-healing: check if user is in group members but missing from chat participants
      const group = await Group.findById(chat.group);
      if (group && group.members.some(m => m.toString() === req.user._id.toString())) {
        chat.participants.push(req.user._id);
        await chat.save();
      } else {
        throw new ApiError(403, 'You are not authorized to access this chat');
      }
    } else {
      throw new ApiError(403, 'You are not authorized to access this chat');
    }
  }
  const freezedUsers = await User.find({ isFreezed: true }).select('_id');
  const excludeIds = freezedUsers.map(a => a._id);

  const chatMessages = await ChatMessage.aggregate([
    {
      $match: {
        chat: new mongoose.Types.ObjectId(chatId),
        parentMessage: null, // Only fetch top-level messages for main list
        sender: { $nin: excludeIds }
      },
    },
    ...chatMessageCommonAggregation(),
    {
      $lookup: {
        from: 'chatmessages',
        localField: '_id',
        foreignField: 'parentMessage',
        as: 'comments',
      },
    },
    {
      $addFields: {
        commentCount: { $size: '$comments' },
      },
    },
    {
      $project: {
        comments: 0,
      },
    },
    {
      $sort: {
        createdAt: 1,
      },
    },
  ]);
  if (!chatMessages.length) {
    return res.status(200).json(new ApiResponse(200, [], 'Chat messages fetched successfully (no messages found)'));
  }
  return res.status(200).json(new ApiResponse(200, chatMessages, 'Chat messages fetched successfully'));
});

const stripHtmlTags = (html) => {
  return html.replace(/<[^>]*>/g, '');
};

const sendMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { content, replyTo, parentMessage } = req.body;
  const sanitizedContent = content ? stripHtmlTags(content).trim() : '';

  if (!chatId) {
    throw new ApiError(400, 'Chat id is required');
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, 'Chat not found');
  }

  const isParticipant = chat.participants.some(p => p.toString() === req.user._id.toString());
  if (!isParticipant) {
    throw new ApiError(403, 'You are not authorized to send messages to this chat');
  }
  
  if (!sanitizedContent && (!req.files || req.files.length === 0)) {
    throw new ApiError(400, 'Message content or attachment is required');
  }

  let attachments = [];
  if (req.body.uploadedAttachments) {
    try {
      attachments = JSON.parse(req.body.uploadedAttachments);
    } catch (e) {
      console.error("Failed to parse uploaded attachments", e);
    }
  }

  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const fileExt = file.originalname.split('.').pop().toLowerCase();
      const isDoc = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(fileExt);

      if (isDoc) {
        const timestamp = Date.now();
        const filename = `documents/${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        try {
          const s3Response = await uploadToS3(file.buffer, filename, file.mimetype || 'application/octet-stream');
          attachments.push({
            url: s3Response.Location,
            localPath: s3Response.Key,
            fileName: file.originalname,
          });
        } catch (error) {
          console.error('Failed to upload document to S3:', error);
          throw new ApiError(500, 'Failed to upload document attachment');
        }
      } else {
        const b64 = Buffer.from(file.buffer).toString('base64');
        const dataURI = `data:${file.mimetype};base64,${b64}`;
        const uploadResult = await cloudinary.uploader.upload(dataURI, {
          folder: 'chat_attachments',
          resource_type: 'auto',
        });
        attachments.push({
          url: uploadResult.secure_url,
          localPath: uploadResult.public_id,
          fileName: file.originalname,
        });
      }
    }
  }

  // If message begins with '@hiveai', call the external API to get a response
  if (sanitizedContent.startsWith('@hiveai')) {
    const prompt = sanitizedContent.substring('@hiveai'.length).trim();
    const payload = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };
    let promptRes = '';
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`;
      const apiResponse = await axios.post(apiUrl, payload);
      promptRes = apiResponse.data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error calling AI API:', error);
      throw new ApiError(500, 'Error generating AI response');
    }

    // Create the original sender message
    const senderMessage = await ChatMessage.create({
      sender: req.user._id,
      chat: chatId,
      content: content,
      replyTo: replyTo || null,
      parentMessage: parentMessage || null,
    });

    const botUserId = new mongoose.Types.ObjectId((process.env.HIVEAI_BOT_ID || '69d948ea4ee80ad6382362fa').trim());
    const botMessage = await ChatMessage.create({
      sender: botUserId,
      chat: chatId,
      content: promptRes,
      replyTo: senderMessage._id,
    });

    const populatedSenderMessage = await ChatMessage.aggregate([
      {
        $match: { _id: senderMessage._id },
      },
      ...chatMessageCommonAggregation(),
    ]);

    const populatedBotMessage = await ChatMessage.aggregate([
      {
        $match: { _id: botMessage._id },
      },
      ...chatMessageCommonAggregation(),
    ]);

    // Update the chat's last message to the bot's response and restore visibility
    await Chat.findByIdAndUpdate(chatId, { lastMessage: botMessage._id, $set: { removedBy: [] } }, { new: true });

    const chat = await Chat.findById(chatId);
    chat.participants.forEach((participant) => {
      // Don't emit to the sender, they will get it via API response
      if (participant.toString() !== req.user._id.toString()) {
        emitSocketEvent(req, participant.toString(), ChatEventEnum.MESSAGE_RECEIVED_EVENT, populatedSenderMessage[0]);
        emitSocketEvent(req, participant.toString(), ChatEventEnum.MESSAGE_RECEIVED_EVENT, populatedBotMessage[0]);
      }
    });

    return res.status(201).json(
      new ApiResponse(
        201,
        { 
          isAI: true, 
          senderMessage: populatedSenderMessage[0], 
          botMessage: populatedBotMessage[0] 
        },
        'Message sent with AI response'
      )
    );
  }

  // Process normal message
  const chatMessage = await ChatMessage.create({
    sender: req.user._id,
    chat: chatId,
    content: sanitizedContent,
    attachments,
    replyTo: replyTo || null,
    parentMessage: parentMessage || null,
  });

  const updatedChat = await Chat.findByIdAndUpdate(chatId, { lastMessage: chatMessage._id, $set: { removedBy: [] } }, { new: true });

  const chatMessages = await ChatMessage.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(chatMessage._id),
      },
    },
    ...chatMessageCommonAggregation(),
  ]);

  if (!chatMessages.length) {
    throw new ApiError(404, 'No chat messages found');
  }

  const receivedMessage = chatMessages[0];
  updatedChat.participants.forEach((participant) => {
    if (participant._id.toString() !== req.user._id.toString()) {
      emitSocketEvent(req, participant._id?.toString(), ChatEventEnum.MESSAGE_RECEIVED_EVENT, receivedMessage);
    }
  });

  return res.status(201).json(new ApiResponse(201, receivedMessage, 'Message sent successfully'));
});

const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  if (!messageId) {
    throw new ApiError(400, 'Message id is required');
  }
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new ApiError(404, 'Message not found');
  }

  const botUserId = process.env.HIVEAI_BOT_ID || '69d948ea4ee80ad6382362fa';
  if (!(message.sender.toString() === req.user._id.toString() || message.sender.toString() === botUserId)) {
    throw new ApiError(403, 'You are not authorized to delete this message');
  }

  const deletedMessage = await ChatMessage.findByIdAndDelete(messageId);
  const chat = await Chat.findById(deletedMessage.chat);

  if (chat.lastMessage.toString() === deletedMessage._id.toString()) {
    const lastMessage = await ChatMessage.find({ chat: chat._id }).sort({ createdAt: -1 });
    if (lastMessage.length > 0) {
      chat.lastMessage = lastMessage[0]._id;
      await chat.save();
    } else {
      chat.lastMessage = null;
      await chat.save();
    }
  }

  chat.participants.forEach((participant) => {
    if (participant._id.toString() !== req.user._id.toString()) {
      emitSocketEvent(req, participant._id?.toString(), ChatEventEnum.MESSAGE_DELETE_EVENT, deletedMessage);
    }
  });

  return res.status(200).json(new ApiResponse(200, deletedMessage, 'Message deleted successfully'));
});

const getThreadMessages = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  
  const parentMessage = await ChatMessage.findById(messageId);
  if (!parentMessage) {
    throw new ApiError(404, 'Parent message not found');
  }

  const freezedUsers = await User.find({ isFreezed: true }).select('_id');
  const excludeIds = freezedUsers.map(a => a._id);

  const threadMessages = await ChatMessage.aggregate([
    {
      $match: {
        parentMessage: new mongoose.Types.ObjectId(messageId),
        sender: { $nin: excludeIds }
      },
    },
    ...chatMessageCommonAggregation(),
    {
      $sort: {
        createdAt: 1,
      },
    },
  ]);

  return res.status(200).json(new ApiResponse(200, threadMessages, 'Thread messages fetched successfully'));
});

export { sendMessage, getChatMessages, deleteMessage, getThreadMessages };
