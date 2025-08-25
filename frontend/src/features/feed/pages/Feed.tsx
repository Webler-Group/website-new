import { Container } from "react-bootstrap";
import Post from "../components/Post";

const Feed = () => {
  return (
    <Container className="wb-feed-container">
      <h2 className="mb-4">Community Feed</h2>
      <Post />
    </Container>
  );
};

export default Feed;
