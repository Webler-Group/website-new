export interface Tag {
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

export interface Feed {
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
  isOriginalPostDeleted: Number;
  isShared: boolean;
}

export interface Comment {
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