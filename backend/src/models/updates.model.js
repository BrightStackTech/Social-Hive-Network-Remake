import mongoose from 'mongoose';

const updateSchema = new mongoose.Schema(
  {
    media: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    viewedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// TTL index to automatically delete records after 24 hours
// 24 hours * 60 minutes * 60 seconds = 86400 seconds
updateSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export const Update = mongoose.model('Update', updateSchema);
