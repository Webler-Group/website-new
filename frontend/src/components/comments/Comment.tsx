import PostAttachment, { IPostAttachment } from "../../features/discuss/components/PostAttachment";
import { parseMessage } from "../PostTextareaControl";
import ProfileAvatar from "../ProfileAvatar";
import ProfileName from "../ProfileName";

interface CommentProps {
  comment: IComment;
}

interface IComment {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    date: string;
    message: string;
    answers: number;
    votes: number;
    isUpvoted: boolean;
    index: number;
    attachments: IPostAttachment[];
}

const Comment: React.FC<CommentProps> = ({ comment }) => {
  return (
    <div className="comment-content">
      <div className="d-flex align-items-center">
        <ProfileAvatar size={32} avatarImage={comment.userAvatar ?? null} />
        <div>
          <ProfileName userId={comment.userId} userName={comment.userName} />
          <small className="text-muted ms-2">{comment.date}</small>
        </div>
      </div>
      <div className={`wb-playground-comments__message mt-2`}>
        {parseMessage(comment.message)}
      </div>
      {comment.attachments.map((attachment, index) => (
        <PostAttachment key={index} data={attachment} />
      ))}
    </div>
  );
};

export type {
    IComment
}

export default Comment;