import { Router } from "express";
import { 
    changePassword, 
    getChannelDetails, 
    getCurrentUser, 
    getWatchHistory, 
    refreshAccessToken, 
    updateAvatar, 
    updateCoverImage, 
    updateUserDetails, 
    userLogin, 
    userLogout, 
    userRegister 
    } from "../controllers/user.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

// router.post('/register' , userController);
router.route('/register').post( 
    upload.fields(                                              // fields provided by multer - accepts multiple files (array of objects)
        [
            { name: 'avatar', maxCount : 1},
            { name: 'coverImage', maxCount :1}
        ]
    ),
    userRegister
)

router.route('/login').post(userLogin);

// secured Routes
router.route('/logout').post( verifyJWT , userLogout);
router.route('/refresh-token').post(refreshAccessToken);

router.route('/change-password').post(verifyJWT , changePassword);
router.route('/current-user').get(verifyJWT, getCurrentUser); 
router.route('/update-account').patch(verifyJWT, updateUserDetails);        // patch -> updates only specified fields

router.route('/update-avatar').patch(verifyJWT, upload.single('avatar') , updateAvatar);        
router.route('/update-cover-image').patch(verifyJWT, upload.single('coverImage') , updateCoverImage); 

router.route('/ch/:username').get(verifyJWT , getChannelDetails);
router.route('/watch-history').get(verifyJWT, getWatchHistory);

export default router