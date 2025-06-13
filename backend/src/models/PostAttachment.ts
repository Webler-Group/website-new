import mongoose, { InferSchemaType, Model } from "mongoose";

const postAttachmentSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Types.ObjectId,
        ref: "Post",
        required: true
    },
    /*
    * 1 - code
    * 2 - question
    */
    _type: {
        type: Number,
        required: true
    },
    code: {
        type: mongoose.Types.ObjectId,
        ref: "Code",
        default: null
    },
    question: {
        type: mongoose.Types.ObjectId,
        ref: "Post",
        default: null
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    }
})

postAttachmentSchema.statics.getByPostId = async function (postId: string) {
    const result = await PostAttachment
        .find({ postId })
        .populate("code", "name language")
        .populate("question", "title")
        .populate("user", "name avatarImage countryCode level roles") as any[];
    return result.map(x => {
        const userDetails = {
            userId: x.user._id,
            userName: x.user.name,
            userAvatar: x.user.avatarImage,
            countryCode: x.user.countryCode,
            level: x.user.level,
            roles: x.user.roles
        }
        switch (x._type) {
            case 1: return {
                id: x._id,
                type: 1,
                ...userDetails,
                codeId: x.code._id,
                codeName: x.code.name,
                codeLanguage: x.code.language
            }
            case 2: return {
                id: x._id,
                type: 2,
                ...userDetails,
                questionId: x.question._id,
                questionTitle: x.question.title
            }
        }
        return null
    })
        .filter(x => x !== null)
}

declare interface IPostAttachment extends InferSchemaType<typeof postAttachmentSchema> { }

interface PostAttachmentModel extends Model<IPostAttachment> {
    getByPostId(postId: string): Promise<any[]>;
}

const PostAttachment = mongoose.model<IPostAttachment, PostAttachmentModel>("PostAttachment", postAttachmentSchema);

export default PostAttachment;