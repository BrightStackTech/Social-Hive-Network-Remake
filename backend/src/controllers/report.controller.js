import { v2 as cloudinary } from 'cloudinary';
import { Report } from '../models/report.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ─── CREATE REPORT ────────────────────────────────────────
export const createReport = asyncHandler(async (req, res) => {
  const { reportedUserId, reportedEmail, description } = req.body;
  const reporterId = req.user._id;

  if (!reportedEmail?.trim()) {
    throw new ApiError(400, 'Reported email is required');
  }

  if (!description?.trim()) {
    throw new ApiError(400, 'Description is required');
  }

  let mediaUrl = null;
  let mediaType = null;

  // Handle single media file upload
  if (req.file) {
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'class-network/reports',
      resource_type: resourceType,
    });
    
    mediaUrl = result.secure_url;
    mediaType = resourceType;
  }

  const report = await Report.create({
    reportedUser: reportedUserId || null,
    reportedEmail: reportedEmail || null,
    reportedBy: reporterId,
    description: description.trim(),
    media: mediaUrl,
    mediaType: mediaType,
  });

  return res.status(201).json(
    new ApiResponse(201, report, 'Report submitted successfully')
  );
});

// ─── GET ALL REPORTS (ADMIN) ─────────────────────────────
export const getAllReports = asyncHandler(async (req, res) => {
  const { query } = req.query;
  
  let filter = {};
  if (query) {
    filter = {
      $or: [
        { reportedEmail: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    };
  }

  const reports = await Report.find(filter)
    .populate('reportedUser', 'username email profilePicture')
    .populate('reportedBy', 'username email profilePicture')
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, reports, 'Reports fetched successfully')
  );
});
