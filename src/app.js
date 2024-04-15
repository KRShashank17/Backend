import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN ,
    credentials: true
}))

app.use(express.json({limit:"16mb"}));                          // to support JSON-encoded bodies
app.use(express.urlencoded({ extended: true , limit: "16mb"})); // to support URL-encoded bodies
app.use(cookieParser())   


// config route
import userRouter from "./routes/user.routes.js"
import videoRouter from "./routes/video.routes.js"

app.use("/api/v1/users" , userRouter)
app.use("/api/v1/videos" , videoRouter)

export {app}
