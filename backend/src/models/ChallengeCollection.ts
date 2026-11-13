import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";

export class ChallengeCollectionSection {
    @prop({ required: true, trim: true, minlength: 1, maxlength: 120 })
    title!: string;

    @prop({ trim: true, default: "", maxlength: 1000 })
    description!: string;

    @prop({ type: () => [Types.ObjectId], ref: "Challenge", default: [] })
    challenges!: Types.ObjectId[];
}

@modelOptions({ schemaOptions: { collection: "challengecollections", timestamps: true } })
export class ChallengeCollection {
    @prop({ required: true, unique: true, trim: true, minlength: 1, maxlength: 120 })
    title!: string;

    @prop({ trim: true, default: "", maxlength: 4096 })
    description!: string;

    @prop({ type: () => [ChallengeCollectionSection], default: [] })
    sections!: ChallengeCollectionSection[];

    @prop({ default: true })
    isPublic!: boolean;

    @prop({ ref: "User", required: true })
    author!: Types.ObjectId;

    createdAt!: Date;
}

const ChallengeCollectionModel = getModelForClass(ChallengeCollection);
export default ChallengeCollectionModel;
