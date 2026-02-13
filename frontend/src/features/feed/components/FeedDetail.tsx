import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IFeed } from './types';
import FeedItem from './FeedItem';
import { useApi } from '../../../context/apiCommunication';
import NotificationToast from '../../../components/NotificationToast';
import { Button, Offcanvas } from 'react-bootstrap';
import CommentList from '../../../components/comments/CommentList';
import { FaArrowLeft } from 'react-icons/fa6';
import Loader from '../../../components/Loader';

interface FeedDetailsProps {
  feedId?: string;
  onGeneralUpdate: (feed: IFeed) => void;
  onShowUserReactions: (feedId: string) => void;
  onDelete: (feed: IFeed) => void;
  onTogglePin: (feed: IFeed) => void;
}

const FeedDetails = ({ feedId, onGeneralUpdate, onShowUserReactions, onDelete, onTogglePin }: FeedDetailsProps) => {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<IFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sendJsonRequest } = useApi();
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [findPost, setFindPost] = useState<any | null>(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentListOptions, setCommentListOptions] = useState({ section: "Feed", params: { feedId } });
  const [commentCount, setCommentCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (location.state) {
      if (location.state.postId || location.state.comments) {
        openCommentModal();
      }
      if (location.state.postId) {
        setFindPost({ id: location.state.postId, isReply: location.state.isReply });
      }
    } else {
      closeCommentModal();
    }
  }, [location]);

  useEffect(() => {
    if (!feedId) return;

    const fetchFeed = async () => {
      try {
        setLoading(true);

        const response = await sendJsonRequest("/Feed/GetFeed", "POST", { feedId });
        if (!response.success) {
          throw new Error(response.message);
        }
        setFeed(response.feed);
        setCommentCount(response.feed.answers);
        onGeneralUpdate(response.feed);

      } catch (err) {
        setError("Failed to load feed");
        console.error("Error fetching feed:", err);
        showNotification("error", String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
    setCommentListOptions({ section: "Feed", params: { feedId } });
  }, [feedId]);

  useEffect(() => {
    if (feed) {
      onGeneralUpdate({ ...feed, answers: commentCount })
    }
  }, [commentCount]);

  const openCommentModal = () => {
    if (!feedId) return;
    setCommentModalVisible(true)
  }

  const closeCommentModal = () => {
    setCommentModalVisible(false);
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const onUpdate = (feed: IFeed) => {
    setFeed(feed);
    onGeneralUpdate(feed);
  }

  if (loading) {
    return (
      <>
        <div className="loading-container">
          <Loader />
        </div>
      </>
    );
  }

  if (error || !feed) {
    return (
      <>
        <div className="error-container">
          <NotificationToast
            notification={notification}
            onClose={() => setNotification(null)}
          />
          <div className="error-content">
            <h4 className="error-title">
              {error || 'Feed not found'}
            </h4>
            <Button onClick={() => navigate('/Feed')} variant='primary'>
              <FaArrowLeft />
              Back to Feed
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Offcanvas show={commentModalVisible} onHide={closeCommentModal} backdropClassName="wb-feed-comment-modal__backdrop" style={{ zIndex: 1060 }} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>{commentCount} Comments</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column" style={{ height: "calc(100% - 62px)" }}>
          <CommentList
            findPost={findPost}
            options={commentListOptions}
            setCommentCount={setCommentCount}
          />
        </Offcanvas.Body>
      </Offcanvas>

      <div className="wb-feed-details-container p-2">
        <div className="wb-feed-main-content">
          {/* Back Button */}
          <button
            onClick={() => navigate('/Feed')}
            className="wb-feed-back-button"
          >
            <FaArrowLeft size={16} />
            Back to Feed
          </button>

          {/* Feed Item - No wrapper needed since FeedItem has its own styling */}
          <FeedItem
            feed={feed}
            onCommentsClick={openCommentModal}
            onGeneralUpdate={onUpdate}
            commentCount={commentCount}
            onShowUserReactions={onShowUserReactions}
            onDelete={onDelete}
            onTogglePin={onTogglePin}
          />
        </div>
      </div>
    </>
  );
};

export default FeedDetails;