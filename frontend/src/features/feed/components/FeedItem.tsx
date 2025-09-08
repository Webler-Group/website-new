import React, { useState, useCallback } from 'react';
import { IFeed, PostType } from './types';
import ProfileAvatar from "../../../components/ProfileAvatar";
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import { useNavigate, Link } from "react-router-dom";
import ShareModal from './ShareModal';
import { useAuth } from '../../auth/context/authContext';
import NotificationToast from './comments/NotificationToast';
import { useApi } from '../../../context/apiCommunication';
import ReactionPicker from './ReactionPicker';
import { ReactionsEnum, reactionsInfo } from '../../../data/reactions';
import DateUtils from '../../../utils/DateUtils';
import EditModal from './EditModal';
import { FaClock, FaComment, FaMapPin, FaShareNodes, FaTag, FaTrash } from 'react-icons/fa6';
import { FaEdit } from 'react-icons/fa';
import DeleteModal from './DeleteModal';
import PostAttachment from '../../discuss/components/PostAttachment';
import { Dropdown } from 'react-bootstrap';
import EllipsisDropdownToggle from '../../../components/EllipsisDropdownToggle';

const allowedUrls = [/^https?:\/\/.+/i, /^\/.*/];

interface FeedItemProps {
  feed: IFeed;
  onCommentsClick?: (feedId: string) => void;
  onShowUserReactions?: (feedId: string) => void;
  onGeneralUpdate?: (feed: IFeed) => void;
  commentCount?: number;
  onDelete: (feed: IFeed) => void;
  onTogglePin?: (feed: IFeed) => void;
}

