import { prop, getModelForClass, modelOptions, index } from "@typegoose/typegoose";
import { Types } from "mongoose";
import FileTypeEnum from "../data/FileTypeEnum";

@modelOptions({ schemaOptions: { _id: false } })
export class FilePreview {
    @prop({ required: true })
    contenthash!: string;

    @prop({ required: true })
    size!: number;

    @prop({ required: true })
    mimetype!: string;
}

@index({ path: 1, name: 1 }, { unique: true })
@modelOptions({ schemaOptions: { collection: "files", timestamps: true } })
export class File {
    @prop({ ref: "User", required: true })
    author!: Types.ObjectId;

    @prop({ required: true, trim: true, index: true })
    path!: string;

    @prop({ required: true, trim: true, maxlength: 40 })
    name!: string;

    @prop({
        required: true,
        enum: FileTypeEnum,
        type: Number
    })
    _type!: FileTypeEnum;

    @prop()
    mimetype?: string;

    @prop()
    size?: number;

    @prop({ index: true })
    contenthash?: string;

    @prop({ type: () => FilePreview, default: null, _id: false })
    preview!: FilePreview | null;
}

export default getModelForClass(File);