import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    description: {
        type: String,
    },
    profilePicture: {
        type: String,
        default: "https://res.cloudinary.com/domckasfk/image/upload/v1776156528/default-channel-image_zod7df.png"
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    joinRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    removedMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    }],
    isPublic: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const Channel = mongoose.model('Channel', channelSchema);
export { Channel };
