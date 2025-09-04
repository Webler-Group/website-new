import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Share2, MoreHorizontal, Edit, Trash2, Clock, Tag as TagIcon, Pin, MessageSquare } from 'lucide-react';
import { IFeed, PostType, ReactionChange, ReactionName } from './types';
import ProfileAvatar from "../../../components/ProfileAvatar";
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import EditModal from './EditModal';
import { useNavigate, Link } from "react-router-dom";
import ShareModal from './ShareModal';
import { useAuth } from '../../auth/context/authContext';
import NotificationToast from './comments/NotificationToast';
import { useApi } from '../../../context/apiCommunication';
import ReactionPicker from './ReactionPicker';
import { validReactions } from './types';

interface FeedItemProps {
  feed: IFeed;
  onUpdate?: (feed: IFeed) => void;
  onDelete?: (feed: IFeed) => void;
  onCommentsClick?: (feedId: string) => void;
  showFullContent?: boolean;
}

const FeedItem = React.forwardRef<HTMLDivElement, FeedItemProps>(({
  feed,
  onUpdate,
  onDelete,
  onCommentsClick,
  showFullContent = false
}, ref) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLiked, setIsLiked] = useState(feed.isUpvoted || false);
  const [likesCount, setLikesCount] = useState(feed.votes || 0);

  const { sendJsonRequest } = useApi();
  const { userInfo } = useAuth();
  const currentUserId = userInfo?.id;

  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [totalReactions, setTotalReactions] = useState<number>(feed.totalReactions || 0);
  const [topReactions, setTopReactions] = useState<ReactionName[]>(feed.topReactions || []);

  const navigate = useNavigate();
  const canModerate = userInfo?.roles?.includes("Admin") || userInfo?.roles?.includes("Moderator");

  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [reaction, setReaction] = useState(feed.reaction ?? validReactions.NONE);
  const [isPinned, setIsPinned] = useState(feed.isPinned || false);

  useEffect(() => {
    setIsPinned(feed.isPinned || false);
  }, [feed.isPinned]);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const handleTogglePin = useCallback(async () => {
    if (!sendJsonRequest) return;
    const prevPinned = isPinned;
    try {
      setIsPinned(!prevPinned);
      const response = await sendJsonRequest("/Feed/PinFeed", "POST", { feedId: feed.id });
      console.log(response)
      
      if (!response.success) throw new Error(response.message);

      const updatedFeed = { ...feed, isPinned: response.feed.isPinned };
      setIsPinned(response.feed.isPinned);
      onUpdate?.(updatedFeed);
      showNotification("success", response.feed.isPinned ? "Post pinned" : "Post unpinned");
    } catch (err) {
      setIsPinned(prevPinned);
      showNotification("error", err instanceof Error ? err.message : String(err));
    }
  }, [sendJsonRequest, feed, isPinned, onUpdate, showNotification]);

  const reactions = {
    [validReactions.LIKE]: "👍",
    [validReactions.LOVE]: "❤️",
    [validReactions.HAHA]: "😂",
    [validReactions.WOW]: "😮",
    [validReactions.SAD]: "😢",
    [validReactions.ANGRY]: "😡",
    [validReactions.NONE]: null,
  };

  useEffect(() => {
    setTotalReactions(feed.totalReactions || 0);
    setTopReactions(feed.topReactions || []);
    setReaction(feed.reaction ?? validReactions.NONE);
    setIsLiked(feed.isUpvoted || false);
    setLikesCount(feed.votes || 0);
  }, [feed]);

  const handleEdit = useCallback(async (updatedContent: string) => {
    if (!sendJsonRequest) return;
    try {
      const response = await sendJsonRequest("/Feed/EditFeed", "PUT", { feedId: feed.id, message: updatedContent });
      setShowEditModal(false);
      if (!response.success) throw new Error(response.message);
      onUpdate?.({ ...feed, message: updatedContent });
      showNotification("success", "Post updated successfully");
    } catch (err) {
      showNotification("error", err instanceof Error ? err.message : String(err));
    }
  }, [sendJsonRequest, feed, onUpdate, showNotification]);

  const handleDelete = useCallback(async () => {
    if (!sendJsonRequest) return;
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        const response = await sendJsonRequest("/Feed/DeleteFeed", "DELETE", { feedId: feed.id });
        if (!response.success) throw new Error(response.message);
        onDelete?.(feed);
        showNotification("success", "Post deleted successfully");
      } catch (err) {
        showNotification("error", err instanceof Error ? err.message : String(err));
      }
    }
  }, [sendJsonRequest, feed, onDelete, showNotification]);

  const handleLike = useCallback(async (reactionChange: ReactionChange) => {
    if (!sendJsonRequest) return;

    const prevIsLiked = isLiked;
    const prevLikesCount = likesCount;
    const prevReaction = reaction;
    const prevTotalReactions = totalReactions;
    const prevTopReactions = topReactions;

    try {
      const newIsLiked = reactionChange.hasVoted;
      const newLikesCount = prevIsLiked ? likesCount - 1 : likesCount + 1;
      setIsLiked(newIsLiked);
      setLikesCount(newLikesCount);
      setReaction(reactionChange.currentReaction ?? validReactions.NONE);

      const response = await sendJsonRequest("/Feed/VotePost", "POST", {
        postId: feed.id,
        vote: newIsLiked,
        reaction: reactionChange.currentReaction
      });
      if (!response.success) throw new Error(response.message);

      setTotalReactions(response.reactionSummary?.totalReactions || 0);
      setTopReactions(response.reactionSummary?.topReactions || []);

      onUpdate?.({ ...feed, isUpvoted: newIsLiked, votes: newLikesCount, reaction: reactionChange.currentReaction ?? null });
    } catch (err) {
      setIsLiked(prevIsLiked);
      setLikesCount(prevLikesCount);
      setReaction(prevReaction);
      setTotalReactions(prevTotalReactions);
      setTopReactions(prevTopReactions);
      showNotification("error", err instanceof Error ? err.message : String(err));
    }
  }, [sendJsonRequest, feed, isLiked, likesCount, reaction, totalReactions, topReactions, onUpdate, showNotification]);

  const handleShare = useCallback(async (shareMessage: string, tags?: string[]) => {
    if (!sendJsonRequest) return;
    try {
      const response = await sendJsonRequest("/Feed/ShareFeed", "POST", { feedId: feed.id, message: shareMessage, ...(tags && { tags }) });
      if (!response.success) throw new Error(response.message);
      if (response?.feed?.id) navigate(`/feed/${response.feed.id}`);
      setShowShareModal(false);
      showNotification("success", "Post shared successfully");
    } catch (err) {
      showNotification("error", err instanceof Error ? err.message : String(err));
    }
  }, [sendJsonRequest, feed.id, navigate, showNotification]);

  const handleCommentsClick = useCallback(() => {
    onCommentsClick?.(feed.id);
  }, [onCommentsClick, feed.id]);

  const canEdit = feed.userId === currentUserId;
  const allowedUrls = [/^https?:\/\/.+/i, /^\/.*/];

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }, []);

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

  const body = (
    <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-3">
      <NotificationToast notification={notification} onClose={() => setNotification(null)} />
      <div className="card-body p-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="d-flex gap-3 flex-grow-1 min-w-0">
            {feed.userAvatarImage ? (
              <ProfileAvatar size={48} avatarImage={feed.userAvatarImage} />
            ) : (
              <div className="rounded-circle bg-gradient d-flex align-items-center justify-content-center text-white fw-bold shadow-sm" style={{ width: 48, height: 48, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                {feed.userName?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
            <div className="flex-grow-1 min-w-0">
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <h6 className="fw-bold mb-0 text-truncate">
                  <Link to={`/Profile/${feed.userId}`} className="text-primary text-decoration-none">
                    {feed.userName || "Anonymous"}
                  </Link>
                </h6>
                {isPinned && (<span className="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-25"><Pin size={10} className="me-1" />Pinned</span>)}
                {feed.type === PostType.SHARED_FEED && (<span className="badge bg-info bg-opacity-25 text-info border border-info border-opacity-25"><Share2 size={10} className="me-1" />shared</span>)}
              </div>
              <div className="d-flex align-items-center gap-3 text-muted">
                <small className="d-flex align-items-center gap-1"><Clock size={12} />{feed.date ? formatDate(feed.date) : "Recently"}</small>
              </div>
            </div>
          </div>

          {(canEdit || canModerate) && (
            <div className="dropdown flex-shrink-0">
              <button className="btn btn-light btn-sm rounded-circle border-0 d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }} onClick={() => setShowDropdown(!showDropdown)}>
                <MoreHorizontal size={16} />
              </button>
              {showDropdown && (
                <div className="dropdown-menu show position-absolute end-0 shadow border-0 rounded-3">
                  {canEdit && (
                    <>
                      <button className="dropdown-item d-flex align-items-center gap-2 rounded-2" onClick={() => { setShowEditModal(true); setShowDropdown(false); }}>
                        <Edit size={14} /> Edit Post
                      </button>
                      <button className="dropdown-item d-flex align-items-center gap-2 text-danger rounded-2" onClick={() => { handleDelete(); setShowDropdown(false); }}>
                        <Trash2 size={14} /> Delete Post
                      </button>
                    </>
                  )}
                  {canModerate && (
                    <button className="dropdown-item d-flex align-items-center gap-2 text-warning rounded-2" onClick={() => { handleTogglePin(); setShowDropdown(false); }}>
                      <Pin size={14} /> {isPinned ? "Unpin Post" : "Pin Post"}
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
          {feed.type === PostType.SHARED_FEED && !feed.originalPost && (
            <div className="alert alert-light border border-danger border-opacity-25 mt-3 text-center py-4" style={{ borderRadius: "12px", backgroundColor: "#fef7f7" }}>
              <div className="text-muted"><MessageSquare size={24} className="mb-2 opacity-50" /><p className="mb-0 fw-medium">This shared post is no longer available</p></div>
            </div>
          )}
        </div>

        {/* Reactions */}
        {topReactions?.length > 0 && (
          <div className="mb-2 d-flex align-items-center">
            <div className="d-flex" style={{ marginRight: 6 }}>
              {topReactions.map((r: ReactionName, index: number) => (
                <span key={`${r.reaction}-${index}`} style={{ fontSize: "1rem", marginLeft: index === 0 ? 0 : -6, zIndex: topReactions.length - index }}>{reactions[r.reaction]}</span>
              ))}
            </div>
            {totalReactions > 0 && (<small className="text-muted fw-medium">{totalReactions}</small>)}
          </div>
        )}

        {/* Actions */}
        <div className="border-top pt-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-1">
              <ReactionPicker onReactionChange={handleLike} currentState={{ reaction: reaction }} />
              <button className="btn btn-light btn-sm border-0 d-flex align-items-center gap-2 rounded-pill px-3" onClick={handleCommentsClick}>
                <MessageCircle size={16} /><span className="fw-medium">{feed.answers || 0}</span>
                <small className="text-muted d-none d-sm-inline">{feed.answers === 1 ? 'comment' : 'comments'}</small>
              </button>
            </div>
            <button className="btn btn-light btn-sm border-0 d-flex align-items-center gap-2 rounded-pill px-3" onClick={() => setShowShareModal(true)}>
              <Share2 size={16} /><span className="fw-medium">{feed.shares || 0}</span>
              <small className="text-muted d-none d-sm-inline">{feed.shares === 1 ? 'share' : 'shares'}</small>
            </button>
          </div>
        </div>
      </div>

      {showEditModal && (<EditModal initialContent={feed.message} onSave={handleEdit} onClose={() => setShowEditModal(false)} />)}
      {showShareModal && (<ShareModal feedId={feed.id} onShare={handleShare} onClose={() => setShowShareModal(false)} />)}
    </div>
  );

  return ref ? <div ref={ref}>{body}</div> : body;
});

FeedItem.displayName = 'FeedItem';
export default FeedItem;
