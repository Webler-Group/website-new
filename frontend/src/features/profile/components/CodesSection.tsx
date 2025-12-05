import { Modal } from "react-bootstrap";
import useCodes from "../hooks/useCodes";
import { useCallback, useRef, useState } from "react";
import Code from "../../codes/components/Code";

interface CodesSectionProps {
    userId: string;
    onClose: () => void;
}

const CodesSection = ({ userId, onClose }: CodesSectionProps) => {

    const [pageNum, setPageNum] = useState(1)
    const {
        isLoading,
        error,
        results,
        hasNextPage
    } = useCodes(userId, 10, pageNum);

    const intObserver = useRef<IntersectionObserver>()
    const lastCodeRef = useCallback((code: any) => {
        if (isLoading) return

        if (intObserver.current) intObserver.current.disconnect()

        intObserver.current = new IntersectionObserver(profiles => {

            if (profiles[0].isIntersecting && hasNextPage) {

                setPageNum(prev => prev + 1)
            }
        })


        if (code) intObserver.current.observe(code)
    }, [isLoading, hasNextPage])

    const content = results.map((code, i) => {

        return (
            <div key={code.id}>
                {
                    results.length === i + 1 ?
                        <Code ref={lastCodeRef} code={code} searchQuery="" showUserProfile={false} />
                        :
                        <Code code={code} searchQuery="" showUserProfile={false} />
                }
            </div>
        )
    })

    return (
        <Modal show={true} onHide={onClose} className="d-flex justify-content-center align-items-center" fullscreen="sm-down" contentClassName="wb-modal__container codes">
            <Modal.Header closeButton>
                <Modal.Title>Codes</Modal.Title>
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

export default CodesSection