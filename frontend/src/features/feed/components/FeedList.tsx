import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Filter, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../../context/apiCommunication';
import { IFeed } from './types';
import FeedItem from './FeedItem';

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
  
  // Search input state (initialize with URL value to prevent mismatch)
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
    
    // Check cache first
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

    // Cancel previous request
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
      
      // Cache the result
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

  // Debounced search handler
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

  // Filter change handler
  const handleFilterChange = useCallback((newFilter: number) => {
    if (newFilter !== filterValue) {
      updateUrlParams(searchQuery, newFilter);
      resetFeedList();
    }
  }, [filterValue, searchQuery, updateUrlParams, resetFeedList]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    // Clear cache for current query
    const cacheKey = getCacheKey(searchQuery, filterValue, 1);
    delete cache.current[cacheKey];
    
    resetFeedList();
    fetchFeeds(searchQuery, filterValue, 1);
  }, [searchQuery, filterValue, getCacheKey, resetFeedList, fetchFeeds]);

  // Feed update handler
  const handleFeedUpdate = useCallback((updatedFeed: IFeed) => {
    setFeeds(prevFeeds => 
      prevFeeds.map(feed => 
        feed.id === updatedFeed.id ? updatedFeed : feed
      )
    );
  }, []);

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
  }, [searchQuery, filterValue]); // Only depend on URL params

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

  // Memoized filter options
  const filterButtons = useMemo(() => (
    FILTER_OPTIONS.map(option => (
      <button
        key={option.value}
        onClick={() => handleFilterChange(option.value)}
        className={`btn btn-sm rounded-pill border-0 ${
          filterValue === option.value 
            ? 'btn-primary text-white shadow-sm' 
            : 'btn-light text-muted'
        }`}
        disabled={loading}
      >
        {option.label}
      </button>
    ))
  ), [filterValue, handleFilterChange, loading]);

  return (
    <div className="container-fluid px-3 py-4">
      {/* Header Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-between">
            <h2 className="h4 mb-0 fw-bold text-dark">Feed</h2>
            
            {/* Controls */}
            <div className="d-flex flex-column flex-sm-row gap-2 align-items-stretch align-items-sm-center">
              {/* Search Input */}
              <div className="position-relative">
                <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={16} />
                <input
                  type="text"
                  className="form-control ps-5 rounded-pill border-0 bg-light"
                  placeholder="Search feeds..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  disabled={loading}
                  style={{ minWidth: '250px' }}
                />
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={loading || loadingMore}
                className="btn btn-outline-secondary rounded-pill border-0 bg-light d-flex align-items-center gap-2"
                title="Refresh feeds"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span className="d-none d-sm-inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="d-flex flex-wrap gap-2 mt-3">
            <Filter size={16} className="text-muted mt-1 me-1" />
            {filterButtons}
          </div>

          {/* Results Info */}
          {!loading && !error && (
            <div className="mt-2">
              <small className="text-muted">
                {searchQuery ? (
                  <>Showing {feeds.length} of {totalCount} results for "{searchQuery}"</>
                ) : (
                  <>Showing {feeds.length} of {totalCount} feeds</>
                )}
              </small>
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="row">
        <div className="col-12">
          {/* Error State */}
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

          {/* Loading State (Initial) */}
          {loading && feeds.length === 0 && (
            <div className="text-center py-5">
              <Loader2 className="animate-spin mb-3 text-primary" size={32} />
              <p className="text-muted">Loading feeds...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && feeds.length === 0 && (
            <div className="text-center py-5">
              <div className="text-muted mb-3">
                <Search size={48} className="opacity-50" />
              </div>
              <h5 className="text-muted">No feeds found</h5>
              <p className="text-muted">
                {searchQuery 
                  ? `No results found for "${searchQuery}". Try adjusting your search or filters.`
                  : 'No feeds available at the moment.'
                }
              </p>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    updateUrlParams('', filterValue);
                  }}
                  className="btn btn-outline-primary rounded-pill"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

          {/* Feed Items */}
          {feeds.map((feed, index) => {
            const isLast = index === feeds.length - 1;
            return (
              <FeedItem
                key={feed.id}
                ref={isLast ? lastFeedRef : undefined}
                feed={feed}
                onGeneralUpdate={handleFeedUpdate}
                onCommentsClick={(feedId) => navigate(`/feed/${feedId}`)}
                commentCount={feed.answers || 0}
              />
            );
          })}

          {/* Load More Indicator */}
          {loadingMore && (
            <div className="text-center py-4">
              <Loader2 className="animate-spin mb-2 text-primary" size={24} />
              <p className="text-muted mb-0">Loading more feeds...</p>
            </div>
          )}

          {/* End of Results */}
          {!hasMore && feeds.length > 0 && (
            <div className="text-center py-4">
              <div className="text-muted">
                <hr className="my-3" />
                <small>You've reached the end of the feed</small>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedList;