import React, { useState } from 'react';
import { Comment } from '../types';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import UserAvatar from './UserAvatar';
import CommentHeader from './CommentHeader';
import CommentActions from './CommentAction';
import ReplyBox from './ReplyBox';
import PostTextareaControl, { parseMessage } from '../../../../components/PostTextareaControl';

interface CommentItemProps {
  comment: Comment;
  depth?: number;
  index?: number;
  parentId?: string;
  expandedReplies: Record<string, boolean>;
  setExpandedReplies: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  replyBoxes: Record<string, boolean>;
  setReplyBoxes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  currentUserId?: string;
  onVote: (commentId: string, currentlyUpvoted: boolean) => Promise<void>;
  onReplySubmit: (parentId: string, replyText: string) => Promise<void>;
  onEdit: (commentId: string, newText: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  // New props for lazy loading
  onFetchReplies?: (parentId: string, page?: number, append?: boolean) => Promise<void>;
  replyPagination?: Record<string, { page: number; hasMore: boolean; loading: boolean }>;
  registerRef?: (id: string, el: HTMLDivElement | null) => void;
   innerRef?: (el: HTMLDivElement | null) => void;
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
  onFetchReplies,
  replyPagination = {},
  innerRef,
  registerRef
}) => {
  const showReplies = expandedReplies[comment.id] || false;
  const showReplyBox = replyBoxes[comment.id] || false;

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.message);

  // Get pagination info for this comment
  const paginationInfo = replyPagination[comment.id] || { page: 0, hasMore: true, loading: false };
  const { hasMore, loading: loadingReplies } = paginationInfo;

  const toggleReplies = async () => {
      if (!showReplies && onFetchReplies && (comment.replies?.length === 0 || comment.replyCount > 0)) {
        await onFetchReplies(comment.id, 1, false);
      }


    setExpandedReplies((prev) => ({
      ...prev,
      [comment.id]: !showReplies,
    }));
  };

  const loadMoreReplies = async () => {
    if (!onFetchReplies || !hasMore || loadingReplies) return;
    
    const nextPage = paginationInfo.page + 1;
    await onFetchReplies(comment.id, nextPage, true);
  };

  const toggleReplyBox = () => {
    setReplyBoxes((prev) => ({
      ...prev,
      [comment.id]: !showReplyBox,
    }));
  };

  const handleReplySubmit = async (replyText: string) => {
    const replyParentId = depth === 0 ? comment.id : (parentId || comment.id);
    await onReplySubmit(replyParentId, replyText);

    // FIX: Don't automatically refresh replies after submitting
    // The parent component will handle adding the new reply optimistically
    // Only ensure replies are expanded to show the new comment
    setExpandedReplies((prev) => ({
      ...prev,
      [comment.id]: true,
    }));

    // Close reply box after submit
    setReplyBoxes((prev) => ({
      ...prev,
      [comment.id]: false,
    }));
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
      ref={innerRef} 
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
              autoFocus
              onSubmit={handleReplySubmit}
              onCancel={toggleReplyBox}
            />
          )}


          {/* Replies toggle - only show for top-level comments or if there are replies */}
          {depth < 1 && (comment.replyCount > 0 || (comment.replies && comment.replies.length > 0)) && (
            <div className="mt-2">
              <button
                className="btn btn-link small p-0 text-muted d-inline-flex align-items-center gap-1"
                onClick={toggleReplies}
                disabled={loadingReplies}
              >
                {showReplies ? (
                  <>
                    <ChevronUp size={14} /> Hide replies
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> 
                    {loadingReplies ? (
                      <>
                        <Loader2 size={14} className="spinner-border-sm" />
                        Loading...
                      </>
                    ) : (
                      `Show replies (${comment.replyCount || comment.replies?.length || 0})`
                    )}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Recursive replies */}
          {showReplies && comment.replies && comment.replies.length > 0 && depth < 1 && (
            <div className="mt-3">
              {comment.replies.map((reply, i) => (
                <CommentItem
                  key={`${reply.id}-${depth + 1}-${i}`}
                  comment={reply}
                  depth={depth + 1}
                  index={i}
                  parentId={comment.id}
                  expandedReplies={expandedReplies}
                  setExpandedReplies={setExpandedReplies}
                  replyBoxes={replyBoxes}
                  setReplyBoxes={setReplyBoxes}
                  currentUserId={currentUserId}
                  onVote={onVote}
                  onReplySubmit={onReplySubmit}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onFetchReplies={onFetchReplies}
                  replyPagination={replyPagination}
                  registerRef={registerRef} // pass it down
                  innerRef={(el) => registerRef?.(reply.id, el)} // 👈 register reply
                />
              ))}
              
              {/* Load more replies button */}
              {hasMore && (
                <div className="mt-2">
                  <button
                    onClick={loadMoreReplies}
                    disabled={loadingReplies}
                    className="btn btn-link small p-0 text-primary d-inline-flex align-items-center gap-1"
                  >
                    {loadingReplies ? (
                      <>
                        <Loader2 size={14} className="spinner-border-sm" />
                        Loading more replies...
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} />
                        Load more replies
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentItem;