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

const deleteTweet = asyncHandler(async(req, res) => {
    const {tweetId} = req.params;

    if (!isValidObjectId(tweetId)){
        throw new ApiError(404, "Invalid tweet");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet){
        throw new ApiError(404,"Tweet not found");
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(404,"Only Owner can delete tweet");
    }

    await Tweet.findByIdAndDelete(tweetId);

    return res.status(200)
              .json(new ApiResponse(200,{tweetId},"Tweet Deleted Successful"));
})

const updateTweet = asyncHandler(async(req, res) => {
    const {tweetId} = req.params;
    const {content} = req.body;

    if (!content){
        throw new ApiError(400, "Content is required");
    }
    if (!isValidObjectId(tweetId)){
        throw new ApiError(404, "Invalid tweet");
    }

    let tweet = await Tweet.findById(tweetId);
    if(!tweet){
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(404, "Only Owner can update tweet");
    }

    const newTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set : {
                content
            }
        },
        {new : true}
    )

    if (!newTweet){
        throw new ApiError(500, "Failed to update Tweet - Something went wrong");
    }

    return res.status(200)
             .json(new ApiResponse(200, newTweet, "Tweet updated successfully"))
})

const getUserTweets = asyncHandler(async(req, res) => {
    const {userId} = req.params;
    if (!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid User Id");
    }

    const tweets = await Tweet.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username : 1,
                            "avatar_url": 1
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from : "likes",
                localField : "_id",
                foreignField : "tweet",
                as : "likeDetails",
                pipeline: [
                    {
                        $project:{
                            likedBy : 1
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                likesCount : {
                    $size : "$likeDetails"
                },
                ownerDetails : {
                    $first : "$ownerDetails"
                },
                isLiked : {
                    $cond: {
                        if : { $in : [req.user?._id , "$likeDetails.likedBy"]},
                        then : true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt : -1
            }
        },
        {
            $project : {
                content : 1,
                likesCount : 1,
                ownerDetails : 1,
                isLiked : 1,
                createdAt : 1
            }
        }
    ])

    return res.status(200)
              .json(new ApiResponse(200 , tweets , "Tweets fetched successfully"))
})

export {
    createTweet ,
    deleteTweet ,
    updateTweet ,
    getUserTweets
}