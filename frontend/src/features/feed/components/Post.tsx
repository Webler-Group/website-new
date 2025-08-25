import { useEffect, useState } from "react";
import { Container, Badge } from "react-bootstrap";
import { useApi } from "../../../context/apiCommunication";
import { useAuth } from "../../auth/context/authContext";
import { Modal, Button, Form } from "react-bootstrap"; // add bootstrap modal
import ProfileAvatar from "../../../components/ProfileAvatar";


interface Feed {
  id: string;
  type: number;
  title: string | null;
  message: string;
  userName: string;
  date: string;
  tags: string[];
  votes?: number;
  shares?: number;
  answers?: number;
  userAvatarImage?: string | null;
  originalPost?: Feed | null;
  userVote?: number; // 0 = not voted, 1 = upvoted
}

interface Reply {
  id: string;
  message: string;
  date: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  level: number;
  roles: string[];
  votes: number;
  answers: number;
  isUpvoted: boolean;
}

const Post = () => {
  const { sendJsonRequest } = useApi();
  const user  = useAuth(); 
  let avatarImage = user.userInfo?.avatarImage || null

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState<Feed[]>([]);
  const [replies, setReplies] = useState<{[key: string]: Reply[]}>({});
  const [showReplies, setShowReplies] = useState<{[key: string]: boolean}>({});
  const [replyText, setReplyText] = useState<{[key: string]: string}>({});

// inside your Post component:
const [showShareModal, setShowShareModal] = useState(false);
const [sharePostId, setSharePostId] = useState<string | null>(null);
const [shareTitle, setShareTitle] = useState("");
const [shareMessage, setShareMessage] = useState("");

// Open modal
function openShareModal(postId: string) {
  setSharePostId(postId);
  setShareTitle("");
  setShareMessage("");
  setShowShareModal(true);
}

// Handle share
async function handleSharePost() {
  if (!sharePostId) return;

  const result = await sendJsonRequest("/Feed/ShareFeed", "POST", {
    feedId: sharePostId,
    title: shareTitle,
    message: shareMessage,
    tags: ["c++"] 
  });

  if (result && result.feed) {
    const newSharedPost: Feed = {
      id: result.feed.id,
      type: 5,
      title: result.feed.title,
      message: result.feed.message,
      userName: "You",
      date: new Date().toISOString(),
      tags: result.feed.tags || [],
      userAvatarImage: avatarImage,
      originalPost: posts.find(p => p.id === sharePostId) || null,
      userVote: 0,
      votes: 0,
      shares: 0,
      answers: 0,
    };

    setPosts((current) => [newSharedPost, ...current]);
    setShowShareModal(false);

    // Update share count of original post
    setPosts(current => 
      current.map(post =>
        post.id === sharePostId 
          ? { ...post, shares: (post.shares || 0) + 1 }
          : post
      )
    );
  }
}


  function handleTitleChange(e: any) {
    setTitle(e.target.value);
  }

  function handleContentChange(e: any) {
    setContent(e.target.value);
  }

  async function getFeedList() {
    const result = await sendJsonRequest("/Feed/", "POST", {
      page: 1,
      count: 10,
      filter: 1,
      searchQuery: "",
    });

    if (result && result.feeds) {
      setPosts(result.feeds);
    }
  }

  useEffect(() => {
    getFeedList();
  }, []);

  async function handleCreatePost() {
    const result = await sendJsonRequest("/Feed/CreateFeed", "POST", {
        title: title,
        message: content
    });

    if (!result.feed) {
      alert(result.message)
      return;
    }

    const newPost: Feed = {
      id: result.feed.id,
      type: result.feed.type,
      title: result.feed.title,
      message: result.feed.message,
      userName: "You",
      date: new Date().toISOString(),
      tags: [],
      userAvatarImage: user.userInfo?.avatarImage,
      userVote: 0,
    };

    setPosts((current) => [newPost, ...current]);
    setTitle("");
    setContent("");
  }

  async function handleVote(postId: string, vote: number) {
    const result = await sendJsonRequest("/Feed/VotePost", "POST", {
      postId: postId,
      vote: vote
    });

    if (result !== null) {
      setPosts(current => 
        current.map(post => {
          if (post.id === postId) {
            const currentVote = post.userVote || 0;
            const newVote = result.vote;
            const voteDiff = newVote - currentVote;
            
            return {
              ...post,
              votes: (post.votes || 0) + voteDiff,
              userVote: newVote
            };
          }
          return post;
        })
      );
    }
  }

  async function getReplies(feedId: string) {
    const result = await sendJsonRequest("/Feed/GetFeedReplies", "POST", {
      feedId: feedId,
      page: 1,
      count: 10
    });

    if (result && result.replies) {
      setReplies(current => ({
        ...current,
        [feedId]: result.replies
      }));
    }
  }

  async function handleAddReply(feedId: string) {
    const text = replyText[feedId];
    if (!text?.trim()) return;

    const result = await sendJsonRequest("/Feed/CreateReply", "POST", {
      message: text,
      feedId: feedId,
    });

    if (result) {
      const newReply: Reply = {
        id: result.post.id,
        message: result.post.message,
        date: result.post.date,
        userId: user.userInfo?.id || "",
        userName: "You",
        userAvatar: avatarImage,
        level: 0,
        roles: [],
        votes: 0,
        answers: 0,
        isUpvoted: false
      };

      setReplies(current => ({
        ...current,
        [feedId]: [newReply, ...(current[feedId] || [])]
      }));

      setReplyText(current => ({
        ...current,
        [feedId]: ""
      }));

      // Update parent post answer count
      setPosts(current => 
        current.map(post => 
          post.id === feedId 
            ? { ...post, answers: (post.answers || 0) + 1 }
            : post
        )
      );
    }
  }

  function toggleReplies(feedId: string) {
    setShowReplies(current => ({
      ...current,
      [feedId]: !current[feedId]
    }));

    if (!replies[feedId]) {
      getReplies(feedId);
    }
  }

  async function handleVoteReply(replyId: string, vote: number, feedId: string) {
    const result = await sendJsonRequest("/Feed/VotePost", "POST", {
      postId: replyId,
      vote: vote
    });

    if (result !== null) {
      setReplies(current => ({
        ...current,
        [feedId]: current[feedId]?.map(reply => {
          if (reply.id === replyId) {
            const currentVote = reply.isUpvoted ? 1 : 0;
            const newVote = result.vote;
            const voteDiff = newVote - currentVote;
            
            return {
              ...reply,
              votes: reply.votes + voteDiff,
              isUpvoted: newVote === 1
            };
          }
          return reply;
        }) || []
      }));
    }
  }

  function renderTags(tags: string[]) {
    return (
      <div className="mb-2">
        {tags.map((tag) => (
          <Badge bg="secondary" className="me-1" key={tag}>
            {tag}
          </Badge>
        ))}
      </div>
    );
  }

  function renderStats(item: Feed) {
    const isUpvoted = item.userVote === 1;
    
    return (
      <div className="d-flex gap-3 text-muted mt-2 small">
        <button 
          className={`btn btn-sm p-0 border-0 ${isUpvoted ? 'text-primary' : 'text-muted'}`}
          style={{ background: 'none' }}
          onClick={() => handleVote(item.id, isUpvoted ? 0 : 1)}
        >
          👍 {item.votes ?? 0}
        </button>
        <button 
          className="btn btn-sm p-0 border-0 text-muted"
          style={{ background: 'none' }}
          onClick={() => toggleReplies(item.id)}
        >
          💬 {item.answers ?? 0}
        </button>
        <button 
          className="btn btn-sm p-0 border-0 text-muted"
          style={{ background: 'none' }}
          onClick={() => openShareModal(item.id)}
        >
          🔄 {item.shares ?? 0}
        </button>

      </div>
    );
  }

  function renderReplies(feedId: string) {
    if (!showReplies[feedId]) return null;

    return (
      <div className="mt-3 border-top pt-3">
        {/* Add reply form */}
        <div className="mb-3">
          <div className="d-flex gap-2 align-items-center">
            <ProfileAvatar size={32} avatarImage={avatarImage} />
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Write a reply..."
              value={replyText[feedId] || ""}
              onChange={(e) => setReplyText(current => ({
                ...current,
                [feedId]: e.target.value
              }))}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddReply(feedId);
                }
              }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleAddReply(feedId)}
              disabled={!replyText[feedId]?.trim()}
            >
              Reply
            </button>
          </div>
        </div>

        {/* Replies list */}
        <div className="replies-container">
          {replies[feedId] && replies[feedId].length > 0 ? (
            replies[feedId].map((reply) => (
              <div key={reply.id} className="reply-item border-bottom pb-3 mb-3">
                <div className="d-flex align-items-start">
                  <ProfileAvatar size={32} avatarImage={reply.userAvatar} />
                  <div className="ms-3 flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                      <strong className="me-2" style={{ fontSize: '0.9rem' }}>
                        {reply.userName}
                      </strong>
                      <small className="text-muted">
                        {new Date(reply.date).toLocaleString()}
                      </small>
                    </div>
                    <p className="mb-2 reply-message">{reply.message}</p>
                    <div className="d-flex gap-3 text-muted" style={{ fontSize: '0.85rem' }}>
                      <button 
                        className={`btn btn-sm p-0 border-0 ${reply.isUpvoted ? 'text-primary' : 'text-muted'}`}
                        style={{ background: 'none' }}
                        onClick={() => handleVoteReply(reply.id, reply.isUpvoted ? 0 : 1, feedId)}
                      >
                        👍 {reply.votes}
                      </button>
                      {reply.answers > 0 && (
                        <span>💬 {reply.answers}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted py-3">
              <em>No replies yet. Be the first to reply!</em>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderUserHeader(userName: string, avatar: string | null, date: string, prefix?: string) {
    return (
      <div className="d-flex align-items-center mb-2">
        <ProfileAvatar size={40} avatarImage={avatar} />
        <div className="ms-3">
          <div>
            <strong>{userName}</strong> {prefix && <span className="text-muted">{prefix}</span>}
          </div>
          <small className="text-muted">{new Date(date).toLocaleString()}</small>
        </div>
      </div>
    );
  }

  return (
    <section className="wb-feed-posts-container">
      {/* Create post area */}
      <Container className="wb-feature-create_posts mb-5">
        <div className="mb-3">
          <label htmlFor="exampleFormControlInput1" className="form-label">
            Title
          </label>
          <input
            type="text"
            className="form-control"
            id="exampleFormControlInput1"
            placeholder="My post title"
            value={title}
            onChange={handleTitleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="exampleFormControlTextarea1" className="form-label">
            Content
          </label>
          <textarea
            className="form-control"
            id="exampleFormControlTextarea1"
            rows={3}
            value={content}
            onChange={handleContentChange}
          ></textarea>
        </div>
        <button
          className="btn btn-primary mt-3"
          type="submit"
          onClick={handleCreatePost}
        >
          Publish
        </button>
      </Container>

      {/* Feed list */}
      <Container className="wb-feed-posts">
        <div className="row row-cols-1 row-cols-lg-1 g-5 g-lg-3">
          <div className="col">
            <div className="p-3">
              {posts.map((item) => (
                <div className="card mb-4 wb-post shadow-sm" key={item.id}>
                  <div className="card-body">
                    {/* Shared Post */}
                    {item.type === 5 && item.originalPost ? (
                      <>
                        {renderUserHeader(item.userName, item.userAvatarImage || null, item.date, "shared a post")}
                        <h5 className="card-title">{item.title}</h5>
                        <p className="card-text">{item.message}</p>
                        {/* Nested original post */}
                        <div className="card mt-3 border">
                          <div className="card-body bg-light">
                            {renderUserHeader(
                              item.originalPost.userName,
                              item.originalPost.userAvatarImage || null,
                              item.originalPost.date
                            )}
                            <h5 className="card-title">{item.originalPost.title}</h5>
                            <p className="card-text">{item.originalPost.message}</p>
                            {renderTags(item.originalPost.tags)}
                          </div>
                        </div>
                        {renderStats(item)}
                        {renderReplies(item.id)}
                      </>
                    ) : (
                      /* Normal Post */
                      <>
                        {renderUserHeader(item.userName, item.userAvatarImage || null, item.date)}
                        <h5 className="card-title">{item.title}</h5>
                        <p className="card-text">{item.message}</p>
                        {renderTags(item.tags)}
                        {renderStats(item)}
                        {renderReplies(item.id)}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
      <Modal show={showShareModal} onHide={() => setShowShareModal(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Share Post</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control 
              type="text" 
              placeholder="Optional title" 
              value={shareTitle} 
              onChange={(e) => setShareTitle(e.target.value)} 
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Message</Form.Label>
            <Form.Control 
              as="textarea" 
              rows={3} 
              placeholder="Say something about this post..." 
              value={shareMessage} 
              onChange={(e) => setShareMessage(e.target.value)} 
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowShareModal(false)}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSharePost}>
          Share
        </Button>
      </Modal.Footer>
    </Modal>

    </section>
  );
};

export default Post;