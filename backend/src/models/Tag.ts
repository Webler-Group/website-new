import mongoose, { InferSchemaType, Model } from "mongoose";

const tagSchema = new mongoose.Schema({
    name: {
        required: true,
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        maxLength: 64,
        minLength: 1
    }
});

tagSchema.statics.getOrCreateTagsByNames = async function (tagNames: string[]) {
    // Remove duplicates to avoid unnecessary queries
    const uniqueNames = [...new Set(tagNames)];

    // Find already existing tags
    const existingTags = await Tag.find({ name: { $in: uniqueNames } });

    const existingNames = existingTags.map(tag => tag.name);

    // Determine which names are missing
    const missingNames = uniqueNames.filter(name => !existingNames.includes(name));

    // Create missing tags (if any)
    const newTags = missingNames.length > 0
        ? await Tag.insertMany(missingNames.map(name => ({ name })))
        : [];

    // Return combined array of existing + new tags
    return [...existingTags, ...newTags];
};


declare interface ITag extends InferSchemaType<typeof tagSchema> { }

interface TagModel extends Model<ITag> {
    getOrCreateTagsByNames(tagName: string[]): Promise<any[]>
}

const Tag = mongoose.model<ITag, TagModel>("Tag", tagSchema);

export default Tag;