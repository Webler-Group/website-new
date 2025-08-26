import React, { useState, useEffect } from 'react';
import { Comment } from './types';
import { Heart, Clock, Loader2, Reply } from 'lucide-react';
import ProfileAvatar from '../../../components/ProfileAvatar';

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

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await sendJsonRequest("/Feed/GetFeedReplies", "POST", {
        feedId: feedId,
      });

      if (response && response.replies) {
        // ensure replies have unique IDs by stringifying
        setComments(response.replies);
      }
    } catch (err) {
      setError("Failed to load comments");
      console.error("Error fetching comments:", err);
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

  const formatDate = (dateString: string) => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - commentDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleCommentVote = async (commentId: string, currentlyUpvoted: boolean) => {
    // recursive function to update a comment or its replies
    const updateCommentVotes = (commentsList: Comment[]): Comment[] => {
      return commentsList.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            isUpvoted: !currentlyUpvoted,
            votes: currentlyUpvoted ? comment.votes - 1 : comment.votes + 1,
          };
        }

        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateCommentVotes(comment.replies),
          };
        }

        return comment;
      });
    };

    try {
      // optimistic update for UI
      setComments((prevComments) => updateCommentVotes(prevComments));

      await sendJsonRequest("/Feed/VotePost", "POST", {
        vote: !currentlyUpvoted,
        postId: commentId,
      });
    } catch (error) {
      // rollback if API fails
      setComments((prevComments) => updateCommentVotes(prevComments));
      console.error("Failed to vote on comment:", error);
    }
  };

  const UserAvatar = ({ src, name }: { src: string | null; name: string }) => (
    <div
      className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-semibold"
      style={{ width: 32, height: 32 }}
    >
      {src ? <ProfileAvatar size={32} avatarImage={src} /> : name.charAt(0).toUpperCase()}
    </div>
  );

  // Component to render a comment (recursive for replies, but only 1 level deep)
  const CommentItem: React.FC<{ comment: Comment; depth?: number; index?: number }> = ({
    comment,
    depth = 0,
    index = 0,
  }) => {
    const [showReplyBox, setShowReplyBox] = useState(false);
    const [replyText, setReplyText] = useState("");

    const handleReplySubmit = async () => {
      if (!replyText.trim()) return;

      try {
        await sendJsonRequest("/Feed/ReplyComment", "POST", {
          message: replyText.trim(),
          feedId: feedId,
          parentId: comment.id,
        });

        setReplyText("");
        setShowReplyBox(false);
        fetchComments(); // refresh thread
      } catch (err) {
        console.error("Failed to post reply:", err);
      }
    };


    return (
      <div
        className="bg-white rounded shadow-sm border p-3 mb-3"
        style={{ marginLeft: depth * 30 }}
      >
        <div className="d-flex align-items-start gap-3">
          <UserAvatar src={comment.userAvatar} name={comment.userName} />

          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2 mb-1">
              <h4 className="fw-semibold text-dark mb-0">{comment.userName}</h4>
              <span className="text-muted small">•</span>
              <span className="text-muted small d-flex align-items-center gap-1">
                <Clock size={12} />
                {formatDate(comment.date)}
              </span>
            </div>

            <p className="text-secondary mb-2">{comment.message}</p>

            <div className="d-flex gap-2">
              {/* Like button (works for both comments and replies) */}
              <button
                onClick={() => handleCommentVote(comment.id, comment.isUpvoted)}
                className={`btn btn-sm d-inline-flex align-items-center gap-1 px-2 py-1 ${
                  comment.isUpvoted ? "btn-outline-danger active" : "btn-outline-secondary"
                }`}
              >
                <Heart size={14} fill={comment.isUpvoted ? "currentColor" : "none"} />
                <span className="small fw-medium">{comment.votes}</span>
              </button>

              {/* Only show reply button for top-level comments */}
              {depth === 0 && (
                <button
                  onClick={() => setShowReplyBox(!showReplyBox)}
                  className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 px-2 py-1"
                >
                  <Reply size={14} />
                  Reply
                </button>
              )}
            </div>

            {showReplyBox && depth === 0 && (
              <div className="mt-2">
                <textarea
                  className="form-control mb-2"
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                />
                <button
                  onClick={handleReplySubmit}
                  className="btn btn-sm btn-primary me-2"
                >
                  Post Reply
                </button>
                <button
                  onClick={() => setShowReplyBox(false)}
                  className="btn btn-sm btn-outline-secondary"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Render replies only once (1 level depth) */}
            {depth === 0 && comment.replies && comment.replies.length > 0 && (
              <div className="mt-3">
                {comment.replies.map((reply, i) => (
                  // 👇 key fixed: combine reply.id + depth + index
                  <CommentItem
                    key={`${reply.id}-${depth + 1}-${i}`}
                    comment={reply}
                    depth={depth + 1}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
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
      <h3 className="fw-semibold text-dark fs-5 mb-3">
        Comments ({comments.length})
      </h3>

      {comments.map((comment, i) => (
        <CommentItem key={`${comment.id}-0-${i}`} comment={comment} depth={0} index={i} />
      ))}
    </div>
  );
};

export default CommentList;
