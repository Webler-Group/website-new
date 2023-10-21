import { useCallback, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import useFollows from "../hooks/useFollows";
import FollowListProfile from "../components/FollowListProfile";

interface FollowListProps {
    onClose: () => void;
    options: {
        urlPath: string;
        title: string;
        userId: string;
        setCount: (callback: (data: number) => number) => void;
    }
}

const FollowList = ({ onClose, options }: FollowListProps) => {

    const [pageNum, setPageNum] = useState(1)
    const {
        isLoading,
        error,
        results,
        hasNextPage
    } = useFollows(options.urlPath, options.userId, 10, pageNum)

    const intObserver = useRef<IntersectionObserver>()
    const lastProfileRef = useCallback((profile: any) => {
        if (isLoading) return

        if (intObserver.current) intObserver.current.disconnect()

        intObserver.current = new IntersectionObserver(profiles => {

            if (profiles[0].isIntersecting && hasNextPage) {

                setPageNum(prev => prev + 1)
            }
        })


        if (profile) intObserver.current.observe(profile)
    }, [isLoading, hasNextPage])

    const content = results.map((user, i) => {

        return (
            <div key={user.id} className="mb-3">
                {
                    results.length === i + 1 ?
                        <FollowListProfile ref={lastProfileRef} user={user} viewedUserId={options.userId} setCount={options.setCount} />
                        :
                        <FollowListProfile user={user} viewedUserId={options.userId} setCount={options.setCount} />
                }
            </div>
        )
    })

    return (
        <Modal show={true} onHide={onClose} className="d-flex justify-content-center align-items-center" fullscreen="sm-down" contentClassName="wb-modal__container follows">
            <Modal.Header closeButton>
                <Modal.Title>{options.title}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="overflow-auto">
                {
                    error ?
                        <p>{error}</p>
                        :
                        <div>
                            {
                                content
                            }
                        </div>
                }
            </Modal.Body>
        </Modal>
    )
}

export default FollowList;