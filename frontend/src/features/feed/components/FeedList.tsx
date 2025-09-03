import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, MessageCircle, Loader2, Filter, ChevronDown, ChevronUp, Pin, RefreshCw } from 'lucide-react';
import { IFeed } from './types';
import FeedItem from './FeedItem';
import NotificationToast from './comments/NotificationToast';
import { TagSearch } from '../../../components/InputTags';
import { useAuth } from '../../auth/context/authContext';
import { useFeedContext } from "../components/FeedContext";

const FeedList: React.FC = () => {
  const [pinnedPostsExpanded, setPinnedPostsExpanded] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
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

  useEffect(() => {
    const f = searchParams.has("filter") ? Number(searchParams.get("filter")) : 1;
    const q = searchParams.get("query") ?? "";

    if (f !== filter) {
      setFilter(f);
    }
    if (q !== query) {
      setQuery(q);
    }
  }, [searchParams, filter, query, setFilter, setQuery]);


  useEffect(() => {
    if (scrollY > 0) {
      window.scrollTo({ top: scrollY, behavior: "instant" });
    }
  }, []); 

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

  // Split regular posts so we don't duplicate pinned in the list
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
      <div className="container py-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 gap-2">
          <h1 className="fw-bold text-dark mb-0">
            Feed
            <small className="text-muted ms-2">({totalCount} posts)</small>
          </h1>

          <div className="d-flex gap-2">
            <button
              onClick={() => fetchFeeds({ reset: true })}
              className="btn btn-outline-secondary d-inline-flex align-items-center gap-2 rounded-pill px-4"
              disabled={isLoading}
            >
              <RefreshCw size={18} className={isLoading ? "spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => navigate("/Feed/New")}
              className="btn btn-primary d-inline-flex align-items-center gap-2 rounded-pill px-4"
            >
              <Plus size={18} />
              Create Post
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="row g-3 mb-4 align-items-center">
          <div className='col-md-8'>
            <TagSearch query={query} handleSearch={handleSearch} placeholder='Search by tags or content' />
          </div>
          <div className="col-md-4">
            <div className="dropdown w-100">
              <button
                className="btn btn-outline-secondary dropdown-toggle w-100 d-flex align-items-center justify-content-between rounded-pill"
                data-bs-toggle="dropdown"
              >
                <span className="d-flex align-items-center gap-2">
                  <Filter size={16} />
                  {filterOptions.find(fopt => fopt.value === filter)?.label ?? 'Filter'}
                </span>
              </button>
              <ul className="dropdown-menu w-100">
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

        {/* Pinned Posts Section */}
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
                  {pinnedPostsExpanded ? <ChevronUp size={16} className="text-warning" /> : <ChevronDown size={16} className="text-warning" />}
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

        {/* Regular Posts */}
        <div className="row g-3">
          {regularPosts.length === 0 && !isLoading ? (
            <div className="col-12 text-center py-5">
              <div className="text-muted mb-3">
                <MessageCircle size={48} />
              </div>
              <h4 className="fw-semibold text-muted mb-2">No posts found</h4>
            </div>
          ) : (
            regularPosts.map((feed, i) => (
              i === regularPosts.length - 1 ? (
                <div key={feed.id} className="col-12">
                  <FeedItem
                    feed={feed}
                    ref={lastFeedElemRef}
                    onUpdate={handleFeedUpdate}
                    onDelete={handleFeedDelete}
                    onCommentsClick={handleCommentsClick}
                  />
                </div>
              ) : (
                <div key={feed.id} className="col-12">
                  <FeedItem
                    feed={feed}
                    onUpdate={handleFeedUpdate}
                    onDelete={handleFeedDelete}
                    onCommentsClick={handleCommentsClick}
                  />
                </div>
              )
            ))
          )}
          {isLoading && regularPosts.length > 0 && (
            <div className="col-12 text-center py-3">
              <Loader2 className="text-primary" size={20} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedList;
