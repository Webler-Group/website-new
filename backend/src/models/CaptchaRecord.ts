import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";

@modelOptions({ schemaOptions: { collection: "captcharecords", timestamps: true } })
export class CaptchaRecord {
    @prop({ required: true })
    encrypted!: string;
}

export default getModelForClass(CaptchaRecord);