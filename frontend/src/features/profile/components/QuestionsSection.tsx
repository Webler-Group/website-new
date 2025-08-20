import { Modal } from "react-bootstrap";
import { useCallback, useRef, useState } from "react";
import useQuestions from "../hooks/useQuestions";
import Question from "../../discuss/components/Question";

interface QuestionsSectionProps {
    userId: string;
    onClose: () => void;
}

const QuestionsSection = ({ userId, onClose }: QuestionsSectionProps) => {

    const [pageNum, setPageNum] = useState(1)
    const {
        isLoading,
        error,
        results,
        hasNextPage
    } = useQuestions(userId, 10, pageNum);

    const intObserver = useRef<IntersectionObserver>()
    const lastQuestionRef = useCallback((question: any) => {
        if (isLoading) return

        if (intObserver.current) intObserver.current.disconnect()

        intObserver.current = new IntersectionObserver(profiles => {

            if (profiles[0].isIntersecting && hasNextPage) {

                setPageNum(prev => prev + 1)
            }
        })


        if (question) intObserver.current.observe(question)
    }, [isLoading, hasNextPage])

    const content = results.map((question, i) => {

        return (
            <div key={question.id} className="mt-2">
                {
                    results.length === i + 1 ?
                        <Question ref={lastQuestionRef} question={question} searchQuery="" showUserProfile={false} />
                        :
                        <Question question={question} searchQuery="" showUserProfile={false} />
                }
            </div>
        )
    })

    return (
        <Modal show={true} onHide={onClose} className="d-flex justify-content-center align-items-center" fullscreen="sm-down" contentClassName="wb-modal__container codes">
            <Modal.Header closeButton>
                <Modal.Title>Questions</Modal.Title>
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

export default QuestionsSection