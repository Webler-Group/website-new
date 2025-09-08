import { useCallback, useEffect, useRef, useState } from "react";
import { IFeed } from "../components/types";
import { useApi } from "../../../context/apiCommunication";

const FEEDS_PER_PAGE = 10;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

const useFeeds = (searchQuery: string, filterValue: number) => {
    const { sendJsonRequest } = useApi();

    const cache = useRef<FeedCache>({});
    const abortController = useRef<AbortController | null>(null);

    const [feeds, setFeeds] = useState<IFeed[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Initial fetch and URL parameter changes
      useEffect(() => {
        resetFeedList();
        fetchFeeds(searchQuery, filterValue, 1);
      }, [searchQuery, filterValue]);

    // Reset feeds and pagination
    const resetFeedList = () => {
        setFeeds([]);
        setCurrentPage(1);
        setHasMore(true);
        setError(null);
        setTotalCount(0);
    }

    // Generate cache key
    const getCacheKey = useCallback((search: string, filter: number, page: number) => {
        return `${search}-${filter}-${page}`;
    }, []);

    // Check if cache entry is valid
    const isCacheValid = useCallback((entry: CacheEntry): boolean => {
        return Date.now() - entry.timestamp < CACHE_DURATION;
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

    // Refresh handler
    const handleRefresh = useCallback(() => {
        const cacheKey = getCacheKey(searchQuery, filterValue, 1);
        delete cache.current[cacheKey];

        resetFeedList();
        fetchFeeds(searchQuery, filterValue, 1);
    }, [searchQuery, filterValue, getCacheKey, resetFeedList, fetchFeeds]);

    const onGeneralUpdate = (feed: IFeed) => {
        setFeeds(prev => prev.map(f => f.id === feed.id ? feed : f))
    };

    const onDelete = (feed: IFeed) => {
        setFeeds(prev => prev.filter(f => f.id !== feed.id))
    }

    return {
        feeds,
        error,
        loading,
        loadingMore,
        totalCount,
        hasMore,
        resetFeedList,
        loadMore,
        handleRefresh,
        onGeneralUpdate,
        onDelete
    }
}

export default useFeeds;