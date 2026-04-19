import {asyncHandler} from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import {Comment} from '../models/comment.model.js'
import { Post } from '../models/post.model.js'
import mongoose from 'mongoose'

const addComment = asyncHandler(async (req, res) => {
    const { postId } = req.params
    const { comment, parentId } = req.body
    const userId = req.user._id

    if (!comment) {
        throw new ApiError(400, 'Content is required')
    }

    const post = await Post.findById(postId)
    if (!post) {
        throw new ApiError(404, 'Post not found')
    }

    // If parentId is provided, verify it exists
    if (parentId) {
        const parent = await Comment.findById(parentId);
        if (!parent) {
            throw new ApiError(404, 'Parent comment not found');
        }
    }

    const savedComment = await Comment.create({
        comment,
        post: postId,
        user: userId,
        parentId: parentId || null
    }).then(
        async (comment) => await comment.populate('user', 'username profilePicture email')
    )
    
    // Only add top-level comments to the post's direct comments array?
    // Actually, the Post model currently has a comments array. We should probably add it there regardless to keep count.
    post.comments.push(savedComment._id)
    await post.save()

    res.status(201).json(new ApiResponse(201, savedComment, 'Comment added successfully'))
})

const getCommentsByPost = asyncHandler(async (req, res) => {
    const { postId } = req.params

    const post = await Post.findById(postId)
    if (!post) {
        throw new ApiError(404, 'Post not found')
    }

    const comments = await Comment.aggregate([
        {
            $match: {
                post: post._id
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $unwind: '$user'
        },
        {
            $match: {
                'user.isFreezed': { $ne: true }
            }
        },
        {
            $addFields: {
                likeCount: { $size: { $ifNull: ["$likes", []] } },
                isLiked: {
                    $in: [new mongoose.Types.ObjectId(req.user?._id), { $ifNull: ["$likes", []] }]
                }
            }
        },
        {
            $project: {
                comment: 1,
                user: {
                    _id: 1,
                    username: 1,
                    profilePicture: 1,
                    email: 1
                },
                parentId: 1,
                likeCount: 1,
                isLiked: 1,
                createdAt: 1
            }
        },
        {
            $sort: {
                likeCount: -1,
                createdAt: -1
            }
        }
    ])

    res.status(200).json(new ApiResponse(200, comments, 'Comments fetched successfully'))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, 'Comment not found');
    }

    const isLiked = comment.likes.includes(userId);
    if (isLiked) {
        comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
    } else {
        comment.likes.push(userId);
    }

    await comment.save();

    res.status(200).json(new ApiResponse(200, { likeCount: comment.likes.length, isLiked: !isLiked }, 'Comment like toggled'));
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, 'Comment not found')
    }

    if (comment.user.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to delete this comment')
    }

    await Comment.findByIdAndDelete(commentId)
    await Post.findByIdAndUpdate(comment.post, {
        $pull: { comments: commentId }
    })

    res.status(200).json(new ApiResponse(200, null, 'Comment deleted successfully'))
})

export {
    addComment,
    getCommentsByPost,
    deleteComment,
    toggleCommentLike
}