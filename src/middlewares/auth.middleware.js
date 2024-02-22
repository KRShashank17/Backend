import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler(async(req, _ , next)=>{
    try {
            //* header contains-> Authentication : Bearer <token> 
        
        const header = req.header("Authentication")?.replace("Bearer ", "")         // removes "Bearer "
        const token = req.cookies?.accessToken || header
    
        if(!token){
            throw new ApiError(401 , "Unauthorized request");
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        const curruser = await User.findById(decodedToken?._id)
                                   .select("-password -refreshToken");
                                   
        if (!curruser){
           throw new ApiError(401,"Invalid Access Token");
        }
        
        req.user = curruser;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")
    }
})