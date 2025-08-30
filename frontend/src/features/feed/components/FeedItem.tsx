import React, { useState } from 'react';
import { IFeed } from './types';
import { Link } from 'react-router-dom';
import { FileCode, MessageSquare, Link2 } from 'lucide-react';
import NotificationToast from './comments/NotificationToast';

import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Clock,
  Tag as TagIcon,
  Edit,
  Trash2,
  Pin
} from 'lucide-react';
import ShareModal from './ShareModal';
import EditModal from './EditModal';
import ProfileAvatar from "../../../components/ProfileAvatar";
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import { useNavigate } from "react-router-dom";

interface FeedItemProps {
  feed: IFeed;
  currentUserId?: string;
  sendJsonRequest: (url: string, method: string, reqBody?: any) => Promise<any>;
  onUpdate?: (updatedFeed: IFeed) => void;
  onDelete?: () => void;
  onCommentsClick?: (feedId: string) => void;
  showFullContent?: boolean;
  isPinned?: boolean;
}

const FeedItem: React.FC<FeedItemProps> = ({
  feed,
  currentUserId,
  sendJsonRequest,
  onUpdate,
  onDelete,
  onCommentsClick,
  showFullContent = false,
  isPinned = false
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpvoted, setIsUpvoted] = useState(feed.isUpvoted);
  const [votes, setVotes] = useState(feed.votes);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000); // Auto-hide after 5 seconds
  };
  const isOwner = currentUserId === feed.userId;
  const isSharedPost = feed.isOriginalPostDeleted !== 2;
  const navigate = useNavigate();

  const allowedUrls = [/^https?:\/\/.+/i];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleUpvote = async () => {
    try {
      setIsUpvoted(!isUpvoted);
      setVotes(prev => isUpvoted ? prev - 1 : prev + 1);
      const response = await sendJsonRequest("/Feed/VotePost", "POST", { postId: feed.id, vote: !isUpvoted });
      if(!response.success) {
        throw new Error(response.message)
      }
    } catch (error) {
      // rollback
      setIsUpvoted(isUpvoted);
      setVotes(votes);
      console.error('Failed to vote:', error);
      showNotification("error", String(error))
    }
  };

  const handleEdit = async (updatedContent: string) => {
    try {
      await sendJsonRequest("/Feed/EditFeed", "PUT", { feedId: feed.id, message: updatedContent });
      if (onUpdate) {
        onUpdate({ ...feed, message: updatedContent });
      }
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating feed:', err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await sendJsonRequest("/Feed/DeleteFeed", "DELETE", { feedId: feed.id });
        if (onDelete) onDelete();
      } catch (err) {
        console.error('Error deleting feed:', err);
      }
    }
  };

  const handleShare = async (shareMessage: string) => {
    try {
      const response = await sendJsonRequest("/Feed/ShareFeed", 'POST', { feedId: feed.id, message: shareMessage });
      if(!response.success) {
        throw new Error(response.message)
      }
      if (response?.feed) {
        navigate(`/feed/${response.feed.id}`);
      }
      setShowShareModal(false);
    } catch (err) {
      console.error('Error sharing feed:', err);
      showNotification("error", String(err))
    }
  };

  const UserAvatar = ({ src, name }: { src: string | null; name: string }) => (
    <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: 40, height: 40 }}>
      {src ? (
        <ProfileAvatar size={42} avatarImage={src} />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );


  const OriginalPostCard = ({ originalPost }: { originalPost: any }) => (
    <Link 
      to={`/feed/${originalPost.id}`} 
      className="mt-3 border rounded bg-light p-3 d-block text-dark text-decoration-none"
    >
      <div className="d-flex gap-3">
        <UserAvatar src={originalPost.userAvatarImage} name={originalPost.userName} />
        <div>
          <div className="d-flex align-items-center gap-2">
            <h6 className="fw-semibold mb-0">
              <Link 
                to={`/Profile/${originalPost.userId}`} 
                className="text-primary text-decoration-none"
                onClick={(e) => e.stopPropagation()} // prevent feed card click from firing
              >
                {originalPost.userName}
              </Link>
            </h6>
            <small className="text-muted">{formatDate(originalPost.date)}</small>
          </div>
          <MarkdownRenderer content={originalPost.message} allowedUrls={allowedUrls} />
          {originalPost.tags?.length > 0 && (
            <div className="d-flex flex-wrap gap-1">
              {originalPost.tags.map((tag: any) => (
                <span key={tag.id} className="badge bg-info text-dark d-flex align-items-center gap-1">
                  <TagIcon size={12} /> {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );


  return (
    <div className={`card shadow-sm border-0 mb-4 rounded-4 ${isPinned ? 'border-warning border-2' : ''}`}>
      <NotificationToast 
        notification={notification} 
        onClose={() => setNotification(null)} 
      />
      <div className="card-body">
        {/* Header */}
        <div className="d-flex justify-content-between">
          <div className="d-flex gap-3">
            <UserAvatar src={feed.userAvatarImage} name={feed.userName} />
            <div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h6 className="fw-bold mb-0">
                <Link 
                  to={`/Profile/${feed.userId}`} 
                  className="text-primary text-decoration-none"
                >
                  {feed.userName || "Anonymous"}
                </Link>
              </h6>
              {feed.level > 0 && (
                <span className="badge bg-warning text-dark">Level {feed.level}</span>
              )}
              <small className="text-muted d-flex align-items-center gap-1">
                <Clock size={14} /> {feed.date ? formatDate(feed.date) : "Recently"}
              </small>
              {isPinned && <Pin className="text-warning" size={14} />}
            </div>
              {feed.roles?.length > 0 && (
                <div className="d-flex gap-1 mt-1 flex-wrap">
                  {feed.roles.map((role, i) => (
                    <span key={i} className="badge bg-success">{role}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isOwner && (
            <div className="dropdown">
              <button 
                className="btn btn-sm btn-light dropdown-toggle" 
                type="button" 
                data-bs-toggle="dropdown" 
                aria-expanded="false"
              >
                <MoreHorizontal size={18} />
              </button>

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
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mt-3">
            {<MarkdownRenderer content={feed.message} allowedUrls={allowedUrls}/>}
            {feed.isOriginalPostDeleted === 1 && (
              <div className="alert alert-warning text-center my-3" role="alert">
                <h5 className="mb-0">This post is unavailable.</h5>
              </div>
            )}
            {feed.isOriginalPostDeleted === 0 && <OriginalPostCard originalPost={feed.originalPost} />}
          {feed.tags?.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mt-3">
              {feed.tags.map(tag => (
                <span key={tag.id} className="badge bg-primary d-flex align-items-center gap-1">
                  <TagIcon size={12} /> {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Attachments */}
        {feed.attachments?.length > 0 && (
          <div className="mt-4 d-flex flex-column gap-3">
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
                  return null; // unknown type
              }

              return (
                <Link
                  key={att.id}
                  to={to}
                  className="d-flex align-items-start gap-3 p-3 border rounded bg-white text-dark text-decoration-none shadow-sm"
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
        <div className="d-flex gap-4 pt-3 border-top mt-3">
          <button className={`btn btn-sm d-flex align-items-center gap-2 ${isUpvoted ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={handleUpvote}>
            <Heart size={16} /> {votes}
          </button>
          <button 
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            onClick={() => onCommentsClick && onCommentsClick(feed.id)}
          >
            <MessageCircle size={16} /> {feed.answers || 0}
          </button>
          <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2" onClick={() => setShowShareModal(true)}>
            <Share2 size={16} /> {feed.shares || 0}
          </button>
        </div>
      </div>

      {/* Modals */}
      {showShareModal && (
        <ShareModal feedId={feed.id} onShare={handleShare} onClose={() => setShowShareModal(false)} />
      )}
      {showEditModal && (
        <EditModal initialContent={feed.message} onSave={handleEdit} onClose={() => setShowEditModal(false)} />
      )}
    </div>
  );
};

export default FeedItem;
