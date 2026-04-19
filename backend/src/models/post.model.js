import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    media: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    reposts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    sharedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isRepost: { type: Boolean, default: false },
    repostedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    isEdited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Post = mongoose.model('Post', postSchema);
