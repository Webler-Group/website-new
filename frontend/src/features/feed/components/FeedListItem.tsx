import React, { useState } from 'react';
import { MessageCircle, Heart, Share2, Pin, MoreHorizontal, Edit, Trash2, Clock } from 'lucide-react';
import { Feed } from './types';
import ProfileAvatar from "../../../components/ProfileAvatar";
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import EditModal from './EditModal';
import { useNavigate } from "react-router-dom"; 
import ShareModal from './ShareModal';
import { useAuth } from '../../auth/context/authContext';
import { Link } from "react-router-dom";
import { FileCode, MessageSquare, Link2 } from "lucide-react";
import NotificationToast from './comments/NotificationToast';


interface FeedListItemProps {
  feed: Feed;
  currentUserId: string;
  sendJsonRequest: any;
  onUpdate: (feed: Feed) => void;
  onDelete: (feed: Feed) => void;
  onCommentsClick: (feedId: string) => void;
  isPinned?: boolean;
  onRefresh: () => void;
}

const FeedListItem: React.FC<FeedListItemProps> = ({
  feed,
  currentUserId,
  sendJsonRequest,
  onUpdate,
  onDelete,
  onCommentsClick,
  onRefresh,
  isPinned = false
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLiked, setIsLiked] = useState(feed.isUpvoted || false);
  const [likesCount, setLikesCount] = useState(feed.votes || 0);

  // New modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const navigate = useNavigate();
  const { userInfo } = useAuth()
  const canModerate = userInfo?.roles.includes("Admin") || userInfo?.roles.includes("Moderator");

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000); // Auto-hide after 5 seconds
  };

  const handlePinToggle = async () => {
    try {
      const endpoint = "/Feed/PinFeed"
      const response = await sendJsonRequest(endpoint, "POST", { feedId: feed.id });
      setShowDropdown(false);
      if(!response.success) {
        throw new Error(response.message)
      }
      onUpdate({ ...feed, isPinned: !feed.isPinned });
      onRefresh();
    } catch (err) {
      console.error("Error pinning/unpinning feed:", err);
    }
};
  const handleEdit = async (updatedContent: string) => {
    try {
      const response = await sendJsonRequest("/Feed/EditFeed", "PUT", { feedId: feed.id, message: updatedContent });
      setShowEditModal(false);
      if(!response.success) {
        throw new Error(response.message)
      }
      onUpdate({ ...feed, message: updatedContent });
    } catch (err) {
      console.error("Error updating feed:", err);
      showNotification("error", String(err))
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        const response = await sendJsonRequest("/Feed/DeleteFeed", "DELETE", { feedId: feed.id });
        if(!response.success) {
          throw new Error(response.message)
        }
        onDelete(feed);
      } catch (err) {
        console.error("Error deleting feed:", err);
        showNotification("error", String(err))
      }
    }
  };

  const handleLike = async () => {
    try {
      const response = await sendJsonRequest("/Feed/VotePost", "POST", { postId: feed.id, vote: !isLiked });
      if(!response.success) {
        throw new Error(response.message)
      }
      setIsLiked(!isLiked);
      setLikesCount(prev => (isLiked ? prev - 1 : prev + 1));
    } catch (err) {
      console.error("Error voting post:", err);
      showNotification("error", String(err))
    }
  };

    const handleShare = async (shareMessage: string) => {
    try {
        const response = await sendJsonRequest("/Feed/ShareFeed", "POST", {
        feedId: feed.id,
        message: shareMessage,
        });

        if(!response.success) {
          throw new Error(response.message)
        }

        if (response?.feed?.id) {
          navigate(`/feed/${response.feed.id}`);  
        }

        setShowShareModal(false);
    } catch (err) {
        console.error("Error sharing feed:", err);
        showNotification("error", String(err))
    }
    };
  const canEdit = feed.userId === currentUserId;
  const allowedUrls = [/^https?:\/\/.+/i];
