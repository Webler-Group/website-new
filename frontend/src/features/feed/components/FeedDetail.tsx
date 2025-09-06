import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { IFeed } from './types';
import FeedItem from './FeedItem';
import { useApi } from '../../../context/apiCommunication';
import NotificationToast from './comments/NotificationToast';
import { Offcanvas } from 'react-bootstrap';
import CommentList from '../../../components/comments/CommentList';

const FeedDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [feed, setFeed] = useState<IFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sendJsonRequest } = useApi();
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [findPost, setFindPost] = useState<any | null>(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentListOptions, setCommentListOptions] = useState({ section: "Feed", params: { feedId: id } });
  const [commentCount, setCommentCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (location.state && location.state.postId) {
      openCommentModal();
      setFindPost({ id: location.state.postId, isReply: location.state.isReply });
    } else {
      closeCommentModal();
    }
  }, [location]);

  useEffect(() => {
    if (!id) return;

    const fetchFeed = async () => {
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
    setCommentListOptions({ section: "Feed", params: { feedId: id } });
  }, [id]);

  const openCommentModal = () => {
    if (!id) return;
    setCommentModalVisible(true)
  }

  const closeCommentModal = () => {
    setCommentModalVisible(false);
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const onGeneralUpdate = async (feed: IFeed) => {
    setFeed(feed);
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
    <>
      <Offcanvas show={commentModalVisible} onHide={closeCommentModal} placement="end">
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
                onCommentsClick={openCommentModal}
                onGeneralUpdate = {onGeneralUpdate}
                commentCount={commentCount}
              />
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default FeedDetails;