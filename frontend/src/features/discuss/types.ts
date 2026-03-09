import { PostAttachmentDetails } from "../../components/post-attachment-select/types";
import { UserMinimal } from "../profile/types";

export interface QuestionDetails {
    id: string;
    title: string;
    date: string;
    answers: number;
    votes: number;
    tags: string[];
    message: string;
    isAccepted: boolean;
    isFollowed: boolean;
    user: UserMinimal;
    attachments: PostAttachmentDetails[];
    isUpvoted?: boolean;
}

export interface CreateQuestionData {
    question: {
        id: string;
        title: string;
        message: string;
        tags: string[];
        date: string;
        isAccepted: boolean;
        votes: number;
        answers: number;
    }
}

export interface GetQuestionData {
    question: QuestionDetails;
}

export interface QuestionMinimal<T = string> {
    id: string;
    title: string;
    date: string;
    answers: number;
    votes: number;
    tags: string[];
    user: T;
    isUpvoted?: boolean;
    isAccepted: boolean;
}

export interface QuestionListData {
    count: number;
    questions: QuestionMinimal<UserMinimal>[];
}

export interface AnswerDetails {
    id: string;
    user: UserMinimal;
    message: string;
    date: string;
    parentId: string;
    isAccepted: boolean;
    votes: number;
    answers: number;
    attachments: PostAttachmentDetails[];
    index: number;
    isUpvoted?: boolean;
}

export interface CreateReplyData {
    post: {
        id: string;
        message: string;
        date: string;
        parentId: string;
        isAccepted: boolean;
        votes: number;
        answers: number;
        attachments: PostAttachmentDetails[];
    }
}

export interface RepliesListData {
    posts: AnswerDetails[];
}

export interface ToggleAcceptedAnswerData {
    accepted: boolean;
}

export interface EditQuestionData {
    id: string;
    title: string;
    message: string;
    tags: string[];
    attachments: PostAttachmentDetails[];
}

export interface EditReplyData {
    id: string;
    message: string;
    attachments: PostAttachmentDetails[];
}

export interface VotePostData {
    vote: 0 | 1;
}

export interface VotersListData {
    users: UserMinimal[];
}