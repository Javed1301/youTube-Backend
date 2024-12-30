/*
 id string pk
  video ObjectId videos
  comment ObjectId comments
  tweet ObjectId tweets
  likedBy ObjectId users
  createdAt Date
  updatedAt Date
*/

import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema ({
    //either of 'video', 'comment'or 'tweet' will be assigned others are null

    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    Tweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet"
    },
    likedBy: {
        type:Schema.Types.ObjectId,
        ref: "User"
    }
},
{timestamps: true}
)

export const Like = mongoose.model("Like",likeSchema)