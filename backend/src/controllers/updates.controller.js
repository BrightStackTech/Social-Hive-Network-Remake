import { Update } from '../models/updates.model.js';
import User from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @description Create a new status update
 * @route POST /api/v1/updates
 */
export const createUpdate = asyncHandler(async (req, res) => {
  const { media, description } = req.body;
  const postedBy = req.user?._id;

  if (!media) {
    throw new ApiError(400, "Media is required for an update");
  }

  const newUpdate = await Update.create({
    media,
    description,
    postedBy,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newUpdate, "Update created successfully"));
});

/**
 * @description Get updates for a specific user
 * @route GET /api/v1/updates/:userId
 */
export const getUpdates = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const updates = await Update.find({ postedBy: userId })
    .populate('postedBy', 'username profilePicture')
    .sort({ createdAt: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, updates, "Updates fetched successfully"));
});

/**
 * @description Delete an update by ID
 * @route DELETE /api/v1/updates/:updateId
 */
export const deleteUpdateById = asyncHandler(async (req, res) => {
  const { updateId } = req.params;
  const userId = req.user?._id;

  const update = await Update.findById(updateId);

  if (!update) {
    throw new ApiError(404, "Update not found");
  }

  // Check authorization
  if (update.postedBy.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to delete this update");
  }

  await Update.findByIdAndDelete(updateId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Update deleted successfully"));
});

/**
 * @description Increment view count for an update
 * @route POST /api/v1/updates/:updateId/view
 */
export const incrementViewCount = asyncHandler(async (req, res) => {
  const { updateId } = req.params;
  const viewerId = req.user?._id;

  const update = await Update.findById(updateId);
  if (!update) {
    throw new ApiError(404, "Update not found");
  }

  // Don't count own views
  if (update.postedBy.toString() !== viewerId.toString()) {
    // Atomic update: only add to viewedBy if not already present
    const updatedUpdate = await Update.findOneAndUpdate(
      {
        _id: updateId,
        postedBy: { $ne: viewerId }, // Safety check again
        viewedBy: { $ne: viewerId } // Only if viewer is NOT in viewedBy
      },
      {
        $addToSet: { viewedBy: viewerId },
        $inc: { viewCount: 1 }
      },
      { new: true }
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "View count incremented successfully"));
});

/**
 * @description Get people who viewed the update
 * @route GET /api/v1/updates/:updateId/viewers
 */
export const getViewers = asyncHandler(async (req, res) => {
  const { updateId } = req.params;
  const userId = req.user?._id;

  const update = await Update.findById(updateId).populate({
    path: 'viewedBy',
    select: 'username profilePicture college'
  });
  
  if (!update) {
    throw new ApiError(404, "Update not found");
  }

  // Only the person who posted can see viewers
  if (update.postedBy.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to see viewers of this update");
  }

  // Deduplicate viewers by ID to be safe and handle legacy data
  const seenIds = new Set();
  const uniqueViewers = [];
  let hasDuplicates = false;

  for (const viewer of update.viewedBy) {
    if (!viewer?._id) continue;
    const vId = viewer._id.toString();
    if (seenIds.has(vId)) {
      hasDuplicates = true;
      continue;
    }
    seenIds.add(vId);
    uniqueViewers.push(viewer);
  }

    // We use the cleaned IDs to update the document and re-save viewedBy
    await Update.findByIdAndUpdate(updateId, {
      $set: { viewedBy: uniqueViewers.map(v => v._id) }
    });

  // Final check: ensure every viewer object has a college field (even if empty)
  const finalViewers = uniqueViewers.map(v => ({
    _id: v._id,
    username: v.username,
    profilePicture: v.profilePicture,
    college: v.college || ''
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, finalViewers, "Viewers fetched successfully"));
});

/**
 * @description Check if a user has active updates
 * @route GET /api/v1/updates/has-updates/:userId
 */
export const hasUpdates = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const updatesCount = await Update.countDocuments({ postedBy: userId });
  
  return res
    .status(200)
    .json(new ApiResponse(200, { hasUpdates: updatesCount > 0 }, "Checked updates status"));
});
