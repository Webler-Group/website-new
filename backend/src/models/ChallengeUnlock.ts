import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";

@modelOptions({ schemaOptions: { collection: "challengeunlocks", timestamps: true } })
export class ChallengeUnlock {
    @prop({ ref: "Challenge", required: true })
    challenge!: Types.ObjectId;

    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;

    createdAt!: Date;
}

const ChallengeUnlockModel = getModelForClass(ChallengeUnlock);
export default ChallengeUnlockModel;
