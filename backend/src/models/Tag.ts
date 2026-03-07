import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { ModelType } from "@typegoose/typegoose/lib/types";

@modelOptions({ schemaOptions: { collection: "tags" } })
export class Tag {
    @prop({ required: true, unique: true, trim: true, lowercase: true, maxlength: 64, minlength: 1 })
    name!: string;

    // --- Static ---
    static async getOrCreateTagsByNames(
        this: ModelType<Tag>,
        tagNames: string[]
    ): Promise<any[]> {
        const uniqueNames = [...new Set(tagNames)];
        const existingTags = await TagModel.find({ name: { $in: uniqueNames } });
        const existingNames = existingTags.map(tag => tag.name);
        const missingNames = uniqueNames.filter(name => !existingNames.includes(name));
        const newTags = missingNames.length > 0
            ? await TagModel.insertMany(missingNames.map(name => ({ name })))
            : [];
        return [...existingTags, ...newTags];
    }
}

const TagModel = getModelForClass(Tag);
export default TagModel;