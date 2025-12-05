import mongoose, { InferSchemaType, Model } from "mongoose";

const quizAnswerSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 120
    },
    correct: {
        type: Boolean,
        default: false
    },
    courseLessonNodeId: {
        type: mongoose.Types.ObjectId,
        ref: "LessonNode",
        default: null
    }
});

declare interface IQuizAnswer extends InferSchemaType<typeof quizAnswerSchema> {}

interface QuizAnswerModel extends Model<IQuizAnswer> {
}

const QuizAnswer = mongoose.model<IQuizAnswer, QuizAnswerModel>("QuizAnswer", quizAnswerSchema);

export default QuizAnswer;