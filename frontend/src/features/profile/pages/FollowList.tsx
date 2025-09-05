import { useCallback, useRef } from "react";
import { Modal } from "react-bootstrap";
import useFollows from "../hooks/useFollows";
import FollowListProfile from "../components/FollowListProfile";

interface FollowListProps {
    options: { path?: string; userId: string | null; };
    visible: boolean;
    onClose: () => void;
    title: string;
    setCount?: (callback: (data: number) => number) => void;
}

const FollowList = ({ options, visible, title, onClose, setCount }: FollowListProps) => {

    const {
        isLoading,
        error,
        results,
        hasNextPage,
        setState
    } = useFollows(options, 10);

    const intObserver = useRef<IntersectionObserver>()
    const lastProfileRef = useCallback((profile: any) => {
        if (isLoading) return

        if (intObserver.current) intObserver.current.disconnect()

        intObserver.current = new IntersectionObserver(profiles => {

            if (profiles[0].isIntersecting && hasNextPage && results.length > 0) {

                setState(prev => ({ page: prev.page + 1 }))
            }
        })


        if (profile) intObserver.current.observe(profile)
    }, [isLoading, hasNextPage, results])

    return (
        <Modal show={visible} onHide={onClose} className="d-flex justify-content-center align-items-center" fullscreen="sm-down" contentClassName="wb-modal__container follows">
            <Modal.Header closeButton>
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="overflow-auto">
                {
                    error ?
                        <p className="text-danger">{error}</p>
                        :
                        results.map((user, i) => {

                            return (
                                <div key={user.id} className="mb-3">
                                    {
                                        results.length === i + 1 ?
                                            <FollowListProfile ref={lastProfileRef} user={user} viewedUserId={options.userId} setCount={setCount} />
                                            :
                                            <FollowListProfile user={user} viewedUserId={options.userId} setCount={setCount} />
                                    }
                                </div>
                            )
                        })
                }
                {
                    isLoading &&
                    <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center text-center">
                        <div className="wb-loader">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                }
            </Modal.Body>
        </Modal>
    )
}

export default FollowList;