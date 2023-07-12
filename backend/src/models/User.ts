import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {
        required: true,
        type: String,
        unique: true
    },
    password: {
        required: true,
        type: String
    },
    name: {
        type: String,
        default: "Weblerian"
    },
    country: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country'
    },
    bio: {
        type: String
    },
    accessLevel: {
        type: Number,
        default: 0
    },
    activated: {
        type: Boolean,
        default: false
    },
    blocked: {
        type: Boolean,
        default: false
    },
    level: {
        type: Number,
        default: 1
    },
    xp: {
        type: Number,
        default: 0
    },
    avatarUrl: {
        type: String
    }
},
{
    timestamps: true
});

const User = mongoose.model('User', userSchema);

export default User;