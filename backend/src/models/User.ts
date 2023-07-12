import mongoose, { InferSchemaType } from "mongoose";
import bcrypt from "bcrypt";

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
    countryCode: {
        type: String
    },
    bio: {
        type: String
    },
    roles: {
        type: [String],
        default: []
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    active: {
        type: Boolean,
        default: true
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

userSchema.methods.matchPassword = async function(inputPassword: string) {
    return await bcrypt.compare(inputPassword, this.password);
}

userSchema.pre('save', async function (next) {
    if(!this.isModified("password")) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
})

declare interface IUser extends InferSchemaType<typeof userSchema> {
    matchPassword(inputPassword: string): Promise<boolean>
}

const User = mongoose.model<IUser>('User', userSchema);

export default User;