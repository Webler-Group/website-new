import { Document, InferSchemaType, Model, Schema, model } from "mongoose";
import FileTypeEnum from "../data/FileTypeEnum";

const filePreviewSchema = new Schema(
    {
        contenthash: {
            type: String,
            required: true
        },
        size: {
            type: Number,
            required: true
        },
        mimetype: {
            type: String,
            required: true
        }
    },
{ _id: false });

const fileSchema = new Schema(
    {
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        path: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxLength: 40
        },

        _type: {
            type: Number,
            required: true,
            enum: Object.values(FileTypeEnum).map(Number)
        },

        mimetype: {
            type: String
        },

        size: {
            type: Number
        },

        contenthash: {
            type: String,
            index: true
        },

        preview: {
            type: filePreviewSchema,
            required: false,
            default: null
        }
    },
    { timestamps: true }
);

fileSchema.index(
    { path: 1, name: 1 },
    { unique: true }
);

interface IFile extends InferSchemaType<typeof fileSchema> { }
interface FileModel extends Model<IFile> { }

const File = model<IFile, FileModel>("File", fileSchema);

export type IFileDocument = IFile & Document;
export default File;
