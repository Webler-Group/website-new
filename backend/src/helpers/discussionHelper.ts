import { Types } from "mongoose"
import { QuestionMinimal } from "../models/Post"
import { UserMinimal } from "../models/User"
import { formatUserMinimal } from "./userHelper"

export const formatQuestionMinimal = (question: QuestionMinimal & { _id: Types.ObjectId }, user?: UserMinimal & { _id: Types.ObjectId }) => {
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