const OriginalPostCard = ({ originalPost }: { originalPost: any }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/feed/${originalPost.id}`)}
      className="mt-2 border rounded bg-light p-2 d-block text-dark text-decoration-none"
      style={{ cursor: "pointer" }}
    >
      <div className="d-flex gap-2">
        <ProfileAvatar size={28} avatarImage={originalPost.userAvatarImage} />
        <div>
          {/* User profile link */}
          <strong>
            <Link
              to={`/Profile/${originalPost.userId}`}
              className="text-dark text-decoration-none"
              onClick={(e) => e.stopPropagation()} // prevent outer click from firing
            >
              {originalPost.userName}
            </Link>
          </strong> posted

          <div className='wb-feed-content__message'>
            <MarkdownRenderer content={originalPost.message} allowedUrls={allowedUrls} />
          </div>

          {originalPost.tags?.length > 0 && (
            <div className="d-flex flex-wrap gap-1 mt-1">
              {originalPost.tags.map((tag: any) => (
                <span
                  key={tag}
                  className="badge bg-info text-dark d-flex align-items-center gap-1"
                >
                  <FaTag size={12} /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FeedItem = React.forwardRef<HTMLDivElement, FeedItemProps>(({
  feed,
  onCommentsClick,
  onShowUserReactions,
  onGeneralUpdate,
  commentCount,
  onDelete,
  onTogglePin
}, ref) => {
  const { sendJsonRequest } = useApi();
  const { userInfo } = useAuth();
  const currentUserId = userInfo?.id;

  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const navigate = useNavigate();
  const canModerate = userInfo?.roles?.includes("Admin") || userInfo?.roles?.includes("Moderator");

  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const handleTogglePin = async () => {
    const result = await sendJsonRequest("/Feed/PinFeed", "POST", { feedId: feed.id, pinned: !feed.isPinned });
    if (result && result.success) {
      onTogglePin?.({ ...feed, isPinned: result.data.isPinned });
      showNotification("success", result.data.isPinned ? "Post pinned" : "Post unpinned");
    }
  }

  const handleEdit = async (updatedContent: string, tags: string[]) => {
    const result = await sendJsonRequest("/Feed/EditFeed", "PUT", { feedId: feed.id, message: updatedContent, tags });
    if (result && result.success) {
      onGeneralUpdate?.({ ...feed, message: result.data.message, tags: result.data.tags, attachments: result.data.attachments });
      showNotification("success", "Post updated successfully");
      setShowEditModal(false);
    } else {
      showNotification("error", result.message);
    }
  }

  const handleDelete = async () => {
    const result = await sendJsonRequest("/Feed/DeleteFeed", "DELETE", { feedId: feed.id });
    if (result && result.success) {
      onDelete(feed);
      navigate("/feed")
      showNotification("success", "Post deleted successfully");
    } else {
      showNotification("error", result.message);
    }
  }

  const handleLike = async (reactionChange: ReactionsEnum | null) => {
    const result = await sendJsonRequest("/Feed/VotePost", "POST", {
      postId: feed.id,
      vote: reactionChange != null,
      reaction: reactionChange
    });
    if (result && result.success) {
      const votes = feed.votes + (feed.isUpvoted != result.vote ? result.vote ? 1 : -1 : 0);

      let topReactions = [...feed.topReactions];
      const previousReaction = feed.reaction;

      if (previousReaction) {
        for (let i = 0; i < topReactions.length; ++i) {
          if (topReactions[i].reaction == previousReaction) {
            if (topReactions[i].count == 1) {
              topReactions.splice(i, 1);
            } else {
              --topReactions[i].count;
            }
            break;
          }
        }
      }

      if (reactionChange) {
        let idx = -1;
        for (let i = 0; i < topReactions.length; ++i) {
          if (topReactions[i].reaction == reactionChange) {
            ++topReactions[i].count;
            idx = i;
            break;
          }
        }
        if (idx == -1) {
          topReactions.push({ reaction: reactionChange, count: 1 });
        } else {
          while (idx > 0) {
            if (topReactions[idx - 1].count > topReactions[idx].count) {
              break;
            }
            [topReactions[idx], topReactions[idx - 1]] = [topReactions[idx - 1], topReactions[idx]];
            --idx;
          }
        }
      }

      onGeneralUpdate?.({ ...feed, reaction: reactionChange, votes, isUpvoted: result.vote, topReactions, totalReactions: result.totalReactions });
    }
  }

  const handleShare = async (shareMessage: string, tags?: string[]) => {
    const result = await sendJsonRequest("/Feed/ShareFeed", "POST", { feedId: feed.id, message: shareMessage, tags });
    if (result && result.success) {
      navigate(`/feed/${result.feed.id}`);
      setShowShareModal(false);
      showNotification("success", "Post shared successfully");
    }
  }

  const handleCommentsClick = () => {
    onCommentsClick?.(feed.id);
  }

  const handleShowUserReactions = () => {
    onShowUserReactions?.(feed.id);
  }

  const canEdit = feed.userId === currentUserId;

  const body = (
    <>
      <article className="wb-feed-item">
        <NotificationToast notification={notification} onClose={() => setNotification(null)} />

        {/* Header */}
        <header className="wb-feed-header">
          <div className="d-flex justify-content-between align-items-start">
            <div className="d-flex align-items-start gap-3 flex-grow-1 min-w-0">
              <ProfileAvatar size={44} avatarImage={feed.userAvatarImage} />

              <div className="flex-grow-1 min-w-0">
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <Link to={`/Profile/${feed.userId}`} className="wb-feed-author-name">
                    {feed.userName || "Anonymous"}
                  </Link>

                  {feed.isPinned && (
                    <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">
                      <FaMapPin size={10} className="me-1" />
                      Pinned
                    </span>
                  )}

                  {feed.type === PostType.SHARED_FEED && (
                    <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25">
                      <FaShareNodes size={10} className="me-1" />
                      Shared
                    </span>
                  )}
                </div>

                <div className="wb-feed-post-meta d-flex align-items-center gap-1">
                  <FaClock size={12} />
                  <time dateTime={feed.date}>
                    {DateUtils.format2(new Date(feed.date))}
                  </time>
                </div>
              </div>
            </div>

            {(canEdit || canModerate) && (
              <Dropdown>
                <Dropdown.Toggle as={EllipsisDropdownToggle}></Dropdown.Toggle>
                <Dropdown.Menu style={{ width: "200px" }}>
                  {canEdit && (
                    <>
                      <Dropdown.Item
                        className="dropdown-item d-flex align-items-center gap-2"
                        onClick={() => setShowEditModal(true)}
                      >
                        <FaEdit size={14} /> Edit Post
                      </Dropdown.Item>
                      <Dropdown.Item
                        className="dropdown-item d-flex align-items-center gap-2 text-danger"
                        onClick={() => setShowDeleteModal(true)}
                      >
                        <FaTrash size={14} /> Delete Post
                      </Dropdown.Item>
                    </>
                  )}
                  {canModerate && (
                    <Dropdown.Item
                      className="dropdown-item d-flex align-items-center gap-2 text-warning"
                      onClick={() => handleTogglePin()}
                    >
                      <FaMapPin size={14} /> {feed.isPinned ? "Unpin Post" : "Pin Post"}
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              </Dropdown>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="wb-feed-content">
          <div className='wb-feed-content__message'>
            <MarkdownRenderer content={feed.message} allowedUrls={allowedUrls} />
          </div>

          {feed.attachments?.length > 0 && (
            <div className="mt-2 rounded text-dark text-decoration-none">
              <div className="d-flex flex-column gap-2">
                {feed.attachments.map(data => (
                  <div key={data.id} className='mt-1'>
                    <PostAttachment data={data} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {feed.type === PostType.SHARED_FEED && (
            feed.originalPost ? <OriginalPostCard originalPost={feed.originalPost} />
              :
              <div className="wb-feed-shared-post-unavailable">
                <FaComment size={24} className="mb-3 opacity-50" />
                <p className="mb-0 fw-medium text-muted">
                  This shared post is no longer available
                </p>
              </div>
          )}

          {feed.tags?.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mt-3">
              {feed.tags.map(tag => (
                <span key={tag} className="badge bg-primary d-flex align-items-center gap-1">
                  <FaTag size={12} /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Reactions */}
        {feed.topReactions?.length > 0 && (
          <div className="px-3 px-sm-4">
            <div className="wb-feed-reactions-display" onClick={handleShowUserReactions}>
              <div className="d-flex">
                {feed.topReactions.map((r: any, index: number) => (
                  <span
                    key={`${r.reaction}-${index}`}
                    className="wb-feed-reaction-emoji"
                    style={{
                      marginLeft: index === 0 ? 0 : -2,
                      zIndex: feed.topReactions.length - index
                    }}
                  >
                    {reactionsInfo[(r.reaction ?? ReactionsEnum.LIKE) as ReactionsEnum].emoji}
                  </span>
                ))}
              </div>
              {feed.totalReactions > 0 && (
                <span className="wb-feed-reaction-count">
                  {feed.totalReactions}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <footer className="wb-feed-actions">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-1">
              <ReactionPicker onReactionChange={handleLike} currentState={feed.reaction} />

              <button className="wb-feed-action-button" onClick={handleCommentsClick}>
                <FaComment size={16} />
                <span>{commentCount}</span>
                <span className="wb-feed-action-text">
                  {commentCount === 1 ? 'comment' : 'comments'}
                </span>
              </button>
            </div>

            <button
              className="wb-feed-action-button"
              onClick={() => {
                if (!userInfo) {
                  navigate("/Users/Login");
                  return;
                }
                setShowShareModal(true);
              }}
            >
              <FaShareNodes size={16} />
              <span>{feed.shares || 0}</span>
              <span className="wb-feed-action-text">
                {feed.shares === 1 ? 'share' : 'shares'}
              </span>
            </button>
          </div>
        </footer>

        {showEditModal && (
          <EditModal
            feed={feed}
            onSave={handleEdit}
            onClose={() => setShowEditModal(false)}
          />
        )}

        {showDeleteModal && (
          <DeleteModal
            onConfirm={handleDelete}
            onClose={() => setShowDeleteModal(false)}
          />
        )}

        {showShareModal && (
          <ShareModal
            feedId={feed.id}
            onShare={handleShare}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </article>
    </>
  );

  return ref ? <div ref={ref}>{body}</div> : body;
});

FeedItem.displayName = 'FeedItem';
export default FeedItem;