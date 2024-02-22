import { Router } from "express";
import { refreshAccessToken, userLogin, userLogout, userRegister } from "../controllers/user.controller.js"
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

export default router