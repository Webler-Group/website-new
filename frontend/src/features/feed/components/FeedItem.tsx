import React, { useState } from 'react';
import { MessageCircle, Heart, Share2, Pin, MoreHorizontal, Edit, Trash2, Clock, Tag as TagIcon } from 'lucide-react';
import { IFeed, PostType } from './types';
import ProfileAvatar from "../../../components/ProfileAvatar";
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import EditModal from './EditModal';
import { useNavigate } from "react-router-dom";
import ShareModal from './ShareModal';
import { useAuth } from '../../auth/context/authContext';
import { Link } from "react-router-dom";
import { FileCode, MessageSquare, Link2 } from "lucide-react";
import NotificationToast from './comments/NotificationToast';
import { useApi } from '../../../context/apiCommunication';

interface FeedItemProps {
  feed: IFeed;
  onUpdate?: (feed: IFeed) => void;
  onDelete?: (feed: IFeed) => void;
  onCommentsClick?: (feedId: string) => void;
  isPinned?: boolean;
  // New props to handle different contexts
  showFullContent?: boolean;
  // For direct usage without hooks (like in individual feed view)
  currentUserId?: string;
  sendJsonRequest?: (url: string, method: string, reqBody?: any) => Promise<any>;
}

const FeedItem = React.forwardRef<HTMLDivElement, FeedItemProps>(({
  feed,
  onUpdate,
  onDelete,
  onCommentsClick,
  isPinned = false,
  showFullContent = false,
  currentUserId: propCurrentUserId,
  sendJsonRequest: propSendJsonRequest
}, ref) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLiked, setIsLiked] = useState(feed.isUpvoted || false);
  const [likesCount, setLikesCount] = useState(feed.votes || 0);
  
  // Determine if we're in list view based on whether external props are provided
  const isListView = !propCurrentUserId && !propSendJsonRequest;
  
  // Use hooks only if not provided via props (for list view)
  const { sendJsonRequest: hookSendJsonRequest } = isListView ? useApi() : { sendJsonRequest: null };
  const { userInfo } = isListView ? useAuth() : { userInfo: null };
  
  const sendJsonRequest = propSendJsonRequest || hookSendJsonRequest;
  const currentUserId = propCurrentUserId || userInfo?.id;

  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const navigate = useNavigate();
  
  const canModerate = userInfo?.roles?.includes("Admin") || userInfo?.roles?.includes("Moderator");
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handlePinToggle = async () => {
    if (!sendJsonRequest) return;
    try {
      const endpoint = "/Feed/PinFeed";
      const response = await sendJsonRequest(endpoint, "POST", { feedId: feed.id });
      setShowDropdown(false);
      if (!response.success) {
        throw new Error(response.message);
      }
      onUpdate?.({ ...feed, isPinned: !feed.isPinned });
    } catch (err) {
      console.error("Error pinning/unpinning feed:", err);
      showNotification("error", String(err));
    }
  };

  const handleEdit = async (updatedContent: string) => {
    if (!sendJsonRequest) return;
    try {
      const response = await sendJsonRequest("/Feed/EditFeed", "PUT", { feedId: feed.id, message: updatedContent });
      setShowEditModal(false);
      if (!response.success) {
        throw new Error(response.message);
      }
      onUpdate?.({ ...feed, message: updatedContent });
    } catch (err) {
      console.error("Error updating feed:", err);
      showNotification("error", String(err));
    }
  };

  const handleDelete = async () => {
    if (!sendJsonRequest) return;
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        const response = await sendJsonRequest("/Feed/DeleteFeed", "DELETE", { feedId: feed.id });
        if (!response.success) {
          throw new Error(response.message);
        }
        if (isListView) {
          onDelete?.(feed);
        } else {
          // For individual feed view, call onDelete without parameters
          (onDelete as (() => void))?.();
        }
      } catch (err) {
        console.error("Error deleting feed:", err);
        showNotification("error", String(err));
      }
    }
  };

  const handleLike = async () => {
    if (!sendJsonRequest) return;
    try {
      // Optimistic update
      const newIsLiked = !isLiked;
      const newLikesCount = isLiked ? likesCount - 1 : likesCount + 1;
      setIsLiked(newIsLiked);
      setLikesCount(newLikesCount);

      const response = await sendJsonRequest("/Feed/VotePost", "POST", { postId: feed.id, vote: newIsLiked });
      if (!response.success) {
        throw new Error(response.message);
      }
    } catch (err) {
      // Rollback on error
      setIsLiked(!isLiked);
      setLikesCount(likesCount);
      console.error("Error voting post:", err);
      showNotification("error", String(err));
    }
  };

  const handleShare = async (shareMessage: string, tags?: string[]) => {
    if (!sendJsonRequest) return;
    try {
      const response = await sendJsonRequest("/Feed/ShareFeed", "POST", {
        feedId: feed.id,
        message: shareMessage,
        ...(tags && { tags })
      });

      if (!response.success) {
        throw new Error(response.message);
      }

      if (response?.feed?.id) {
        navigate(`/feed/${response.feed.id}`);
      }

      setShowShareModal(false);
    } catch (err) {
      console.error("Error sharing feed:", err);
      showNotification("error", String(err));
    }
  };

  const canEdit = feed.userId === currentUserId;
  const allowedUrls = [/^https?:\/\/.+/i, /^\/.*/];

  const OriginalPostCard = ({ originalPost }: { originalPost: any }) => (
    <div
      onClick={() => navigate(`/feed/${originalPost.id}`)}
      className="mt-2 border rounded bg-light p-2 d-block text-dark text-decoration-none"
      style={{ cursor: "pointer" }}
    >
      <div className="d-flex gap-2">
        <ProfileAvatar size={28} avatarImage={originalPost.userAvatarImage} />
        <div>
          <strong>
            <Link
              to={`/Profile/${originalPost.userId}`}
              className="text-dark text-decoration-none"
              onClick={(e) => e.stopPropagation()}
            >
              {originalPost.userName}
            </Link>
          </strong>

          <MarkdownRenderer content={originalPost.message} allowedUrls={allowedUrls} />

          {originalPost.tags?.length > 0 && (
            <div className="d-flex flex-wrap gap-1">
              {originalPost.tags.map((tag: any) => (
                <span
                  key={tag._id}
                  className="badge bg-info text-dark d-flex align-items-center gap-1"
                >
                  <TagIcon size={12} /> {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderUserAvatar = () => {
    if (feed.userAvatarImage) {
      return <ProfileAvatar size={42} avatarImage={feed.userAvatarImage} />;
    }
    return (
      <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: 40, height: 40 }}>
        {feed.userName?.charAt(0).toUpperCase() || 'A'}
      </div>
    );
  };

  const body = (
    <div className={`card shadow-sm border-0 rounded-4 ${isPinned ? 'border-warning border-2' : ''} ${isListView ? '' : 'mb-4'}`}>
      <NotificationToast
        notification={notification}
        onClose={() => setNotification(null)}
      />
      <div className="card-body">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="d-flex align-items-center gap-3">
            {renderUserAvatar()}
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h6 className="fw-bold mb-0">
                  <Link
                    to={`/Profile/${feed.userId}`}
                    className="text-primary text-decoration-none"
                  >
                    {feed.userName || "Anonymous"}
                  </Link>
                  <span style={{ fontWeight: 400 }}>
                    {feed.type === PostType.SHARED_FEED ? " shared a post" : ""}
                  </span>
                </h6>
                {isPinned && <Pin className="text-warning" size={14} />}
                <div className="d-flex align-items-center gap-2">
                  {feed.isPinned && <Pin size={20} className="text-warning" />}
                </div>
              </div>
              
              <div className="d-flex gap-1 mt-1 flex-wrap align-items-center">
                <small className="text-muted d-flex align-items-center gap-1">
                  <Clock size={14} /> {feed.date ? formatDate(feed.date) : "Recently"}
                </small>
                {/* {feed.roles?.length > 0 && (
                  <>
                    {feed.level > 0 && (
                      <span className="badge bg-warning text-dark">Level {feed.level}</span>
                    )}
                    {feed.roles.slice(1).map((role, i) => (
                      <span key={i} className="badge bg-success">{role}</span>
                    ))}
                  </>
                )} */}
              </div>
            </div>
          </div>

          {(canEdit || canModerate) && (
            <div className="dropdown">
              <button
                className={`btn btn-sm ${isListView ? 'btn-outline-secondary border-0' : 'btn-light dropdown-toggle'}`}
                onClick={() => setShowDropdown(!showDropdown)}
                {...(!isListView && { 'data-bs-toggle': 'dropdown', 'aria-expanded': 'false' })}
              >
                <MoreHorizontal size={16} />
              </button>
              
              {isListView ? (
                showDropdown && (
                  <div className="dropdown-menu show position-absolute end-0">
                    {canEdit && (
                      <>
                        <button
                          className="dropdown-item d-flex align-items-center gap-2"
                          onClick={() => {
                            setShowEditModal(true);
                            setShowDropdown(false);
                          }}
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          className="dropdown-item d-flex align-items-center gap-2 text-danger"
                          onClick={() => {
                            handleDelete();
                            setShowDropdown(false);
                          }}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </>
                    )}

                    {canModerate && (
                      <button
                        className="dropdown-item d-flex align-items-center gap-2"
                        onClick={handlePinToggle}
                      >
                        <Pin size={14} />
                        {feed.isPinned ? "Unpin Post" : "Pin Post"}
                      </button>
                    )}
                  </div>
                )
              ) : (
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <button 
                      className="dropdown-item d-flex align-items-center gap-2" 
                      onClick={() => setShowEditModal(true)}
                    >
                      <Edit size={14} /> Edit Post
                    </button>
                  </li>
                  <li>
                    <button 
                      className="dropdown-item text-danger d-flex align-items-center gap-2" 
                      onClick={handleDelete}
                    >
                      <Trash2 size={14} /> Delete Post
                    </button>
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mb-3">
          <MarkdownRenderer content={feed.message} allowedUrls={allowedUrls} />
          {feed.type === PostType.SHARED_FEED && !feed.originalPost && (
            <div
              className="alert mt-4"
              role="alert"
              style={{
                minHeight: "150px", 
                border: "1px solid #ddd", 
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#fafafa" 
              }}
            >
              <h5 className="mb-0">⚠️ The post is unavailable.</h5>
            </div>
          )}
          {feed.type === PostType.SHARED_FEED && feed.originalPost && (
            <OriginalPostCard originalPost={feed.originalPost} />
          )}
        </div>

        {/* Attachments */}
        {feed.attachments?.length > 0 && (
          <div className={`${isListView ? 'mb-3' : 'mt-4'} d-flex flex-column gap-3`}>
            {feed.attachments.map(att => {
              let icon = null;
              let title = "";
              let subtitle = "";
              let to = "#";

              switch (att.type) {
                case 1: // Code
                  icon = <FileCode size={20} className="text-primary" />;
                  title = att.codeName || "Untitled Code";
                  subtitle = `${att.codeLanguage} • by ${att.userName}`;
                  to = `/Compiler-Playground/${att.codeId}`;
                  break;

                case 2: // Question / Discussion
                  icon = <MessageSquare size={20} className="text-success" />;
                  title = att.questionTitle || "Question";
                  subtitle = `by ${att.userName}`;
                  to = `/Discuss/${att.questionId}`;
                  break;

                case 4: // Feed
                  icon = <Link2 size={20} className="text-info" />;
                  title = "Feed";
                  subtitle = `${att.userName}: ${att.feedMessage}`;
                  to = `/feed/${att.feedId}`;
                  break;

                default:
                  return null;
              }

              return (
                <Link
                  key={att.id}
                  to={to}
                  className="d-flex align-items-start gap-3 p-3 border rounded bg-white text-dark text-decoration-none shadow-sm transition-all hover-shadow"
                  style={{
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "translateY(-2px)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
                >
                  <div className="flex-shrink-0">{icon}</div>
                  <div className="flex-grow-1 overflow-hidden">
                    <h6 className="fw-semibold mb-1 text-truncate">{title}</h6>
                    <small className="text-muted d-block text-truncate">
                      {subtitle}
                    </small>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {feed.tags?.length > 0 && (
          <div className={`d-flex flex-wrap gap-2 ${isListView ? 'mt-3 mb-2' : 'mt-3'}`}>
            {feed.tags.map((tag: any) => (
              <span key={tag._id} className="badge bg-primary d-flex align-items-center gap-1">
                <TagIcon size={12} /> {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className={`d-flex align-items-center ${isListView ? 'justify-content-between' : 'gap-4'} pt-2 border-top ${isListView ? '' : 'mt-3'}`}>
          <div className="d-flex align-items-center gap-4">
            <button
              className={`btn btn-sm ${isListView ? 'border-0' : ''} d-flex align-items-center gap-2 ${
                isLiked ? (isListView ? "text-danger" : "btn-danger") : (isListView ? "text-muted" : "btn-outline-secondary")
              }`}
              onClick={handleLike}
            >
              <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
              <span>{likesCount}</span>
            </button>

            <button
              className={`btn btn-sm ${isListView ? 'border-0 text-muted' : 'btn-outline-secondary'} d-flex align-items-center gap-2`}
              onClick={() => onCommentsClick?.(feed.id)}
            >
              <MessageCircle size={16} />
              <span>{feed.answers || 0}</span>
            </button>
          </div>

          <button
            className={`btn btn-sm ${isListView ? 'border-0 text-muted' : 'btn-outline-secondary'} d-flex align-items-center gap-2`}
            onClick={() => setShowShareModal(true)}
          >
            <Share2 size={16} />
            <span>{feed.shares || 0}</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      {showEditModal && (
        <EditModal
          initialContent={feed.message}
          onSave={handleEdit}
          onClose={() => setShowEditModal(false)}
        />
      )}
      {showShareModal && (
        <ShareModal
          feedId={feed.id}
          onShare={handleShare}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );

  return ref ? <div ref={ref}>{body}</div> : body;
});

FeedItem.displayName = 'FeedItem';

export default FeedItem;