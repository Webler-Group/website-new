import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";

@modelOptions({ schemaOptions: { collection: "captcharecords", timestamps: true } })
export class CaptchaRecord {
    @prop({ required: true })
    encrypted!: string;

    createdAt!: Date;
}

const CaptchaRecordModel = getModelForClass(CaptchaRecord);
export default CaptchaRecordModel;