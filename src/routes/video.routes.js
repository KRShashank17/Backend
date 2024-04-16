import { Router } from "express";
import { upload } from "../middlewares/multer.middleware";
import { verifyJWT } from "../middlewares/auth.middleware";
import { deleteVideo, getAllVideos,getVideoById, publishAVideo } from "../controllers/video.controller";

const router = Router();

router.route("/")
        .get(getAllVideos)
        .post(verifyJWT, upload.fields([
            { name: 'videoFile', maxCount : 1},
            { name: 'thumbnail', maxCount :1}
            ]),
            publishAVideo
        )

// update , delete - yet to be implemented
router.route("/v/:videoId")
        .get(verifyJWT, getVideoById)
        .delete(verifyJWT, deleteVideo)

// toggle route - yet to be implemented

export default router;