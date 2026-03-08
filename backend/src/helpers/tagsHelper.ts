import TagModel from "../models/Tag";

export const getOrCreateTagsByNames = async (tagNames: string[]) => {
    const uniqueNames = [...new Set(tagNames)];
    const existingTags = await TagModel.find({ name: { $in: uniqueNames } });
    const existingNames = existingTags.map(tag => tag.name);
    const missingNames = uniqueNames.filter(name => !existingNames.includes(name));
    const newTags = missingNames.length > 0
        ? await TagModel.insertMany(missingNames.map(name => ({ name })))
        : [];
    return [...existingTags, ...newTags];
}