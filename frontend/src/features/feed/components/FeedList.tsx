import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Filter, Loader2, RefreshCw, AlertCircle, Plus } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../../context/apiCommunication';
import { IFeed } from './types';
import FeedItem from './FeedItem';
import "./FeedList.css"

interface FeedListResponse {
  success: boolean;
  count: number;
  feeds: IFeed[];
  message?: string;
}

interface CacheEntry {
  feeds: IFeed[];
  totalCount: number;
  timestamp: number;
}

interface FeedCache {
  [key: string]: CacheEntry;
}

const FEEDS_PER_PAGE = 10;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const SEARCH_DEBOUNCE_MS = 500;

const FILTER_OPTIONS = [
  { value: 1, label: 'Latest' },
  { value: 2, label: 'My Posts' },
  { value: 3, label: 'Following' },
  { value: 4, label: 'Trending (24h)' },
  { value: 5, label: 'Most Popular' },
  { value: 6, label: 'Most Shared' },
  { value: 7, label: 'Pinned' }
];

const FeedList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { sendJsonRequest } = useApi();

  // URL state synchronization
  const searchQuery = searchParams.get('search') || '';
  const filterValue = parseInt(searchParams.get('filter') || '1');

  // Component state
  const [feeds, setFeeds] = useState<IFeed[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Search input state
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Refs and cache
  const cache = useRef<FeedCache>({});
  const abortController = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastFeedRef = useRef<HTMLDivElement | null>(null);

  // Generate cache key
  const getCacheKey = useCallback((search: string, filter: number, page: number) => {
    return `${search}-${filter}-${page}`;
  }, []);

  // Check if cache entry is valid
  const isCacheValid = useCallback((entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp < CACHE_DURATION;
  }, []);

  // Update URL parameters
  const updateUrlParams = useCallback((search: string, filter: number) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filter !== 1) params.set('filter', filter.toString());
    setSearchParams(params);
  }, [setSearchParams]);

  // Reset feeds and pagination
  const resetFeedList = useCallback(() => {
    setFeeds([]);
    setCurrentPage(1);
    setHasMore(true);
    setError(null);
    setTotalCount(0);
  }, []);

  // Fetch feeds from API
  const fetchFeeds = useCallback(async (
    search: string,
    filter: number,
    page: number,
    isLoadMore: boolean = false
  ): Promise<void> => {
    const cacheKey = getCacheKey(search, filter, page);

    if (cache.current[cacheKey] && isCacheValid(cache.current[cacheKey])) {
      const cachedEntry = cache.current[cacheKey];
      if (isLoadMore) {
        setFeeds(prev => [...prev, ...cachedEntry.feeds]);
      } else {
        setFeeds(cachedEntry.feeds);
        setTotalCount(cachedEntry.totalCount);
      }
      setCurrentPage(page);
      return;
    }

    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      const response = await sendJsonRequest(
        '/Feed',
        'POST',
        {
          page,
          count: FEEDS_PER_PAGE,
          filter,
          searchQuery: search
        },
        { signal: abortController.current.signal }
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch feeds');
      }

      const feedData: FeedListResponse = response;

      cache.current[cacheKey] = {
        feeds: feedData.feeds,
        totalCount: feedData.count,
        timestamp: Date.now()
      };

      if (isLoadMore) {
        setFeeds(prev => [...prev, ...feedData.feeds]);
      } else {
        setFeeds(feedData.feeds);
        setTotalCount(feedData.count);
      }

      setCurrentPage(page);
      setHasMore(feedData.feeds.length === FEEDS_PER_PAGE && 
                 (isLoadMore ? feeds.length + feedData.feeds.length : feedData.feeds.length) < feedData.count);

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching feeds:', err);
        setError(err.message || 'Failed to load feeds');
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sendJsonRequest, getCacheKey, isCacheValid, feeds.length]);

  // Load more feeds (infinite scroll)
  const loadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore) {
      fetchFeeds(searchQuery, filterValue, currentPage + 1, true);
    }
  }, [fetchFeeds, searchQuery, filterValue, currentPage, loadingMore, loading, hasMore]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchInput !== searchQuery) {
        updateUrlParams(searchInput, filterValue);
        resetFeedList();
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput, searchQuery, filterValue, updateUrlParams, resetFeedList]);


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
      updateUrlParams(searchQuery, newFilter);
      resetFeedList();
      setIsDropdownOpen(false);
    }
  }, [filterValue, searchQuery, updateUrlParams, resetFeedList]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    const cacheKey = getCacheKey(searchQuery, filterValue, 1);
    delete cache.current[cacheKey];
    
    resetFeedList();
    fetchFeeds(searchQuery, filterValue, 1);
  }, [searchQuery, filterValue, getCacheKey, resetFeedList, fetchFeeds]);


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

  // Initial fetch and URL parameter changes
  useEffect(() => {
    resetFeedList();
    fetchFeeds(searchQuery, filterValue, 1);
  }, [searchQuery, filterValue]);

  // Sync search input with URL
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Memoized filter dropdown
  const filterDropdown = useMemo(() => (
    <div className="dropdown dropstart">
      <button
        className="btn btn-light rounded-pill shadow-sm d-flex align-items-center gap-2 control-button"
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={loading}
      >
        <Filter size={16} className="text-muted" />
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

  const onGeneralUpdate = (feed: IFeed) => {
    setFeeds(feeds.map(f => f.id === feed.id ? feed : f))
    console.log("Feed updated in list", feed)
  };

  return (
    <div className="container py-4 feed-list-container">
      {/* Header */}
      <div className={`feed-list-header ${headerVisible ? 'visible' : 'hidden'}`}>
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
          <h2 className="h4 fw-bold text-dark mb-0">Feed</h2>

          {/* Controls */}
          <div className="d-flex align-items-center gap-2 w-100 w-md-auto">
            {/* Search */}
            <div className="position-relative flex-grow-1">
              <Search
                className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                size={16}
              />
              <input
                type="text"
                className="form-control ps-5 rounded-pill bg-light border-0 shadow-sm control-input"
                placeholder="Search feeds..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={loading || loadingMore}
              className="btn btn-light rounded-pill shadow-sm d-flex align-items-center justify-content-center gap-2 control-button"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin text-muted" : "text-muted"}
              />
              <span className="d-none d-sm-inline">Refresh</span>
            </button>

            {/* Filter Dropdown */}
            {filterDropdown}
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

      {/* Content */}
      <div className="feed-items">
        {error && (
          <div className="alert alert-danger rounded-4 border-0 d-flex align-items-center gap-3">
            <AlertCircle size={20} />
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
            <Loader2 className="animate-spin mb-3 text-primary" size={32} />
            <p className="text-muted">Loading feeds...</p>
          </div>
        )}

        {!loading && !error && feeds.length === 0 && (
          <div className="text-center py-5">
            <Search size={40} className="opacity-50 mb-3" />
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
                    onCommentsClick={(feedId) => navigate(`/feed/${feedId}`)}
                    commentCount={feed.answers || 0}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More */}
        {loadingMore && (
          <div className="text-center py-4">
            <Loader2 className="animate-spin mb-2 text-primary" size={24} />
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
        className="new-post-button"
        title="Create new post"
      >
        <span className="d-none d-md-inline">New Post</span>
        <Plus className="d-md-none" size={24} />
      </button>
    </div>
  );
};

export default FeedList;