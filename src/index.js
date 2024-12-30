import { app } from "./app.js"
import dotenv from "dotenv"
import connectDB from "./db/index.js"

dotenv.config({
    path:"./.env"
})

const PORT = process.env.PORT || 8000
//since we want first our database to be connected then the functionality to perform
// app.listen(PORT,()=>{
//     console.log(`server is listening on port number ${PORT}`)
// })

connectDB()
.then(()=>{
    app.listen(PORT,()=>{
        console.log(`server is listening on port number ${PORT}`)
    })
})
.catch((err) => {
    console.log("MongoDb connection error(index.js)",err)
})