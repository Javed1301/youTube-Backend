/*
id string pk
  video ObjectId videos
  owner ObjectId users
  content string
  createdAt Date
  updatedAt Date
*/

import mongoose, { Schema } from "mongoose";

import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema ({
    //either of 'video', 'comment'or 'tweet' will be assigned others are null

    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
   content: {
        type: String,
        required: true
   }
},
{timestamps: true}
)
commentSchema.plugin(mongooseAggregatePaginate)
export const Comment = mongoose.model("Comment",commentSchema)