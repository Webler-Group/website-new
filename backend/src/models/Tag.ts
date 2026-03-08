import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";

@modelOptions({ schemaOptions: { collection: "tags" } })
export class Tag {
    @prop({ required: true, unique: true, trim: true, lowercase: true, maxlength: 64, minlength: 1 })
    name!: string;
}

const TagModel = getModelForClass(Tag);
export default TagModel;