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
  pinnedPosts: IFeed[];
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
  togglePin: (feedId: string, isPinned: boolean) => Promise<void>;
}

const FeedContext = createContext<FeedStore | null>(null);

export const FeedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sendJsonRequest } = useApi();

  const [results, setResults] = useState<IFeed[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<IFeed[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filterState, setFilterState] = useState(1);
  const [queryState, setQueryState] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  const currentRequestRef = useRef<{
    filter: number;
    query: string;
    page: number;
  } | null>(null);

  // ---------- fetch pinned feeds ----------
  const fetchPinnedFeeds = useCallback(async () => {
    try {
      const result = await sendJsonRequest("/Feed", "POST", {
        count: 20,
        page: 1,
        filter: 7, // pinned posts
        searchQuery: "",
      });

      if (result?.success && Array.isArray(result.feeds)) {
        setPinnedPosts(result.feeds);
      } else {
        setPinnedPosts([]);
      }
    } catch (err) {
      console.error("Error fetching pinned feeds:", err);
      setPinnedPosts([]);
    }
  }, [sendJsonRequest]);

  // ---------- fetch normal feeds ----------
  const fetchFeeds = useCallback(
    async ({ reset }: { reset?: boolean } = {}) => {
      if (isLoading) return;

      const currentPage = reset ? 1 : page;
      const requestParams = {
        filter: filterState,
        query: queryState,
        page: currentPage,
      };

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
        } else {
          if (reset) {
            setResults([]);
            setTotalCount(0);
            setHasNextPage(false);
          }
        }
      } catch (error) {
        console.error('Error fetching feeds:', error);
        if (reset) {
          setResults([]);
          setTotalCount(0);
          setHasNextPage(false);
        }
      } finally {
        setIsLoading(false);
        currentRequestRef.current = null;
      }
    },
    [page, filterState, queryState, isLoading, sendJsonRequest]
  );

  // ---------- helpers ----------
  const addFeed = useCallback((feed: IFeed) => {
    setResults(prev => {
      const exists = prev.some(f => f.id === feed.id);
      if (exists) {
        return prev.map(f => f.id === feed.id ? feed : f);
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
    setPinnedPosts(prev => prev.filter(f => f.id !== feedId));
  }, []);

  const editFeed = useCallback((feed: IFeed) => {
    setResults(prev => prev.map(f => (f.id === feed.id ? { ...f, ...feed } : f)));
    setPinnedPosts(prev => prev.map(f => (f.id === feed.id ? { ...f, ...feed } : f)));
  }, []);

  // ---------- filter & query changes ----------
  const setFilter = useCallback((newFilter: number) => {
    if (newFilter === filterState) return; 
    
    setFilterState(newFilter);
    setPage(1);
    setResults([]);
    setTotalCount(0);
    setHasNextPage(true);
  }, [filterState]);

  const setQuery = useCallback((newQuery: string) => {
    if (newQuery === queryState) return;
    
    setQueryState(newQuery);
    setPage(1);
    setResults([]);
    setTotalCount(0);
    setHasNextPage(true);
  }, [queryState]);

  // fetch pinned once on mount
  useEffect(() => {
    fetchPinnedFeeds();
  }, [fetchPinnedFeeds]);

  // refetch feeds on filter/query change
  useEffect(() => {
    currentRequestRef.current = null;
    
    const timeoutId = setTimeout(() => {
      fetchFeeds({ reset: true });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [filterState, queryState]);

  useEffect(() => {
    fetchFeeds({ reset: true });
  }, []);

  const togglePin = useCallback(
    async (feedId: string, isPinned: boolean) => {
      try {
        // Optimistic UI update
        if (isPinned) {
          setResults(prev =>
            prev.map(f => f.id === feedId ? { ...f, isPinned: true } : f)
          );
          setPinnedPosts(prev => {
            const exists = prev.some(f => f.id === feedId);
            if (!exists) {
              const feed = results.find(f => f.id === feedId);
              if (feed) return [{ ...feed, isPinned: true }, ...prev];
            }
            return prev.map(f => f.id === feedId ? { ...f, isPinned: true } : f);
          });
        } else {
          setResults(prev =>
            prev.map(f => f.id === feedId ? { ...f, isPinned: false } : f)
          );
          setPinnedPosts(prev => prev.filter(f => f.id !== feedId));
        }

        // Call backend to persist
        await sendJsonRequest("/Feed/PinToggle", "POST", {
          feedId,
          isPinned,
        });

        // Optional: re-sync from backend
        fetchPinnedFeeds();
      } catch (err) {
        console.error("Error toggling pin:", err);
        // Optionally revert optimistic update if request failed
        fetchPinnedFeeds();
      }
    },
    [results, sendJsonRequest, fetchPinnedFeeds]
  );


  return (
    <FeedContext.Provider
      value={{
        results,
        pinnedPosts,
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
        togglePin,
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
