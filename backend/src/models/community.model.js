import mongoose, { Schema } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

const communitySchema = new Schema(
  {
    communityName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    profilePicture: {
      type: String,
      default: '', 
    },
    composts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'ComPost',
      },
    ],
    admin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    joinedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    joinedCount: {
      type: Number,
      default: 1,
    },
    removedMem: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    pendingReq: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

communitySchema.plugin(uniqueValidator);

const Community = mongoose.model("Community", communitySchema);

export { Community };
