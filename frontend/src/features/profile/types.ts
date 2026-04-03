import NotificationTypeEnum from "../../data/NotificationTypeEnum";
import RolesEnum from "../../data/RolesEnum";
import { CodeMinimal } from "../codes/types";
import { QuestionMinimal } from "../discuss/types";

export const notificationTypeToField: Record<NotificationTypeEnum, string> = {
    [NotificationTypeEnum.PROFILE_FOLLOW]: "profileFollow",
    [NotificationTypeEnum.QA_ANSWER]: "qaAnswer",
    [NotificationTypeEnum.CODE_COMMENT]: "codeComment",
    [NotificationTypeEnum.QA_QUESTION_MENTION]: "qaQuestionMention",
    [NotificationTypeEnum.QA_ANSWER_MENTION]: "qaAnswerMention",
    [NotificationTypeEnum.CODE_COMMENT_MENTION]: "codeCommentMention",
    [NotificationTypeEnum.FEED_FOLLOWER_POST]: "feedFollowerPost",
    [NotificationTypeEnum.FEED_COMMENT]: "feedComment",
    [NotificationTypeEnum.FEED_SHARE]: "feedShare",
    [NotificationTypeEnum.FEED_PIN]: "feedPin",
    [NotificationTypeEnum.FEED_COMMENT_MENTION]: "feedCommentMention",
    [NotificationTypeEnum.LESSON_COMMENT]: "lessonComment",
    [NotificationTypeEnum.LESSON_COMMENT_MENTION]: "lessonCommentMention",
    [NotificationTypeEnum.CHANNELS]: "channels",
} as const;

export type NotificationSettingsField = typeof notificationTypeToField[keyof typeof notificationTypeToField];
export type NotificationSettings = Record<NotificationSettingsField, boolean>;
export type UserNotificationSettings = NotificationSettings;

export interface UserDetails {
    id: string;
    name: string;
    email: string;
    bio: string;
    avatarUrl: string | null;
    countryCode: string | null;
    followers: number;
    following: number;
    isFollowing: boolean;
    level: number;
    xp: number;
    emailVerified: boolean;
    active: boolean;
    roles: RolesEnum[];
    registerDate: string;
    notifications: UserNotificationSettings;
    codes: CodeMinimal[];
    questions: QuestionMinimal[];
    solvedChallenges: {
        easy: number;
        medium: number;
        hard: number;
    }
}

export interface UserMinimal {
    id: string;
    name: string;
    avatarUrl: string | null;
    level: number;
    roles: RolesEnum[];
    isFollowing?: boolean;
    countryCode: string | null;
    active: boolean;
}

export interface GetProfileData {
    userDetails: UserDetails;
}

export interface UpdateProfileData {
    id: string;
    name: string;
    bio: string;
    countryCode: string | null;
}

export interface EmailChangeData {
    email: string;
}

export interface FollowsData {
    users: UserMinimal[];
}

export interface NotificationDetails {
    id: string;
    type: NotificationTypeEnum;
    message: string;
    date: string;
    user: UserMinimal;
    actionUser: UserMinimal;
    isSeen: boolean;
    isClicked: boolean;
    codeId?: string;
    courseCode: string;
    lessonId?: string;
    postId?: string;
    postParentId?: string;
    questionId?: string;
    feedId?: string;
}

export interface NotificationListData {
    notifications: NotificationDetails[];
}

export interface UnseenNotificationsData {
    count: number;
}

export interface UploadProfileAvatarData {
    avatarFileId: string;
    avatarUrl: string;
}

export interface UpdateNotificationsData {
    notifications: UserNotificationSettings;
}

export interface SearchProfilesData {
    users: UserMinimal[];
}

export const isUser = (user: UserMinimal | string): user is UserMinimal => {
    return typeof user !== "string";
};

export interface PublicKeyData {
    publicKey: string;
}


export interface IGetBlockUserData {
    success: string;
    message: string;
}


export interface IGetBlockUserGroupData {
    blocked: {
        name: string,
        _id: string,
        unblocked?: boolean
    }
}