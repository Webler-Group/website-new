import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import FeedItem from './FeedItem';
import useFeeds from '../hooks/useFeeds';
import { Modal } from 'react-bootstrap';
import FeedDetails from './FeedDetail';
import ReactionsList from '../../../components/reactions/ReactionsList';
import { FaEye, FaEyeSlash, FaFilter, FaMapPin, FaPlus, FaRotateRight } from 'react-icons/fa6';
import { FaExclamationCircle, FaSearch } from 'react-icons/fa';
import { TagSearch } from '../../../components/InputTags';

const FILTER_OPTIONS = [
  { value: 1, label: 'Latest' },
  { value: 2, label: 'My Posts' },
  { value: 3, label: 'Following' },
  { value: 4, label: 'Trending (24h)' },
  { value: 5, label: 'Most Popular' },
  { value: 6, label: 'Most Shared' },
];

const FeedList = () => {
  const { feedId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pinnedExpanded, setPinnedExpanded] = useState(true);
  const navigate = useNavigate();

  // URL state synchronization
  const searchQuery = searchParams.get('search') || '';
  const filterValue = parseInt(searchParams.get('filter') || '1');

  const {
    feeds,
    error,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    resetFeedList,
    loadMore,
    handleRefresh,
    onGeneralUpdate,
    onDelete,
    onTogglePin,
    pinnedFeeds
  } = useFeeds(searchQuery, filterValue);

  const [headerVisible, setHeaderVisible] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // Search input state
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [votesModalVisible, setVotesModalVisible] = useState(false);
  const [votesModalOptions, setVotesModalOptions] = useState({ parentId: "" });

  // Refs and cache
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastFeedRef = useRef<HTMLDivElement | null>(null);

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

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  // Filter change handler
  const handleFilterChange = useCallback((newFilter: number) => {
    if (newFilter !== filterValue) {
      searchParams.set("filter", newFilter.toString());
      setSearchParams(searchParams);
      resetFeedList();
      setIsDropdownOpen(false);
    }
  }, [filterValue, searchQuery, resetFeedList]);


  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      {
        rootMargin: '200px'
      }
    );

    if (lastFeedRef.current) {
      observerRef.current.observe(lastFeedRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadingMore, loadMore]);

  // Sync search input with URL
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const handleSearch = (value: string) => {
    searchParams.set("search", value);
    setSearchParams(searchParams);
    setSearchInput(value);
  }

  // Memoized filter dropdown
  const filterDropdown = useMemo(() => (
    <div className="dropdown dropstart">
      <button
        className="btn btn-light rounded-pill shadow-sm d-flex align-items-center gap-2 control-button"
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={loading}
      >
        <FaFilter size={16} className="text-muted" />
        <span>{FILTER_OPTIONS.find(opt => opt.value === filterValue)?.label || 'Filter'}</span>
      </button>
      {isDropdownOpen && (
        <div className="dropdown-menu show">
          {FILTER_OPTIONS.map(option => (
            <button
              key={option.value}
              className={`dropdown-item ${filterValue === option.value ? 'active' : ''}`}
              onClick={() => handleFilterChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  ), [filterValue, handleFilterChange, loading, isDropdownOpen]);

  const handleClose = () => {
    navigate("/Feed");
  }

  const closeVotesModal = () => {
    setVotesModalVisible(false);
  }

  const onShowUserReactions = (feedId: string) => {
    setVotesModalOptions({ parentId: feedId });
    setVotesModalVisible(true);
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
      <div className="container py-4 wb-feed-list-container">
        {/* Header */}
        <div className={`wb-feed-list-header ${headerVisible ? 'wb-feed-visible' : 'wb-feed-hidden'}`}>
          <div className="d-flex flex-column gap-2">
            <h2 className="h4 fw-bold text-dark mb-0">Feed</h2>
            {/* Search */}
            <TagSearch query={searchInput} handleSearch={handleSearch} />
            {/* Controls */}
            <div className="d-flex align-items-center justify-content-between gap-2">
              {/* Filter Dropdown */}
              {filterDropdown}
              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={loading || loadingMore}
                className="btn btn-light rounded-pill shadow-sm d-flex align-items-center justify-content-center gap-2 wb-feed-control-button"
              >
                <FaRotateRight
                  size={16}
                  className={loading ? "animate-spin text-muted" : "text-muted"}
                />
                <span className="d-none d-sm-inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Info / Status */}
        {!loading && !error && (
          <div className="mt-3 mb-3">
            <small className="text-muted">
              {searchQuery ? (
                <>Showing {feeds.length} of {totalCount} results for "{searchQuery}"</>
              ) : (
                <>Showing {feeds.length} of {totalCount} feeds</>
              )}
            </small>
          </div>
        )}

        {/* Pinned Feeds Section */}
        <div className="card border-warning shadow-sm mb-5">
          {/* Header */}
          <div
            className="card-header bg-warning bg-opacity-10 border-warning d-flex align-items-center justify-content-between py-2 px-3"
            style={{ cursor: "pointer" }}
            onClick={() => setPinnedExpanded(!pinnedExpanded)}
          >
            <small className="fw-bold text-dark mb-0"><FaMapPin size={16} />  Pinned Posts</small>
            <small className="text-muted">
              {pinnedExpanded ? <FaEye /> : <FaEyeSlash />}
            </small>
          </div>
          {pinnedExpanded && <div className="d-flex flex-column gap-3">
            {pinnedExpanded && (
              <div className="d-flex flex-column gap-3 p-3">
                {pinnedFeeds.length > 0 ? (
                  pinnedFeeds.map((feed) => (
                    <div key={feed.id}>
                      <FeedItem
                        feed={feed}
                        onGeneralUpdate={onGeneralUpdate}
                        onCommentsClick={(feedId) => navigate(`/feed/${feedId}`, { state: { comments: true } })}
                        commentCount={feed.answers || 0}
                        onShowUserReactions={onShowUserReactions}
                        onDelete={onDelete}
                        onTogglePin={onTogglePin}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted py-4">
                    <FaMapPin size={24} className="mb-2 opacity-50" />
                    <p className="mb-0">No pinned posts available</p>
                  </div>
                )}
              </div>
            )}
          </div>}
        </div>

        {/* Content */}
        <div className="wb-feed-items">
          {error && (
            <div className="alert alert-danger rounded-4 border-0 d-flex align-items-center gap-3">
              <FaExclamationCircle size={20} />
              <div>
                <strong>Error loading feeds</strong>
                <p className="mb-0">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="btn btn-sm btn-outline-danger mt-2"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {loading && feeds.length === 0 && (
            <div className="text-center py-5">
              <div className="wb-loader">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <p className="text-muted">Loading feeds...</p>
            </div>
          )}

          {!loading && !error && feeds.length === 0 && (
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
          <div className="d-flex flex-column gap-3">
            {feeds.map((feed, index) => {
              const isLast = index === feeds.length - 1;
              return (
                <div
                  key={feed.id}
                  ref={isLast ? lastFeedRef : undefined}
                >
                  <div>
                    <FeedItem
                      feed={feed}
                      onGeneralUpdate={onGeneralUpdate}
                      onCommentsClick={(feedId) => navigate(`/feed/${feedId}`, { state: { comments: true } })}
                      commentCount={feed.answers || 0}
                      onShowUserReactions={onShowUserReactions}
                      onDelete={onDelete}
                      onTogglePin={onTogglePin}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More */}
          {loadingMore && (
            <div className="text-center py-4">
              <div className="wb-loader">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <p className="text-muted mb-0">Loading more feeds...</p>
            </div>
          )}

          {!hasMore && feeds.length > 0 && (
            <div className="text-center py-4 text-muted small">
              <hr className="my-3" />
              <span>You've reached the end of the feed</span>
            </div>
          )}
        </div>

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