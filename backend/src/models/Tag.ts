import mongoose, { InferSchemaType } from "mongoose";
import isAlpha from "validator/lib/isAlpha";

const tagSchema = new mongoose.Schema({
    name: {
        required: true,
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        validate: [(val: string) => isAlpha(val), "Tag can only contain letters"]
    }
});

const Tag = mongoose.model<InferSchemaType<typeof tagSchema>>("Tag", tagSchema);

export default Tag;