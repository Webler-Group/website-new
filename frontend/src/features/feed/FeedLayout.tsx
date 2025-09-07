import React from 'react';
import { Container } from 'react-bootstrap';
import FeedList from './components/FeedList';

const FeedLayout: React.FC = () => {
  return (
    <Container>
      <div className="min-vh-100">
        <FeedList />
      </div>
    </Container>
  );
};

export default FeedLayout;