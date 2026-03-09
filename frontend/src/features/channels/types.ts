import { PostAttachmentDetails } from "../../components/post-attachment-select/types";
import ChannelMessageTypeEnum from "../../data/ChannelMessageTypeEnum";
import ChannelRolesEnum from "../../data/ChannelRolesEnum";
import ChannelTypeEnum from "../../data/ChannelTypeEnum";
import { UserMinimal } from "../profile/types";

export interface InviteDetails<T = UserMinimal, U = undefined> {
    id: string;
    author: UserMinimal;
    invitedUser: T;
    channel: U;
    createdAt: string;
}

export interface ChannelParticipantDetails {
    role: ChannelRolesEnum;
    user: UserMinimal;
}

export interface ChannelMessageMinimal {
    id: string;
    type: ChannelMessageTypeEnum;
    deleted: boolean;
    content: string;
    createdAt: string;
    updatedAt: string;
    user: UserMinimal;
    viewed?: boolean;
}

export interface ChannelMessageDetails extends ChannelMessageMinimal {
    repliedTo: ChannelMessageMinimal;
    channelId: string;
    channelTitle?: string;
    attachments: PostAttachmentDetails[];
}

export interface ChannelBase {
    id: string;
    type: ChannelTypeEnum;
    title?: string;
    coverImageUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ChannelDetails extends ChannelBase {
    unreadCount: number;
    muted: boolean;
    lastActiveAt: string | null;
    invites: {
        id: string;
        author: UserMinimal;
        invitedUser: UserMinimal;
    }[];
    participants: {
        role: ChannelRolesEnum;
        user: UserMinimal;
    }[];
}

export interface ChannelMinimal extends ChannelBase {
    unreadCount: number;
    muted: boolean;
    lastMessage: ChannelMessageMinimal | null;
}

export interface CreateGroupData {
    channel: {
        id: string;
        type: ChannelTypeEnum;
        title: string;
        createdAt: string;
        updatedAt: string;
    }
}

export interface CreateDirectMessagesData {
    channel: {
        id: string;
    }
}

export interface GroupInviteUserData {
    invite: {
        id: string;
        invitedUser: UserMinimal;
        createdAt: string;
    }
}

export interface GetChannelData {
    channel: ChannelDetails;
}

export interface ChannelsListData {
    channels: ChannelMinimal[];
}

export interface InvitesListData {
    invites: InviteDetails<undefined, ChannelBase>[];
    count: number;
}

export interface AcceptInviteData {
    accepted: boolean;
}

export interface ChannelMessagesListData {
    messages: ChannelMessageDetails[];
}

export interface GroupRenameData {
    title: string;
}

export interface GroupChangeRoleData {
    userId: string;
    role: ChannelRolesEnum;
}

export interface UnseenMessagesCountData {
    count: number;
}

export interface MuteChannelData {
    muted: boolean;
}

export interface MessagesSeenData {
    channelId: string;
    userId: string;
    lastActiveAt: string;
}

export interface NewMessageData {
    message: ChannelMessageDetails;
}

export interface MessageEditedData {
    messageId: string;
    channelId: string;
    content: string;
    attachments: PostAttachmentDetails[];
    updatedAt: string;
}

export interface MessageDeletedData {
    messageId: string;
    channelId: string;
}

export interface ChannelDeletedData {
    channelId: string;
}