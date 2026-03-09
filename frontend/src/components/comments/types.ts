import { UserMinimal } from "../../features/profile/types";
import { PostAttachmentDetails } from "../post-attachment-select/types";

export interface CommmentDetails {
    id: string;
    parentId: string | null;
    message: string;
    date: string;
    user: UserMinimal;
    votes: number;
    isUpvoted: boolean;
    answers: number;
    index: number;
    attachments: PostAttachmentDetails[];
}

export interface CommentListData {
    posts: CommmentDetails[];
}

export interface CreateCommentData {
    post: {
        id: string;
        message: string;
        date: string;
        parentId: string | null;
        votes: number;
        answers: number;
        attachments: PostAttachmentDetails[];
    }
}

export interface EditCommentData {
    id: string;
    message: string;
    attachments: PostAttachmentDetails[];
}