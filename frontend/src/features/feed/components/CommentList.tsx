import React, { useState, useEffect } from 'react';
import { Comment } from './types';
import { Heart, Clock, Loader2, Reply, ChevronDown, ChevronUp } from 'lucide-react';
import ProfileAvatar from '../../../components/ProfileAvatar';
import { MoreVertical } from "lucide-react";
import NotificationToast from './comments/NotificationToast';


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
  const [menuOpen, setMenuOpen] = useState(false);


  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [replyBoxes, setReplyBoxes] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  

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

      if(!response.success) {
        throw new Error(response.message)
      }

      if (response && response.replies) {
        setComments(response.replies);
        console.log(response.replies)
      }
    } catch (err) {
      setError("Failed to load comments");
      console.error("Error fetching comments:", err);
      showNotification("error", String(err))
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
      setComments((prevComments) => updateCommentVotes(prevComments));

      const response = await sendJsonRequest("/Feed/VotePost", "POST", {
        vote: !currentlyUpvoted,
        postId: commentId,
      });
      if(!response.success) {
        throw new Error(response.message)
      }
    } catch (error) {
      setComments((prevComments) => updateCommentVotes(prevComments));
      console.error("Failed to vote on comment:", error);
      showNotification("error", String(error))
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

  const CommentItem: React.FC<{
    comment: Comment;
    depth?: number;
    index?: number;
    expandedReplies: Record<string, boolean>;
    setExpandedReplies: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    replyBoxes: Record<string, boolean>;
    setReplyBoxes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  }> = ({
    comment,
    depth = 0,
    index = 0,
    expandedReplies,
    setExpandedReplies,
    replyBoxes,
    setReplyBoxes,
  }) => {
    const showReplies = expandedReplies[comment.id] || false;
    const showReplyBox = replyBoxes[comment.id] || false;
    const [replyText, setReplyText] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);

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

    const handleReplySubmit = async () => {
      if (!replyText.trim()) return;

      try {
        const response = await sendJsonRequest("/Feed/ReplyComment", "POST", {
          message: replyText.trim(),
          feedId: feedId,
          parentId: comment.id,
        });

        setReplyText("");
        if(!response.success) {
          throw new Error(response.message)
        }

        setReplyBoxes((prev) => ({ ...prev, [comment.id]: false }));
        fetchComments();
      } catch (err) {
        console.error("Failed to post reply:", err);
        showNotification("error", String(err))
      }
    };

    const handleEditSubmit = async () => {
      if (!editText.trim()) return;

      try {
        const response = await sendJsonRequest("/Feed/EditReply", "PUT", {
          replyId: comment.id,
          message: editText.trim(),
        });
        setIsEditing(false);
        if(!response.success) {
          throw new Error(response.message)
        }

        // update UI without full reload
        comment.message = editText.trim();
      } catch (err) {
        console.error("Failed to edit reply:", err);
        showNotification("error", String(err))
      }
    };

    const handleDelete = async () => {
      try {
        const response = await sendJsonRequest("/Feed/DeleteReply", "DELETE", {
          replyId: comment.id
        });
        if(!response.success) {
          throw new Error(response.message)
        }
        fetchComments();
      } catch (err) {
        console.error("Failed to delete reply:", err);
        showNotification("error", String(err))
      }
    };

    return (
      <div
        className={`mb-3 ${depth === 0 ? "p-3 bg-white rounded border shadow-sm" : ""}`}
        style={{ marginLeft: depth > 0 ? depth * 20 : 0 }}
      >
        <NotificationToast 
          notification={notification} 
          onClose={() => setNotification(null)} 
        />
        <div className="d-flex align-items-start gap-3">
          <UserAvatar src={comment.userAvatar} name={comment.userName} />

          <div className="flex-grow-1">
            {/* Header row */}
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
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setMenuOpen(false);
                            setIsEditing(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="dropdown-item text-danger"
                          onClick={() => {
                            setMenuOpen(false);
                            handleDelete();
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Comment content OR Edit textarea */}
            {!isEditing ? (
              <p className="text-secondary mb-2">{comment.message}</p>
            ) : (
              <div className="mb-2">
                <textarea
                  className="form-control mb-2"
                  rows={2}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
                <button onClick={handleEditSubmit} className="btn btn-sm btn-primary me-2">
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(comment.message);
                  }}
                  className="btn btn-sm btn-outline-secondary"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Actions */}
            {!isEditing && (
              <div className="d-flex gap-2">
                {/* Like button */}
                <button
                  onClick={() => handleCommentVote(comment.id, comment.isUpvoted)}
                  className={`btn btn-sm d-inline-flex align-items-center gap-1 px-2 py-1 ${
                    comment.isUpvoted ? "btn-outline-danger active" : "btn-outline-secondary"
                  }`}
                >
                  <Heart size={14} fill={comment.isUpvoted ? "currentColor" : "none"} />
                  <span className="small fw-medium">{comment.votes}</span>
                </button>

                {/* Reply button - only up to 3 levels */}
                {depth < 2 && (
                  <button
                    onClick={toggleReplyBox}
                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 px-2 py-1"
                  >
                    <Reply size={14} />
                    Reply
                  </button>
                )}
              </div>
            )}

            {/* Reply box */}
            {showReplyBox && (
              <div className="mt-2">
                <textarea
                  className="form-control mb-2"
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                />
                <button onClick={handleReplySubmit} className="btn btn-sm btn-primary me-2">
                  Post Reply
                </button>
                <button
                  onClick={toggleReplyBox}
                  className="btn btn-sm btn-outline-secondary"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Replies toggle */}
            {comment.replies && comment.replies.length > 0 && (
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

            {/* Recursive replies */}
            {showReplies && comment.replies && comment.replies.length > 0 && (
              <div className="mt-3">
                {comment.replies.map((reply, i) => (
                  <CommentItem
                    key={`${reply.id}-${depth + 1}-${i}`}
                    comment={reply}
                    depth={depth + 1}
                    index={i}
                    expandedReplies={expandedReplies}
                    setExpandedReplies={setExpandedReplies}
                    replyBoxes={replyBoxes}
                    setReplyBoxes={setReplyBoxes}
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
        <CommentItem
          key={`${comment.id}-0-${i}`}
          comment={comment}
          depth={0}
          index={i}
          expandedReplies={expandedReplies}
          setExpandedReplies={setExpandedReplies}
          replyBoxes={replyBoxes}
          setReplyBoxes={setReplyBoxes}
        />
      ))}
    </div>
  );
};

export default CommentList;
