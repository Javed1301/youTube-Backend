import { asyncHandler } from "../utils/asyncHandler.js"
// import {ApiError} from "../utils/ApiError.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary,deleteFromCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const genrateAccessAndRefreshToken = async (userId) => {
   try {
     const user = await User.findById(userId)
 
     if(!user){
         throw new ApiError(500,"No user exist with the given id");
     }
 
     const accessToken = user.genrateAccessToken()
     const refreshToken = user.genrateRefreshToken()
 
     user.refreshToken = refreshToken
     //there might be an issue here
     await user.save({validateBeforeSave:false})
     return {accessToken, refreshToken}
   } catch (error) {
        throw new ApiError(500,"something went wrong while genrating AccessToken and RefreshToken")
   }
}

const registerUser = asyncHandler(async (req,res) => {
    const {fullname,email,username,password} = req.body

    //validation: task explore other validation pattern
    if(
        [fullname,email,username,password].some((field) => field?.trim()==="")

    )
    {
        throw new ApiError (400,"All fields are required")
    }


    // const existedUser = User.findOne({
    //     $or: [{username},{email}]
    // })
    const existedUser = await User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser){
        throw new ApiError (409,"User already exist")
    }
    console.warn(req.files)
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverLocalPath = req.files?.coverImage?.[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    // const avatar = await uploadOnCloudinary(avatarLocalPath)

    // let coverImage = ""
    // if(coverLocalPath){
    //     coverImage = await uploadOnCloudinary(coverImage)
    // }

    let avatar;
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath)
        console.log("Uploaded Avatar",avatar)
    } catch (error) {
        console.log("error uploading avatar",error)
        throw new ApiError(500, "Failed to upload avatar")
    }

    let coverImage;
    try {
        coverImage = await uploadOnCloudinary(coverLocalPath)
        console.log("Uploaded coverImage",coverImage)
    } catch (error) {
        console.log("error uploading coverImage",error)
        throw new ApiError(500, "Failed to upload coverImage")
    }

    try {

        //debugging
        // console.log("test1")
    
        // // Log the data being passed to create
        // console.log("Attempting to create user with data:", {
        //     fullname,
        //     avatar: avatar?.url,
        //     coverImage: coverImage?.url || "",
        //     email,
        //     username: username?.toLowerCase()
        //     // Omitting password from log for security
        // });
    
        const user = await User.create({
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        })
        // console.log("test2")
        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )
        
        if(!createdUser){
            throw new ApiError(500,"Something went wrong while registering user");
        }
    
        return res
            .status(201)
            .json(new ApiResponse(200,createdUser,"user registered successfully"))
    
    
    } catch (error) {
        console.log("User creation failed")

        //debugging
        // console.log("User creation failed with error:", {
        //     name: error.name,
        //     message: error.message,
        //     stack: error.stack
        // });

        if(avatar){
            await deleteFromCloudinary(avatar.public_id)
        }
        if(coverImage){
            await deleteFromCloudinary(coverImage.public_id)
        }

        throw new ApiError(500,"Something went wrong while registering a user and images were deleted")
    }


})

const loginUser = asyncHandler(async (req,res) => {
    //get data from body
    const {email,username,password} = req.body
    //debuging
    // console.log("Request Body:", req.body);

    // console.log("Username:", username);
    // console.log("Email:", email);


    //validation
    if(
        [email,username,password].some((field) => field?.trim()==="")

    )
    {
        throw new ApiError (400,"All fields are required")
    }

    // console.log("test1")
    //get data from database
    const user = await User.findOne({
        $or:[{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"User not Found");
    }

    //if user exist validate the password(possibility of error)
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError (401,"Invalid Password")
    }

    const {accessToken,refreshToken} = await genrateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure:process.env.NODE_ENV === "production"
    }

    return res 
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(
            200,
            {user: loggedInUser, accessToken, refreshToken},
            "User logged in successfully"
        ))
}) 

