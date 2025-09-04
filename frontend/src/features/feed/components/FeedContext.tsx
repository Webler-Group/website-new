import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { IFeed } from "../components/types";
import { useApi } from "../../../context/apiCommunication";

interface FeedStore {
  results: IFeed[];
  totalCount: number;
  page: number;
  filter: number;
  query: string;
  isLoading: boolean;
  hasNextPage: boolean;
  fetchFeeds: (opts?: { reset?: boolean }) => Promise<void>;
  fetchPinnedFeeds: () => Promise<void>;
  addFeed: (feed: IFeed) => void;
  deleteFeed: (feedId: string) => void;
  editFeed: (feed: IFeed) => void;
  setFilter: (filter: number) => void;
  setQuery: (query: string) => void;
  scrollY: number;
  setScrollY: (y: number) => void;
  pinnedPosts: IFeed[];
  setPinnedPosts: (posts: IFeed[]) => void;
}

const FeedContext = createContext<FeedStore | null>(null);

export const FeedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sendJsonRequest } = useApi();

  const [results, setResults] = useState<IFeed[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filterState, setFilterState] = useState(1);
  const [queryState, setQueryState] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [pinnedPosts, setPinnedPosts] = useState<IFeed[]>([]);

  const currentRequestRef = useRef<{
    filter: number;
    query: string;
    page: number;
  } | null>(null);

  const isInitializedRef = useRef(false);

  // ---------- fetch feeds ----------
  const fetchFeeds = useCallback(
    async ({ reset }: { reset?: boolean } = {}) => {
      if (isLoading) return;

      const currentPage = reset ? 1 : page;
      const requestParams = {
        filter: filterState,
        query: queryState,
        page: currentPage,
      };

      // Prevent duplicate requests
      if (
        currentRequestRef.current &&
        currentRequestRef.current.filter === requestParams.filter &&
        currentRequestRef.current.query === requestParams.query &&
        currentRequestRef.current.page === requestParams.page
      ) {
        return;
      }

      currentRequestRef.current = requestParams;
      setIsLoading(true);

      try {
        const result = await sendJsonRequest("/Feed", "POST", {
          count: 10,
          page: currentPage,
          filter: filterState,
          searchQuery: queryState,
        });

        // Check if request is still relevant
        if (
          currentRequestRef.current?.filter !== filterState ||
          currentRequestRef.current?.query !== queryState
        ) {
          return;
        }

        if (result?.success && Array.isArray(result.feeds)) {
          if (reset) {
            setResults(result.feeds);
            setPage(2);
            setHasNextPage(result.feeds.length === 10);
          } else {
            setResults(prev => {
              const existingIds = new Set(prev.map(f => f.id));
              const newFeeds = result.feeds.filter((f: IFeed) => !existingIds.has(f.id));
              return [...prev, ...newFeeds];
            });
            setPage(currentPage + 1);
            setHasNextPage(result.feeds.length === 10);
          }

          setTotalCount(result.count || 0);
        } else if (reset) {
          setResults([]);
          setTotalCount(0);
          setHasNextPage(false);
        }
      } catch (error) {
        console.error("Error fetching feeds:", error);
        if (reset) {
          setResults([]);
          setTotalCount(0);
          setHasNextPage(false);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [page, filterState, queryState, isLoading, sendJsonRequest]
  );

  // ---------- fetch pinned feeds ----------
  const fetchPinnedFeeds = useCallback(async () => {
    try {
      const result = await sendJsonRequest("/Feed", "POST", {
        count: 30, // fetch 30 pinned feeds
        page: 1,
        filter: 7,
        searchQuery: "",
      });
      console.log(result)
      if (result?.success && Array.isArray(result.feeds)) {
        setPinnedPosts(result.feeds);
      } else {
        setPinnedPosts([]);
      }
    } catch (error) {
      console.error("Error fetching pinned feeds:", error);
      setPinnedPosts([]);
    }
  }, []);

  // ---------- helpers ----------
  const addFeed = useCallback((feed: IFeed) => {
    setResults(prev => {
      const exists = prev.some(f => f.id === feed.id);
      if (exists) {
        return prev.map(f => (f.id === feed.id ? feed : f));
      }
      return [feed, ...prev];
    });
    setTotalCount(prev => prev + 1);
  }, []);

  const deleteFeed = useCallback((feedId: string) => {
    setResults(prev => {
      const filtered = prev.filter(f => f.id !== feedId);
      if (filtered.length < prev.length) {
        setTotalCount(prevCount => Math.max(0, prevCount - 1));
      }
      return filtered;
    });
  }, []);

  const editFeed = useCallback((feed: IFeed) => {
    setResults(prev => prev.map(f => (f.id === feed.id ? { ...f, ...feed } : f)));
    setPinnedPosts(prev => prev.map(f => (f.id === feed.id ? { ...f, ...feed } : f)));
  }, []);

  // ---------- filter & query changes ----------
  const setFilter = useCallback(
    (newFilter: number) => {
      if (newFilter === filterState) return;
      setFilterState(newFilter);
      setPage(1);
      setResults([]);
      setTotalCount(0);
      setHasNextPage(true);
    },
    [filterState]
  );

  const setQuery = useCallback(
    (newQuery: string) => {
      if (newQuery === queryState) return;
      setQueryState(newQuery);
      setPage(1);
      setResults([]);
      setTotalCount(0);
      setHasNextPage(true);
    },
    [queryState]
  );

  // Single initialization effect
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      fetchFeeds({ reset: true }).catch(console.error);
      fetchPinnedFeeds().catch(console.error);
    }
  }, []);

  // Refetch feeds when filter/query changes
  useEffect(() => {
    if (!isInitializedRef.current) return;
    currentRequestRef.current = null;

    const timeoutId = setTimeout(() => {
      fetchFeeds({ reset: true });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filterState, queryState]);

  return (
    <FeedContext.Provider
      value={{
        results,
        totalCount,
        page,
        filter: filterState,
        query: queryState,
        isLoading,
        hasNextPage,
        fetchFeeds,
        fetchPinnedFeeds,
        addFeed,
        deleteFeed,
        editFeed,
        setFilter,
        setQuery,
        scrollY,
        setScrollY,
        pinnedPosts,
        setPinnedPosts
      }}
    >
      {children}
    </FeedContext.Provider>
  );
};

export const useFeedContext = () => {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error("useFeedContext must be used inside FeedProvider");
  return ctx;
};

export default FeedContext;
