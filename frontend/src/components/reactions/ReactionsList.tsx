import { useCallback, useRef } from 'react';
import useReactions from './useReactions';
import ReactionListItem, { IUserReaction } from './ReactionListItem';
import { Modal } from 'react-bootstrap';

interface ReactionsListProps {
    options: { parentId: string | null; };
    visible: boolean;
    onClose: () => void;
    title: string;
    showReactions: boolean;
    countPerPage: number;
}

const ReactionsList = ({ options, visible, onClose, title, showReactions, countPerPage }: ReactionsListProps) => {
    const { results, loading, hasNextPage, error, setState } = useReactions(options, countPerPage);

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
        [loading, hasNextPage, results]
    );

    return (
        <Modal show={visible} onHide={onClose} className="d-flex justify-content-center align-items-center" style={{ zIndex: 1070 }} backdropClassName="wb-reactions-modal__backdrop" fullscreen="sm-down" contentClassName="wb-modal__container follows">
            <Modal.Header closeButton>
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="overflow-auto">

                {
                    error ?
                        <p className="text-danger">{error}</p>
                        :
                        results.map((item: IUserReaction, index) => (
                            <div key={index} className="mb-2">
                                <ReactionListItem
                                    ref={index === results.length - 1 ? lastElemRef : undefined}
                                    item={item}
                                    showReactions={showReactions}
                                />
                            </div>
                        ))
                }

                {loading && (
                    <div className="d-flex flex-column justify-content-center align-items-center text-center py-2">
                        <div className="wb-loader">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    )
};

export default ReactionsList;