const logoutUser = asyncHandler( async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {new:true}
    )

    const options ={
        httpOnly:true,
        secure:process.env.NODE_ENV === "production",
    }

    return res 
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(new ApiResponse(200,{}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler( async (req,res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(incomingRefreshToken){
        throw new ApiError(401,"Refresh token required");
    }

    try {
        const decodeToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodeToken?._id)

        if(!user){
            throw new ApiError(401,"Invalid Refresh Token");
        }

        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Invalid refresh token");
        }

        const options = {
            httpOnly:true,
            secure:process.env.NODE_ENV === "production"
        }

        const {accessToken,refreshToken: newRefreshToken} = 
        await genrateAccessAndRefreshToken(user._id)

        return res 
            .status(200)
            .cookie("accessToken",accessToken,options)
            .cookie("refreshToken",newRefreshToken,options)
            .json(
                new ApiResponse(
                    200,
                    {accessToken,refreshToken: newRefreshToken},
                    "Access Token refreshed successfully"
                )
            )
    } catch (error) {
        throw new ApiError(500,"Something went wrong while refreshing access token");
     }

})


const changeCurrentPassword = asyncHandler( async (req,res) => {

    const {oldPassword,newPassword} = req.body

    if([oldPassword,newPassword].some((field)=> field?.trim()==="")){
        throw new ApiError(400,"All fields are required")
    }

    const user = await User.findById(req.user?._id)

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)
    
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid Password")
    }

    user.password = newPassword

    await user.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponse(200,{}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler( async (req,res) => {
      return res.status(200).json(new ApiResponse(200,req.user, "User details fetched successfully"))
})

const updateAccountDetails = asyncHandler( async (req,res) => {
   const  {fullname,email} = req.body

   if([fullname,email].some((field)=> field?.trim()==="")){
         throw new ApiError(400,"All fields are required")
   }
   
   const user = await User.findByIdAndUpdate(
         req.user._id,
         {
            //set is use to set the new fullname and email
              $set:{
                fullname,
                email: email
              }
         },
         //new:true is use to return the updated user
         {new:true}
   ).select("-password -refreshToken")


   return res.status(200).json(new ApiResponse(200,user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler( async (req,res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(500,"Failed to upload avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new:true}
    ).select("-password -refreshToken")

   return res.status(200).json(new ApiResponse(200,user,"Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler( async (req,res) => {
    const coverLocalPath = req.file?.path

    if(!coverLocalPath){
        throw new ApiError(400,"Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverLocalPath)

    if(!coverImage.url){
        throw new ApiError(500,"Failed to upload cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new:true}
    ).select("-password -refreshToken")

   return res.status(200).json(new ApiResponse(200,user,"Cover Image updated successfully"))
})

const getUserChanelProfile = asyncHandler( async( req, res ) =>{
       const { username } = req.params 
       if(!username?.trim()){
            throw new ApiError(400, "Username is required")
       }

       const chanel = await User.aggregate(
            [
                {
                    $match: {
                        username: username?.toLowerCase()
                    }
                },
                {
                    $lookup: {
                        from: "susbcriptions" , 
                        localField: "_id",
                        foreignField: "channel",
                        as: "susbcribers"
                    }
                },
                {
                    $lookup: {
                        from: "susbcriptions" , 
                        localField: "_id",
                        foreignField: "subscriber",
                        as: "subscribedTo"
                    }
                },
                {
                    $addFields: {
                        subscribersCount: {
                            $size: "$susbcribers"
                        },
                        channelsSubscribedToCount:{
                            $size: "$subscribedTo"
                        },
                        isSubscribed: {
                            $cond: {
                                if: {
                                    $in: [req.user?._id, "$susbcribers.suscriber"]
                                },
                                then: true,
                                else: false
                            }
                        }
                    }
                },
                {
                    //project only the necessay data
                    $project: {
                        fullname: 1,
                        username:1,
                        avatar: 1,
                        subscribersCount: 1,
                        channelsSubscribedToCount: 1,
                        isSubscribed: 1,
                        coverImage: 1,
                        email: 1
                    }
                }
            ]
       )

       if(!chanel?.length){
            throw new ApiError(404, "Chanel not found")
       }

       return res.status(200).json(new ApiResponse(
        200,
        chanel[0],
        "Channel profile fetched successfully"
       ))
})

const getWatchHistory = asyncHandler( async( req, res ) =>{
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as:"owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                      $addFields: {
                        owner: {
                            $first: "$owner"
                        }
                      }  
                    }
                ]
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200,user[0]?.watchHistory,"watchHistory fetched successfully"))
})

export { 
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChanelProfile,
    getWatchHistory
 }