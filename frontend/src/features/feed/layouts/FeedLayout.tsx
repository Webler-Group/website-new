import { ReactNode } from 'react';

interface FeedLayoutProps {
  MainPage: ReactNode;
}

const FeedLayout = ({ MainPage }: FeedLayoutProps) => {
  return (
    <div className="wb-feed-layout-container">{MainPage}</div>
  );
};

export default FeedLayout;