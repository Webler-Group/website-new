import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Feed } from './types';
import FeedItem from './FeedItem';
import CommentForm from './CommentForm';
import CommentList from './CommentList';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useApi } from '../../../context/apiCommunication';
import { getCurrentUserId } from './utils';

interface FeedDetailsProps {}

const FeedDetails: React.FC<FeedDetailsProps> = ({ }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sendJsonRequest } = useApi();
  const currentUserId = getCurrentUserId();

  useEffect(() => {
    const fetchFeed = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await sendJsonRequest("/Feed/GetFeed", "POST", { feedId: id });
        setFeed(response.feed);
      } catch (err) {
        setError('Failed to load feed');
        console.error('Error fetching feed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [id, sendJsonRequest]);

  const handleFeedUpdate = async (updatedFeed: Feed) => {
    await sendJsonRequest("/Feed/EditFeed", "PUT", { feedId: updatedFeed.id, message: updatedFeed.message })
    setFeed(updatedFeed);
  };

  const handleFeedDelete = async (feed: Feed) => {
    await sendJsonRequest("/Feed/DeleteFeed", "DELETE", { feedId: feed.id })
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
              onDelete={() => { handleFeedDelete(feed) }}
              showFullContent={true}
            />
          </div>
        </div>

        {/* Comments Section */}
        <div className="card shadow-sm border-0 rounded-4">
          <div className="card-body">
            <h5 className="fw-semibold text-dark mb-3">Comments</h5>
            
            {/* Comment Form */}
            <div className="mb-4">
              <CommentForm
                feedId={feed.id}
                sendJsonRequest={sendJsonRequest}
                onCommentPosted={() => {
                  window.dispatchEvent(new CustomEvent('commentPosted', { detail: { feedId: feed.id } }));
                }}
              />
            </div>

            {/* Comment List */}
            <CommentList
              feedId={feed.id}
              sendJsonRequest={sendJsonRequest}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedDetails;
