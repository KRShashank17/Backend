import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {destroyOnCloudinary, uploadOnCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"

const generateRefreshTokenAccessToken = async (userId) => {
    try {
        const curruser = await User.findById(userId);
        const accessToken = curruser.generateAccessToken()
        const refreshToken = curruser.generateRefreshToken()
        // save to DB
        curruser.refreshToken = refreshToken;
        await curruser.save({ validateBeforeSave : false })       //! so that "required" fields doesn't cause problem

        return { refreshToken, accessToken }

    } catch (error) {
        throw new ApiError(500 , error ||  "Something went wrong - while generating Refresh , Access Token");
    }
}


const userRegister = asyncHandler(async (req, res) => {
    // 1. Get Details
    // 2. Check if fields are empty
    // 3. Check if user is already registered
    // 4. Multer middleware - user.router
    // 5. uploadOnCloudinary
    // 6. create new user in DB
    // 7. remove password , refreshToken to send to Frontend
    // 8. return response (use utils-> apiResponse)

    //1
    const {username , email , fullname , password } = req.body ;

    //2
    if ( [username, email, fullname, password].some( (entry) => entry?.trim() === "" ) ){
        throw new ApiError(400 , "Field is required");
    }

    //3
    const doesUserExist = await User.findOne({
        $or : [{username} , {email}]
    })

    if (doesUserExist){
        throw new ApiError(409 , "User already exists - LOGIN" );
    }

    //4
    // console.log(req.body);           
    // console.log('\n\n');
    // console.log(req.files);          // just for reference

    // avatar is required field
    const avatarPath = req.files?.avatar[0]?.path ;                         // multer provided "files" option
    if (!avatarPath) {
        throw new ApiError(400 , "Avatar field is required ");
    }
    
    // coverImage is optional field
    // const coverImagePath = req.files?.coverImage[0]?.path ;      // shows error - can't access 0th index - if empty
    let coverImagePath;
    if (req.files?.coverImage) {
        coverImagePath = req.files.coverImage[0].path;
    }
    

    //5
    const avatar = await uploadOnCloudinary(avatarPath);
    const coverImage = await uploadOnCloudinary(coverImagePath);
    if (!avatar){
        throw new ApiError(400 , "Avatar field is required");
    }

    //6
    const user = await User.create(
        {
            username : username.toLowerCase() ,
            fullname ,
            password ,
            email ,
            avatar : avatar.url ,
            coverImage : coverImage?.url || ""

        }
    )

    //7
    const finalUser = await User.findById( user._id ).select(                   // to remove use select option  -> (-ve) symbol 
                        "-password -refreshToken"
                    ) 
    if (!finalUser){
        throw new ApiError(500 , "Something went wrong - User register")
    }

    //8
    res.status(201).json( new ApiResponse(200 ,finalUser , "User Registration Successful"))
})

const userLogin = asyncHandler( async (req, res) => {
    // 1. get details from body
    // 2. Check if username or email is present/sent
    // 3. Check if USER exists - else Reg
    // 4. Check if password is valid
    // 5. ALL OK -> generate  RefeshToken(long-time + DB) ,AccessToken(short-time)

    // 1
    const { username, email, password } = req.body ;
    // console.log(username);

    // 2
    // if (!username && !email){            // also works
    if (! (username || email)){
        throw new ApiError(400 , "Enter Valid Credentials");
    }
    
    // 3
    const curruser = await User.findOne({
        $or : [{username} , {email}]
    })
    if (!curruser){
        throw new ApiError(404 , "User not found - PLS REGISTER");
    }

    // 4
    const isValidPassword = await curruser.isPasswordCorrect(password);
    if(!isValidPassword){
        throw new ApiError(401 , "Enter Valid Credentials");
    }
    
    // 5
    const {refreshToken , accessToken } = await generateRefreshTokenAccessToken(curruser._id);
    // console.log(isValidPassword);

    const options = {
        httpOnly : true,        //* can only be altered from SERVER side
        secure : true
    }

    const loginUser = await User.findById(curruser._id)
                                .select("-password -refreshToken");

    return res.status(200)
    .cookie("refreshToken" , refreshToken , options)
    .cookie("accessToken", accessToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user : loginUser , accessToken , refreshToken
            },
            "Login Successful"
        )
    )

} )

const userLogout = asyncHandler( async(req,res) => {
        // remove refresh Token
    await User.findByIdAndUpdate(
        req.user._id ,
        {
            $unset : { refreshToken : 1 }
        },
        { new : true }
    )
    
        // clear cookie
    const options = {
        httpOnly : true,
        secure : true
    }
    return res.status(200)
    .clearCookie("refreshToken" , options)
    .clearCookie("accessToken" , options)
    .json( new ApiResponse(200 , {} , "Logout Successful") )
} )

const refreshAccessToken = asyncHandler( async(req,res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken ;
    if (!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized Access");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET)
        const curruser = await User.findById(decodedToken?._id)
        if (!curruser){
            throw new ApiError(401 , "Unauthorized Access");
        }

        if (incomingRefreshToken !== curruser.refreshToken){
            throw new ApiError(401, "Refresh Token doesn't match ")
        }

        const {newrefreshToken, accessToken } = await generateRefreshTokenAccessToken(curruser._id);
        const options = {
            httpOnly : true,
            secure : true
        }
        return res.status(200)
        .cookie("refreshToken" , newrefreshToken , options)
        .cookie("accessToken" , accessToken , options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken, 
                    refreshToken : newrefreshToken
                },
                "Refresh Access Token Successful"
            )
        )
    } catch (error) {
        throw new ApiError(401 , "Invalid RefreshAccess Token");
    }
})

        // Updating values -->
