import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/ApiError";
import { Video } from "../models/video.model";
import {Comment} from "../models/comment.model";
import { Like } from "../models/like.model";

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const {content} = req.body;

    if (!content){
        throw new ApiError(400, "Content is required");
    }

    const video = await Video.findById(videoId);
    if (!video){
        throw new ApiError(404, "Invalid video");
    }

    const comment = await Comment.create({
        content,
        video : videoId,
        owner : req.user?._id
    })
    if (!comment){
        throw new ApiError(500, "Failed to add comment - Something went wrong");
    }

    return res.status(200)
              .json(new ApiResponse(200, comment, "Comment added successfully"))
})

const deleteComment = asyncHandler(async(req, res) => {
    const {commentId} = req.params;
    const comment = await Comment.findById(commentId);

    if (!comment){
        throw new ApiError(404, "Comment not found");
    }

    if (comment?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "Unauthorized request");
    }

    await Comment.findByIdAndDelete(commentId);

    await Like.deleteMany({
        comment : commentId,
        likedBy : req.user
    })

    return res.status(200)
              .json(new ApiResponse(200, {commentId},"Comment deleted successfully"))
})

const updateComment = asyncHandler(async(req, res) => {
    const {commentId} = req.params;
    const {content} = req.body;

    if (!content){
        throw new ApiError(400, "Content is required");
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(404, "Comment not found");
    }

    if (comment?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "Unauthorized request");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id, 
        {
            $set: {
                content
            }
        }, 
        {new : true}
    )

    if (!updateComment){
        throw new ApiError(500, "Failed to update comment - Something went wrong");
    }

    return res.status(200)
              .json(new ApiResponse(200, updatedComment, "Comment updated successfully"))
});

export {
    addComment,
    deleteComment,
    updateComment
}