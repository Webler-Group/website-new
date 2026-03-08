import { getModelForClass, index, modelOptions, prop } from "@typegoose/typegoose";
import { Types } from "mongoose";

@modelOptions({ schemaOptions: { collection: "userfollowings", timestamps: true } })
@index({ user: 1, following: 1 }, { unique: true })
export class UserFollowing {

    @prop({ required: true, ref: "User" })
    user!: Types.ObjectId;

    @prop({ required: true, ref: "User" })
    following!: Types.ObjectId;

}

const UserFollowingModel = getModelForClass(UserFollowing);
export default UserFollowingModel;