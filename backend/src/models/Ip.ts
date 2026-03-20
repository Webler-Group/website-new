import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";

@modelOptions({ schemaOptions: { collection: "ips", timestamps: true } })
export class Ip {
    @prop({ required: true, unique: true, trim: true })
    value!: string;

    @prop({ default: false })
    banned!: boolean;

    @prop({ trim: true })
    description?: string;
}

const IpModel = getModelForClass(Ip);
export default IpModel;
