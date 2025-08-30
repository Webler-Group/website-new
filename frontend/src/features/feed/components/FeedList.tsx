import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, MessageCircle, Loader2, Filter, ChevronDown, ChevronUp, Pin } from 'lucide-react';
import { IFeed } from './types';
import FeedListItem from './FeedListItem';
import NotificationToast from './comments/NotificationToast';
import useFeed from '../hook/useFeeds';
import { TagSearch } from '../../../components/InputTags';
import { useAuth } from '../../auth/context/authContext';

const postsPerPage = 10;

interface FeedListProps { }

const FeedList: React.FC<FeedListProps> = () => {
  const [selectedFilter, setSelectedFilter] = useState(1); // 1 = Most Recent
  const [pinnedPostsExpanded, setPinnedPostsExpanded] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const { userInfo } = useAuth();
  const [feedsStore, setFeedStore] = useState({ page: 0, filter: 1, query: "" });
  const [pinnedFeedsStore, _] = useState({ page: 1, filter: 7, query: "" });

  // Main feed hook
  const {
    results,
    isLoading,
    totalCount,
    hasNextPage,
    deleteFeed,
    editFeed
  } = useFeed(postsPerPage, feedsStore);

  // Pinned posts hook - fetch pinned posts (filter 7)
  const {
    results: pinnedPosts,
    isLoading: pinnedLoading,
    deleteFeed: deletePinnedFeed,
    editFeed: editPinnedFeed,
    addFeed: addPinnedFeed
  } = useFeed(50, pinnedFeedsStore); // Fetch up to 50 pinned posts

  useEffect(() => {
    if (searchParams.has("filter")) {
      setSelectedFilter(Number(searchParams.get("filter")))
    }
    if (searchParams.has("query")) {
      setSearchQuery(searchParams.get("query")!)
    }
  }, []);

  useEffect(() => {
    const filter = searchParams.has("filter") ? Number(searchParams.get("filter")) : 1;
      const searchQuery = searchParams.has("query") ? searchParams.get("query")! : "";
    if (searchParams.has("filter")) {
      setSelectedFilter(Number(searchParams.get("filter")))
    }
    if (searchParams.has("query")) {
      setSearchQuery(searchParams.get("query")!)
    }
    console.log(1);
    setFeedStore({ page: 1, filter, query: searchQuery });
  }, [searchParams]);

  const intObserver = useRef<IntersectionObserver>()
  const lastFeedElemRef = useCallback((elem: any) => {
    if (isLoading) return

    if (intObserver.current) intObserver.current.disconnect()

    intObserver.current = new IntersectionObserver(elems => {
      if (elems[0].isIntersecting && hasNextPage) {
        setFeedStore(prev => ({ ...prev, page: prev.page + 1 }));
      }
    })

    if (elem) intObserver.current.observe(elem)
  }, [isLoading, hasNextPage]);

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

  const handleFilterChange = (filter: number) => {
    searchParams.set("filter", filter.toString());
    setSearchParams(searchParams, { replace: true });
    setSelectedFilter(filter);
  };

  const handleSearch = (value: string) => {
    searchParams.set("query", value);
    setSearchParams(searchParams, { replace: true });
    setSearchQuery(value);
  }

  const handleFeedUpdate = (updatedFeed: IFeed) => {
    // If pin status changed, refresh pinned posts list
    if (updatedFeed.isPinned !== results.find(f => f.id === updatedFeed.id)?.isPinned) {
      if (updatedFeed.isPinned) {
        addPinnedFeed({ ...updatedFeed });
      } else {
        // If unpinned, remove from pinned list
        deletePinnedFeed(updatedFeed.id);
      }
    } else {
      editPinnedFeed(updatedFeed);
    }
    editFeed(updatedFeed);
  };

  const handleFeedDelete = (deletedFeed: IFeed) => {
    deleteFeed(deletedFeed.id);
    // Also remove from pinned posts if it was pinned
    if (deletedFeed.isPinned) {
      deletePinnedFeed(deletedFeed.id);
    }
  };

  const handlePinnedFeedUpdate = (updatedFeed: IFeed) => {
    // Update main feed if the updated feed appears there
    editFeed(updatedFeed);
    // If unpinned, remove from pinned list
    if (!updatedFeed.isPinned) {
      deletePinnedFeed(updatedFeed.id);
    } else {
      editPinnedFeed(updatedFeed);
    }
  };

  const handlePinnedFeedDelete = (deletedFeed: IFeed) => {
    deletePinnedFeed(deletedFeed.id);
    // Also remove from main feed if it appears there
    deleteFeed(deletedFeed.id);
  };

  const handleCommentsClick = (feedId: string) => {
    navigate(`/Feed/${feedId}`);
  };

  if (isLoading && results.length === 0 && pinnedLoading) {
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
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="fw-bold text-dark mb-0">
            Feed
            <small className="text-muted ms-2">({totalCount} posts)</small>
          </h1>
          <button
            onClick={() => navigate("/Feed/New")}
            className="btn btn-primary d-inline-flex align-items-center gap-2 rounded-pill px-4"
          >
            <Plus size={18} />
            Create Post
          </button>
        </div>

        {/* Search and Filters */}
        <div className="row g-3 mb-4 align-items-center">
          <div className='col-md-8'>
            <TagSearch query={searchQuery} handleSearch={handleSearch} placeholder='Search by tags or content' />
          </div>
          <div className="col-md-4">
            <div className="dropdown w-100">
              <button
                className="btn btn-outline-secondary dropdown-toggle w-100 d-flex align-items-center justify-content-between rounded-pill"
                data-bs-toggle="dropdown"
              >
                <span className="d-flex align-items-center gap-2">
                  <Filter size={16} />
                  {filterOptions.find(f => f.value === selectedFilter)?.label}
                </span>
              </button>
              <ul className="dropdown-menu w-100">
                {filterOptions.map(option => (
                  <li key={option.value}>
                    <button
                      className={`dropdown-item ${selectedFilter === option.value ? 'active' : ''}`}
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
                className="card-header bg-warning bg-opacity-10 border-warning cursor-pointer"
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
                  {pinnedPostsExpanded ? (
                    <ChevronUp size={16} className="text-warning" />
                  ) : (
                    <ChevronDown size={16} className="text-warning" />
                  )}
                </div>
              </div>

              {pinnedPostsExpanded && (
                <div className="card-body p-0">
                  {pinnedLoading ? (
                    <div className="text-center py-3">
                      <Loader2 className="text-warning" size={20} />
                    </div>
                  ) : (
                    <div className="row g-0">
                      {pinnedPosts.map((feed, index) => (
                        <div key={feed.id} className={`col-12 ${index > 0 ? 'border-top' : ''}`}>
                          <div className="p-3">
                            <FeedListItem
                              feed={feed}
                              onUpdate={handlePinnedFeedUpdate}
                              onDelete={handlePinnedFeedDelete}
                              onCommentsClick={handleCommentsClick}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Regular Posts */}
        <div className="row g-3">
          {results.length === 0 && !isLoading ? (
            <div className="col-12 text-center py-5">
              <div className="text-muted mb-3">
                <MessageCircle size={48} />
              </div>
              <h4 className="fw-semibold text-muted mb-2">No posts found</h4>
            </div>
          ) : (
            results.map((feed, i) => (
              i == results.length - 1 ?
                <div key={feed.id} className="col-12">
                  <FeedListItem
                    ref={lastFeedElemRef}
                    feed={feed}
                    onUpdate={handleFeedUpdate}
                    onDelete={handleFeedDelete}
                    onCommentsClick={handleCommentsClick}
                  />
                </div>
                :
                <div key={feed.id} className="col-12">
                  <FeedListItem
                    feed={feed}
                    onUpdate={handleFeedUpdate}
                    onDelete={handleFeedDelete}
                    onCommentsClick={handleCommentsClick}
                  />
                </div>
            ))
          )}
          {isLoading && results.length > 0 && (
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