const changePassword = asyncHandler( async(req,res) => {
    const { oldPassword , newPassword } = req.body ;

    const curruser = await User.findById(req.user._id)
    const doesPasswordMatch = await curruser.isPasswordCorrect(oldPassword);
    
    if(!doesPasswordMatch){
        throw new ApiError(400 , "Enter Valid Credentials");
    }

    curruser.password = newPassword;
    await curruser.save({validateBeforeSave : false});

    return res.status(200)
    .json( new ApiResponse(200 , {} , "Password Changed Successfully") )
});

const getCurrentUser = asyncHandler( async(req,res) => {
    return res.status(200)
    .json( 
        new ApiResponse(200 , 
        req.user , 
        "User Fetch Successful")
    )
})

const updateUserDetails = asyncHandler( async(req,res) => {
    const { fullname , email } = req.body ;
    if (!(fullname && email)){
        throw new ApiError(400 , "All Fields are required");;
    }

    const curruser = await User.findByIdAndUpdate(
        req.user?._id ,
        {
            $set : {
                fullname , 
                email
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(
            200, curruser, "Account details updated successfully"
        )
    )
})

        //* user middleware (in Routes) - Multer
const updateAvatar = asyncHandler( async(req,res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath){
        throw new ApiError(400 , "Please select an image");
    }

    const newAvatar = await uploadOnCloudinary(avatarLocalPath);
    if (!newAvatar.url){
        throw new ApiError(500 , "Something went wrong - while updating/uploading avatar to Cloudinary");
    }
            //* Deleting old Avatar
    await destroyOnCloudinary(req.user?.avatar)

    const curruser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : newAvatar.url
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res.status(200)
    .json( 
        new ApiResponse(200 , curruser , "Avatar Updated Successfully")
    )
})

const updateCoverImage = asyncHandler( async(req,res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath){
        throw new ApiError(400 , "Please select an image");
    }

    const newCoverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!newCoverImage.url){
        throw new ApiError(500 , "Something went wrong - while updating/uploading avatar to Cloudinary");
    }

        //* Deleting old Cover Image
    await destroyOnCloudinary(req.user?.coverImage)

    const curruser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : newCoverImage.url
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res.status(200)
    .json( 
        new ApiResponse(200 , curruser , "Cover Image Updated Successfully")
    )
})

const getChannelDetails = asyncHandler(async(req, res) => {
    const {username} = req.params ;                         // channel name is taken from 'URL'
    if (!username?.trim()){
        throw new ApiError(400, "Username misssing - URL");
    }

    // aggregate( [ {$match:},{$lookup},{$addFields},{$project} ] )
    const channel = User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup : {
                from : "subscriptions",                     // User <-> Subscription Model
                localField : "_id",
                foreignField : "channel",                   //! look for same Channel name -> to get count(Subsribers)
                as : "subscribers"
            }
        },
        {
            $lookup : {
                from : "subscriptions",                     //* within MongoDB 'Subscription' -> subscriptions (toLower & plural)
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount : {$size : "$subscribers"},
                channelsSubscribedToCount : {$size : "$subscribedTo"},
                isSubscribed : {
                    $cond : {
                        if : { $in : [req.user?._id , "$subscriptions.subscriber" ] },      //! Syntax -> imp PRACTICE
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {                                //  turn flag to "1" if needs to be PROJECTed
                username : 1,
                fullname : 1,
                email : 1,
                avatar : 1,
                coverImage : 1,
                subscribersCount : 1,
                channelsSubscribedToCount :  1,
                isSubscribed: 1,
            }
        }
    ]);

    if (! channel?.length){
        throw new ApiError(404, "Channel not found");
    }
    console.log(channel);               //*  aggregate returns 'array of Objects' - Here Channel contains 'single object'

    return res.status(200)
    .json( 
        new ApiResponse(200, channel[0], "Channel Details Fetch Successful")
    )
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId( req.user._id )       // req.user._id is "object('String_id')" -> only be parsed via Mongoose
            },
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",            // users.watchHistory <-> videos._id
                foreignField : "_id",
                as : "watchHistory", 

                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",       // videos.owner <-> users._id
                            foreignField : "_id",
                            as : "owner"
                        },

                        pipeline : [
                            {
                                $project : {
                                    fullname : 1,
                                    username : 1,
                                    avatar : 1
                                }
                            }
                        ]
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"       // keeping owner[0] into owner
                            }
                        }
                    }
                ]
            }
        }
    ])

    res.status(200)
    .json(
        new ApiResponse(
            200 ,
            user[0].watchHistory,
            "Watch History Fetch Successful"
        )
    )
})

export {userRegister, 
    userLogin , 
    userLogout , 
    refreshAccessToken ,
    changePassword,
    getCurrentUser,
    updateUserDetails,
    updateAvatar,
    updateCoverImage,
    getChannelDetails,
    getWatchHistory
}