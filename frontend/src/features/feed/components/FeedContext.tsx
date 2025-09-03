import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
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
  addFeed: (feed: IFeed) => void;
  deleteFeed: (feedId: string) => void;
  editFeed: (feed: IFeed) => void;
  setFilter: (filter: number) => void;
  setQuery: (query: string) => void;
  scrollY: number;
  setScrollY: (y: number) => void;
}

const FeedContext = createContext<FeedStore | null>(null);

export const FeedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sendJsonRequest } = useApi();

  // ---------- state ----------
  const [results, setResults] = useState<IFeed[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filterState, setFilterState] = useState(1);
  const [queryState, setQueryState] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  const pinnedPosts = useMemo(
    () => results.filter(f => f.isPinned),
    [results]
  );

  // ---------- fetch feeds ----------
  const fetchFeeds = useCallback(
    async ({ reset }: { reset?: boolean } = {}) => {
      if (isLoading) return;
      setIsLoading(true);

      const currentPage = reset ? 1 : page;

      const result = await sendJsonRequest("/Feed", "POST", {
        count: 10,
        page: currentPage,
        filter: filterState,
        searchQuery: queryState,
      });

      if (result?.success) {
        if (reset || currentPage === 1) {
          setResults(result.feeds);
        } else {
          setResults(prev => [...prev, ...result.feeds]);
        }
        setTotalCount(result.count);
        setHasNextPage(result.feeds.length === 10);
        setPage(currentPage + 1);
      }

      setIsLoading(false);
    },
    [page, filterState, queryState, isLoading, sendJsonRequest]
  );

  // ---------- helpers ----------
  const addFeed = (feed: IFeed) => setResults(prev => [feed, ...prev]);

  const deleteFeed = (feedId: string) =>
    setResults(prev => prev.filter(f => f.id !== feedId));

  const editFeed = (feed: IFeed) =>
    setResults(prev => prev.map(f => (f.id === feed.id ? { ...f, ...feed } : f)));

  // ---------- filter & query changes ----------
  const setFilter = (newFilter: number) => {
    setFilterState(newFilter);
    setPage(1);
    setResults([]);
  };

  const setQuery = (newQuery: string) => {
    setQueryState(newQuery);
    setPage(1);
    setResults([]);
  };

  // ---------- auto-fetch whenever filter/query changes (and on first mount) ----------
  useEffect(() => {
    fetchFeeds({ reset: true });
  }, [filterState, queryState]); 

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
        addFeed,
        deleteFeed,
        editFeed,
        setFilter,
        setQuery,
        scrollY,
        setScrollY,
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
