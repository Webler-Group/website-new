import { Types } from "mongoose"
import { QuestionMinimal } from "../models/Post"
import { UserMinimal } from "../models/User"
import { formatUserMinimal } from "./userHelper"
import TagModel from "../models/Tag"

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

export const formatQuestionMinimal = (question: QuestionMinimal & { _id: Types.ObjectId }, user?: UserMinimal) => {
    return {
        id: question._id,
        title: question.title,
        date: question.createdAt,
        answers: question.answers,
        votes: question.votes,
        tags: question.tags.map(x => x.name),
        user: user ? formatUserMinimal(user) : question.user,
        isUpvoted: false,
        isAccepted: question.isAccepted
    }
}