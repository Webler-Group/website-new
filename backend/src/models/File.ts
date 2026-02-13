import { Document, InferSchemaType, Model, Schema, model } from "mongoose";

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
            index: true,
            maxLength: 200
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxLength: 80
        },
        mimetype: {
            type: String,
            required: true
        },
        size: {
            type: Number,
            required: true
        },
        contenthash: {
            type: String,
            required: true,
            unique: true,
            index: true
        }
    },
    { timestamps: true }
);

interface IFile extends InferSchemaType<typeof fileSchema> { }
interface FileModel extends Model<IFile> { }

const File = model<IFile, FileModel>("File", fileSchema);

export type IFileDocument = IFile & Document;
export default File;
