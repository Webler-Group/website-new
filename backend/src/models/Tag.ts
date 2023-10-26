import mongoose, { InferSchemaType, Model } from "mongoose";

const tagSchema = new mongoose.Schema({
    name: {
        required: true,
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        maxLength: 20,
        minLength: 1,
        validate: [(val: string) => val.match(new RegExp("^([a-z]+-)*[a-z]+$", "i")) !== null, 'Tag can only contain words separated by "-"']
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