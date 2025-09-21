import React from 'react';
import FeedList from './components/FeedList';

const FeedLayout: React.FC = () => {
  return (
    <div className="wb-feed-layout-container">
      <FeedList />
    </div>
  );
};

export default FeedLayout;