import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";

@modelOptions({ schemaOptions: { collection: "postfollowings" } })
export class PostFollowing {
    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;

    @prop({ ref: "Post", required: true })
    following!: Types.ObjectId;
}

export default getModelForClass(PostFollowing);