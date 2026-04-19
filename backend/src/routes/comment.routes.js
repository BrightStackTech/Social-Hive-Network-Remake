import {Router} from 'express'
import {
    addComment,
    deleteComment,
    getCommentsByPost,
    toggleCommentLike
} from '../controllers/comment.controller.js'

import { verifyJWT } from '../middleware/auth.middleware.js'

const router = Router()

router.route("/:postId").get(verifyJWT, getCommentsByPost)
router.route("/:postId").post(verifyJWT, addComment)

router.route("/:commentId").delete(verifyJWT, deleteComment)
router.route("/:commentId/like").post(verifyJWT, toggleCommentLike)

export default router