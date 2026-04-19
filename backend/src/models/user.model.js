import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
      default: '',
    },
    profilePicture: {
      type: String,
      default: '',
    },
    followers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    following: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    posts: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Post',
      default: [],
    },
    groups: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Group',
      default: [],
    },
    pendingGroupRequests: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Group',
      default: [],
    },
    channels: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Channel',
      default: [],
    },
    pendingChannelRequests: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Channel',
      default: [],
    },
    socialLinks: {
      type: [String],
      default: [],
    },
    preferences: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      default: '',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    loginType: {
      type: String,
      enum: ['email', 'google'],
      default: 'email',
    },
    deviceTokens: {
      type: [String],
      default: [],
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isFreezed: {
      type: Boolean,
      default: false,
    },
    frozenByAdmin: {
      type: Boolean,
      default: false,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    refreshToken: {
      type: String,
      default: '',
    },
    college: {
      type: String,
      default: '',
    },
    engineeringDomain: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    yearOfGraduation: {
      type: String,
      default: '',
    },
    showYearOfGraduation: {
      type: Boolean,
      default: false,
    },
    isDeletionScheduled: {
      type: Boolean,
      default: false,
    },
    deletionScheduleDate: {
      type: Date,
    },
    emailVerificationToken: {
      type: String,
      default: '',
    },
    emailVerificationTokenExpiry: {
      type: Date,
    },
    collegeEmail: {
      type: String,
      default: '',
      sparse: true,
    },
    isCollegeEmailVerified: {
      type: Boolean,
      default: false,
    },
    collegeEmailVerificationToken: {
      type: String,
      default: '',
    },
    collegeEmailVerificationTokenExpiry: {
      type: Date,
    },
    savedPosts: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Post',
      default: [],
    },
    resetPasswordToken: {
      type: String,
      default: '',
    },
    resetPasswordExpire: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
