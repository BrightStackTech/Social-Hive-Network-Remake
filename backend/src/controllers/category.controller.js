import { Category } from '../models/category.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { v2 as cloudinary } from 'cloudinary';

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, imageUrl: existingImageUrl } = req.body;

  // Validate required fields
  if (!name || !description) {
    throw new ApiError(400, 'Name and description are required');
  }

  // Get the user id from req.user
  const userId = req.user?._id || req.user?.id;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Check if the user already has a category with this name
  const existingCategory = await Category.findOne({ name: name.trim(), createdBy: userId });
  if (existingCategory) {
    throw new ApiError(400, 'You already have a category with this name');
  }

  let finalImageUrl = existingImageUrl || '';

  // If a file was uploaded via multer, use it
  if (req.file) {
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'class-network/categories',
    });
    finalImageUrl = result.secure_url;
  }

  const category = await Category.create({ 
    name: name.trim(), 
    description: description.trim(), 
    imageUrl: finalImageUrl, 
    createdBy: userId 
  });

  return res
    .status(201)
    .json(new ApiResponse(201, category, 'Category created successfully'));
});

export const getCategories = asyncHandler(async (req, res) => {
  const { createdBy } = req.query;
  const filter = createdBy ? { createdBy } : {};
  
  const categories = await Category.find(filter)
    .populate('createdBy', 'username profilePicture')
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, categories, 'Categories fetched successfully'));
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id)
    .populate('createdBy', 'username profilePicture');
    
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }
  return res.status(200).json(new ApiResponse(200, category, 'Category fetched successfully'));
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { name, description, imageUrl } = req.body;
  const userId = req.user?._id || req.user?.id;

  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  if (category.createdBy.toString() !== userId.toString()) {
    throw new ApiError(403, 'Unauthorized to update this category');
  }

  category.name = name?.trim() || category.name;
  category.description = description?.trim() || category.description;
  if (imageUrl) category.imageUrl = imageUrl;

  await category.save();

  return res.status(200).json(new ApiResponse(200, category, 'Category updated successfully'));
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const category = await Category.findById(req.params.id);

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  if (category.createdBy.toString() !== userId.toString()) {
    throw new ApiError(403, 'Unauthorized to delete this category');
  }

  await Category.findByIdAndDelete(req.params.id);

  return res.status(200).json(new ApiResponse(200, null, 'Category deleted successfully'));
});
