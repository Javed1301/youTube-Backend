import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.models.js"
import { Subscription } from "../models/subscription.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { match } from "assert"
import { channel } from "diagnostics_channel"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const userId = req.user.id; // Assuming user info is in `req.user`

    // Validate channelId
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid Channel ID");
    }

    // Prevent self-subscription
    if (channelId === userId) {
        throw new ApiError(400, "You cannot subscribe to your own channel.");
    }

    // Check if subscription already exists
    const existingSubscription = await Subscription.findOne({
        subscriber: userId,
        channel: channelId
    });

    if (existingSubscription) {
        // Unsubscribe (remove subscription)
        await Subscription.findByIdAndDelete(existingSubscription._id);
        return res.status(200).json(new ApiResponse(200, "Unsubscribed successfully"));
    } else {
        // Subscribe (create subscription)
        await Subscription.create({
            subscriber: userId,
            channel: channelId
        });
        return res.status(200).json(new ApiResponse(200, "Subscribed successfully"));
    }
});


// controller to return subscriber list of a channel(user)
//Retrieves the list of users who are subscribed to a given channel.
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const userId = req.user.id;

    if (!channelId) {
        throw new ApiError(400, "Invalid Channel Id.");
    }

    // Ensure that only the channel owner can view the subscribers
    if (channelId !== userId) {
        throw new ApiError(403, "You cannot access the list of subscribers.");
    }

    // Get the list of subscribers
    const subscribers = await Subscription.aggregate([
        { $match: { channel: (channelId) } },  // Match subscriptions for the given channelId
        {
            $lookup: {
                from: "users",   // Assuming your user collection name is 'users'
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails"
            }
        },
        { $unwind: "$subscriberDetails" },  // Convert array to object
        { $project: { "subscriberDetails.password": 0 } }  // Exclude password field for security
    ]);

    res.status(200).json(new ApiResponse(200, subscribers, "Subscribers list fetched successfully."));
});


// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    const userId = req.user.id;
    if(!subscriberId){
        throw new ApiError(400,"Invalid Subscriber Id...")
    }

    // f(subscriberId !== userId){
    //     throw new ApiError(500,"You are not allowed to view subscribed Channels ...")
    // }i

    const subscribedChannels = await Subscription.aggregate([
        {
            $match : 
                {subscriber : subscriberId}
        },
        {
            $lookup:
                {
                    from: "users",   // Assuming your user collection name is 'users'
                    localField: "channel",
                    foreignField: "_id",
                    as: "channelDetails"
                }
        },
        {
            $unwind:"$channelDetails"
        },
        {
            $project:{"channelDetails.password" : 0}
        }
    ])

    res.status(200).json(new ApiResponse(200, subscribedChannels, "Subscribed Channel list fetched successfully."));
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}