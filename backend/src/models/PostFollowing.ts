import { prop, getModelForClass, modelOptions, index } from "@typegoose/typegoose";
import { Types } from "mongoose";

@modelOptions({ schemaOptions: { collection: "postfollowings" } })
@index({ user: 1, following: 1 }, { unique: true })
export class PostFollowing {
    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;

    @prop({ ref: "Post", required: true })
    following!: Types.ObjectId;
}

export default getModelForClass(PostFollowing);