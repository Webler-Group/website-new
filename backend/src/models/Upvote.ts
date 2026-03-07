import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";
import ReactionsEnum from "../data/ReactionsEnum";

@modelOptions({ schemaOptions: { collection: "upvotes" } })
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

export default getModelForClass(Upvote);