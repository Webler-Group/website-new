import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Loader2, Filter, RefreshCw } from 'lucide-react';
import { IFeed } from './types';
import FeedItem from './FeedItem';
import NotificationToast from './comments/NotificationToast';
import { TagSearch } from '../../../components/InputTags';
import { useAuth } from '../../auth/context/authContext';
import { useFeedContext } from "../components/FeedContext";

const FeedList: React.FC = () => {
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showNavbar, setShowNavbar] = useState(true);
  const [showPinned, setShowPinned] = useState(true);
  const lastScrollRef = useRef(0);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userInfo } = useAuth();
  const hasInitializedFromUrl = useRef(false);

  const {
    results,
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
    pinnedPosts,
    setPinnedPosts
  } = useFeedContext();

  // Derive pinned/unpinned results instead of storing them in local state
  const pinnedResults = pinnedPosts;
  const unpinnedResults = results.filter(r => !pinnedPosts.some(p => p.id === r.id));

  // Hide/show navbar on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      if (currentScroll > lastScrollRef.current && currentScroll > 80) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }
      lastScrollRef.current = currentScroll;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Initialize filter and query from URL params once
  useEffect(() => {
    if (!hasInitializedFromUrl.current) {
      hasInitializedFromUrl.current = true;
      const f = searchParams.has("filter") ? Number(searchParams.get("filter")) : 1;
      const q = searchParams.get("query") ?? "";
      if (f !== filter) setFilter(f);
      if (q !== query) setQuery(q);
    }
  }, [searchParams, filter, query, setFilter, setQuery]);

  // Restore scroll position once on mount
  useEffect(() => {
    if (scrollY > 0) {
      window.scrollTo({ top: scrollY, behavior: "instant" });
    }
  }, []); 

  // Refetch feeds when userInfo changes
  useEffect(() => {
    if (hasInitializedFromUrl.current) {
      fetchFeeds({ reset: true });
    }
  }, [userInfo?.id]);

  // Infinite scroll observer
  const intObserver = useRef<IntersectionObserver | null>(null);
  const lastFeedElemRef = useCallback(
    (elem: HTMLElement | null) => {
      if (isLoading) return;
      if (intObserver.current) intObserver.current.disconnect();

      intObserver.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasNextPage && !isLoading) {
          fetchFeeds();
        }
      });

      if (elem) intObserver.current.observe(elem);
    },
    [hasNextPage, isLoading, fetchFeeds]
  );

  // Filter options
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

  const handleFilterChange = useCallback((newFilter: number) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("filter", newFilter.toString());
    setSearchParams(newSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSearch = useCallback((value: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (value) {
      newSearchParams.set("query", value);
    } else {
      newSearchParams.delete("query");
    }
    setSearchParams(newSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleCommentsClick = useCallback((feedId: string) => {
    setScrollY(window.scrollY);
    navigate(`/Feed/${feedId}`);
  }, [navigate, setScrollY]);

  const handleFeedUpdate = useCallback((updated: IFeed) => {
    // Update pinned posts list
    if (updated.isPinned) {
      if (!pinnedPosts.some(p => p.id === updated.id)) {
        setPinnedPosts([...pinnedPosts, updated]);
      } else {
        setPinnedPosts(pinnedPosts.map(p => p.id === updated.id ? updated : p));
      }
    } else {
      setPinnedPosts(pinnedPosts.filter(p => p.id !== updated.id));
    }

    // Update main feed results
    editFeed(updated);
  }, [pinnedPosts, setPinnedPosts, editFeed]);

  const handleFeedDelete = useCallback((deleted: IFeed) => {
    deleteFeed(deleted.id);
  }, [deleteFeed]);

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
          <h5 className="fw-bold text-dark mb-0">
            Feed <small className="text-muted">({totalCount})</small>
          </h5>

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
        {/* Pinned Section */}
        {pinnedResults.length > 0 && (
          <div className="mb-4">
            <div
              className="d-flex justify-content-between align-items-center cursor-pointer bg-light border rounded px-3 py-2"
              onClick={() => setShowPinned(prev => !prev)}
            >
              <h6 className="mb-0 fw-bold">
                📌 Pinned Posts ({pinnedResults.length})
              </h6>
              <span className="text-primary">
                {showPinned ? "Hide ▲" : "Show ▼"}
              </span>
            </div>

            {showPinned && (
              <div className="row g-3 mt-2">
                {pinnedResults.map(feed => (
                  <div key={feed.id} className="col-12">
                    <FeedItem
                      feed={feed}
                      onUpdate={handleFeedUpdate}
                      onDelete={handleFeedDelete}
                      onCommentsClick={handleCommentsClick}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Unpinned / Normal Feed */}
        <div className="row g-3">
          {unpinnedResults.length === 0 && !isLoading ? (
            <div className="col-12 text-center py-5">
              <h4 className="fw-semibold text-muted mb-2">No posts found</h4>
            </div>
          ) : (
            unpinnedResults.map((feed, i) => (
              <div key={feed.id} className="col-12">
                <FeedItem
                  feed={feed}
                  ref={i === unpinnedResults.length - 1 ? lastFeedElemRef : null}
                  onUpdate={handleFeedUpdate}
                  onDelete={handleFeedDelete}
                  onCommentsClick={handleCommentsClick}
                />
              </div>
            ))
          )}
          {isLoading && unpinnedResults.length > 0 && (
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
          bottom: "1.5rem",
          right: "1.5rem",
          zIndex: 1050
        }}
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

export default FeedList;
