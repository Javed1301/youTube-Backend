/**
  id string pk
  username string
  email string
  fullName string
  avatar string
  coverImage string
  watchHistory ObjectId[] videos
  password string
  refreshToken string
  createdAt Date
  updatedAt Date
 */

  import mongoose, { Schema } from "mongoose";

  import bcrypt from "bcrypt"
  import jwt from "jsonwebtoken"
  import dotenv from "dotenv"
  
  dotenv.config()

  const userSchema = new Schema ({
    username: {
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim: true,
        index:true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim:true,
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    avatar: {
        type: String, //cloudinary Url
        required: true
    },
    coverImage: {
        type: String, //cloudinary Url
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref:"Video"
        }
    ],
    password: {
        type: String,
        required: [true,"password is required"]
    },
    refreshToken: {
        type:String,
    }
  },
  { timestamps : true}
)


//middleware :- encrypting the password before saving it 
userSchema.pre("save",async function (next){
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password,10)

    next();
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.genrateAccessToken = function (){
    //short lived access token
    return jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullname: this.fullname
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }    
)
}

userSchema.methods.genrateRefreshToken = function (){
    //short lived access token
    return jwt.sign({
        _id: this._id,
       
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }    
)
}

  // its a stadard practice to write the user wit capital U (User)     
  export const User = mongoose.model("User",userSchema)