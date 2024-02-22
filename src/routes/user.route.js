import { Router } from "express";
import { userRegister } from "../controllers/user.controller.js"
import {upload} from "../middlewares/multer.middleware.js"

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

export default router