import { ClientSession, Types } from "mongoose"
import { QuestionMinimal } from "../models/Post"
import { UserMinimal } from "../models/User"
import { formatUserMinimal } from "./userHelper"
import TagModel from "../models/Tag"
import PostModel, { QUESTION_MINIMAL_FIELDS } from "../models/Post"
import PostTypeEnum from "../shared/data/PostTypeEnum";

export const getOrCreateTagsByNames = async (tagNames: string[], session?: ClientSession) => {
    const uniqueNames = [...new Set(tagNames)];
    const existingTags = await TagModel.find({ name: { $in: uniqueNames } }).session(session ?? null);
    const existingNames = existingTags.map(tag => tag.name);
    const missingNames = uniqueNames.filter(name => !existingNames.includes(name));
    const newTags = missingNames.length > 0
        ? await TagModel.insertMany(missingNames.map(name => ({ name })), { session })
        : [];
    const byName = new Map([...existingTags, ...newTags].map(tag => [tag.name, tag]));
    return uniqueNames.map(name => byName.get(name)!);
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

/** A user's latest questions */
export const getUserQuestions = async (userId: Types.ObjectId | string, count: number) => {
    const questions = await PostModel.find({ user: userId, _type: PostTypeEnum.QUESTION, hidden: false })
        .select(QUESTION_MINIMAL_FIELDS)
        .sort({ createdAt: "desc" })
        .limit(count)
        .populate("tags")
        .lean<(QuestionMinimal & { _id: Types.ObjectId })[]>();

    return questions.map(x => formatQuestionMinimal(x));
}
