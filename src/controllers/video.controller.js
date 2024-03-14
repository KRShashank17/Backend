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

export {
    getAllVideos
}