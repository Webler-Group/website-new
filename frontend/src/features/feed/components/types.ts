export interface Tag {
  _id: string | null | undefined;
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  avatarImage: string | null;
  level: number;
  roles: string[];
}

export interface OriginalPost {
  id: string;
  message: string;
  title: string;
  date: string;
  userName: string;
  userAvatarImage: string | null;
  tags: Tag[];
}

export interface IFeed {
  id: string;
  type: number;
  title: string | null;
  message: string;
  tags: Tag[];
  date: string;
  updatedAt: string;
  userId: string;
  userName: string;
  userAvatarImage: string | null;
  level: number;
  roles: string[];
  answers: number;
  votes: number;
  shares: number;
  attachments: any[];
  isUpvoted: boolean;
  isFollowing: boolean;
  originalPost: OriginalPost | null;
  isPinned: boolean;
  isShared: boolean;
}

export interface Comment {
  replyCount: number;
  id: string;
  message: string;
  userName: string;
  userAvatar: string | null;
  userId: string;
  date: string;
  votes: number;
  isUpvoted: boolean;
  replies?: Comment[];
}

export enum PostType {
    QUESTION = 1,
    ANSWER = 2,
    CODE_COMMENT = 3,
    FEED = 4,
    SHARED_FEED = 5,
    FEED_COMMENT = 6
}