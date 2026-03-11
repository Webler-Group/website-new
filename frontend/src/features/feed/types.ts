import { PostAttachmentDetails } from "../../components/post-attachment-select/types";
import PostTypeEnum from "../../data/PostTypeEnum";
import { ReactionsEnum } from "../../data/reactions";
import { UserMinimal } from "../profile/types";

export interface UserReaction {
  id: string;
  user: UserMinimal;
  reaction: ReactionsEnum;
}

export interface PostReactions {
  totalReactions: number;
  topReactions: { reaction: ReactionsEnum, count: number }[];
}

export interface FeedMinimal {
  id: string;
  type: PostTypeEnum;
  message: string;
  date: string;
  user: UserMinimal;
}

export interface FeedDetails extends FeedMinimal {
  answers: number;
  votes: number;
  shares: number;
  reaction: ReactionsEnum | null;
  score: number;
  isPinned: boolean;
  attachments: PostAttachmentDetails[];
  originalPost: FeedMinimal | null;
  reactions: PostReactions;
}

export interface CreateFeedData {
  feed: {
    type: PostTypeEnum;
    id: string;
    message: string;
    date: string;
    userId: string;
    votes: number;
    answers: number;
  }
}

export interface UserReactionsListData {
  count: number;
  userReactions: {
    id: string;
    user: UserMinimal;
    reaction: ReactionsEnum;
  }[];
}

export interface EditFeedData {
  id: string;
  message: string;
  attachments: PostAttachmentDetails[];
}

export interface VotePostData {
  vote: 0 | 1;
}

export type ShareFeedData = CreateFeedData;

export interface FeedListData {
  count: number;
  feeds: FeedDetails[];
}

export interface GetFeedData {
  feed: FeedDetails;
}

export interface TogglePinFeedData {
  isPinned: boolean;
}