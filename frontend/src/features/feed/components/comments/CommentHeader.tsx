import React, { useState } from 'react';
import { Comment } from '../types';
import { Clock, MoreVertical } from 'lucide-react';

interface CommentHeaderProps {
  comment: Comment;
  currentUserId?: string;
  onEdit: () => void;
  onDelete: () => void;
}

const CommentHeader: React.FC<CommentHeaderProps> = ({
  comment,
  currentUserId,
  onEdit,
  onDelete,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const formatDate = (dateString: string) => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - commentDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleEdit = () => {
    setMenuOpen(false);
    onEdit();
  };

  const handleDelete = () => {
    setMenuOpen(false);
    onDelete();
  };

  return (
    <div className="d-flex align-items-center mb-1">
      <h4 className="fw-semibold text-dark mb-0 me-2">{comment.userName}</h4>
      <span className="text-muted small d-flex align-items-center gap-1">
        <Clock size={12} />
        {formatDate(comment.date)}
      </span>

      {/* Spacer pushes menu right */}
      <div className="ms-auto position-relative">
        <button
          className="btn btn-sm btn-link text-muted p-0"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <MoreVertical size={18} />
        </button>

        {menuOpen && (
          <div
            className="dropdown-menu show position-absolute end-0 mt-2"
            style={{ minWidth: 120, zIndex: 1000 }}
          >
            {comment.userId === currentUserId && (
              <>
                <button className="dropdown-item" onClick={handleEdit}>
                  Edit
                </button>
                <button className="dropdown-item text-danger" onClick={handleDelete}>
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentHeader;