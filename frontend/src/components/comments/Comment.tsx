import { FaPencil, FaThumbsUp, FaTrash } from "react-icons/fa6";
import { useAuth } from "../../features/auth/context/authContext";
import PostAttachment, { IPostAttachment } from "../../features/discuss/components/PostAttachment";
import DateUtils from "../../utils/DateUtils";
import { parseMessage } from "../PostTextareaControl";
import ProfileAvatar from "../ProfileAvatar";
import ProfileName from "../ProfileName";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../context/apiCommunication";

interface IComment {
  id: string;
  parentId: string | null;
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

interface CommentProps {
  comment: IComment;
  repliesVisible?: boolean;
  isHighlighted: boolean;
  handleToggleReplies?: () => void;
  handleReply?: () => void;
  handleEdit: () => void;
  handleDelete: () => void;
  handleShowVotes: () => void;
  onVote: (id: string, vote: number) => void;
}

const Comment: React.FC<CommentProps> = ({
  comment,
  repliesVisible,
  handleToggleReplies,
  handleReply,
  handleEdit,
  handleDelete,
  handleShowVotes,
  isHighlighted,
  onVote
}) => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const { sendJsonRequest } = useApi();

  const handleVote = async () => {
    if (!userInfo) {
      navigate("/Users/Login");
      return;
    }
    const vote = comment.isUpvoted ? 0 : 1;
    const result = await sendJsonRequest("/Discussion/VotePost", "POST", { postId: comment.id, vote });
    if (result.success && result.vote === vote) {
      onVote(comment.id, result.vote);
    }
  }

  return (
    <div className="d-flex position-relative gap-2">
      <div className="wb-user-comment__options">
        <div className="d-flex gap-2">
          {
            (userInfo && userInfo.id === comment.userId) &&
            <>
              <span className="wb-user-comment__options__item" onClick={handleEdit}>
                <FaPencil />
              </span>
              <span className="wb-user-comment__options__item" onClick={handleDelete}>
                <FaTrash />
              </span>
            </>
          }
        </div>
      </div>
      <div>
        <div className="wb-p-follow-item__avatar">
          <ProfileAvatar size={32} avatarImage={comment.userAvatar ?? null} />
        </div>
      </div>
      <div className="flex-grow-1">
        <div className="rounded border p-2 mb-1" style={{ background: isHighlighted ? "beige" : "white" }}>
          <div>
            <ProfileName userId={comment.userId} userName={comment.userName} />
          </div>
          <div className="wb-playground-comments__message mt-2">
            {parseMessage(comment.message)}
          </div>
          <div className="mt-2">
            {
              comment.attachments.map(attachment => {
                return (
                  <div key={attachment.id} className="mt-1">
                    <PostAttachment data={attachment} />
                  </div>
                )
              })
            }
          </div>
        </div>
        <div className="d-flex justify-content-between">
          <div className="d-flex gap-2 align-items-center">
            <div className="small">
              <span className={"wb-discuss-voting__button" + (comment.isUpvoted ? " text-black" : "")} onClick={handleVote}>
                <FaThumbsUp />
              </span>
              {
                comment.votes > 0 ?
                <span className="ms-1 wb-playground-comments__button" onClick={handleShowVotes}>{comment.votes}</span>
                :
                <span className="ms-1">{comment.votes}</span>
              }
            </div>
            <button className="small wb-user-comment-footer__reply" onClick={handleReply}>
              Reply
            </button>
            {
              (comment.parentId === null && comment.answers > 0) &&
              <>
                <button className={"small wb-user-comment-footer__replies " + (repliesVisible ? "text-secondary" : "text-black")} onClick={handleToggleReplies}>
                  {comment.answers} replies
                </button>
              </>
            }
          </div>
          <div>
            <div>
              <small className="text-secondary">{DateUtils.format2(new Date(comment.date), true)}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export type {
  IComment
}

export default Comment;