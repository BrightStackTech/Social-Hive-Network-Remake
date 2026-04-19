import mongoose, { Schema } from 'mongoose';

const liveSessionSchema = new Schema(
  {
    title: {
      type: String,
      default: 'Untitled session',
    },
    meetingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    recordingUrl: {
      type: String,
      default: '',
    },
    recordings: [
      {
        type: String,
      }
    ],
    startTime: {
      type: Date,
      default: Date.now,
    },
    terminatedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'ended'],
      default: 'active',
    },
    bannedParticipants: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        kickCount: {
          type: Number,
          default: 0,
        },
        isBanned: {
          type: Boolean,
          default: false,
        },
      },
    ],
    hiddenFromUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

export const LiveSession = mongoose.model('LiveSession', liveSessionSchema);
