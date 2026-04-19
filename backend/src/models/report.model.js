import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Now optional if manual email is provided
    },
    reportedEmail: {
      type: String,
      required: [true, 'Reported email is required'],
      trim: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    media: {
      type: String, // Cloudinary URL
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', null],
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export const Report = mongoose.model('Report', reportSchema);
