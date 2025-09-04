import React, { useState } from 'react';
import { MessageCircle, Heart, Share2, Pin, MoreHorizontal, Edit, Trash2, Clock, Tag as TagIcon } from 'lucide-react';
import { IFeed, PostType, ReactionChange, ReactionName } from './types';
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
import ReactionPicker from './ReactionPicker';
import { validReactions } from './types';

interface FeedItemProps {
  feed: IFeed;
  onUpdate?: (feed: IFeed) => void;
  onDelete?: (feed: IFeed) => void;
  onCommentsClick?: (feedId: string) => void;
  isPinned?: boolean;
  showFullContent?: boolean;
  currentUserId?: string;
  sendJsonRequest?: (url: string, method: string, reqBody?: any) => Promise<any>;
}

const FeedItem = React.forwardRef<HTMLDivElement, FeedItemProps>(({
  feed,
  onUpdate,
  onCommentsClick,
  isPinned = false,
  showFullContent = false,
  currentUserId: propCurrentUserId,
  sendJsonRequest: propSendJsonRequest,
  onDelete
}, ref) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLiked, setIsLiked] = useState(feed.isUpvoted || false);
  const [likesCount, setLikesCount] = useState(feed.votes || 0);
  
  const isListView = !propCurrentUserId && !propSendJsonRequest;
  
  const { sendJsonRequest: hookSendJsonRequest } = isListView ? useApi() : { sendJsonRequest: null };
  const { userInfo } = isListView ? useAuth() : { userInfo: null };
  
  const sendJsonRequest = propSendJsonRequest || hookSendJsonRequest;
  const currentUserId = propCurrentUserId || userInfo?.id;

  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [totalReactions, setTotalReactions] = useState<number>(feed.totalReactions || {});
  const [topReactions, setTopReactions] = useState<any>(feed.topReactions || []);

  const navigate = useNavigate();
  
  const canModerate = userInfo?.roles?.includes("Admin") || userInfo?.roles?.includes("Moderator");
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const reactions = {
    [validReactions.LIKE]: "👍",
    [validReactions.LOVE]: "❤️",
    [validReactions.HAHA]: "😂",
    [validReactions.WOW]: "😮",
    [validReactions.SAD]: "😢",
    [validReactions.ANGRY]: "😡"
  };

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
          (onDelete as (() => void))?.();
        }
      } catch (err) {
        console.error("Error deleting feed:", err);
        showNotification("error", String(err));
      }
    }
  };

  const handleLike = async (reaction: ReactionChange) => {
    if (!sendJsonRequest) return;
    try {
      // Optimistic update
      const newIsLiked = reaction.hasVoted;
      const newLikesCount = isLiked ? likesCount - 1 : likesCount + 1;
      setIsLiked(newIsLiked);
      setLikesCount(newLikesCount);

      const response = await sendJsonRequest("/Feed/VotePost", "POST", { postId: feed.id, vote: newIsLiked, reaction: reaction.currentReaction });
      if (!response.success) {
        throw new Error(response.message);
      }
      setTotalReactions(response.reactionSummary.totalReactions || 0);
      setTopReactions(response.reactionSummary.topReactions || []);
      onUpdate?.({ ...feed, isUpvoted: newIsLiked, votes: newLikesCount, reaction: reaction.currentReaction ?? null, totalReactions: response.reactionSummary.totalReactions, topReactions: response.reactionSummary.topReactions });
    } catch (err) {
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
      className="mt-3 border rounded-3 bg-light p-3 text-dark text-decoration-none position-relative overflow-hidden"
      style={{ 
        cursor: "pointer",
        transition: "all 0.2s ease",
        borderLeft: "4px solid #0d6efd"
      }}
    >
      <div className="d-flex gap-3">
        <ProfileAvatar size={32} avatarImage={originalPost.userAvatarImage} />
        <div className="flex-grow-1 min-w-0">
          <div className="d-flex align-items-center gap-2 mb-2">
            <strong className="text-truncate">
              <Link
                to={`/Profile/${originalPost.userId}`}
                className="text-dark text-decoration-none"
                onClick={(e) => e.stopPropagation()}
              >
                {originalPost.userName}
              </Link>
            </strong>
            <small className="text-muted">posted</small>
          </div>
          
          <div className="mb-2">
            <MarkdownRenderer content={originalPost.message} allowedUrls={allowedUrls} />
          </div>

          {originalPost.tags?.length > 0 && (
            <div className="d-flex flex-wrap gap-1">
              {originalPost.tags.map((tag: any) => (
                <span
                  key={tag._id}
                  className="badge bg-info bg-opacity-25 text-info border border-info border-opacity-25 d-flex align-items-center gap-1"
                  style={{ fontSize: "0.7rem" }}
                >
                  <TagIcon size={10} /> {tag.name}
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
      return <ProfileAvatar size={48} avatarImage={feed.userAvatarImage} />;
    }
    return (
      <div 
        className="rounded-circle bg-gradient d-flex align-items-center justify-content-center text-white fw-bold shadow-sm" 
        style={{ 
          width: 48, 
          height: 48,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        }}
      >
        {feed.userName?.charAt(0).toUpperCase() || 'A'}
      </div>
    );
  };

  const body = (
    <div 
      className={`card shadow-sm border-0 rounded-4 overflow-hidden ${isPinned ? 'border-warning border-2' : ''} ${isListView ? 'mb-3' : 'mb-4'}`}
      style={{
        transition: "all 0.2s ease",
        ...(isPinned && {
          background: "linear-gradient(135deg, #fff9e6 0%, #ffffff 100%)",
          boxShadow: "0 4px 12px rgba(255, 193, 7, 0.15)"
        })
      }}
    >
      <NotificationToast
        notification={notification}
        onClose={() => setNotification(null)}
      />
      
      <div className="card-body p-4">
        {/* Header Section */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="d-flex gap-3 flex-grow-1 min-w-0">
            {renderUserAvatar()}
            <div className="flex-grow-1 min-w-0">
              {/* User Info Row */}
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <h6 className="fw-bold mb-0 text-truncate">
                  <Link
                    to={`/Profile/${feed.userId}`}
                    className="text-primary text-decoration-none"
                  >
                    {feed.userName || "Anonymous"}
                  </Link>
                </h6>
                
                {feed.type === PostType.SHARED_FEED && (
                  <span className="badge bg-info bg-opacity-25 text-info border border-info border-opacity-25">
                    <Share2 size={10} className="me-1" />
                    shared
                  </span>
                )}
                
                {(isPinned || feed.isPinned) && (
                  <span className="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-25">
                    <Pin size={10} className="me-1" />
                    pinned
                  </span>
                )}
              </div>
              
              <div className="d-flex align-items-center gap-3 text-muted">
                <small className="d-flex align-items-center gap-1">
                  <Clock size={12} /> 
                  {feed.date ? formatDate(feed.date) : "Recently"}
                </small>
                
                {/* {feed.roles?.length > 0 && feed.level && feed.level > 0 && (
                  <small className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25">
                    Level {feed.level}
                  </small>
                )}
                {feed.roles?.slice(1).map((role, i) => (
                  <small key={i} className="badge bg-secondary bg-opacity-25 text-secondary border border-secondary border-opacity-25">
                    {role}
                  </small>
                ))}  */}
              </div>
            </div>
          </div>

          {/* Actions Dropdown */}
          {(canEdit || canModerate) && (
            <div className="dropdown flex-shrink-0">
              <button
                className="btn btn-light btn-sm rounded-circle border-0 d-flex align-items-center justify-content-center"
                style={{ width: 32, height: 32 }}
                onClick={() => setShowDropdown(!showDropdown)}
                {...(!isListView && { 'data-bs-toggle': 'dropdown', 'aria-expanded': 'false' })}
              >
                <MoreHorizontal size={16} />
              </button>
              
              {isListView ? (
                showDropdown && (
                  <div className="dropdown-menu show position-absolute end-0 shadow border-0 rounded-3">
                    {canEdit && (
                      <>
                        <button
                          className="dropdown-item d-flex align-items-center gap-2 rounded-2"
                          onClick={() => {
                            setShowEditModal(true);
                            setShowDropdown(false);
                          }}
                        >
                          <Edit size={14} />
                          Edit Post
                        </button>
                        <button
                          className="dropdown-item d-flex align-items-center gap-2 text-danger rounded-2"
                          onClick={() => {
                            handleDelete();
                            setShowDropdown(false);
                          }}
                        >
                          <Trash2 size={14} />
                          Delete Post
                        </button>
                      </>
                    )}

                    {canModerate && (
                      <>
                        {canEdit && <hr className="my-1" />}
                        <button
                          className="dropdown-item d-flex align-items-center gap-2 rounded-2"
                          onClick={handlePinToggle}
                        >
                          <Pin size={14} />
                          {feed.isPinned ? "Unpin Post" : "Pin Post"}
                        </button>
                      </>
                    )}
                  </div>
                )
              ) : (
                <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-3">
                  <li>
                    <button 
                      className="dropdown-item d-flex align-items-center gap-2 rounded-2" 
                      onClick={() => setShowEditModal(true)}
                    >
                      <Edit size={14} /> Edit Post
                    </button>
                  </li>
                  <li>
                    <button 
                      className="dropdown-item text-danger d-flex align-items-center gap-2 rounded-2" 
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

        {/* Main Content Section */}
        <div className="mb-3">
          <div className="content-wrapper">
            <MarkdownRenderer content={feed.message} allowedUrls={allowedUrls} />
          </div>
          
          {feed.type === PostType.SHARED_FEED && !feed.originalPost && (
            <div
              className="alert alert-light border border-danger border-opacity-25 mt-3 text-center py-4"
              role="alert"
              style={{
                borderRadius: "12px",
                backgroundColor: "#fef7f7"
              }}
            >
              <div className="text-muted">
                <MessageSquare size={24} className="mb-2 opacity-50" />
                <p className="mb-0 fw-medium">This shared post is no longer available</p>
              </div>
            </div>
          )}
          
          {feed.type === PostType.SHARED_FEED && feed.originalPost && (
            <OriginalPostCard originalPost={feed.originalPost} />
          )}
        </div>

        {/* Tags Section */}
        {feed.tags?.length > 0 && (
          <div className="mb-3">
            <div className="d-flex flex-wrap gap-2">
              {feed.tags.map((tag: any) => (
                <span 
                  key={tag._id} 
                  className="badge bg-primary bg-opacity-15 border border-primary border-opacity-25 d-flex align-items-center gap-1"
                  style={{ 
                    fontSize: "0.75rem",
                    padding: "0.375rem 0.75rem",
                    borderRadius: "20px"
                  }}
                >
                  <TagIcon size={11} /> 
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Attachments Section */}
        {feed.attachments?.length > 0 && (
          <div className="mb-3">
            <div className="d-flex flex-column gap-2">
              {feed.attachments.map(att => {
                let icon = null;
                let title = "";
                let subtitle = "";
                let to = "#";
                let bgColor = "";
                let textColor = "";
                let info = "";

                switch (att.type) {
                  case 1: // Code
                    icon = <FileCode size={18} color="#0d6efd" strokeWidth={2} />;
                    title = att.codeName || "Untitled Code";
                    subtitle = `${att.codeLanguage} • by ${att.userName}`;
                    to = `/Compiler-Playground/${att.codeId}`;
                    bgColor = "bg-primary";
                    info = "code";
                    break;

                  case 2: // Question / Discussion
                    icon = <MessageSquare size={18} />;
                    title = att.questionTitle || "Question";
                    subtitle = `by ${att.userName}`;
                    to = `/Discuss/${att.questionId}`;
                    bgColor = "bg-success";
                    textColor = "text-success";
                    info = "question";
                    break;

                  case 4: // Feed
                    icon = <Link2 size={18} />;
                    title = "Shared Post";
                    subtitle = `${att.userName}: ${att.feedMessage?.substring(0, 50)}${att.feedMessage?.length > 50 ? '...' : ''}`;
                    to = `/feed/${att.feedId}`;
                    bgColor = "bg-info";
                    textColor = "text-info";
                    info = "post";
                    break;

                  default:
                    return null;
                }

                return (
                  <Link
                    key={att.id}
                    to={to}
                    className="d-flex align-items-center gap-3 p-3 border rounded-3 bg-white text-decoration-none shadow-sm position-relative overflow-hidden"
                    style={{
                      transition: "all 0.2s ease",
                      borderLeft: `4px solid var(--bs-${bgColor.split('-')[1]})`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
                    }}
                  >
                  <div className="d-flex justify-content-between align-items-start flex-grow-1 min-w-0">
                    <div className="min-w-0">
                      <h6 className="fw-semibold mb-1 text-truncate text-dark bold">
                        {title}
                      </h6>
                      <small className="text-muted d-block text-truncate">
                        {subtitle}
                      </small>
                    </div>
                    <span 
                      className="ms-2"
                      style={{ fontWeight: "light", color: "midnightblue", fontSize: "0.75rem" }}
                    >
                      {info}
                    </span>
                  </div>

                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Reactions Summary */}
        {topReactions?.length > 0 && (
          <div className="mb-3">
            <div className="d-flex align-items-center gap-2 p-2 bg-light rounded-3">
              <div className="d-flex align-items-center gap-1">
                {topReactions.map((r: ReactionName) => (
                  <span 
                    key={r.reaction} 
                    className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white shadow-sm"
                    style={{ width: 28, height: 28, fontSize: "0.9rem" }}
                  >
                    {reactions[r.reaction]}
                  </span>
                ))}
              </div>
              {totalReactions > 0 && (
                <small className="text-muted fw-medium ms-1">
                  {totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}
                </small>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="border-top pt-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-1">
              <ReactionPicker 
                onReactionChange={(reaction) => { handleLike(reaction) }} 
                currentState={{ reaction: feed.reaction }} 
              />
              
              <button
                className="btn btn-light btn-sm border-0 d-flex align-items-center gap-2 rounded-pill px-3"
                onClick={() => onCommentsClick?.(feed.id)}
                style={{ 
                  transition: "all 0.2s ease",
                  backgroundColor: "transparent"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <MessageCircle size={16} />
                <span className="fw-medium">{feed.answers || 0}</span>
                <small className="text-muted d-none d-sm-inline">
                  {feed.answers === 1 ? 'comment' : 'comments'}
                </small>
              </button>
            </div>

            <button
              className="btn btn-light btn-sm border-0 d-flex align-items-center gap-2 rounded-pill px-3"
              onClick={() => setShowShareModal(true)}
              style={{ 
                transition: "all 0.2s ease",
                backgroundColor: "transparent"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f8f9fa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Share2 size={16} />
              <span className="fw-medium">{feed.shares || 0}</span>
              <small className="text-muted d-none d-sm-inline">
                {feed.shares === 1 ? 'share' : 'shares'}
              </small>
            </button>
          </div>
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