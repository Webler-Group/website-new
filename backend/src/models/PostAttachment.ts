import mongoose, { InferSchemaType, Model } from "mongoose";
import Post from "./Post";
import Code from "./Code";
import { config } from "../confg";

const postAttachmentSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Types.ObjectId,
        ref: "Post",
        default: null
    },
    channelMessageId: {
        type: mongoose.Types.ObjectId,
        ref: "ChannelMessage",
        default: null
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
    feed: {
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

postAttachmentSchema.statics.getByPostId = async function (id: { post?: mongoose.Types.ObjectId; channelMessage?: mongoose.Types.ObjectId; }) {
    const result = await PostAttachment
        .find({ postId: id.post ?? null, channelMessageId: id.channelMessage ?? null })
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
            case 1: 
            if (!x.code) return null;
            return {
                id: x._id,
                type: 1,
                ...userDetails,
                codeId: x.code._id,
                codeName: x.code.name,
                codeLanguage: x.code.language
            }
            case 2: 
            if (!x.question) return null;
            return {
                id: x._id,
                type: 2,
                ...userDetails,
                questionId: x.question._id,
                questionTitle: x.question.title
            }
            case 3:
                if (!x.feed) return null;
                return {
                    id: x._id,
                    type: 3,
                    ...userDetails,
                    feedId: x.feed._id,
                    feedMessage: x.feed.message,
                    feedType: x.feed._type 
                }

        }
        return null
    })
        .filter(x => x !== null)
}

postAttachmentSchema.statics.updateAttachments = async function (message: string, id: { post?: mongoose.Types.ObjectId; channelMessage?: mongoose.Types.ObjectId; }) {
    const currentAttachments = await PostAttachment
        .find({ postId: id.post ?? null, channelMessageId: id.channelMessage ?? null });

    const newAttachmentIds: string[] = [];

    const pattern = new RegExp("(" + config.allowedOrigins.join("|") + ")\/([\\w\-]+)\/([\\w\-]+)", "gi");
    const matches = message.matchAll(pattern);

    for (let match of matches) {
        if (match.length < 4) continue;
        console.log(match)
        let attachment = null;
        switch (match[2]) {
            case "Compiler-Playground": {
                const codeId = match[3];
                try {
                    const code = await Code.findById(codeId);
                    if (!code) {
                        continue
                    }

                    attachment = currentAttachments.find(x => x.code && x.code == codeId);
                    
                    if (!attachment) {
                        attachment = await PostAttachment.create({
                            postId: id.post ?? null,
                            channelMessageId: id.channelMessage ?? null,
                            _type: 1,
                            code: codeId,
                            user: code.user
                        })
                    }
                    
                }
                catch (err: any) {
                    console.log(err?.message);
                }
                break;
            }
            case "Discuss": {
                const questionId = match[3];
                try {
                    const question = await Post.findById(questionId);
                    if (!question) {
                        continue
                    }

                    attachment = currentAttachments.find(x => x.question && x.question == questionId);
                    if (!attachment) {
                        attachment = await PostAttachment.create({
                            postId: id.post ?? null,
                            channelMessageId: id.channelMessage ?? null,
                            _type: 2,
                            question: questionId,
                            user: question.user
                        })
                    }
                }
                catch(err: any) {
                    console.log(err?.message);
                }
                break;
            }
            case "feed": {
                const postId = match[3];
                try {
                    const post = await Post.findById(postId);
                    if (!post) continue;

                    // accept both feed (4) and sharedFeed (5)
                    if (post._type !== 4 && post._type !== 5) continue;

                    attachment = currentAttachments.find(x => x.feed && x.feed == postId);
                    if (!attachment) {
                        attachment = await PostAttachment.create({
                            postId: id.post ?? null,
                            channelMessageId: id.channelMessage ?? null,
                            _type: 3, // just "feed attachment"
                            feed: postId,
                            user: post.user
                        });
                    }
                } catch (err: any) {
                    console.log(err?.message);
                }
                break;
            }

        }
        if (attachment) {
            newAttachmentIds.push(attachment._id.toString());
        }
    }

    const idsToDelete = currentAttachments.map(x => x._id)
        .filter(v => !newAttachmentIds.includes(v.toString()));

    await PostAttachment.deleteMany({
        _id: { $in: idsToDelete }
    });
}

declare interface IPostAttachment extends InferSchemaType<typeof postAttachmentSchema> { }

interface PostAttachmentModel extends Model<IPostAttachment> {
    getByPostId(id: { post?: mongoose.Types.ObjectId; channelMessage?: mongoose.Types.ObjectId; }): Promise<any[]>;
    updateAttachments(message: string, id: { post?: mongoose.Types.ObjectId; channelMessage?: mongoose.Types.ObjectId; }): Promise<void>;

}

const PostAttachment = mongoose.model<IPostAttachment, PostAttachmentModel>("PostAttachment", postAttachmentSchema);

export default PostAttachment;