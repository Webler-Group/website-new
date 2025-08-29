import React, { useState } from 'react';
import { Comment } from '../types';
import { Heart, Reply, ChevronDown, ChevronUp } from 'lucide-react';
import UserAvatar from './UserAvatar';
import CommentHeader from './CommentHeader';
import CommentActions from './CommentAction';
import ReplyBox from './ReplyBox';
import PostTextareaControl, { parseMessage } from '../../../../components/PostTextareaControl';

interface CommentItemProps {
  comment: Comment;
  depth?: number;
  index?: number;
  parentId?: string; // ID of the level 1 parent (for level 2 replies)
  expandedReplies: Record<string, boolean>;
  setExpandedReplies: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  replyBoxes: Record<string, boolean>;
  setReplyBoxes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  currentUserId?: string;
  onVote: (commentId: string, currentlyUpvoted: boolean) => Promise<void>;
  onReplySubmit: (parentId: string, replyText: string) => Promise<void>;
  onEdit: (commentId: string, newText: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  depth = 0,
  index = 0,
  parentId,
  expandedReplies,
  setExpandedReplies,
  replyBoxes,
  setReplyBoxes,
  currentUserId,
  onVote,
  onReplySubmit,
  onEdit,
  onDelete,
}) => {
  const showReplies = expandedReplies[comment.id] || false;
  const showReplyBox = replyBoxes[comment.id] || false;
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.message);

  const toggleReplies = () => {
    setExpandedReplies((prev) => ({
      ...prev,
      [comment.id]: !showReplies,
    }));
  };

  const toggleReplyBox = () => {
    setReplyBoxes((prev) => ({
      ...prev,
      [comment.id]: !showReplyBox,
    }));
  };

  const handleReplySubmit = async (replyText: string) => {
    // For level 1 comments, reply to themselves
    // For level 2 comments, reply to their level 1 parent
    const replyParentId = depth === 0 ? comment.id : (parentId || comment.id);
    await onReplySubmit(replyParentId, replyText);
  };

  const handleEditSubmit = async () => {
    if (!editText.trim()) return;

    try {
      await onEdit(comment.id, editText.trim());
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to edit reply:", err);
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditText(comment.message);
  };

  const handleDelete = async () => {
    await onDelete(comment.id);
  };

  return (
    <div
      className={`mb-3 ${depth === 0 ? "p-3 bg-white rounded border shadow-sm" : ""}`}
      style={{ marginLeft: depth > 0 ? depth * 20 : 0 }}
    >
      <div className="d-flex align-items-start gap-3">
        <UserAvatar src={comment.userAvatar} name={comment.userName} />

        <div className="flex-grow-1">
          {/* Header */}
          <CommentHeader
            comment={comment}
            currentUserId={currentUserId}
            onEdit={() => setIsEditing(true)}
            onDelete={handleDelete}
          />

          {/* Comment content OR Edit textarea */}
          {!isEditing ? (
            <p className="text-secondary mb-2">{parseMessage(comment.message)}</p>
          ) : (
            <div className="mb-2">
              <PostTextareaControl 
                rows={2}
                value={editText}
                setValue={setEditText}
              />
              <button onClick={handleEditSubmit} className="btn btn-sm btn-primary me-2">
                Save
              </button>
              <button
                onClick={handleEditCancel}
                className="btn btn-sm btn-outline-secondary"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Actions */}
          {!isEditing && (
            <CommentActions
              comment={comment}
              depth={depth}
              onVote={() => onVote(comment.id, comment.isUpvoted)}
              onReplyClick={toggleReplyBox}
            />
          )}

          {/* Reply box */}
          {showReplyBox && (
            <ReplyBox
              onSubmit={handleReplySubmit}
              onCancel={toggleReplyBox}
            />
          )}

          {/* Replies toggle - only show if depth < 1 (no nesting beyond level 1) */}
          {comment.replies && comment.replies.length > 0 && depth < 1 && (
            <div className="mt-2">
              <button
                className="btn btn-link small p-0 text-muted d-inline-flex align-items-center gap-1"
                onClick={toggleReplies}
              >
                {showReplies ? (
                  <>
                    <ChevronUp size={14} /> Hide replies
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> Show replies ({comment.replies.length})
                  </>
                )}
              </button>
            </div>
          )}

          {/* Recursive replies - only render if depth < 1 */}
          {showReplies && comment.replies && comment.replies.length > 0 && depth < 1 && (
            <div className="mt-3">
              {comment.replies.map((reply, i) => (
                <CommentItem
                  key={`${reply.id}-${depth + 1}-${i}`}
                  comment={reply}
                  depth={depth + 1}
                  index={i}
                  parentId={comment.id} // Pass the level 1 parent ID
                  expandedReplies={expandedReplies}
                  setExpandedReplies={setExpandedReplies}
                  replyBoxes={replyBoxes}
                  setReplyBoxes={setReplyBoxes}
                  currentUserId={currentUserId}
                  onVote={onVote}
                  onReplySubmit={onReplySubmit}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentItem;