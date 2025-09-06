import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Share2, MoreHorizontal, Edit, Trash2, Clock, Pin, MessageSquare, TagIcon } from 'lucide-react';
import { IFeed, PostType } from './types';
import ProfileAvatar from "../../../components/ProfileAvatar";
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import EditModal from './EditModal';
import { useNavigate, Link } from "react-router-dom";
import ShareModal from './ShareModal';
import { useAuth } from '../../auth/context/authContext';
import NotificationToast from './comments/NotificationToast';
import { useApi } from '../../../context/apiCommunication';
import ReactionPicker from './ReactionPicker';
import { ReactionsEnum, reactionsInfo } from '../../../data/reactions';
import DateUtils from '../../../utils/DateUtils';
import "./FeedItem.css"

interface FeedItemProps {
  feed: IFeed;
  onCommentsClick?: (feedId: string) => void;
  onShowUserReactions?: (feedId: string) => void;
  onGeneralUpdate?: (feed: IFeed) => void;
  commentCount?: number;
}

const FeedItem = React.forwardRef<HTMLDivElement, FeedItemProps>(({
  feed,
  onCommentsClick,
  onShowUserReactions,
  onGeneralUpdate,
  commentCount
}, ref) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { sendJsonRequest } = useApi();
  const { userInfo } = useAuth();
  const currentUserId = userInfo?.id;

  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const navigate = useNavigate();
  const canModerate = userInfo?.roles?.includes("Admin") || userInfo?.roles?.includes("Moderator");

  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [reaction, setReaction] = useState(feed.reaction ?? null);
  const [isPinned, setIsPinned] = useState(feed.isPinned || false);
  

  useEffect(() => {
    setIsPinned(feed.isPinned ?? false);
  }, [feed.isPinned]);

  useEffect(() => {
    setReaction(feed.reaction ?? null);
  }, [feed.reaction]);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const handleTogglePin = async () => {
    const prevPinned = isPinned;
    try {
      setIsPinned(!prevPinned);
      const result = await sendJsonRequest("/Feed/PinFeed", "POST", { feedId: feed.id });

      if (!result.success) throw new Error(result.message);

      const updatedFeed = { ...feed, isPinned: result.feed.isPinned };
      setIsPinned(result.feed.isPinned);
      onGeneralUpdate?.(updatedFeed);
      showNotification("success", result.feed.isPinned ? "Post pinned" : "Post unpinned");
    } catch (err) {
      setIsPinned(prevPinned);
      showNotification("error", err instanceof Error ? err.message : String(err));
    }
  }

  const handleEdit = async (updatedContent: string) => {
    try {
      const response = await sendJsonRequest("/Feed/EditFeed", "PUT", { feedId: feed.id, message: updatedContent });
      setShowEditModal(false);
      if (!response.success) throw new Error(response.message);
      onGeneralUpdate?.({ ...feed, message: updatedContent });
      showNotification("success", "Post updated successfully");
    } catch (err) {
      showNotification("error", err instanceof Error ? err.message : String(err));
    }
  }

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        const response = await sendJsonRequest("/Feed/DeleteFeed", "DELETE", { feedId: feed.id });
        if (!response.success) throw new Error(response.message);
        navigate("/feed")
        showNotification("success", "Post deleted successfully");
      } catch (err) {
        showNotification("error", err instanceof Error ? err.message : String(err));
      }
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

      if(previousReaction) {
        for (let i = 0; i < topReactions.length; ++i) {
          if (topReactions[i].reaction == previousReaction) {
            if(topReactions[i].count == 1) {
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
        if(idx == -1) {
          topReactions.push({ reaction: reactionChange, count: 1 });
        } else {
          while(idx > 0) {
            if(topReactions[idx - 1].count > topReactions[idx].count) {
              break;
            }
            [topReactions[idx], topReactions[idx - 1]] = [topReactions[idx - 1], topReactions[idx]];
            --idx;
          }
        }
      }

      setReaction(reactionChange);
      console.log(onGeneralUpdate)
      onGeneralUpdate?.({ ...feed, reaction: reactionChange, votes, isUpvoted: result.vote, topReactions, totalReactions: result.totalReactions });
    }
  }

  const handleShare = async (shareMessage: string, tags?: string[]) => {
    try {
      const response = await sendJsonRequest("/Feed/ShareFeed", "POST", { feedId: feed.id, message: shareMessage, ...(tags && { tags }) });
      if (!response.success) throw new Error(response.message);
      if (response?.feed?.id) navigate(`/feed/${response.feed.id}`);
      setShowShareModal(false);
      showNotification("success", "Post shared successfully");
    } catch (err) {
      showNotification("error", err instanceof Error ? err.message : String(err));
    }
  }

  const handleCommentsClick = () => {
    onCommentsClick?.(feed.id);
  }

  const handleShowUserReactions = () => {
    onShowUserReactions?.(feed.id);
  }

  const canEdit = feed.userId === currentUserId;
  const allowedUrls = [/^https?:\/\/.+/i, /^\/.*/];

  // close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown) {
        const target = event.target as Element;
        if (!target.closest('.dropdown')) setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

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

            <MarkdownRenderer content={originalPost.message} allowedUrls={allowedUrls} />

            {originalPost.tags?.length > 0 && (
              <div className="d-flex flex-wrap gap-1 mt-1">
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
  };

  const body = (
    <>
      <article className="feed-item">
        <NotificationToast notification={notification} onClose={() => setNotification(null)} />
        
        {/* Header */}
        <header className="feed-header">
          <div className="d-flex justify-content-between align-items-start">
            <div className="d-flex align-items-start gap-3 flex-grow-1 min-w-0">
              {feed.userAvatarImage ? (
                <ProfileAvatar size={44} avatarImage={feed.userAvatarImage} />
              ) : (
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" 
                  style={{ 
                    width: 44, 
                    height: 44, 
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    fontSize: '16px'
                  }}
                >
                  {feed.userName?.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
              
              <div className="flex-grow-1 min-w-0">
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <Link to={`/Profile/${feed.userId}`} className="author-name">
                    {feed.userName || "Anonymous"}
                  </Link>
                  
                  {isPinned && (
                    <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">
                      <Pin size={10} className="me-1" />
                      Pinned
                    </span>
                  )}
                  
                  {feed.type === PostType.SHARED_FEED && (
                    <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25">
                      <Share2 size={10} className="me-1" />
                      Shared
                    </span>
                  )}
                </div>
                
                <div className="post-meta d-flex align-items-center gap-1">
                  <Clock size={12} />
                  <time dateTime={feed.date}>
                    {DateUtils.format2(new Date(feed.date))}
                  </time>
                </div>
              </div>
            </div>

            {(canEdit || canModerate) && (
              <div className="dropdown position-relative">
                <button 
                  className="dropdown-toggle-btn"
                  onClick={() => setShowDropdown(!showDropdown)}
                  aria-label="Post options"
                >
                  <MoreHorizontal size={18} />
                </button>
                
                {showDropdown && (
                  <div className="custom-dropdown position-absolute end-0 mt-1">
                    {canEdit && (
                      <>
                        <button 
                          className="dropdown-item d-flex align-items-center gap-2"
                          onClick={() => { setShowEditModal(true); setShowDropdown(false); }}
                        >
                          <Edit size={14} /> Edit Post
                        </button>
                        <button 
                          className="dropdown-item d-flex align-items-center gap-2 text-danger"
                          onClick={() => { handleDelete(); setShowDropdown(false); }}
                        >
                          <Trash2 size={14} /> Delete Post
                        </button>
                      </>
                    )}
                    {canModerate && (
                      <button 
                        className="dropdown-item d-flex align-items-center gap-2 text-warning"
                        onClick={() => { handleTogglePin(); setShowDropdown(false); }}
                      >
                        <Pin size={14} /> {isPinned ? "Unpin Post" : "Pin Post"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="feed-content">
          <MarkdownRenderer content={feed.message} allowedUrls={allowedUrls} />
          
          {feed.type === PostType.SHARED_FEED && !feed.originalPost && (
            <div className="shared-post-unavailable">
              <MessageSquare size={24} className="mb-3 opacity-50" />
              <p className="mb-0 fw-medium text-muted">
                This shared post is no longer available
              </p>
            </div>
          )}

          {feed.type === PostType.SHARED_FEED && feed.originalPost && (
            <OriginalPostCard originalPost={feed.originalPost} />
          )}

        </div>

        {/* Reactions */}
        {feed.topReactions?.length > 0 && (
          <div className="px-3 px-sm-4">
            <div className="reactions-display" onClick={handleShowUserReactions}>
              <div className="d-flex">
                {feed.topReactions.map((r: any, index: number) => (
                  <span 
                    key={`${r.reaction}-${index}`} 
                    className="reaction-emoji"
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
                <span className="reaction-count">
                  {feed.totalReactions}
                </span>
              )}
            </div>

        {feed.tags?.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mt-3">
            {feed.tags.map(tag => (
              <span key={tag._id} className="badge bg-primary d-flex align-items-center gap-1">
                <TagIcon size={12} /> {tag.name}
              </span>
            ))}
          </div>
        )}
          </div>
        )}

        {/* Actions */}
        <footer className="feed-actions">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-1">
              <ReactionPicker onReactionChange={handleLike} currentState={reaction} />
              
              <button className="action-button" onClick={handleCommentsClick}>
                <MessageCircle size={16} />
                <span>{commentCount}</span>
                <span className="action-text">
                  {commentCount === 1 ? 'comment' : 'comments'}
                </span>
              </button>
            </div>
            
            <button 
              className="action-button" 
              onClick={() => setShowShareModal(true)}
            >
              <Share2 size={16} />
              <span>{feed.shares || 0}</span>
              <span className="action-text">
                {feed.shares === 1 ? 'share' : 'shares'}
              </span>
            </button>
          </div>
        </footer>

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
      </article>
    </>
  );

  return ref ? <div ref={ref}>{body}</div> : body;
});

FeedItem.displayName = 'FeedItem';
export default FeedItem;