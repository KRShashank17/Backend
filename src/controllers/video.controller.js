import { ApiError } from "../utils/ApiError";
import mongoose ,{ isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import {Video} from "../models/video.model.js";

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


export {
    getAllVideos,
    publishAVideo
}