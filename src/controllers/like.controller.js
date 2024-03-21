import mongoose  from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/apiResponse";
import { Like } from "../models/like.model";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    if (!videoId){
        throw new ApiError(400, "Video Id is required");
    }

    const likedAlready = await Like.findOne({
        video : videoId,
        owner : req.user?._id
    })
    if (likedAlready){
        await Like.findByIdAndDelete(likedAlready._id);

        return res.status(200)
                  .json(new ApiResponse(200, { isLiked : false}))
    }

    await Like.create({
        video : videoId,
        likedBy : req.user?._id
    })
    return res.status(200)
              .json(new ApiResponse(200, { isLiked : true}));
})

export {
    toggleVideoLike
}