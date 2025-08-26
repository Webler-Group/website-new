import React, { useState } from 'react';
import { MessageCircle, Heart, Share2, Pin, MoreHorizontal, Edit, Trash2, Clock } from 'lucide-react';
import { Feed } from './types';
import ProfileAvatar from "../../../components/ProfileAvatar";
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import EditModal from './EditModal';
import { useNavigate } from "react-router-dom"; 
import ShareModal from './ShareModal';

interface FeedListItemProps {
  feed: Feed;
  currentUserId: string;
  sendJsonRequest: any;
  onUpdate: (feed: Feed) => void;
  onDelete: (feed: Feed) => void;
  onCommentsClick: (feedId: string) => void;
  isPinned?: boolean;
}

const FeedListItem: React.FC<FeedListItemProps> = ({
  feed,
  currentUserId,
  sendJsonRequest,
  onUpdate,
  onDelete,
  onCommentsClick,
  isPinned = false
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLiked, setIsLiked] = useState(feed.isUpvoted || false);
  const [likesCount, setLikesCount] = useState(feed.votes || 0);

  // New modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const isSharedPost = feed.originalPost ? true: false;
  const navigate = useNavigate();
  console.log(isSharedPost)

  const handleEdit = async (updatedContent: string) => {
    try {
      await sendJsonRequest("/Feed/EditFeed", "PUT", { feedId: feed.id, message: updatedContent });
      onUpdate({ ...feed, message: updatedContent });
      setShowEditModal(false);
    } catch (err) {
      console.error("Error updating feed:", err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await sendJsonRequest("/Feed/DeleteFeed", "DELETE", { feedId: feed.id });
        onDelete(feed);
      } catch (err) {
        console.error("Error deleting feed:", err);
      }
    }
  };

  const handleLike = async () => {
    try {
      await sendJsonRequest("/Feed/VotePost", "POST", { postId: feed.id, vote: !isLiked });
      setIsLiked(!isLiked);
      setLikesCount(prev => (isLiked ? prev - 1 : prev + 1));
    } catch (err) {
      console.error("Error voting post:", err);
    }
  };

    const handleShare = async (shareMessage: string) => {
    try {
        const response = await sendJsonRequest("/Feed/ShareFeed", "POST", {
        feedId: feed.id,
        message: shareMessage,
        });

        if (response?.feed?.id) {
        navigate(`/feed/${response.feed.id}`);  
        }

        setShowShareModal(false);
    } catch (err) {
        console.error("Error sharing feed:", err);
    }
    };

  const canEdit = feed.userId === currentUserId;
  const allowedUrls = [/^https?:\/\/.+/i];
  const OriginalPostCard = ({ originalPost }: { originalPost: any }) => (
    <div className="mt-2 border rounded bg-light p-2">
        <div className="d-flex gap-2">
        <ProfileAvatar size={28} avatarImage={originalPost.userAvatarImage} />
        <div>
            <strong>{originalPost.userName}</strong>
            <MarkdownRenderer content={originalPost.message} allowedUrls={allowedUrls} />
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

  return (
    <div className={`card shadow-sm border-0 rounded-4 ${isPinned ? 'border-warning border-2' : ''}`}>
      <div className="card-body">
        {/* Header */}

        <div className="d-flex justify-content-between align-items-start mb-3">
            
          <div className="d-flex align-items-center gap-3">
            <ProfileAvatar avatarImage={feed.userAvatarImage} size={42} />
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h6 className="fw-bold mb-0">{feed.userName || "Anonymous"}</h6>
                {feed.level > 0 && (
                  <span className="badge bg-warning text-dark">Level {feed.level}</span>
                )}
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
                  {feed.roles.map((role, i) => (
                    <span key={i} className="badge bg-success">{role}</span>
                  ))}
                </div>
              )}
            </div>
          </div>


          {canEdit && (
            <div className="dropdown">
              <button
                className="btn btn-sm btn-outline-secondary border-0"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <MoreHorizontal size={16} />
              </button>
              {showDropdown && (
                <div className="dropdown-menu show position-absolute end-0">
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
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mb-3">
          <MarkdownRenderer content={feed.message} allowedUrls={allowedUrls} />
            {isSharedPost && <OriginalPostCard originalPost={feed.originalPost} />}

        </div>

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
            className="btn btn-sm border-0 text-muted"
            onClick={() => setShowShareModal(true)}
          >
            <Share2 size={16} />
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
