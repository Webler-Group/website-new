import mongoose, { InferSchemaType } from "mongoose";

const userActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  likedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    timestamp: Date,
    ref: "Post"
  }],

  likedCodes: [{
    type: mongoose.Schema.Types.ObjectId,
    timestamp: Date,
    ref: "Code"
  }],

  likedComments: [{
    type: mongoose.Schema.Types.ObjectId,
    timestamp: Date,
  }],

    visitedCourses: {
        type: Map,
        of: new mongoose.Schema({
            count: { type: Number, default: 0 },
            lastViewed: Date
        }, { _id: false })
    },

    inProgressCourses: [{
        type: [mongoose.Schema.Types.ObjectId],
        ref: "Course"
    }],

    commentedPosts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post"
    }],

    visitedCodes: {
        type: Map,
        of: new mongoose.Schema({
            count: { type: Number, default: 0 },
            lastViewed: Date
        }, { _id: false })
    },

    commentedCodes: [{
        type: mongoose.Schema.Types.ObjectId,
        timestamp: Date,
        ref: "Code"
    }],

    following: [{
        type: mongoose.Schema.Types.ObjectId,
        timestamp: Date,
        ref: "User"
    }],

  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});


declare interface IUserActivity extends InferSchemaType<typeof userActivitySchema> {}

const UserActivity = mongoose.model<IUserActivity>("UserActivity", userActivitySchema);

export default UserActivity;
