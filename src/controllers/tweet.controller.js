import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import Tweet from "../models/tweet.model.js";
import { ApiResponse } from "../utils/apiResponse";

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body;

    if (!content){
        throw new ApiError(400, "Content is required");
    }

    const tweet = await Tweet.create({      //* creation
        content,
        owner : req.user?._id
    })

    if (!tweet){
        throw new ApiError(500, "Failed to create Tweet - Something went wrong");
    }

    return res.status(200)
              .json(new ApiResponse(200, tweet, "Tweet created successfully"))
})

export {createTweet}