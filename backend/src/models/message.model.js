import mongoose, { Schema } from 'mongoose';

const chatMessageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'ChatMessage',
      default: null,
    },
    parentMessage: {
      type: Schema.Types.ObjectId,
      ref: 'ChatMessage',
      default: null,
    },
    attachments: [
      {
        url: {
          type: String,
          required: true,
        },
        localPath: {
          type: String,
        },
        fileName: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true }
);

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
