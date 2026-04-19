import mongoose, { Schema } from 'mongoose';

const chatSchema = new Schema(
  {
    name: {
      type: String,
      required: function () {
        return this.isGroupChat;
      },
    },
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'ChatMessage',
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    admin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
    },
    channel: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
    },
    pinnedMessages: [
      {
        type: Schema.Types.ObjectId,
        ref: 'ChatMessage',
      },
    ],
    removedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

export const Chat = mongoose.model('Chat', chatSchema);
