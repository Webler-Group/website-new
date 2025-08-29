import { Request, Response } from "express";
import mongoose, { InferSchemaType, Model } from "mongoose";
import PostAttachment from "../models/PostAttachment";
import Post from "../models/Post";
import Upvote from "../models/Upvote";
import PostReplies from "../models/PostReplies";
import PostSharing from "../models/PostShare";
import Code from "../models/Code";

/**
 * Controller to fetch actual attachment data by list of PostAttachment IDs
 */
export const getAttachmentsByIds = async (req: Request, res: Response) => {
    try {
        const { attachmentIds } = req.body as { attachmentIds: string[] };

        if (!attachmentIds || !Array.isArray(attachmentIds) || attachmentIds.length === 0) {
            return res.status(400).json({ success: false, message: "attachmentIds is required" });
        }

        // Fetch attachments with necessary populates
        const attachments = await PostAttachment.find({ _id: { $in: attachmentIds.map(id => new mongoose.Types.ObjectId(id)) } })
            .populate("user", "name avatarImage countryCode level roles")
            .populate("code", "name language user")
            .populate("question", "title user")
            .populate("feed", "_type message user shares");

        const results: any[] = [];

        for (const att of attachments) {
            if (!att) continue;

            const userDetails = att.user && "_id" in att.user ? {
                userId: (att.user as any)._id,
                userName: (att.user as any).name,
                userAvatar: (att.user as any).avatarImage,
                countryCode: (att.user as any).countryCode,
                level: (att.user as any).level,
                roles: (att.user as any).roles
            } : {};

            switch (att._type) {
                case 1: { // Code
                    if (!att.code) break;
                    const codeDoc: any = att.code;
                    results.push({
                        id: att._id,
                        type: 1,
                        ...userDetails,
                        codeId: codeDoc._id,
                        codeName: codeDoc.name,
                        codeLanguage: codeDoc.language,
                        codeOwner: codeDoc.user
                            ? {
                                id: codeDoc.user._id,
                                name: codeDoc.user.name,
                                avatar: codeDoc.user.avatarImage
                            }
                            : null
                    });
                    break;
                }

                case 2: { // Question
                    if (!att.question) break;
                    const questionDoc: any = att.question;
                    results.push({
                        id: att._id,
                        type: 2,
                        ...userDetails,
                        questionId: questionDoc._id,
                        questionTitle: questionDoc.title,
                        questionOwner: questionDoc.user
                            ? {
                                id: questionDoc.user._id,
                                name: questionDoc.user.name,
                                avatar: questionDoc.user.avatarImage
                            }
                            : null
                    });
                    break;
                }

                case 3: { // Feed
                    if (!att.feed) break;
                    const feedDoc: any = att.feed;

                    // fetch likes, comments, shares
                    const [likes, comments, shares] = await Promise.all([
                        Upvote.countDocuments({ parentId: feedDoc._id }),
                        PostReplies.countDocuments({ feedId: feedDoc._id }),
                        PostSharing.countDocuments({ originalPost: feedDoc._id })
                    ]);

                    results.push({
                        id: att._id,
                        type: 3,
                        ...userDetails,
                        feedId: feedDoc._id,
                        feedMessage: feedDoc.message,
                        feedType: feedDoc._type,
                        feedOwner: feedDoc.user
                            ? {
                                id: feedDoc.user._id,
                                name: feedDoc.user.name,
                                avatar: feedDoc.user.avatarImage
                            }
                            : null,
                        likes,
                        comments,
                        shares
                    });
                    break;
                }
            }
        }

        return res.json(results);

    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ success: false, message: err.message || "Internal server error" });
    }
};

export default {getAttachmentsByIds}