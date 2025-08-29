import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageCircle, Loader2, Filter } from 'lucide-react';
import { useApi } from '../../../context/apiCommunication';
import { IFeed } from './types';
import FeedListItem from './FeedListItem';
import NotificationToast from './comments/NotificationToast';
import useFeed from '../hook/useFeeds';
import { useAuth } from '../../auth/context/authContext';

const filterOptions = [
  { value: 1, label: 'Most Recent' },
  { value: 2, label: 'My Posts' },
  { value: 3, label: 'Following' },
  { value: 4, label: 'Hot Today' },
  { value: 5, label: 'Most Popular' },
  { value: 6, label: 'Most Shared' }
];

const postsPerPage = 10;

interface FeedListProps { }

const FeedList: React.FC<FeedListProps> = () => {
  const [selectedFilter, setSelectedFilter] = useState(1); // 1 = Most Recent
  const [currentPage, setCurrentPage] = useState({ page: 1, _state: 0 });
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const { userInfo } = useAuth();
  const {
    results,
    isLoading,
    totalCount,
    hasNextPage,
    deleteFeed,
    editFeed
  } = useFeed(postsPerPage, currentPage, selectedFilter);
  const { sendJsonRequest } = useApi();
  const navigate = useNavigate();
  const currentUserId = userInfo?.id;

  useEffect(() => {
    setCurrentPage({ page: 1, _state: 1 });
  }, [selectedFilter]);

  const intObserver = useRef<IntersectionObserver>()
  const lastFeedElemRef = useCallback((elem: any) => {
    if (isLoading) return

    if (intObserver.current) intObserver.current.disconnect()

    intObserver.current = new IntersectionObserver(elems => {

      if (elems[0].isIntersecting && hasNextPage) {

        setCurrentPage(prev => ({ page: prev.page + 1, _state: 1 }));
      }
    })

    if (elem) intObserver.current.observe(elem)
  }, [isLoading, hasNextPage]);

  // const showNotification = (type: 'success' | 'error', message: string) => {
  //   setNotification({ type, message });
  //   setTimeout(() => setNotification(null), 5000); // Auto-hide after 5 seconds
  // };

  // const fetchFeeds = async (page = 1, reset = false) => {
  //   try {
  //     setLoading(true);

  //     const feedsResponse = await sendJsonRequest("/Feed/", "POST", {
  //       page,
  //       count: postsPerPage,
  //       filter: selectedFilter,
  //       searchQuery
  //     });

  //     if(!feedsResponse.success) {
  //       throw new Error(feedsResponse.message)
  //     }

  //     // Step 1: Collect all attachment IDs
  //     const allAttachmentIds = feedsResponse.feeds
  //       .flatMap((feed: any) => feed.attachments?.map((att: any) => att.id) || []);

  //     let attachmentDetails: any[] = [];
  //     if (allAttachmentIds.length > 0) {
  //       // Step 2: Fetch attachment details
  //       attachmentDetails = await sendJsonRequest(
  //         "/PostAttachments/GetPostAttachments",
  //         "POST",
  //         { attachmentIds: allAttachmentIds }
  //       );
  //     }

  //     // Step 3: Create lookup by attachmentId
  //     const attachmentMap: Record<string, any> = {};
  //     attachmentDetails.forEach((att: any) => {
  //       attachmentMap[att.id] = att;
  //     });

  //     // Step 4: Map feeds and inject attachment details
  //     const mappedFeeds = feedsResponse.feeds.map((feed: any) => ({
  //       id: feed.id,
  //       type: feed.type,
  //       title: feed.title,
  //       message: feed.message,
  //       userId: feed.userId,
  //       userName: feed.userName,
  //       userAvatarImage: feed.userAvatarImage,
  //       date: feed.date,
  //       tags: feed.tags,
  //       votes: feed.votes,
  //       answers: feed.answers,
  //       shares: feed.shares,
  //       isUpvoted: feed.isUpvoted,
  //       isFollowing: feed.isFollowing,
  //       score: feed.score,
  //       originalPost: feed.originalPost,
  //       level: feed.level,
  //       roles: feed.roles,
  //       isPinned: feed.isPinned,
  //       isOriginalPostDeleted: feed.isOriginalPostDeleted ?? 2,
  //       attachments: (feed.attachments || []).map((att: any) => ({
  //         ...att,
  //         details: attachmentMap[att.id] || null   // 👈 inject details here
  //       }))
  //     }))
  //     .sort((a: IFeed, b: IFeed) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  //     if (reset || page === 1) {
  //       setFeeds(mappedFeeds);
  //     } else {
  //       setFeeds(prev => [...prev, ...mappedFeeds]);
  //     }

  //     setCurrentPage(feedsResponse.currentPage);
  //     setTotalPages(feedsResponse.totalPages);
  //     setTotalCount(feedsResponse.count);

  //   } catch (err) {
  //     setError('Failed to load feeds');
  //     console.error('Error fetching feeds:', err);
  //     showNotification("error", String(err))
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleFilterChange = (filter: number) => {
    setSelectedFilter(filter);
  };

  const handleFeedUpdate = (updatedFeed: IFeed) => {
    editFeed(updatedFeed);
  };

  const handleFeedDelete = (deletedFeed: IFeed) => {
    deleteFeed(deletedFeed.id);
  };

  const handleCommentsClick = (feedId: string) => {
    navigate(`/Feed/${feedId}`);
  };

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
        <div className="row g-3 mb-4">
          <div className="col-md-12">
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
        {/* Regular Posts */}
        <div className="row g-3">
          {results.length === 0 ? (
            <div className="col-12 text-center py-5">
              <div className="text-muted mb-3">
                <MessageCircle size={48} />
              </div>
              <h4 className="fw-semibold text-muted mb-2">No posts found</h4>
            </div>
          ) : (
            results.map(feed => (
              <div key={feed.id} className="col-12">
                <FeedListItem
                  ref={lastFeedElemRef}
                  feed={feed}
                  currentUserId={currentUserId ?? ""}
                  sendJsonRequest={sendJsonRequest}
                  onUpdate={handleFeedUpdate}
                  onDelete={handleFeedDelete}
                  onCommentsClick={handleCommentsClick}
                  onRefresh={() => { }}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedList;