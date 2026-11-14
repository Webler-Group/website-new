import { ReactNode } from 'react';
import { useSeo } from "../../../components/Seo";

interface FeedLayoutProps {
  MainPage: ReactNode;
}

const FeedLayout = ({ MainPage }: FeedLayoutProps) => {

    useSeo({
        title: "Feed",
        description: "Stay up to date with the Webler community! Explore the latest project updates, shared snippets, and highlights from developers worldwide."
    });


  return (
    <>
      <div className="wb-feed-layout-container">{MainPage}</div>
    </>
  );
};

export default FeedLayout;