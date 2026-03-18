import { FaPencil, FaThumbsUp, FaTrash } from "react-icons/fa6";
import { useAuth } from "../../features/auth/context/authContext";
import PostAttachment from "../post-attachment-select/PostAttachment";
import DateUtils from "../../utils/DateUtils";
import { parseMessage } from "../PostTextareaControl";
import ProfileAvatar from "../ProfileAvatar";
import ProfileName from "../ProfileName";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../context/apiCommunication";
import { VotePostData } from "../../features/discuss/types";
import { CommmentDetails } from "./types";

interface CommentProps {
  comment: CommmentDetails;
  repliesVisible?: boolean;
  isHighlighted: boolean;
  handleToggleReplies?: () => void;
  handleReply?: () => void;
  handleEdit: () => void;
  handleDelete: () => void;
  handleShowVotes: () => void;
  onVote: (id: string, vote: number, error?: { message: string }[]) => void;
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
    const result = await sendJsonRequest<VotePostData>("/Discussion/VotePost", "POST", { postId: comment.id, vote });
    if (result.data && result.data.vote === vote) {
      onVote(comment.id, result.data.vote);
    } else {
      onVote(comment.id, 0, result.error);
    }
  }

  return (
    <div className={`d-flex position-relative gap-3 wb-comment-item ${isHighlighted ? "highlighted" : ""}`}>
      <div className="wb-comments__options">
        <div className="d-flex gap-2">
          {
            (userInfo && userInfo.id === comment.user.id) &&
            <>
              <span className="wb-comments__options__item" title="Edit" onClick={handleEdit}>
                <FaPencil size={12} />
              </span>
              <span className="wb-comments__options__item" title="Delete" onClick={handleDelete}>
                <FaTrash size={12} />
              </span>
            </>
          }
        </div>
      </div>
      <div className="wb-comment-avatar-container">
        <ProfileAvatar size={32} avatarUrl={comment.user.avatarUrl} />
      </div>
      <div className="flex-grow-1">
        <div className="mb-1">
          <div className="d-flex align-items-center gap-2">
            <ProfileName userId={comment.user.id} userName={comment.user.name} />
            <small className="text-secondary" style={{ fontSize: '0.75rem' }}>• {DateUtils.format2(new Date(comment.date), true)}</small>
          </div>
          <div className="wb-comments__message mt-1">
            {parseMessage(comment.message)}
          </div>
          <div className="mt-2 text-center">
            {
              comment.attachments.map(attachment => {
                return (
                  <div key={attachment.id} className="mt-1 d-inline-block">
                    <PostAttachment data={attachment} />
                  </div>
                )
              })
            }
          </div>
        </div>
        <div className="d-flex gap-3 align-items-center mt-2">
          <div className="d-flex align-items-center gap-1">
            <span className={"wb-icon-button p-0 d-flex align-items-center wb-comment-footer-icon " + (comment.isUpvoted ? " text-primary" : "text-secondary")} onClick={handleVote} style={{ fontSize: '0.9rem' }}>
              <FaThumbsUp />
            </span>
            <span 
              className="small text-secondary fw-medium" 
              style={{ cursor: comment.votes > 0 ? "pointer" : "default" }} 
              onClick={comment.votes > 0 ? handleShowVotes : undefined}
            >
              {comment.votes}
            </span>
          </div>
          <button className="wb-comments-footer-btn" onClick={handleReply}>
            Reply
          </button>
          {
            (comment.parentId === null && comment.answers > 0) &&
            <button className={"wb-comments-footer-btn " + (repliesVisible ? "text-primary" : "")} onClick={handleToggleReplies}>
              {comment.answers} {comment.answers === 1 ? 'reply' : 'replies'}
            </button>
          }
        </div>
      </div>
    </div>
  );

};

export default Comment;