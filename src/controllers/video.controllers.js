import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteFromCloudinary, uploadOnCloudinary , extractPublicId} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if(
        [title,description].some((field) => field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required")
    }

    
    console.warn(req.files)
    const videoFileLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path
    if(!videoFileLocalPath){
        throw new ApiError("video file is missing")
    }
    if(!thumbnailLocalPath){
        throw new ApiError("thumbnail file  is missing")
    }

    const uploadVideo = await uploadOnCloudinary(videoFileLocalPath)
    const uploadThumbnail = await uploadOnCloudinary(thumbnailLocalPath)

   

    if(!uploadVideo.url){
        throw new ApiError(500,"Failed to upload video")
    }
    if(!uploadThumbnail.url){
        throw new ApiError(500,"Failed to upload video")
    }

    const duration = uploadVideo.duration;
    
    const owner = req.user?._id;
    if (!owner) {
        throw new ApiError(401, "Unauthorized: User not authenticated");
    }

    try {
        const video = await Video.create({
            videoFile : uploadVideo.url,
            thumbnail:uploadThumbnail.url,
            title,
            description,
            duration,
            owner
        })

       const createdVideo =  await Video.findByIdAndUpdate(
            video._id,
            { isPublished: true },
            { new: true } // Returns the updated document
        );
        
        
        return res
            .status(201)
            .json(new ApiResponse(200,createdVideo,"video published successfully"))

    } catch (error) {
        console.log("vidoe uplpoading failed")

        if(uploadVideo){
            await deleteFromCloudinary(uploadVideo.public_id)
        }
        if(uploadThumbnail){
            await deleteFromCloudinary(uploadThumbnail.public_id)
        }

        throw new ApiError(500,"Something went wrong while upploading video/Thumbnail and uploaded video/Thumbnail were deleted")
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const { title, description } = req.body;
    if(!videoId){
        throw new ApiError(500,"didn't get the video Id")
    }

    if(title?.trim() === "" || description?.trim() === "") {
        throw new ApiError(400, "Title or description cannot be empty");
    }

    const newThumbnailLocalPath = req.file?.path

    if(!newThumbnailLocalPath){
        throw new ApiError(401,"thumbnail file not found")
    }
    
    const newThumbnail = await uploadOnCloudinary(newThumbnailLocalPath);

    if(!newThumbnail.url){
        throw new ApiError(500,"failed to upload on cloudinary")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (String(video.owner) !== String(req.user._id)) {
        throw new ApiError(403, "You are not allowed to update this video");
    }

    if (video.thumbnail) {
        const oldThumbnailPublicId = extractPublicId(video.thumbnail);
        await deleteFromCloudinary(oldThumbnailPublicId);
    }

    // Update the video details in the database
    video.title = title || video.title; // Keep old value if not updated
    video.description = description || video.description; // Keep old value if not updated
    video.thumbnail = newThumbnail.url || video.thumbnail; // Keep old value if not updated

    const updatedVideo = await video.save();

    // Respond with the updated video
    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}