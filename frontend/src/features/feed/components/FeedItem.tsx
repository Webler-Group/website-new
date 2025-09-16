import React, { useState, useCallback, useRef, useLayoutEffect } from 'react';
import { IFeed, OriginalPost, PostType } from './types';
import ProfileAvatar from "../../../components/ProfileAvatar";
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import { useNavigate } from "react-router-dom";
import ShareModal from './ShareModal';
import { useAuth } from '../../auth/context/authContext';
import NotificationToast from './comments/NotificationToast';
import { useApi } from '../../../context/apiCommunication';
import ReactionPicker from './ReactionPicker';
import { ReactionsEnum, reactionsInfo } from '../../../data/reactions';
import DateUtils from '../../../utils/DateUtils';
import EditModal from './EditModal';
import { FaClock, FaComment, FaMapPin, FaShareNodes, FaTrash } from 'react-icons/fa6';
import { FaEdit } from 'react-icons/fa';
import DeleteModal from './DeleteModal';
import PostAttachment from '../../discuss/components/PostAttachment';
import { Dropdown } from 'react-bootstrap';
import EllipsisDropdownToggle from '../../../components/EllipsisDropdownToggle';
import ProfileName from '../../../components/ProfileName';
import allowedUrls from '../../../data/discussAllowedUrls';

interface FeedItemProps {
  feed: IFeed;
  onCommentsClick?: (feedId: string) => void;
  onShowUserReactions?: (feedId: string) => void;
  onGeneralUpdate?: (feed: IFeed) => void;
  commentCount?: number;
  onDelete: (feed: IFeed) => void;
  onTogglePin?: (feed: IFeed) => void;
  showFullContent?: boolean;
  onShowFullContent?: (feedId: string) => void;
}

