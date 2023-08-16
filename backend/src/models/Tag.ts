import mongoose, { InferSchemaType, Model } from "mongoose";
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

tagSchema.statics.getOrCreateTagByName = async function (tagName: string) {
    let tag = await Tag.findOne({ name: tagName })
    if (tag === null) {
        tag = await Tag.create({ name: tagName })
    }
    return tag;
}

declare interface ITag extends InferSchemaType<typeof tagSchema> { }

interface TagModel extends Model<ITag> {
    getOrCreateTagByName(tagName: string): Promise<any>
}

const Tag = mongoose.model<ITag, TagModel>("Tag", tagSchema);

export default Tag;