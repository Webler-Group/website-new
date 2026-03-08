import { prop, getModelForClass, modelOptions, index } from "@typegoose/typegoose";
import { Types } from "mongoose";
import ReactionsEnum from "../data/ReactionsEnum";

@modelOptions({ schemaOptions: { collection: "upvotes" } })
@index({ parentId: 1, user: 1 }, { unique: true })
export class Upvote {
    @prop({ required: true })
    parentId!: Types.ObjectId;

    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;

    @prop({
        enum: Object.values(ReactionsEnum).filter(v => typeof v === "number").map(Number),
        type: Number
    })
    reaction?: ReactionsEnum;
}

const UpvoteModel = getModelForClass(Upvote);
export default UpvoteModel;