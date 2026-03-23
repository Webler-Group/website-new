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
  isReply?: boolean;
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
  isReply = false,
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
    <div className={`d-flex position-relative gap-3 wb-comment-item ${isHighlighted ? "highlighted" : ""} ${isReply ? "wb-reply-comment" : ""}`}>
      <div className="wb-comments__options">
        <div className="d-flex gap-2">
          {
            (userInfo && userInfo.id === comment.user.id) &&
            <>
              <span className="wb-comments__options__item text-muted" title="Edit" onClick={handleEdit}>
                <FaPencil size={12} />
              </span>
              <span className="wb-comments__options__item text-muted" title="Delete" onClick={handleDelete}>
                <FaTrash size={12} />
              </span>
            </>
          }
        </div>
      </div>
      
      {/* Avatar Container aligned to the top */}
      <div className="wb-comment-avatar-container" style={{ width: isReply ? '24px' : '32px' }}>
        <ProfileAvatar size={isReply ? 24 : 32} avatarUrl={comment.user.avatarUrl} />
      </div>

      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        {/* Username & Timestamp row */}
        <div className="d-flex align-items-center gap-2 mb-1">
          <ProfileName userId={comment.user.id} userName={comment.user.name} className={isReply ? "fs-6" : ""} />
          <small className="text-secondary" style={{ fontSize: '0.75rem' }}>{DateUtils.format2(new Date(comment.date), true)}</small>
        </div>

        {/* Message Content */}
        <div className="wb-comments__message">
          {parseMessage(comment.message)}
        </div>
        
        {/* Attachments */}
        {comment.attachments.length > 0 && (
          <div className="mt-2 text-center text-md-start">
            {comment.attachments.map(attachment => (
              <div key={attachment.id} className="mt-1 d-inline-block me-2">
                <PostAttachment data={attachment} />
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="d-flex gap-3 align-items-center mt-2">
          <button 
            className={`wb-comments-action-btn ${comment.isUpvoted ? "active" : ""}`} 
            onClick={handleVote}
          >
            <FaThumbsUp size={14} className="me-1 mb-1" />
            <span 
              className="fw-medium"
              style={{ paddingLeft: '2px' }}
              onClick={(e) => {
                if (comment.votes > 0) {
                  e.stopPropagation();
                  handleShowVotes();
                }
              }}
            >
              {comment.votes > 0 ? comment.votes : ""}
            </span>
          </button>
          
          <button className="wb-comments-action-btn fw-medium" onClick={handleReply}>
            Reply
          </button>

          {/* The show/hide replies toggle is now handled by CommentNode, so we omit it here */}
        </div>
      </div>
    </div>
  );

};

export default Comment;