import React from 'react';
import { Comment } from '../types';
import { Heart, Reply } from 'lucide-react';

interface CommentActionsProps {
  comment: Comment;
  depth: number;
  onVote: () => void;
  onReplyClick: () => void;
}

const CommentActions: React.FC<CommentActionsProps> = ({
  comment,
  depth,
  onVote,
  onReplyClick,
}) => {
  return (
    <div className="d-flex gap-2">
      {/* Like button */}
      <button
        onClick={onVote}
        className={`btn btn-sm d-inline-flex align-items-center gap-1 px-2 py-1 ${
          comment.isUpvoted ? "btn-outline-danger active" : "btn-outline-secondary"
        }`}
      >
        <Heart size={14} fill={comment.isUpvoted ? "currentColor" : "none"} />
        <span className="small fw-medium">{comment.votes}</span>
      </button>

      {/* Reply button - only up to 2 levels, but always show reply button */}
      <button
        onClick={onReplyClick}
        className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 px-2 py-1"
      >
        <Reply size={14} />
        Reply
      </button>
    </div>
  );
};

export default CommentActions;