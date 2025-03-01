import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.models.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    //TODO: create playlist
    if(!name.trim() || !description.trim()){
        throw new ApiError(403, "please fill the name and description");
    }
    const owner = req.user._id; 
    console.log(owner)
    // console.log(user._id);
    const playlist = await Playlist.create({
        name,
        description,
        owner,
        
    })
    return res
        .status(200)
        .json(new ApiResponse(200,playlist,"Playlist Created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User ID");
    }


    // MongoDB aggregation pipeline
    const playlists = await Playlist.aggregate([
        { 
            $match: { 
                owner:mongoose.Types.ObjectId.createFromHexString(userId)
            } 
        },
        { 
            $lookup: {
                from: "users", // Confirm exact collection name,if the model name is User then mongo db will create its plural with small letter.
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        { 
            $unwind: {
                path: "$ownerDetails",
                preserveNullAndEmptyArrays: true
            }
        },
        { 
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                ownerName: "$ownerDetails.name",
                ownerEmail: "$ownerDetails.email"
            }
        },
        { 
            $sort: { createdAt: -1 } 
        }
    ]);

    
    if (!playlists || playlists.length === 0) {
        return res
            .status(200) // Use 200 if it's valid for no playlists to exist
            .json(new ApiResponse(200, [], "No playlists found for this user."));
    }
    

    // Return the playlists in the response
    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "Playlists retrieved successfully."));
});


const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!playlistId.trim()){
        throw new ApiError(400,"please provide the correct the playlist id...")
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new ApiError(404,"No such Playlist found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200,playlist,"Playlist found..."))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!playlistId.trim() || !videoId.trim()){
        throw new ApiError(400,"cannot get the playlistId and VideoId")
    }

    
    //verifying the ownership of the playlist
    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(404,"Playlist not found..")
    }

    
    if(String(playlist.owner) != String(req.user._id)){
        throw new ApiError(403,"You are not allowed to modify this playlist");
    }
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404,"Video not found..")
    }

   
    if (playlist.videos.includes(video._id)) {
        throw new ApiError(400, "Video already exists in the playlist.");
    }
    
    
    playlist.videos.push(video._id);

    
    const updatePlaylist = await playlist.save();

    return res
        .status(200)
        .json(new ApiResponse(200,updatePlaylist,"Playlist updated successfully..."))

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    if(!playlistId.trim() || !videoId.trim()){
        throw new ApiError(400,"cannot get the playlistId and VideoId")
    }
    //verifying the ownership of the playlist
    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(404,"Playlist not found..")
    }
    if(String(playlist.owner) != String(req.user._id)){
        throw new ApiError(403,"You are not allowed to modify this playlist");
    }
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404,"Video not found..")
    }
    if (!playlist.videos.includes(video._id)) {
        throw new ApiError(400, "Video already deleted from the playlist.");
    }
    
    playlist.videos = playlist.videos.filter(v => String(v) !== String(videoId));


    const updatePlaylist = await playlist.save();

    return res
        .status(200)
        .json(new ApiResponse(200,updatePlaylist,"Video deleted successfully from the playlist"))

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if(!playlistId.trim()){
        throw new ApiError(404,"Invalid playlistId....")
    }
    
    //validate owner
    const findPlaylist = await Playlist.findById(playlistId)
    if(String(findPlaylist.owner.trim()) != String(req.user._id)) {
        throw new ApiError(500,"You can not delete this playlist");
    }

    const playlist = await Playlist.findByIdAndDelete(playlistId);

    if(!playlist){
        throw new ApiError(404,"playlist can not be deleted....")
    }

    return res
        .status(200)
        .json(new ApiResponse(200,playlist,"playlist deleted..."))


})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    if(!playlistId.trim()){
        throw new ApiError(404,"invalid playlist Id...")
    }
    if(!name && !description){
        throw new ApiError(404,"please provide any of the updating details")
    }

    //validate the owner
    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(404,"Playlist not found..")
    }
    if(String(playlist.owner) != String(req.user._id)){
        throw new ApiError(403,"You are not allowed to modify this playlist");
    }

    if(name){
        playlist.name = name;
    }

    playlist.description = description || playlist.description;

    await playlist.save();

    return res
        .status(200)
        .json(new ApiResponse(200,playlist,"playlist updated successfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}