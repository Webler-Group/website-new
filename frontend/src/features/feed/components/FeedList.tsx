import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageCircle, Heart, Share2, Pin, Loader2, Search, Filter } from 'lucide-react';
import { useApi } from '../../../context/apiCommunication';
import { getCurrentUserId } from './utils';
import { Feed } from './types';
import CreatePostModal from './CreatePostModal';
import FeedListItem from './FeedListItem';

interface FeedListProps {}

const FeedList: React.FC<FeedListProps> = () => {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState(1); // 1 = Most Recent
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const postsPerPage = 10;
  
  const { sendJsonRequest } = useApi();
  const navigate = useNavigate();
  const currentUserId = getCurrentUserId();

  const filterOptions = [
    { value: 1, label: 'Most Recent' },
    { value: 2, label: 'My Posts' },
    { value: 3, label: 'Following' },
    { value: 4, label: 'Hot Today' },
    { value: 5, label: 'Most Popular' },
    { value: 6, label: 'Most Shared' }
  ];

  const fetchFeeds = async (page = 1, reset = false) => {
    try {
      setLoading(true);
      
      const [feedsResponse] = await Promise.all([
        sendJsonRequest("/Feed/", "POST", {
          page: page,
          count: postsPerPage,
          filter: selectedFilter,
          searchQuery: searchQuery
        })
      ]);

      
    const mappedFeeds = feedsResponse.feeds.map((feed: any) => ({
        id: feed.id,
        type: feed.type,
        title: feed.title,
        message: feed.message,
        userId: feed.userId,
        userName: feed.userName,
        userAvatarImage: feed.userAvatarImage,
        date: feed.date,
        tags: feed.tags,
        votes: feed.votes,
        answers: feed.answers,
        shares: feed.shares,
        isUpvoted: feed.isUpvoted,
        isFollowing: feed.isFollowing,
        score: feed.score,
        originalPost: feed.originalPost,
        level: feed.level,
        roles: feed.roles,
        isPinned: feed.isPinned,
        isOriginalPostDeleted: feed.isOriginalPostDeleted ?? 2
    }))
    .sort((a: Feed, b: Feed) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)); 


      if (reset || page === 1) {
        setFeeds(mappedFeeds);
      } else {
        setFeeds(prev => [...prev, ...mappedFeeds]);
      }
      
      setCurrentPage(feedsResponse.currentPage);
      setTotalPages(feedsResponse.totalPages);
      setTotalCount(feedsResponse.count);
      
    } catch (err) {
      setError('Failed to load feeds');
      console.error('Error fetching feeds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeds(1, true);
  }, [selectedFilter, searchQuery]);

  useEffect(() => {
    fetchFeeds();
  }, [sendJsonRequest]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchFeeds(1, true);
  };

  const handleFilterChange = (filter: number) => {
    setSelectedFilter(filter);
    setCurrentPage(1);
  };

  const handleLoadMore = () => {
    if (currentPage < totalPages && !loading) {
      fetchFeeds(currentPage + 1, false);
    }
  };

  const handleCreatePost = async (message: string) => {
    try {
      await sendJsonRequest("/Feed/CreateFeed", "POST", { message });
      setShowCreateModal(false);
      fetchFeeds(1, true); // Refresh the feed list
    } catch (err) {
      console.error('Error creating post:', err);
      throw err;
    }
  };

  const handleFeedUpdate = (updatedFeed: Feed) => {
    setFeeds(prev => prev.map(feed => 
      feed.id === updatedFeed.id ? updatedFeed : feed
    ));
  };

  const handleFeedDelete = (deletedFeed: Feed) => {
    setFeeds(prev => prev.filter(feed => feed.id !== deletedFeed.id));
  };

  const handleCommentsClick = (feedId: string) => {
    navigate(`/feed/${feedId}`);
  };

  if (loading && feeds.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
        <Loader2 className="text-primary" style={{ width: "2.5rem", height: "2.5rem" }} />
      </div>
    );
  }

  if (error && feeds.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
        <div className="text-center">
          <h2 className="fw-semibold text-danger mb-3">{error}</h2>
          <button
            onClick={() => fetchFeeds(1, true)}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      <div className="container py-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="fw-bold text-dark mb-0">
            Feed 
            <small className="text-muted ms-2">({totalCount} posts)</small>
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary d-inline-flex align-items-center gap-2 rounded-pill px-4"
          >
            <Plus size={18} />
            Create Post
          </button>
        </div>

        {/* Search and Filters */}
        <div className="row g-3 mb-4">
          <div className="col-md-8">
            <form onSubmit={handleSearch} className="position-relative">
              <Search className="position-absolute top-50 translate-middle-y ms-3 text-muted" size={18} />
              <input
                type="text"
                className="form-control ps-5 rounded-pill border-0 shadow-sm"
                placeholder="Search posts, tags, or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
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
        {/* Regular Posts */}
        <div className="row g-3">
          {feeds.length === 0 ? (
            <div className="col-12 text-center py-5">
              <div className="text-muted mb-3">
                <MessageCircle size={48} />
              </div>
              <h4 className="fw-semibold text-muted mb-2">No posts found</h4>
              <p className="text-muted">
                {searchQuery ? 'Try adjusting your search or filters' : 'Be the first to share something!'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary rounded-pill px-4"
                >
                  Create First Post
                </button>
              )}
            </div>
          ) : (
            feeds.map(feed => (
              <div key={feed.id} className="col-12">
                <FeedListItem
                  feed={feed}
                  currentUserId={currentUserId ?? ""}
                  sendJsonRequest={sendJsonRequest}
                  onUpdate={handleFeedUpdate}
                  onDelete={handleFeedDelete}
                  onCommentsClick={handleCommentsClick}
                  onRefresh={fetchFeeds}
                />
              </div>
            ))
          )}
          
          {/* Load More Button */}
          {currentPage < totalPages && (
            <div className="col-12 text-center mt-4">
              <button
                onClick={handleLoadMore}
                className="btn btn-outline-primary rounded-pill px-4"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="me-2" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
      />
    </div>
  );
};

export default FeedList;