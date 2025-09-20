import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FeedItem from './FeedItem';
import { Button, FormControl, FormSelect, Modal } from 'react-bootstrap';
import FeedDetails from './FeedDetail';
import ReactionsList from '../../../components/reactions/ReactionsList';
import { FaPlus, FaRotateRight, FaMapPin, FaEye, FaEyeSlash } from 'react-icons/fa6';
import { FaExclamationCircle, FaSearch } from 'react-icons/fa';
import useFeed from '../hooks/useFeed';
import { useAuth } from '../../auth/context/authContext';
import { useApi } from '../../../context/apiCommunication';
import { IFeed } from './types';
import Loader from '../../../components/Loader';

const FILTER_OPTIONS = [
  { value: 1, label: 'Latest', requireLogin: false },
  { value: 2, label: 'My Posts', requireLogin: true },
  { value: 3, label: 'Following', requireLogin: true },
  { value: 4, label: 'Trending (24h)', requireLogin: false },
  { value: 5, label: 'Most Popular', requireLogin: false },
  { value: 6, label: 'Most Shared', requireLogin: false },
];

const FeedList = () => {
  const { feedId } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState(1);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [votesModalVisible, setVotesModalVisible] = useState(false);
  const [votesModalOptions, setVotesModalOptions] = useState({ parentId: "" });
  const [pinnedVisible, setPinnedVisible] = useState(true);
  const { userInfo } = useAuth();
  const { sendJsonRequest } = useApi();
  const feeds = useFeed(filter, searchQuery, 10);
  const [pinnedFeeds, setPinnedFeeds] = useState<IFeed[]>([]);
  const [loading, setLoading] = useState(false);

  const intObserver = useRef<IntersectionObserver>();
  const lastFeedRef = useCallback(
    (node: any) => {
      if (feeds.loading) return;

      if (intObserver.current) intObserver.current.disconnect();
      intObserver.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && feeds.hasNextPage && feeds.results.length > 0) {
          feeds.setState((prev) => ({
            page: prev.page + 1
          }));
        }
      });

      if (node) intObserver.current.observe(node);
    },
    [feeds.loading, feeds.hasNextPage, feeds.results]
  );

  useEffect(() => {
    let lastY = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;

      if (currentY < 60) {
        setHeaderVisible(true);
      } else if (currentY > lastY) {
        setHeaderVisible(false);
      } else if (currentY < lastY) {
        setHeaderVisible(true);
      }

      lastY = currentY;
    };

    addEventListener("scroll", handleScroll, { passive: true });
    return () => removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetchPinnedFeeds();
  }, []);

  useEffect(() => {
    if (feeds.state.page === 1) {
      setTimeout(() => {
        scrollTo({ top: 0, behavior: "instant" });
      });
    }
  }, [feeds.state]);

  const fetchPinnedFeeds = async () => {
    setLoading(true);

    const result = await sendJsonRequest("/Feed", "POST", {
      page: 1,
      count: 10,
      filter: 7,
      searchQuery: ""
    });

    if (result && result.feeds) {
      setPinnedFeeds(() => result.feeds);
    }

    setLoading(false);
  }

  const handleFilterSelect = (e: ChangeEvent) => {
    const value = Number((e.target as HTMLSelectElement).selectedOptions[0].value)
    setFilter(value);
  }

  const handleSearch = () => {
    setSearchQuery(() => searchInput);
  }

  const handleRefresh = async () => {
    setLoading(true);
    feeds.setState({ page: 1 });
    await fetchPinnedFeeds();
    setLoading(false);
  }

  const handleClose = () => {
    navigate("/Feed");
  }

  const closeVotesModal = () => {
    setVotesModalVisible(false);
  }

  const onGeneralUpdate = (post: IFeed) => {
    if (post.isPinned) {
      setPinnedFeeds(prev => prev.map(x => x.id == post.id ? post : x));
    } else {
      feeds.editPost(post);
    }
  }

  const onDelete = (post: IFeed) => {
    if (post.isPinned) {
      setPinnedFeeds(prev => prev.filter(x => x.id != post.id));
    } else {
      feeds.deletePost(post.id);
    }
  }

  const onShowUserReactions = (feedId: string) => {
    setVotesModalOptions({ parentId: feedId });
    setVotesModalVisible(true);
  }

  const onTogglePin = (post: IFeed) => {
    if (post.isPinned) {
      feeds.deletePost(post.id);
      setPinnedFeeds(prev => [post, ...prev]);
      setTimeout(() => {
        scrollTo({ top: 0, behavior: "smooth" });
      });
    } else {
      setPinnedFeeds(prev => prev.filter(f => f.id !== post.id));
      feeds.addPost(post);
    }
  }

  const togglePinnedVisibility = () => {
    setPinnedVisible(prev => !prev);
  }

  return (
    <>
      <Modal
        show={feedId != undefined}
        onHide={handleClose}
        fullscreen
        backdrop="static"
      >
        <Modal.Body className="p-0">
          <FeedDetails
            feedId={feedId}
            onGeneralUpdate={onGeneralUpdate}
            onShowUserReactions={onShowUserReactions}
            onDelete={onDelete}
            onTogglePin={onTogglePin}
          />
        </Modal.Body>
      </Modal>
      <ReactionsList title="Reactions" options={votesModalOptions} visible={votesModalVisible} onClose={closeVotesModal} showReactions={true} countPerPage={10} />
      <div className="wb-feed-list-container">
        {/* Header */}
        <div className={`p-2 wb-feed-list-header ${headerVisible ? 'wb-feed-visible' : 'wb-feed-hidden'}`}>
          <div className="d-flex flex-column gap-2">
            <h2 className="h4 fw-bold text-dark mb-0">Feed</h2>
            {/* Search */}
            <div className="d-flex gap-2">
              <FormControl
                type="search"
                size='sm'
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <Button size='sm' onClick={handleSearch}>Search</Button>
            </div>
            {/* Controls */}
            <div className="d-flex align-items-center justify-content-between gap-2">
              {/* Filter Dropdown */}
              <FormSelect size='sm' style={{ width: "140px" }} value={filter} onChange={handleFilterSelect}>
                {
                  FILTER_OPTIONS
                    .filter(x => x.requireLogin == false || userInfo != null)
                    .map(x => (
                      <option key={x.value} value={x.value}>{x.label}</option>
                    ))
                }
              </FormSelect>
              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={feeds.loading || loading}
                className="btn btn-light rounded-pill shadow-sm d-flex align-items-center justify-content-center gap-2 wb-feed-control-button"
              >
                <FaRotateRight
                  className="text-muted"
                />
                <span className="d-none d-sm-inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {
          loading ?
            <div className="d-flex justify-content-center mt-5 text-center">
              <Loader />
            </div>
            :
            <>
              {/* Pinned Feeds Section */}
              {pinnedFeeds.length > 0 && (
                <div className="px-2 wb-pinned-feeds-section bg-light">
                  <div className="d-flex justify-content-between align-items-center py-2">
                    <h6 className="text-warning mb-0"><FaMapPin /> Pinned Posts</h6>
                    <Button size='sm' variant='link' className='text-secondary' onClick={togglePinnedVisibility}>{pinnedVisible ? <FaEye /> : <FaEyeSlash />}</Button>
                  </div>
                  {pinnedVisible && (
                    <div>
                      {pinnedFeeds.map((feed) => (
                        <div key={feed.id} className='border-2 border-bottom mt-3'>
                          <FeedItem
                            feed={feed}
                            onGeneralUpdate={onGeneralUpdate}
                            onCommentsClick={(feedId) => navigate(`/feed/${feedId}`, { state: { comments: true } })}
                            commentCount={feed.answers || 0}
                            onShowUserReactions={onShowUserReactions}
                            onDelete={onDelete}
                            onTogglePin={onTogglePin}
                            showFullContent={false}
                            onShowFullContent={(feedId) => navigate(`/feed/${feedId}`)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="px-2 wb-feed-items">
                {feeds.error.length > 0 && (
                  <div className="alert alert-danger rounded-4 border-0 d-flex align-items-center gap-3">
                    <FaExclamationCircle />
                    <div>
                      <strong>Error loading feeds</strong>
                      <ul>
                        {
                          feeds.error.map((err, idx) => <li key={idx}>{err.message}</li>)
                        }
                      </ul>
                      <button
                        onClick={handleRefresh}
                        className="btn btn-sm btn-outline-danger mt-2"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}

                {!feeds.loading && feeds.error.length == 0 && feeds.results.length === 0 && (
                  <div className="text-center py-5">
                    <FaSearch size={40} className="opacity-50 mb-3" />
                    <h5 className="text-muted">No feeds found</h5>
                    <p className="text-muted small">
                      {searchQuery
                        ? `No results found for "${searchQuery}". Try adjusting search or filters.`
                        : "No feeds available at the moment."}
                    </p>
                  </div>
                )}

                {/* Feed Items */}
                <div>
                  {feeds.results.map((feed, index) => {
                    const isLast = index === feeds.results.length - 1;
                    return (
                      <div
                        className='border-2 border-bottom mt-3'
                        key={feed.id}
                        ref={isLast ? lastFeedRef : undefined}
                      >
                        <FeedItem
                          feed={feed}
                          onGeneralUpdate={onGeneralUpdate}
                          onCommentsClick={(feedId) => navigate(`/feed/${feedId}`, { state: { comments: true } })}
                          commentCount={feed.answers || 0}
                          onShowUserReactions={onShowUserReactions}
                          onDelete={onDelete}
                          onTogglePin={onTogglePin}
                          showFullContent={false}
                          onShowFullContent={(feedId) => navigate(`/feed/${feedId}`)}
                        />
                      </div>
                    );
                  })}
                </div>

                {!feeds.hasNextPage && feeds.results.length > 0 && (
                  <div className="text-center py-4 text-muted small">
                    <span>You've reached the end of the feed</span>
                  </div>
                )}
              </div>
            </>
        }

        {/* Floating New Post Button */}
        <button
          onClick={() => navigate('/feed/new')}
          className="wb-feed-new-post-button"
          title="Create new post"
        >
          <span className="d-none d-md-inline">New Post</span>
          <FaPlus className="d-md-none" size={24} />
        </button>
      </div>
    </>
  );
};

export default FeedList;