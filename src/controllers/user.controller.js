import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from '../utils/cloudinary.js'
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

const changePassword = asyncHandler( async(req,res) => {
    const { oldPassword , newPassword } = req.body ;

    const curruser = await User.findById(req.user._id)
    const doesPasswordMatch = await curruser.isPasswordCorrect(oldPassword);
    
    if(!doesPasswordMatch){
        throw new ApiError(401 , "Enter Valid Credentials");
    }

    curruser.password = newPassword;
    await curruser.save({validateBeforeSave : false});

    return res.status(200)
    .json( new ApiResponse(200 , {} , "Password Changed Successfully") )
});

export {userRegister , userLogin , userLogout , refreshAccessToken}