// Inside FeedListItem.tsx

  const OriginalPostCard = ({ originalPost }: { originalPost: any }) => (
    <Link 
      to={`/feed/${originalPost.id}`} 
      className="mt-2 border rounded bg-light p-2 d-block text-dark text-decoration-none"
    >
      <div className="d-flex gap-2">
        <ProfileAvatar size={28} avatarImage={originalPost.userAvatarImage} />
        <div>
          {/* User profile link */}
          <strong>
            <Link 
              to={`/Profile/${originalPost.userId}`} 
              className="text-dark text-decoration-none"
            >
              {originalPost.userName}
            </Link>
          </strong>
          <MarkdownRenderer content={originalPost.message} allowedUrls={allowedUrls} />
        </div>
      </div>
    </Link>
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

  return (
    <div className={`card shadow-sm border-0 rounded-4 ${isPinned ? 'border-warning border-2' : ''}`}>
      <NotificationToast 
        notification={notification} 
        onClose={() => setNotification(null)} 
      />
      <div className="card-body">
        {/* Header */}

        <div className="d-flex justify-content-between align-items-start mb-3">
            
          <div className="d-flex align-items-center gap-3">
            <ProfileAvatar avatarImage={feed.userAvatarImage} size={42} />
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
                    {feed.isOriginalPostDeleted !== 2 ? " shared a post" : ""}
                  </span>
                </h6>
                <small className="text-muted d-flex align-items-center gap-1">
                  <Clock size={14} /> {feed.date ? formatDate(feed.date) : "Recently"}
                </small>
                {isPinned && <Pin className="text-warning" size={14} />}
                <div className="d-flex align-items-center gap-2">
                    {feed.isPinned && <Pin size={20} className="text-warning" />}
                </div>

              </div>
              {feed.roles?.length > 0 && (
                <div className="d-flex gap-1 mt-1 flex-wrap">
                  {feed.level > 0 && (
                    <span className="badge bg-warning text-dark">Level {feed.level}</span>
                  )}
                  {feed.roles.map((role, i) => (
                    <span key={i} className="badge bg-success">{role}</span>
                  ))}
                </div>
              )}
            </div>
          </div>


          {(canEdit || canModerate) && (
            <div className="dropdown">
              <button
                className="btn btn-sm btn-outline-secondary border-0"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <MoreHorizontal size={16} />
              </button>
              {showDropdown && (
                <div className="dropdown-menu show position-absolute end-0">
                  {/* If user is owner → Edit/Delete */}
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

                  {/* If user is Admin/Moderator → Pin/Unpin */}
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
              )}
            </div>
          )}
  
        </div>

        {/* Content */}
        <div className="mb-3">
          <MarkdownRenderer content={feed.message} allowedUrls={allowedUrls} />
            {feed.isOriginalPostDeleted === 1 && (
              <div className="alert alert-warning text-center my-3" role="alert">
                <h5 className="mb-0">This post is unavailable.</h5>
              </div>
            )}
            {feed.isOriginalPostDeleted === 0 && <OriginalPostCard originalPost={feed.originalPost} />}

        </div>

        {/* Attachments */}
        {feed.attachments?.length > 0 && (
          <div className="mb-3 d-flex flex-column gap-3">
            {feed.attachments.map(att => {
              if (!att.details) return null;

              let icon = null;
              let title = "";
              let subtitle = "";
              let to = "#";

              switch (att.details.type) {
                case 1: // Code
                  icon = <FileCode size={20} className="text-primary" />;
                  title = att.details.codeName;
                  subtitle = `${att.details.codeLanguage} • by ${att.details.userName}`;
                  to = `/Compiler-Playground/${att.details.codeId}`;
                  break;

                case 2: // Question / Discussion
                  icon = <MessageSquare size={20} className="text-success" />;
                  title = att.details.questionTitle;
                  subtitle = `by ${att.details.userName}`;
                  to = `/Discuss/${att.details.questionId}`;
                  break;

                case 3: // Feed
                  icon = <Link2 size={20} className="text-info" />;
                  title = "Feed";
                  subtitle = `${att.details.userName}: ${att.details.feedMessage}`;
                  to = `/feed/${att.details.feedId}`;
                  break;
              }

              return (
                <Link
                  key={att.id}
                  to={to}
                  className="
                    d-flex align-items-start gap-3 p-3 border rounded bg-white text-dark text-decoration-none
                    shadow-sm
                    transition-all
                    hover-shadow
                  "
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

        {/* Actions */}
        <div className="d-flex align-items-center justify-content-between pt-2 border-top">
          <div className="d-flex align-items-center gap-4">
            <button
              className={`btn btn-sm border-0 d-flex align-items-center gap-2 ${
                isLiked ? "text-danger" : "text-muted"
              }`}
              onClick={handleLike}
            >
              <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
              <span>{likesCount}</span>
            </button>

            <button
              className="btn btn-sm border-0 text-muted d-flex align-items-center gap-2"
              onClick={() => onCommentsClick(feed.id)}
            >
              <MessageCircle size={16} />
              <span>{feed.answers || 0}</span>
            </button>
          </div>

          <button
            className="btn btn-sm border-0 text-muted d-flex align-items-center gap-2"
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
};

export default FeedListItem;
