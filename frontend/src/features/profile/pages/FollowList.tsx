import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import useData from "../hooks/useData";
import FollowListProfile from "../components/FollowListProfile";

interface FollowListProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    userId?: string;
    setCount?: (callback: (data: number) => number) => void;
    options: {
        urlPath: string | null;
        params: any;
    }
}

const FollowList = ({ visible, title, onClose, userId, setCount, options }: FollowListProps) => {

    const [store, setStore] = useState({ page: 0 })
    const {
        isLoading,
        error,
        results,
        hasNextPage
    } = useData(options.urlPath, options.params, 10, store)

    useEffect(() => {
        setStore({ page: 1 });
    }, [options]);

    const intObserver = useRef<IntersectionObserver>()
    const lastProfileRef = useCallback((profile: any) => {
        if (isLoading) return

        if (intObserver.current) intObserver.current.disconnect()

        intObserver.current = new IntersectionObserver(profiles => {

            if (profiles[0].isIntersecting && hasNextPage) {

                setStore(prev => ({ page: prev.page + 1 }))
            }
        })


        if (profile) intObserver.current.observe(profile)
    }, [isLoading, hasNextPage])

    const content = results.map((user, i) => {

        return (
            <div key={user.id} className="mb-3">
                {
                    results.length === i + 1 ?
                        <FollowListProfile ref={lastProfileRef} user={user} viewedUserId={userId} setCount={setCount} />
                        :
                        <FollowListProfile user={user} viewedUserId={userId} setCount={setCount} />
                }
            </div>
        )
    })

    return (
        <Modal show={visible} onHide={onClose} className="d-flex justify-content-center align-items-center" fullscreen="sm-down" contentClassName="wb-modal__container follows">
            <Modal.Header closeButton>
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="overflow-auto">
                {
                    error ?
                        <p>{error}</p>
                        :

                        (isLoading && store.page == 1)
                            ?
                            <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center text-center">
                                <div className="wb-loader">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                            :
                            content

                }
            </Modal.Body>
        </Modal>
    )
}

export default FollowList;