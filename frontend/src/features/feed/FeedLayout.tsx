import React from 'react';
import FeedList from './components/FeedList';

const FeedLayout: React.FC = () => {
  return (
    <div className="wb-feed-layout-container p-2">
      <FeedList />
    </div>
  );
};

export default FeedLayout;