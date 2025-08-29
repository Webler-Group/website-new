import React, { useState, useEffect } from 'react';
import { Comment } from '../types';
import { Loader2 } from 'lucide-react';
import CommentItem from './CommentItem';
import NotificationToast from './NotificationToast';

interface CommentListProps {
  feedId: string;
  sendJsonRequest: (method: string, url: string, reqBody?: any) => Promise<any>;
  currentUserId?: string;
}

const CommentList: React.FC<CommentListProps> = ({
  feedId,
  sendJsonRequest,
  currentUserId
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // UI states
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [replyBoxes, setReplyBoxes] = useState<Record<string, boolean>>({});

  // Show notification helper
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000); // Auto-hide after 5 seconds
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await sendJsonRequest("/Feed/GetFeedReplies", "POST", {
        feedId: feedId,
      });

      if (response && response.replies) {
        const sortedComments = sortComments(response.replies);
        setComments(sortedComments);
      }
    } catch (err) {
      setError("Failed to load comments");
      console.error("Error fetching comments:", err);
      setNotification({
        type: "error",
        message: "Failed to fetch the feed replies. Please try again later."
      })
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();

    const handleCommentPosted = (event: CustomEvent) => {
      if (event.detail.feedId === feedId) {
        fetchComments();
      }
    };

    window.addEventListener("commentPosted", handleCommentPosted as EventListener);
    return () => {
      window.removeEventListener("commentPosted", handleCommentPosted as EventListener);
    };
  }, [feedId]);

  // Sort comments: latest first for top-level, oldest first for replies
  const sortComments = (commentsList: Comment[]): Comment[] => {
    return commentsList.map(comment => ({
      ...comment,
      replies: comment.replies ? 
        comment.replies
          .slice()
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // oldest first
          .map(reply => sortComments([reply])[0]) // recursively sort nested replies
        : []
    })).slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // latest first for top-level
  };

  // Calculate total comment count including all replies
  const getTotalCommentCount = (commentsList: Comment[]): number => {
    return commentsList.reduce((total, comment) => {
      const replyCount = comment.replies ? getTotalCommentCount(comment.replies) : 0;
      return total + 1 + replyCount; // 1 for the comment itself + all its replies
    }, 0);
  };

  // Helper function to update comments recursively
  const updateCommentInTree = (commentsList: Comment[], commentId: string, updater: (comment: Comment) => Comment): Comment[] => {
    return commentsList.map((comment) => {
      if (comment.id === commentId) {
        return updater(comment);
      }

      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentInTree(comment.replies, commentId, updater),
        };
      }

      return comment;
    });
  };

  // Helper function to add reply to specific comment
  const addReplyToComment = (commentsList: Comment[], parentId: string, newReply: Comment): Comment[] => {
    return commentsList.map((comment) => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply],
        };
      }

      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: addReplyToComment(comment.replies, parentId, newReply),
        };
      }

      return comment;
    });
  };

  // Helper function to delete comment from tree
  const deleteCommentFromTree = (commentsList: Comment[], commentId: string): Comment[] => {
    return commentsList
      .filter((comment) => comment.id !== commentId)
      .map((comment) => {
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: deleteCommentFromTree(comment.replies, commentId),
          };
        }
        return comment;
      });
  };

  const handleCommentVote = async (commentId: string, currentlyUpvoted: boolean) => {
    // Optimistically update UI
    setComments((prevComments) =>
      updateCommentInTree(prevComments, commentId, (comment) => ({
        ...comment,
        isUpvoted: !currentlyUpvoted,
        votes: currentlyUpvoted ? comment.votes - 1 : comment.votes + 1,
      }))
    );

    try {
      const response = await sendJsonRequest("/Feed/VotePost", "POST", {
        vote: !currentlyUpvoted,
        postId: commentId,
      });

      if (!response.success) {
        throw new Error(response.message);
      }

    } catch (error: any) {
      // Revert on error
      setComments((prevComments) =>
        updateCommentInTree(prevComments, commentId, (comment) => ({
          ...comment,
          isUpvoted: currentlyUpvoted,
          votes: currentlyUpvoted ? comment.votes + 1 : comment.votes - 1,
        }))
      );
      
      const errorMessage = error?.message || "Failed to update vote. Please try again.";
      showNotification('error', errorMessage);
      console.error("Failed to vote on comment:", error);
    }
  };

  const handleReplySubmit = async (parentId: string, replyText: string) => {
    if (!replyText.trim()) return;

    try {
      const response = await sendJsonRequest("/Feed/ReplyComment", "POST", {
        message: replyText.trim(),
        feedId: feedId,
        parentId: parentId,
      });

      // Check if response contains an error message
      if (!response.success) {
        throw new Error(response.message);
      }

      // If API returns the complete reply data, use it; otherwise refresh
      if (response && response.reply) {
        // Add the actual reply from server response
        setComments((prevComments) => {
          const updated = addReplyToComment(prevComments, parentId, response.reply);
          return sortComments(updated);
        });
      } else {
        // Fallback: refresh comments if server doesn't return reply data
        await fetchComments();
      }
      
      // Close reply box and expand replies to show new comment
      setReplyBoxes((prev) => ({ ...prev, [parentId]: false }));
      setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));

    } catch (error: any) {
      const errorMessage = error?.message || "Failed to post reply. Please try again.";
      showNotification('error', errorMessage);
      console.error("Failed to post reply:", error);
    }
  };

  const handleEdit = async (commentId: string, newText: string) => {
    try {
      const response = await sendJsonRequest("/Feed/EditReply", "PUT", {
        replyId: commentId,
        message: newText.trim(),
      });

      // Check if response contains an error message
      if (!response.success) {
        throw new Error(response.message);
      }

      // Optimistically update UI
      setComments((prevComments) =>
        updateCommentInTree(prevComments, commentId, (comment) => ({
          ...comment,
          message: newText.trim(),
        }))
      );

      showNotification('success', 'Comment edited successfully!');

    } catch (error: any) {
      const errorMessage = error?.message || "Failed to edit comment. Please try again.";
      showNotification('error', errorMessage);
      console.error("Failed to edit reply:", error);
      throw error; // Re-throw so CommentItem can handle the error
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const response = await sendJsonRequest("/Feed/DeleteReply", "DELETE", {
        replyId: commentId
      });

      // Check if response contains an error message
      if (!response.success) {
        throw new Error(response.message);
      }

      // Optimistically remove from UI
      setComments((prevComments) => {
        const updated = deleteCommentFromTree(prevComments, commentId);
        return sortComments(updated);
      });

      showNotification('success', 'Comment deleted successfully!');

    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete comment. Please try again.";
      showNotification('error', errorMessage);
      console.error("Failed to delete reply:", error);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Loader2 className="spinner-border text-secondary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">{error}</p>
        <button onClick={fetchComments} className="btn btn-link text-primary">
          Try again
        </button>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className="mb-4">
      {/* Notification Toast */}
      <NotificationToast 
        notification={notification} 
        onClose={() => setNotification(null)} 
      />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="fw-semibold text-dark fs-5 mb-0">
          Comments ({getTotalCommentCount(comments)})
        </h3>
        <button 
          onClick={fetchComments} 
          className="btn btn-sm btn-outline-secondary"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {sortComments(comments).map((comment, i) => (
        <CommentItem
          key={`${comment.id}-0-${i}`}
          comment={comment}
          depth={0}
          index={i}
          parentId={undefined} // Top-level comments don't have parents
          expandedReplies={expandedReplies}
          setExpandedReplies={setExpandedReplies}
          replyBoxes={replyBoxes}
          setReplyBoxes={setReplyBoxes}
          currentUserId={currentUserId}
          onVote={handleCommentVote}
          onReplySubmit={handleReplySubmit}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
};

export default CommentList;