import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Category description is required'],
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User id is required'],
    },
  },
  { timestamps: true }
);

// Index to ensure name uniqueness per user if needed, 
// though the user's spec said "remove global unique constraint" 
// and reference code handles per-user check in controller.

export const Category = mongoose.model('Category', categorySchema);
