import { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';

interface FeedLayoutProps {
  MainPage: ReactNode;
}

const FeedLayout = ({ MainPage }: FeedLayoutProps) => {


  return (
    <>
      <Helmet> <title>Feed | Webler Codes</title> <meta name="description" content="Stay up to date with the Webler community! Explore the latest project updates, shared snippets, and highlights from developers worldwide." /> </Helmet>
      <div className="wb-feed-layout-container">{MainPage}</div>
    </>
  );
};

export default FeedLayout;