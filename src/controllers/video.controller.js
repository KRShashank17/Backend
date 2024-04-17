import { ApiError } from "../utils/ApiError";
import mongoose ,{ isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import {Video} from "../models/video.model.js";
import { destroyOnCloudinary } from "../utils/cloudinary.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const {page=1, limit=10, query, sortBy, sortType, userId} = req.query;

    const pipeline = [];
    if (query) {
        pipeline.push({
            $search : {
                index : "search-videos",
                text : {
                    query : query,
                    path : ["title", "description"]     // search wrt to title, desc
                }
            }
        })
    }

    console.log(userId);
    if (userId){
        if (!isValidObjectId){
            throw new ApiError(400, "Invalid User Id");
        }

        pipeline.push({
            $match : {
                owner : new mongoose.Types.ObjectId(userId)    // refer modle diagram
            }
        })
    }

        // to fetch only public videos
    pipeline.push({
        $match : {isPublished : true}
    })

        // sortBy -> views , createdAt , duration
        // sortyType -> asc(1) , desc(-1) 
    if (sortBy && sortType){
        pipeline.push({
            $sort : {
                [sortBy] : sortType === "asc" ? 1 : -1
            }
        })
    }else{
        pipeline.push({
            $sort : {
                createdAt : -1
            }
        })
    }

    pipeline.push({
        $lookup : {
            from : "users",
            localField : "owner",
            foreignField : "_id",
            as : "ownerDetails",
            pipeline : [{
                $project : {
                    username : 1,
                    "avatar.url" : 1
                }
            }]
        }
    },
    {
        $unwind : "$ownerDetails"        // returns a "document object" for every element present in "ownerDetails" field   
    })

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page : parseInt(page , 10),
        limit : parseInt(limit , 10)
    }

    const videos = await Video.aggregatePaginate(videoAggregate, options);
    
    return res.status(200)
              .json(new ApiResponse(200, videos, "Videos Fetch Successful"));
})

const getVideoById = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    if (!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id");
    }

    if (!isValidObjectId(req.user?._id)){
        throw new ApiError(400, "Invalid User Id");
    }

    const video = await Video.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup :{
                from : "likes",
                localField : "_id",
                foreignField : "video",
                as : "likes"
            }
        },
        {
            $lookup: {
                from : "users",
                localField: "owner",
                foreignField: "_id",
                as : "owner",

                pipeline: [
                    {
                        $lookup : {
                            from : "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as : "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount : {
                                $size : "$subscribers"
                            },
                            isSubscribed : {
                                $cond : {
                                    if : {
                                        $in : [
                                            req.user?._id,
                                            "$subscribers.subscriber"
                                        ]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project : {
                            username : 1,
                            "avatar.url": 1,
                            subscribersCount : 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                likesCount : {
                    $size : "$likes"
                },
                owner : {
                    $first : "$owner"
                },
                isLiked : {
                    $cond: {
                        if : { $in : [req.user?._id , "$likes.likedBy"]},
                        then : true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                "videoFile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ])

    if (!video){
        throw new ApiError(500 , "failed to fetch video");
    }

    await Video.findByIdAndUpdate(videoId , {
        $inc : {
            views : 1
        }
    })

    await User.findByIdAndUpdate(req.user?._id , {
        $addtoSet: {
            watchHistroy : videoId
        }
    })

    return res.status(200)
              .json(new ApiResponse(200, video[0], "Video Fetch Successful"));
})


// get video, upload on Cloudinary
const publishAVideo = asyncHandler(async (req, res) => {
    const {title, description} = req.body;
    if ([title, description].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All fields are required");
    }

    const videoFileLocalPath = req.files?.videoFile[0].path;
    const thumbnailLocalPath = req.files?.thumbnail[0].path;

    if (!videoFileLocalPath || !thumbnailLocalPath){
        throw new ApiError(400, "All files are required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile || !thumbnail){
        throw new ApiError(500, "Files not Found - Failed to upload video");
    }

    const video = await Video.create({
        title,
        description,
        duration : videoFile.duration,
        videoFile: {
            url : videoFile.url,
            public_id : videoFile.public_id
        },
        thumbnail : {
            url : thumbnail.url,
            public_id : thumbnail.public_id
        },
        owner : req.user?._id,
        isPublished : false
    })

    const videoUploaded = await Video.findById(video._id);
    if (!videoUploaded){
        throw new ApiError(500, "Failed to upload video - Something went wrong");
    }

    return res.status(200)
             .json(new ApiResponse(200, videoUploaded, "Video Uploaded Successfully"));
})

const deleteVideo = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    if (!videoId){
        throw new ApiError(400, "Video Id is required");
    }

    const video = await Video.findById(videoId);
    if (!video){
        throw new ApiError(404, "Video not found");
    }

    if (video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "Unauthorized request");
    }

    const videoDeleted = await Video.findByIdAndDelete(videoId);
    if (!videoDeleted){
        throw new ApiError(500, "Failed to delete video - Something went wrong");
    }

    await destroyOnCloudinary(video.thumbnail.public_id);
    await destroyOnCloudinary(video.videoFile.public_id , "video"); // specify video while deleting

    await Like.deleteMany({
        video : videoId
    })

    await Comment.deleteMany({
        video : videoId
    })

    return res.status(200)
            .json(new ApiResponse(200, videoDeleted, "Video Deleted Successfully"));
})

// update video

const togglePublishStatus = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    if (!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id");
    }

    const video = await Video.findById(videoId);
    if (!video){
        throw new ApiError(404, "Video not found");
    }

    if (video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "Unauthorized request");
    }

    const toggledVideoPublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        {new: true}
    )

    if (!toggledVideoPublish){
        throw new ApiError(500, "Failed to toggle video - Something went wrong");
    }

    return res.status(200)
            .json(new ApiResponse(
                200, 
                { isPublished: toggledVideoPublish.isPublished },
                "Video Publish Status Toggled Successfully"
                )
            );
})


export {
    getAllVideos,
    getVideoById,
    publishAVideo,
    deleteVideo,
    togglePublishStatus
}