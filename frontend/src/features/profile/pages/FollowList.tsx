import { useCallback, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import useFollows from "../hooks/useFollows";
import FollowListProfile from "../components/FollowListProfile";

interface FollowListProps {
    onClose: () => void;
    options: {
        urlPath: string;
        title: string;
    }
}

const FollowList = ({ onClose, options }: FollowListProps) => {

    const [pageNum, setPageNum] = useState(1)
    const {
        isLoading,
        error,
        results,
        hasNextPage
    } = useFollows(options.urlPath, 10, pageNum)

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

        if (results.length === i + 1) {
            return <FollowListProfile ref={lastProfileRef} key={user.id} user={user} />
        }
        return <FollowListProfile key={user.id} user={user} />
    })

    return (
        <Modal show={true} onHide={onClose} className="d-flex justify-content-center align-items-center" fullscreen="sm-down" contentClassName="webler-modal__container follows">
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