const OriginalPostCard = ({ originalPost }: { originalPost: OriginalPost }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/feed/${originalPost.id}`)}
      className="mt-2 border bg-light p-2 text-dark text-decoration-none mb-2"
      style={{ cursor: "pointer" }}
    >
      <div className='d-flex gap-2 align-items-center mb-2'>
        <ProfileAvatar size={28} avatarImage={originalPost.userAvatarImage} />
        <ProfileName userId={originalPost.userId} userName={originalPost.userName} />
        <span>wrote</span>
      </div>

      <div className='wb-feed-content__message'>
        <i>{originalPost.message}</i>
      </div>

      {/* {originalPost.tags?.length > 0 && (
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
      )} */}
    </div>
  );
};

const FeedItem = React.forwardRef<HTMLDivElement, FeedItemProps>(({
  feed,
  onCommentsClick,
  onShowFullContent,
  onShowUserReactions,
  onGeneralUpdate,
  commentCount,
  onDelete,
  onTogglePin,
  showFullContent = true
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

  const [needsTruncation, setNeedsTruncation] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  useLayoutEffect(() => {
    if (contentRef.current && !showFullContent) {
      const { scrollHeight, clientHeight } = contentRef.current;
      setNeedsTruncation(scrollHeight > clientHeight);
    } else {
      setNeedsTruncation(false);
    }
  }, [feed.message, feed.attachments, showFullContent]);

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

      if (result.vote === 1) {
        if (feed.isUpvoted && feed.reaction === reactionChange) {
          feed.totalReactions -= 1;
          feed.isUpvoted = false;
        } else if (!feed.isUpvoted) {
          feed.totalReactions += 1;
          feed.isUpvoted = true;
        }
      } else {
        if (feed.isUpvoted) {
          feed.totalReactions -= 1;
          feed.isUpvoted = false;
        }
      }

      onGeneralUpdate?.({ ...feed, reaction: reactionChange, votes, isUpvoted: result.vote, topReactions, totalReactions: feed.totalReactions });
    } else {
      showNotification("error", result.message);
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

  const handleShowFullContentClick = () => {
    onShowFullContent?.(feed.id);
  };

  const canEdit = feed.userId === currentUserId;

  const body = (
    <>
      <article className="wb-feed-item">
        <NotificationToast notification={notification} onClose={() => setNotification(null)} />

        {/* Header */}
        <div className="d-flex justify-content-between">
          <div className="d-flex align-items-start gap-2 flex-grow-1 min-w-0">
            <ProfileAvatar size={36} avatarImage={feed.userAvatarImage} />

            <div className='d-flex flex-column'>
              <div className='d-flex gap-2'>
                <ProfileName userId={feed.userId} userName={feed.userName} />

                {feed.isPinned && (
                  <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">
                    <FaMapPin className="me-1" />
                    Pinned
                  </span>
                )}
              </div>
              <div className="text-muted d-flex align-items-center gap-1 small">
                <FaClock />
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
                      <FaEdit /> Edit Post
                    </Dropdown.Item>
                    <Dropdown.Item
                      className="dropdown-item d-flex align-items-center gap-2 text-danger"
                      onClick={() => setShowDeleteModal(true)}
                    >
                      <FaTrash /> Delete Post
                    </Dropdown.Item>
                  </>
                )}
                {canModerate && (
                  <Dropdown.Item
                    className="dropdown-item d-flex align-items-center gap-2 text-warning"
                    onClick={() => handleTogglePin()}
                  >
                    <FaMapPin /> {feed.isPinned ? "Unpin Post" : "Pin Post"}
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>

        {/* Content */}
        {feed.type === PostType.SHARED_FEED && (
          feed.originalPost ? <OriginalPostCard originalPost={feed.originalPost} />
            :
            <div className="wb-feed-shared-post-unavailable">
              <FaComment className="mb-3 opacity-50" />
              <p className="mb-0 fw-medium text-muted">
                This shared post is no longer available
              </p>
            </div>
        )}

        <div
          ref={contentRef}
          className={`mt-2 wb-feed-content position-relative ${!showFullContent ? "truncated" : ""} ${!showFullContent && needsTruncation ? "clickable" : ""}`}
          onClick={!showFullContent && needsTruncation ? handleShowFullContentClick : undefined}
        >
          <div className="wb-feed-content__message" style={!showFullContent && needsTruncation ? { pointerEvents: "none" } : {}}>
            <MarkdownRenderer content={feed.message} allowedUrls={allowedUrls} />
          </div>

          {feed.attachments?.length > 0 && (
            <div className="mt-2 rounded text-dark text-decoration-none">
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
            </div>
          )}

          {!showFullContent && needsTruncation && <div className="fade-overlay"></div>}
        </div>

        {/* Reactions */}
        <div className="wb-feed-reactions mt-2 d-flex gap-1 align-items-center" onClick={handleShowUserReactions}>
          <div className='d-flex'>
            {feed.topReactions.map((r: any, index: number) => (
              <span
                className='bg-white rounded-circle'
                key={`${r.reaction}-${index}`}
                style={{
                  marginLeft: index === 0 ? "0" : "-6px",
                  zIndex: (feed.topReactions.length - index).toString()
                }}
              >
                {reactionsInfo[(r.reaction ?? ReactionsEnum.LIKE) as ReactionsEnum].emoji}
              </span>
            ))}
          </div>
          {feed.totalReactions > 0 && (
            <span className="text-muted">
              {feed.totalReactions}
            </span>
          )}
        </div>

        {/* {feed.tags?.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mt-2">
            {feed.tags.map(tag => (
              <span key={tag} className="badge bg-primary d-flex align-items-center gap-1">
                <FaTag /> {tag}
              </span>
            ))}
          </div>
        )} */}

        {/* Actions */}
        <div className="mt-3 d-flex align-items-center justify-content-between">

          <ReactionPicker onReactionChange={handleLike} currentState={feed.reaction} />

          <span className="wb-feed-action-btn" onClick={handleCommentsClick}>
            <FaComment />
            <span>{commentCount}</span>
            <span>
              {commentCount === 1 ? 'comment' : 'comments'}
            </span>
          </span>

          <span className="wb-feed-action-btn"
            onClick={() => {
              if (!userInfo) {
                navigate("/Users/Login");
                return;
              }
              setShowShareModal(true);
            }}
          >
            <FaShareNodes />
            <span>{feed.shares || 0}</span>
            <span>
              {feed.shares === 1 ? 'share' : 'shares'}
            </span>
          </span>
        </div>

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