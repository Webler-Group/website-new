import React, { useCallback, useRef } from 'react';
import useReactions from './useReactions';

interface ReactionsListProps {
    parentId: string;
    countPerPage: number;
}

const ReactionsList = ({ parentId, countPerPage }: ReactionsListProps) => {
    const { results, loading, hasNextPage, setState } = useReactions(parentId, countPerPage);

    const intObserver = useRef<IntersectionObserver>();
    const lastElemRef = useCallback(
        (elem: HTMLDivElement) => {
            if (loading) return;

            if (intObserver.current) intObserver.current.disconnect();

            intObserver.current = new IntersectionObserver((elems) => {
                if (elems[0].isIntersecting && hasNextPage && results.length > 0) {
                    setState(prev => ({ page: prev.page + 1 }));
                }
            });

            if (elem) intObserver.current.observe(elem);
        },
        [loading, hasNextPage, setState, results]
    );

    return (
        <div>
            {results.map((item, index) => (
                <div
                    key={item.id}
                    ref={index === results.length - 1 ? lastElemRef : undefined}
                >
                    
                </div>
            ))}
            {loading && <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center text-center">
                <div className="wb-loader">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>}
        </div>
    );
};

export default ReactionsList;