import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Comment } from '../types';
import { Loader2 } from 'lucide-react';
import CommentItem from './CommentItem';
import NotificationToast from './NotificationToast';

interface CommentListProps {
  feedId: string;
  sendJsonRequest: (method: string, url: string, reqBody?: any) => Promise<any>;
  currentUserId?: string;
  noOfComments: number;
}

const CommentList: React.FC<CommentListProps> = ({
  feedId,
  sendJsonRequest,
  currentUserId,
  noOfComments
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Pagination states
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [replyPagination, setReplyPagination] = useState<
    Record<string, { page: number; hasMore: boolean; loading: boolean }>
  >({});
  
  // UI states
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [replyBoxes, setReplyBoxes] = useState<Record<string, boolean>>({});
  
  // Refs for infinite scroll
  const observerRef = useRef<IntersectionObserver>();
  const lastCommentElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMoreComments();
      }
    }, {
      threshold: 0.1,
      rootMargin: '100px'
    });
    
    if (node) observerRef.current.observe(node);
  }, [loadingMore, hasMore, loading]);

  const COMMENTS_PER_PAGE = 10;
  const REPLIES_PER_PAGE = 10;

  // Show notification helper
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchReplies = async (parentId: string, page = 1, append = false) => {
    try {
      setReplyPagination(prev => ({
        ...prev,
        [parentId]: { 
          ...(prev[parentId] || { page: 0, hasMore: true }), 
          loading: true 
        },
      }));

      const response = await sendJsonRequest("/Feed/GetNestedReplies", "POST", {
        parentId,
        page,
        count: REPLIES_PER_PAGE,
      });

      if (response?.success) {
        const newReplies = response.replies || [];

        setComments(prevComments =>
          addReplyToComment(prevComments, parentId, newReplies, append)
        );

        setReplyPagination(prev => ({
          ...prev,
          [parentId]: {
            page,
            hasMore: response.pagination?.hasMore ?? newReplies.length >= REPLIES_PER_PAGE,
            loading: false,
          },
        }));
      } else {
        throw new Error(response?.message || 'Failed to load replies');
      }
    } catch (err) {
      console.error("Error fetching nested replies:", err);
      setReplyPagination(prev => ({
        ...prev,
        [parentId]: { 
          ...(prev[parentId] || { page: 0, hasMore: true }), 
          loading: false 
        },
      }));
      showNotification('error', 'Failed to load replies. Please try again.');
    }
  };

  const fetchComments = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const response = await sendJsonRequest("/Feed/GetFeedReplies", "POST", {
        feedId: feedId,
        count: COMMENTS_PER_PAGE,
        page: pageNum
      });

      console.log(response.replies)

      if (response && response.replies) {
        const newComments = response.replies;
        const sortedComments = sortComments(newComments);
        
        if (append) {
          setComments(prevComments => {
            const combined = [...prevComments, ...sortedComments];
            return sortComments(combined);
          });
        } else {
          setComments(sortedComments);
        }
        
        setTotalLoaded(prev => append ? prev + sortedComments.length : sortedComments.length);
        
        // Check if we have more comments to load
        const hasMoreData = sortedComments.length === COMMENTS_PER_PAGE && 
                           (append ? totalLoaded + sortedComments.length : sortedComments.length) < noOfComments;
        setHasMore(hasMoreData);
        
        if (append) {
          setPage(pageNum);
        }
      }
    } catch (err) {
      const errorMsg = "Failed to load comments";
      setError(errorMsg);
      console.error("Error fetching comments:", err);
      if (!append) {
        showNotification("error", "Failed to fetch the feed replies. Please try again later.");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreComments = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    fetchComments(page + 1, true);
  }, [hasMore, loadingMore, loading, page]);

  useEffect(() => {
    // Reset pagination state when feedId changes
    setPage(1);
    setTotalLoaded(0);
    setHasMore(true);
    setComments([]);
    setReplyPagination({});
    
    fetchComments(1, false);

    const handleCommentPosted = (event: CustomEvent) => {
      if (event.detail.feedId === feedId) {
        if (event.detail.comment) {
          const newComment = event.detail.comment;
          setComments(prevComments => {
            const updated = [newComment, ...prevComments];
            return sortComments(updated);
          });
          setTotalLoaded(prev => prev + 1);
        } else {
          fetchComments(1, false);
          setPage(1);
          setTotalLoaded(0);
          setHasMore(true);
        }
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
  const addReplyToComment = (
    commentsList: Comment[],
    parentId: string,
    newReplies: Comment[],
    append = true
  ): Comment[] => {
    return commentsList.map(comment => {
      if (comment.id === parentId) {
        const existingReplies = comment.replies || [];
        return {
          ...comment,
          replies: append
            ? [...existingReplies, ...newReplies]
            : newReplies,
        };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: addReplyToComment(comment.replies, parentId, newReplies, append),
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

      if (!response.success) {
        throw new Error(response.message);
      }

      // If API returns the complete reply data, use it
      if (response && response.reply) {
        setComments((prevComments) => {
          const updated = addReplyToComment(prevComments, parentId, [response.reply]);
          return sortComments(updated);
        });
      } else {
        // Fallback: refresh comments
        await fetchComments(1, false);
        setPage(1);
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
      throw error;
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const response = await sendJsonRequest("/Feed/DeleteReply", "DELETE", {
        replyId: commentId,
        feedId: feedId
      });

      if (!response.success) {
        throw new Error(response.message);
      }

      // Optimistically remove from UI
      setComments((prevComments) => {
        const updated = deleteCommentFromTree(prevComments, commentId);
        return sortComments(updated);
      });

      // Update total loaded count
      setTotalLoaded(prev => prev - 1);

      showNotification('success', 'Comment deleted successfully!');

    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete comment. Please try again.";
      showNotification('error', errorMessage);
      console.error("Failed to delete reply:", error);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setTotalLoaded(0);
    setHasMore(true);
    setComments([]);
    setReplyPagination({});
    fetchComments(1, false);
  };

  if (loading && comments.length === 0) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Loader2 className="spinner-border text-secondary" />
      </div>
    );
  }

  if (error && comments.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">{error}</p>
        <button onClick={handleRefresh} className="btn btn-link text-primary">
          Try again
        </button>
      </div>
    );
  }

  if (comments.length === 0 && !loading) {
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
          Comments ({noOfComments})
        </h3>
        <button 
          onClick={handleRefresh} 
          className="btn btn-sm btn-outline-secondary"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {comments.map((comment, i) => (
        <div
          key={`${comment.id}-0-${i}`}
          ref={i === comments.length - 1 ? lastCommentElementRef : undefined}
        >
          <CommentItem
            comment={comment}
            depth={0}
            index={i}
            parentId={undefined}
            expandedReplies={expandedReplies}
            setExpandedReplies={setExpandedReplies}
            replyBoxes={replyBoxes}
            setReplyBoxes={setReplyBoxes}
            currentUserId={currentUserId}
            onVote={handleCommentVote}
            onReplySubmit={handleReplySubmit}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onFetchReplies={fetchReplies}
            replyPagination={replyPagination}
          />
        </div>
      ))}

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="d-flex justify-content-center py-3">
          <Loader2 className="spinner-border text-secondary" />
          <span className="ms-2 text-muted">Loading more comments...</span>
        </div>
      )}

      {/* End of comments indicator */}
      {!hasMore && comments.length > 0 && (
        <div className="text-center py-3">
          <p className="text-muted small mb-0">
            You've reached the end of the comments
          </p>
        </div>
      )}

      {/* Error loading more */}
      {error && comments.length > 0 && (
        <div className="text-center py-3">
          <p className="text-muted small mb-2">{error}</p>
          <button 
            onClick={() => loadMoreComments()} 
            className="btn btn-sm btn-link text-primary"
          >
            Try loading more
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentList;