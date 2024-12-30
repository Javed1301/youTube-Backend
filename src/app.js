import express from 'express'
import cors from "cors"
import cookieParser from 'cookie-parser'

const app = express()

app.use(
    cors({
        origin: process.env.CROS_ORIGIN,
        cresentials:true
    })
)

//comman middlewares

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended:true, limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//import routes
import healthcheckRouter from './routes/healthcheck.routes.js'
import userRouter from "./routes/user.routes.js"
import {errorHandler} from "./middlewares/error.middlewares.js"
import videoRouter from "./routes/video.routes.js"
//routes

app.use("/api/v1/healthcheck",healthcheckRouter)
app.use("/api/v1/users",userRouter)
app.use("/api/v1/video",videoRouter)
app.use(errorHandler)

export { app }