import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/ApiError";
import { Video } from "../models/video.model";

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

export {
    addComment
}