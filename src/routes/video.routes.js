import { Router } from "express";
import { upload } from "../middlewares/multer.middleware";
import { verifyJWT } from "../middlewares/auth.middleware";
import { deleteVideo, getAllVideos,getVideoById, publishAVideo, togglePublishStatus } from "../controllers/video.controller";

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

router.route("/toggle/publish/:videoId").patch(verifyJWT, togglePublishStatus)

export default router;