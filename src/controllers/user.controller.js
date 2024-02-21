import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from "../utils/apiResponse.js"

const userController = asyncHandler(async (req, res) => {
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

    const avatarPath = req.files?.avatar[0]?.path ;                         // multer provided "files" option
    const coverImagePath = req.files?.coverImage[0]?.path ;
    if (!avatarPath) {
        throw new ApiError(400 , "Avatar field is required ");
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

export {userController}