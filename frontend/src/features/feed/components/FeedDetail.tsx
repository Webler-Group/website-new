import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { IFeed } from './types';
import FeedItem from './FeedItem';
import { useApi } from '../../../context/apiCommunication';
import { getCurrentUserId } from './utils';
import NotificationToast from './comments/NotificationToast';
import CommentList2 from '../../compiler-playground/pages/CommentList2';

const FeedDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [feed, setFeed] = useState<IFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sendJsonRequest } = useApi();
  const currentUserId = getCurrentUserId();
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [isReply, setIsReply] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (location.state && location.state.postId) {
      setPostId(location.state.postId);
      setIsReply(location.state.isReply);
    }
  }, [location]);

  useEffect(() => {
    const fetchFeed = async () => {
      if (!id) return;

      try {
        setLoading(true);

        const response = await sendJsonRequest("/Feed/GetFeed", "POST", { feedId: id });
        if (!response.success) {
          throw new Error(response.message);
        }
        setFeed(response.feed);
        setCommentCount(response.feed.answers);

      } catch (err) {
        setError("Failed to load feed");
        console.error("Error fetching feed:", err);
        showNotification("error", String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [id, sendJsonRequest]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleFeedUpdate = async (updatedFeed: IFeed) => {
    const response = await sendJsonRequest("/Feed/EditFeed", "PUT", { feedId: updatedFeed.id, message: updatedFeed.message });
    if (!response.success) {
      showNotification("error", response.message);
      throw new Error(response.message);
    }
    setFeed(updatedFeed);
  };

  const handleFeedDelete = async (feed: IFeed) => {
    const response = await sendJsonRequest("/Feed/DeleteFeed", "DELETE", { feedId: feed.id });
    if (!response.success) {
      showNotification("error", response.message);
      throw new Error(response.message);
    }
    navigate('/feed');
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
        <Loader2 className="text-primary" style={{ width: "2.5rem", height: "2.5rem" }} />
      </div>
    );
  }

  if (error || !feed) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
        <NotificationToast
          notification={notification}
          onClose={() => setNotification(null)}
        />
        <div className="text-center">
          <h2 className="fw-semibold text-dark mb-3">
            {error || 'Feed not found'}
          </h2>
          <button
            onClick={() => navigate('/feed')}
            className="btn btn-outline-primary d-inline-flex align-items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      <div className="container py-5">
        {/* Header */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/feed')}
            className="btn btn-link text-decoration-none text-primary d-inline-flex align-items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Feed
          </button>
        </div>

        {/* Feed Item Card */}
        <div className="card shadow-sm border-0 rounded-4 mb-4">
          <div className="card-body">
              <FeedItem
                feed={feed}
                currentUserId={currentUserId}
                sendJsonRequest={sendJsonRequest}
                onUpdate={handleFeedUpdate}
                onDelete={() => { handleFeedDelete(feed); }}
                showFullContent={true}
              />
          </div>
        </div>

        {/* Comments Section */}
        <div className="card shadow-sm border-0 rounded-4">
          <div className="card-body">
            <h5 className="fw-semibold text-dark mb-3">{commentCount} Comments</h5>
            <CommentList2
              options={{ section: "feed", params: { feedId: feed.id } }}
              setCommentCount={setCommentCount}
              postId={postId}
              setPostId={setPostId}
              isReply={isReply}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedDetails;
