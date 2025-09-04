import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Loader2, Filter, RefreshCw, Pin, ChevronDown, ChevronUp } from 'lucide-react';
import { IFeed } from './types';
import FeedItem from './FeedItem';
import NotificationToast from './comments/NotificationToast';
import { TagSearch } from '../../../components/InputTags';
import { useAuth } from '../../auth/context/authContext';
import { useFeedContext } from "../components/FeedContext";

const FeedList: React.FC = () => {
  const [pinnedPostsExpanded, setPinnedPostsExpanded] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userInfo } = useAuth();

  const {
    results,
    pinnedPosts,
    totalCount,
    isLoading,
    hasNextPage,
    fetchFeeds,
    deleteFeed,
    editFeed,
    scrollY,
    setScrollY,
    setFilter,
    setQuery,
    query,
    filter,
  } = useFeedContext();

  // scroll detection
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      if (currentScroll > lastScroll && currentScroll > 80) {
        setShowNavbar(false);
      } else if (lastScroll - currentScroll > 40) {
        setShowNavbar(true);
      }
      setLastScroll(currentScroll);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScroll]);

  useEffect(() => {
    const f = searchParams.has("filter") ? Number(searchParams.get("filter")) : 1;
    const q = searchParams.get("query") ?? "";
    if (f !== filter) setFilter(f);
    if (q !== query) setQuery(q);
  }, [searchParams, filter, query, setFilter, setQuery]);

  useEffect(() => {
    if (scrollY > 0) window.scrollTo({ top: scrollY, behavior: "instant" });
  }, []); 

  useEffect(() => {
    fetchFeeds({ reset: true });
  }, [userInfo]);

  const intObserver = useRef<IntersectionObserver>();
  const lastFeedElemRef = useCallback((elem: any) => {
    if (isLoading) return;
    if (intObserver.current) intObserver.current.disconnect();
    intObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchFeeds();
      }
    });
    if (elem) intObserver.current.observe(elem);
  }, [isLoading, hasNextPage, fetchFeeds]);

  const filterOptions = userInfo ? [
    { value: 1, label: 'Most Recent' },
    { value: 2, label: 'My Posts' },
    { value: 3, label: 'Following' },
    { value: 4, label: 'Hot Today' },
    { value: 5, label: 'Most Popular' },
    { value: 6, label: 'Most Shared' }
  ] : [
    { value: 1, label: 'Most Recent' },
    { value: 4, label: 'Hot Today' },
    { value: 5, label: 'Most Popular' },
    { value: 6, label: 'Most Shared' }
  ];

  const handleFilterChange = (newFilter: number) => {
    searchParams.set("filter", newFilter.toString());
    setSearchParams(searchParams, { replace: true });
  };

  const handleSearch = (value: string) => {
    searchParams.set("query", value);
    setSearchParams(searchParams, { replace: true });
  };

  const handleCommentsClick = (feedId: string) => {
    setScrollY(window.scrollY);
    navigate(`/Feed/${feedId}`);
  };

  const handleFeedUpdate = (updated: IFeed) => {
    editFeed(updated); 
  };

  const handleFeedDelete = (deleted: IFeed) => {
    deleteFeed(deleted.id);
  };

  const regularPosts = results.filter(f => !f.isPinned);

  if (isLoading && results.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
        <Loader2 className="text-primary" style={{ width: "2.5rem", height: "2.5rem" }} />
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      <NotificationToast
        notification={notification}
        onClose={() => setNotification(null)}
      />

      {/* Navbar */}
      <div 
        className={`position-sticky top-0 z-3 bg-white border-bottom shadow-sm transition-all ${showNavbar ? "opacity-100" : "opacity-0 -translate-y-100"}`} 
        style={{ transition: "all 0.3s ease" }}
      >
        <div className="container py-2 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold text-dark mb-0">Feed <small className="text-muted">({totalCount})</small></h5>

          <div className="d-flex gap-2 align-items-center">
            <button
              onClick={() => fetchFeeds({ reset: true })}
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 rounded-pill"
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? "spin" : ""} />
              Refresh
            </button>

            {/* Filters */}
            <div className="dropdown">
              <button
                className="btn btn-sm btn-outline-secondary dropdown-toggle rounded-pill px-3"
                data-bs-toggle="dropdown"
              >
                <Filter size={14} className="me-1" />
                {filterOptions.find(fopt => fopt.value === filter)?.label ?? 'Filter'}
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                {filterOptions.map(option => (
                  <li key={option.value}>
                    <button
                      className={`dropdown-item ${filter === option.value ? 'active' : ''}`}
                      onClick={() => handleFilterChange(option.value)}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="container pb-2">
          <TagSearch query={query} handleSearch={handleSearch} placeholder="Search by tags or content" />
        </div>
      </div>

      {/* Feed */}
      <div className="container py-4">
      {pinnedPosts.length > 0 && (
        <div className="mb-4">
          <div className="card border-warning">
            <div
              className="card-header bg-warning bg-opacity-10 border-warning"
              onClick={() => setPinnedPostsExpanded(!pinnedPostsExpanded)}
              style={{ cursor: 'pointer' }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <Pin size={16} className="text-warning" />
                  <span className="fw-semibold text-black">
                    Pinned Posts ({pinnedPosts.length})
                  </span>
                </div>
                {pinnedPostsExpanded 
                  ? <ChevronUp size={16} className="text-warning" /> 
                  : <ChevronDown size={16} className="text-warning" />}
              </div>
            </div>

            {pinnedPostsExpanded && (
              <div className="card-body p-0">
                <div className="row g-0">
                  {pinnedPosts.map((feed, index) => (
                    <div key={feed.id} className={`col-12 ${index > 0 ? 'border-top' : ''}`}>
                      <div className="p-3">
                        <FeedItem
                          feed={feed}
                          onUpdate={handleFeedUpdate}
                          onDelete={handleFeedDelete}
                          onCommentsClick={handleCommentsClick}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

        {/* Regular posts */}
        <div className="row g-3">
          {regularPosts.length === 0 && !isLoading ? (
            <div className="col-12 text-center py-5">
              <h4 className="fw-semibold text-muted mb-2">No posts found</h4>
            </div>
          ) : (
            regularPosts.map((feed, i) => (
              <div key={feed.id} className="col-12">
                <FeedItem
                  feed={feed}
                  ref={i === regularPosts.length - 1 ? lastFeedElemRef : null}
                  onUpdate={handleFeedUpdate}
                  onDelete={handleFeedDelete}
                  onCommentsClick={handleCommentsClick}
                />
              </div>
            ))
          )}
          {isLoading && regularPosts.length > 0 && (
            <div className="col-12 text-center py-3">
              <Loader2 className="text-primary" size={20} />
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => { navigate("/Feed/New"); setScrollY(0); }}
        className="btn btn-primary rounded-circle position-fixed d-flex align-items-center justify-content-center shadow-lg"
        style={{
          width: "56px",
          height: "56px",
          bottom: "1.5rem",  // 24px above bottom
          right: "1.5rem",   // 24px from right
          zIndex: 1050       // higher than modals/backdrops
        }}
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

export default FeedList;
